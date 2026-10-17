import { beforeEach, describe, expect, it, vi } from "vitest";

const { fakes, FakeHttpsError } = vi.hoisted(() => {
  class FakeHttpsError extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.code = code;
    }
  }
  return {
    FakeHttpsError,
    fakes: {
      events: {} as Record<string, Record<string, unknown>>,
      coupons: {} as Record<string, Record<string, unknown>>,
    },
  };
});

function couponDoc(eventId: string, code: string) {
  const key = `${eventId}/${code}`;
  return {
    get: async () => {
      const data = fakes.coupons[key];
      return { exists: Boolean(data), id: code, data: () => data };
    },
    set: async (data: Record<string, unknown>) => {
      fakes.coupons[key] = { ...fakes.coupons[key], ...data };
    },
    update: async (data: Record<string, unknown>) => {
      fakes.coupons[key] = { ...fakes.coupons[key], ...data };
    },
  };
}

vi.mock("./admin", () => ({
  CALLABLE: {},
  requireAccount: (request: { auth?: { uid?: string } }) => {
    const uid = request.auth?.uid;
    if (!uid) throw new FakeHttpsError("unauthenticated", "Sign in.");
    return uid;
  },
  isPlatformAdmin: () => false,
  db: {
    collection: (name: string) => ({
      doc: (id: string) => ({
        collection: (_sub: string) => ({
          doc: (code: string) => couponDoc(id, code),
          get: async () => ({
            docs: Object.entries(fakes.coupons)
              .filter(([k]) => k.startsWith(`${id}/`))
              .map(([k, data]) => ({ id: k.split("/")[1], data: () => data })),
          }),
        }),
        get: async () => {
          const data = name === "events" ? fakes.events[id] : undefined;
          return { exists: Boolean(data), id, data: () => data };
        },
      }),
    }),
    runTransaction: async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        get: (ref: { get: () => Promise<unknown> }) => ref.get(),
        update: (ref: { update: (data: unknown) => Promise<void> }, data: unknown) => ref.update(data),
      }),
  },
}));

vi.mock("./abuse", () => ({
  noteAppCheck: async () => undefined,
  enforceRateLimit: async () => undefined,
  isAnonymousAuth: () => false,
  writeAudit: async () => undefined,
}));

vi.mock("firebase-functions/v2/https", () => ({
  HttpsError: FakeHttpsError,
  onCall: vi.fn((_opts: unknown, handler: unknown) => handler),
}));

vi.mock("./guestlist", () => ({
  scopeHostUids: async (scope: string, id: string) => {
    if (scope !== "event") return null;
    const e = fakes.events[id] as { organiserUid?: string; coHostUids?: string[] } | undefined;
    if (!e?.organiserUid) return null;
    return { ownerUid: e.organiserUid, coHostUids: e.coHostUids || [] };
  },
}));

import { listEventCoupons, upsertEventCoupon, validateEventCoupon } from "./coupons";

type Handler = (request: unknown) => Promise<Record<string, unknown>>;

const HOST_REQ = { auth: { uid: "org-1" }, data: {} };
const GUEST_REQ = { auth: { uid: "guest-9" }, data: {} };

describe("event coupons", () => {
  beforeEach(() => {
    fakes.events = { "evt-1": { organiserUid: "org-1" } };
    fakes.coupons = {};
  });

  it("lets the organiser create and list codes", async () => {
    await (upsertEventCoupon as unknown as Handler)({
      ...HOST_REQ,
      data: { eventId: "evt-1", code: "mates10", percentOff: 10 },
    });
    const listed = (await (listEventCoupons as unknown as Handler)({
      ...HOST_REQ,
      data: { eventId: "evt-1" },
    })) as { coupons: { code: string; percentOff: number }[] };
    expect(listed.coupons).toEqual([expect.objectContaining({ code: "MATES10", percentOff: 10 })]);
  });

  it("rejects bad drafts and non-hosts", async () => {
    await expect(
      (upsertEventCoupon as unknown as Handler)({ ...HOST_REQ, data: { eventId: "evt-1", code: "x", percentOff: 10 } }),
    ).rejects.toThrowError();
    await expect(
      (upsertEventCoupon as unknown as Handler)({
        ...GUEST_REQ,
        data: { eventId: "evt-1", code: "MATES10", percentOff: 10 },
      }),
    ).rejects.toThrowError();
  });

  it("validates live codes and fails closed on the rest", async () => {
    await (upsertEventCoupon as unknown as Handler)({
      ...HOST_REQ,
      data: { eventId: "evt-1", code: "MATES10", percentOff: 25 },
    });
    const ok = (await (validateEventCoupon as unknown as Handler)({
      ...GUEST_REQ,
      data: { eventId: "evt-1", code: "mates10" },
    })) as { percentOff: number };
    expect(ok.percentOff).toBe(25);
    await expect(
      (validateEventCoupon as unknown as Handler)({ ...GUEST_REQ, data: { eventId: "evt-1", code: "NOPE" } }),
    ).rejects.toThrowError();
  });

  it("honours deactivation and redemption caps", async () => {
    await (upsertEventCoupon as unknown as Handler)({
      ...HOST_REQ,
      data: { eventId: "evt-1", code: "ONEUSE", percentOff: 50, maxRedemptions: 1 },
    });
    fakes.coupons["evt-1/ONEUSE"] = { ...fakes.coupons["evt-1/ONEUSE"], redemptions: 1 };
    await expect(
      (validateEventCoupon as unknown as Handler)({ ...GUEST_REQ, data: { eventId: "evt-1", code: "ONEUSE" } }),
    ).rejects.toThrowError();
    await (upsertEventCoupon as unknown as Handler)({
      ...HOST_REQ,
      data: { eventId: "evt-1", code: "ONEUSE", percentOff: 50, active: false },
    });
    await expect(
      (validateEventCoupon as unknown as Handler)({ ...GUEST_REQ, data: { eventId: "evt-1", code: "ONEUSE" } }),
    ).rejects.toThrowError();
  });
});
