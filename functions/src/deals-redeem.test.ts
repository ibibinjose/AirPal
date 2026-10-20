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
      vouchers: {} as Record<string, Record<string, unknown>>,
      secrets: {} as Record<string, Record<string, unknown>>,
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
      if (name === "vouchers") return { doc: (id: string) => docRef(fakes.vouchers, id) };
      if (name === "businessDealSecrets") return { doc: (id: string) => docRef(fakes.secrets, id) };
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

import { redeemVoucher } from "./deals";
import { hashPin } from "./pin";

type Handler = (request: unknown) => Promise<Record<string, unknown>>;

const STAFF_REQ = { auth: { uid: "staff-1" }, data: {} };
const FUTURE = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
const PAST = new Date(Date.now() - 60 * 1000).toISOString();

function seedVoucher(overrides: Record<string, unknown> = {}) {
  fakes.vouchers["TEA-1234"] = {
    uid: "guest-9",
    dealId: "deal-1",
    status: "active",
    expiresAt: FUTURE,
    ...overrides,
  };
  fakes.secrets["deal-1"] = { pinHash: hashPin("2468") };
}

describe("redeemVoucher staff-PIN gap", () => {
  beforeEach(() => {
    fakes.vouchers = {};
    fakes.secrets = {};
    fakes.userDocs = {};
    ledger.length = 0;
  });

  it("redeems with the correct staff PIN and writes the ledger", async () => {
    seedVoucher();
    const res = (await (redeemVoucher as unknown as Handler)({
      ...STAFF_REQ,
      data: { voucherId: "tea-1234", staffPin: "2468" },
    })) as { ok: boolean };
    expect(res.ok).toBe(true);
    expect(fakes.vouchers["TEA-1234"].status).toBe("redeemed");
    expect(ledger).toHaveLength(1);
    expect(ledger[0]).toMatchObject({
      eventName: "offer_redeem",
      properties: { claimId: "TEA-1234", redemptionChannel: "staff_pin" },
    });
  });

  it("rejects the wrong PIN without touching the voucher", async () => {
    seedVoucher();
    await expect(
      (redeemVoucher as unknown as Handler)({
        ...STAFF_REQ,
        data: { voucherId: "TEA-1234", staffPin: "0000" },
      }),
    ).rejects.toThrowError(expect.objectContaining({ code: "permission-denied" }));
    expect(fakes.vouchers["TEA-1234"].status).toBe("active");
    expect(ledger).toHaveLength(0);
  });

  it("refuses double redemption", async () => {
    seedVoucher({ status: "redeemed", redeemedAt: new Date().toISOString() });
    await expect(
      (redeemVoucher as unknown as Handler)({
        ...STAFF_REQ,
        data: { voucherId: "TEA-1234", staffPin: "2468" },
      }),
    ).rejects.toThrowError(expect.objectContaining({ code: "failed-precondition" }));
  });

  it("expires stale vouchers instead of honouring them", async () => {
    seedVoucher({ expiresAt: PAST });
    await expect(
      (redeemVoucher as unknown as Handler)({
        ...STAFF_REQ,
        data: { voucherId: "TEA-1234", staffPin: "2468" },
      }),
    ).rejects.toThrowError(expect.objectContaining({ code: "failed-precondition" }));
    expect(fakes.vouchers["TEA-1234"].status).toBe("expired");
  });

  it("fails closed on unknown codes and missing venue PINs", async () => {
    seedVoucher();
    delete fakes.secrets["deal-1"];
    await expect(
      (redeemVoucher as unknown as Handler)({
        ...STAFF_REQ,
        data: { voucherId: "TEA-1234", staffPin: "2468" },
      }),
    ).rejects.toThrowError(expect.objectContaining({ code: "failed-precondition" }));
    await expect(
      (redeemVoucher as unknown as Handler)({
        ...STAFF_REQ,
        data: { voucherId: "NOPE-0000", staffPin: "2468" },
      }),
    ).rejects.toThrowError(expect.objectContaining({ code: "not-found" }));
  });
});
