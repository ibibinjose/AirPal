import { beforeEach, describe, expect, it, vi } from "vitest";

const { fakes, FakeHttpsError, ledger } = vi.hoisted(() => {
  class FakeHttpsError extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.code = code;
    }
  }
  return {
    FakeHttpsError,
    ledger: [] as Array<{ eventName: string; properties: Record<string, unknown> }>,
    fakes: {
      deals: {} as Record<string, Record<string, unknown>>,
      vouchers: {} as Record<string, Record<string, unknown>>,
      userDocs: {} as Record<string, Record<string, unknown>>,
    },
  };
});

function docRef(store: Record<string, Record<string, unknown>>, id: string) {
  return {
    get: async () => {
      const data = store[id];
      return { exists: Boolean(data), id, data: () => data };
    },
    set: async (data: Record<string, unknown>, opts?: { merge?: boolean }) => {
      store[id] = opts?.merge ? { ...store[id], ...data } : data;
    },
    update: async (data: Record<string, unknown>) => {
      if (!store[id]) throw new FakeHttpsError("not-found", "Missing doc.");
      store[id] = { ...store[id], ...data };
    },
    collection: (sub: string) => ({
      doc: (subId: string) => docRef(fakes.userDocs, `${id}/${sub}/${subId}`),
    }),
  };
}

vi.mock("./admin", () => ({
  CALLABLE: {},
  requireAccount: (request: { auth?: { uid?: string } }) => {
    const uid = request.auth?.uid;
    if (!uid) throw new FakeHttpsError("unauthenticated", "Sign in.");
    return uid;
  },
  requireAuth: (uid: string | undefined) => {
    if (!uid) throw new FakeHttpsError("unauthenticated", "Sign in.");
    return uid;
  },
  isPlatformAdmin: () => false,
  db: {
    collection: (name: string) => {
      if (name === "businessDeals") return { doc: (id: string) => docRef(fakes.deals, id) };
      if (name === "vouchers") return { doc: (id: string) => docRef(fakes.vouchers, id) };
      if (name === "users") {
        return { doc: (id: string) => docRef(fakes.userDocs, id) };
      }
      throw new Error(`unexpected collection ${name}`);
    },
    runTransaction: async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        get: (ref: { get: () => Promise<unknown> }) => ref.get(),
        set: (ref: { set: (d: unknown, o?: unknown) => unknown }, data: unknown, opts?: unknown) => {
          void ref.set(data, opts);
        },
        update: (ref: { update: (d: unknown) => unknown }, data: unknown) => ref.update(data),
      };
      return fn(tx);
    },
  },
}));

vi.mock("./abuse", () => ({
  noteAppCheck: async () => undefined,
  enforceRateLimit: async () => undefined,
  isAnonymousAuth: () => false,
  writeAudit: async () => undefined,
}));

vi.mock("./analytics", () => ({
  writeAuthoritativeEvent: async (input: { eventName: string; properties: Record<string, unknown> }) => {
    ledger.push({ eventName: input.eventName, properties: input.properties });
  },
}));

vi.mock("firebase-functions/v2/https", () => ({
  HttpsError: FakeHttpsError,
  onCall: vi.fn((_opts: unknown, handler: unknown) => handler),
}));

import { claimDeal } from "./deals";

type Handler = (request: unknown) => Promise<{ voucher: Record<string, unknown> }>;

const GUEST_REQ = { auth: { uid: "guest-9" }, data: {} };
const STAY = { guestName: "Ava", title: "Harbour Brunch Club" };

function seedDeal(overrides: Record<string, unknown> = {}) {
  fakes.deals["deal-1"] = {
    venueId: "venue-1",
    venueName: "Harbour Brunch Club",
    venueAddress: "1 Quay",
    category: "dining",
    title: "2-for-1 Brunch",
    guestPerk: "2-for-1 mains",
    discountBadge: "2-for-1",
    active: true,
    claimsCount: 0,
    ...overrides,
  };
}

describe("claimDeal creation gap", () => {
  beforeEach(() => {
    fakes.deals = {};
    fakes.vouchers = {};
    fakes.userDocs = {};
    ledger.length = 0;
    seedDeal();
  });

  it("claims once and bumps the public counter", async () => {
    const res = await (claimDeal as unknown as Handler)({
      ...GUEST_REQ,
      data: { dealId: "deal-1", stayContext: STAY },
    });
    expect(res.voucher.status).toBe("active");
    expect(res.voucher.uid).toBe("guest-9");
    expect(fakes.deals["deal-1"].claimsCount).toBe(1);
    expect(ledger).toHaveLength(1);
    expect(ledger[0]).toMatchObject({
      eventName: "offer_claim",
      properties: { offerId: "deal-1" },
    });
  });

  it("replays the same voucher on retry without double-counting", async () => {
    const first = await (claimDeal as unknown as Handler)({
      ...GUEST_REQ,
      data: { dealId: "deal-1", stayContext: STAY },
    });
    const retry = await (claimDeal as unknown as Handler)({
      ...GUEST_REQ,
      data: { dealId: "deal-1", stayContext: STAY },
    });
    expect(retry.voucher.id).toBe(first.voucher.id);
    expect(fakes.deals["deal-1"].claimsCount).toBe(1);
    expect(ledger).toHaveLength(2);
  });

  it("fails closed on unknown deals, missing context, and exhausted caps", async () => {
    await expect(
      (claimDeal as unknown as Handler)({ ...GUEST_REQ, data: { dealId: "nope", stayContext: STAY } }),
    ).rejects.toThrowError(expect.objectContaining({ code: "not-found" }));
    await expect(
      (claimDeal as unknown as Handler)({ ...GUEST_REQ, data: { dealId: "deal-1", stayContext: {} } }),
    ).rejects.toThrowError(expect.objectContaining({ code: "invalid-argument" }));
    seedDeal({ claimLimit: 1, claimsCount: 1 });
    await expect(
      (claimDeal as unknown as Handler)({ ...GUEST_REQ, data: { dealId: "deal-1", stayContext: STAY } }),
    ).rejects.toThrowError(expect.objectContaining({ code: "failed-precondition" }));
  });
});
