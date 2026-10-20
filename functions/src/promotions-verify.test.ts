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
      promos: {} as Record<string, Record<string, unknown>>,
      rewards: {} as Record<string, Record<string, unknown>>,
      redemptions: {} as Record<string, Record<string, unknown>>,
      rewardTx: [] as Record<string, unknown>[],
      notifications: [] as Record<string, unknown>[],
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
  };
}

vi.mock("./admin", () => ({
  CALLABLE: {},
  auth: {},
  requireAccount: (request: { auth?: { uid?: string } }) => {
    const uid = request.auth?.uid;
    if (!uid) throw new FakeHttpsError("unauthenticated", "Sign in.");
    return uid;
  },
  requireAuth: (uid: string | undefined) => {
    if (!uid) throw new FakeHttpsError("unauthenticated", "Sign in.");
    return uid;
  },
  isPlatformAdmin: (claims: { platform_admin?: boolean } | undefined) => claims?.platform_admin === true,
  db: {
    collection: (name: string) => {
      if (name === "promotions") {
        return { doc: (id: string) => docRef(fakes.promos, id) };
      }
      if (name === "rewards") {
        return { doc: (id: string) => docRef(fakes.rewards, id) };
      }
      if (name === "promotion_redemptions") {
        return {
          doc: (id: string) => docRef(fakes.redemptions, id),
          where: (field: string, _op: string, value: unknown) => {
            const filters: Array<{ field: string; value: unknown }> = [{ field, value }];
            const query = {
              where: (f2: string, _o2: string, v2: unknown) => {
                filters.push({ field: f2, value: v2 });
                return query;
              },
              limit: (_n: number) => query,
              get: async () => ({
                docs: Object.entries(fakes.redemptions)
                  .filter(([, row]) => filters.every((f) => String(row[f.field] ?? "") === String(f.value)))
                  .map(([id, row]) => ({ id, ref: docRef(fakes.redemptions, id), data: () => row })),
              }),
            };
            return query;
          },
          add: async (data: Record<string, unknown>) => {
            const id = `auto-${Object.keys(fakes.redemptions).length}`;
            fakes.redemptions[id] = data;
            return { id };
          },
        };
      }
      if (name === "reward_transactions" || name === "promotion_notifications") {
        const sink = name === "reward_transactions" ? fakes.rewardTx : fakes.notifications;
        return { add: async (data: Record<string, unknown>) => sink.push(data) };
      }
      throw new Error(`unexpected collection ${name}`);
    },
    runTransaction: async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        get: (ref: { get: () => Promise<unknown> }) => ref.get(),
        set: (ref: { set: (d: unknown, o?: unknown) => unknown }, data: unknown, opts?: unknown) => {
          void ref.set(data, opts);
        },
        create: (ref: { set: (d: unknown, o?: unknown) => unknown }, data: unknown) => {
          void ref.set(data);
        },
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

vi.mock("./notifications", () => ({
  sendPushIfAllowed: async () => undefined,
}));

vi.mock("./analytics", () => ({
  writeAuthoritativeEvent: async (input: {
    eventName: string;
    properties: Record<string, unknown>;
  }) => {
    ledger.push({ eventName: input.eventName, properties: input.properties });
  },
}));

vi.mock("firebase-functions/v2/https", () => ({
  HttpsError: FakeHttpsError,
  onCall: vi.fn((_opts: unknown, handler: unknown) => handler),
}));

vi.mock("firebase-functions/v2/scheduler", () => ({
  onSchedule: vi.fn(() => () => undefined),
}));

import {
  consumePromotionRedemption,
  redeemPoints,
  verifyPromotionRedemption,
} from "./promotions";

type Handler = (request: unknown) => Promise<Record<string, unknown>>;

const OWNER_REQ = { auth: { uid: "org-1", token: {} }, data: {} };
const STRANGER_REQ = { auth: { uid: "mallory", token: {} }, data: {} };
const GUEST_REQ = { auth: { uid: "guest-9", token: {} }, data: {} };

function liveMemberPromo() {
  fakes.promos = {
    "promo-1": {
      title: "Free Kaya Toast",
      status: "live",
      mechanicType: "member",
      pointsCost: 50,
      ownerUid: "org-1",
    },
  };
}

describe("promotion redemption verify + consume", () => {
  beforeEach(() => {
    fakes.promos = {};
    fakes.rewards = {};
    fakes.redemptions = {};
    fakes.rewardTx = [];
    fakes.notifications = [];
    ledger.length = 0;
  });

  it("verifies an active code for the offer owner", async () => {
    liveMemberPromo();
    fakes.redemptions["guest-9_promo-1"] = {
      uid: "guest-9",
      promotionId: "promo-1",
      code: "RDM-PRO-4242",
      status: "active",
      pointsSpent: 50,
    };
    const res = (await (verifyPromotionRedemption as unknown as Handler)({
      ...OWNER_REQ,
      data: { promotionId: "promo-1", code: "RDM-PRO-4242" },
    })) as { valid: boolean; title: string; reason: null };
    expect(res.valid).toBe(true);
    expect(res.title).toBe("Free Kaya Toast");
    expect(res.reason).toBe(null);
  });

  it("denies strangers and reports unknown codes as not_found", async () => {
    liveMemberPromo();
    fakes.redemptions["guest-9_promo-1"] = {
      uid: "guest-9",
      promotionId: "promo-1",
      code: "RDM-PRO-4242",
      status: "active",
      pointsSpent: 50,
    };
    await expect(
      (verifyPromotionRedemption as unknown as Handler)({
        ...STRANGER_REQ,
        data: { promotionId: "promo-1", code: "RDM-PRO-4242" },
      }),
    ).rejects.toThrowError(expect.objectContaining({ code: "permission-denied" }));
    const missing = (await (verifyPromotionRedemption as unknown as Handler)({
      ...OWNER_REQ,
      data: { promotionId: "promo-1", code: "RDM-NOPE-0000" },
    })) as { valid: boolean; reason: string };
    expect(missing.valid).toBe(false);
    expect(missing.reason).toBe("not_found");
  });

  it("consumes once, then reports already_redeemed", async () => {
    liveMemberPromo();
    fakes.redemptions["guest-9_promo-1"] = {
      uid: "guest-9",
      promotionId: "promo-1",
      code: "RDM-PRO-4242",
      status: "active",
      pointsSpent: 50,
    };
    const consumed = (await (consumePromotionRedemption as unknown as Handler)({
      ...OWNER_REQ,
      data: { promotionId: "promo-1", code: "RDM-PRO-4242" },
    })) as { code: string; redeemedAt: string };
    expect(consumed.code).toBe("RDM-PRO-4242");
    expect(typeof consumed.redeemedAt).toBe("string");
    expect(ledger).toHaveLength(1);
    expect(ledger[0]).toMatchObject({
      eventName: "offer_redeem",
      properties: { offerId: "promo-1", claimId: "RDM-PRO-4242" },
    });
    await expect(
      (consumePromotionRedemption as unknown as Handler)({
        ...OWNER_REQ,
        data: { promotionId: "promo-1", code: "RDM-PRO-4242" },
      }),
    ).rejects.toThrowError(expect.objectContaining({ code: "failed-precondition" }));
    const recheck = (await (verifyPromotionRedemption as unknown as Handler)({
      ...OWNER_REQ,
      data: { promotionId: "promo-1", code: "RDM-PRO-4242" },
    })) as { valid: boolean; reason: string };
    expect(recheck.valid).toBe(false);
    expect(recheck.reason).toBe("already_redeemed");
  });
});

describe("redeemPoints idempotency gap", () => {
  beforeEach(() => {
    liveMemberPromo();
    fakes.rewards = { "guest-9": { uid: "guest-9", points: 200 } };
    fakes.redemptions = {};
    fakes.rewardTx = [];
    fakes.notifications = [];
    ledger.length = 0;
  });

  it("charges once and replays the same code on retry", async () => {
    const first = (await (redeemPoints as unknown as Handler)({
      ...GUEST_REQ,
      data: { promotionId: "promo-1" },
    })) as { ok: boolean; code: string; duplicate?: boolean };
    expect(first.ok).toBe(true);
    expect(first.duplicate).toBeUndefined();
    expect(fakes.rewards["guest-9"].points).toBe(150);

    const retry = (await (redeemPoints as unknown as Handler)({
      ...GUEST_REQ,
      data: { promotionId: "promo-1" },
    })) as { ok: boolean; code: string; duplicate?: boolean };
    expect(retry.ok).toBe(true);
    expect(retry.code).toBe(first.code);
    expect(retry.duplicate).toBe(true);
    expect(fakes.rewards["guest-9"].points).toBe(150);
    expect(fakes.rewardTx).toHaveLength(1);
  });

  it("replays legacy random-id redemptions without charging again", async () => {
    fakes.redemptions["legacy-random-id"] = {
      uid: "guest-9",
      promotionId: "promo-1",
      code: "RDM-OLD-1111",
      status: "active",
      pointsSpent: 50,
    };
    const res = (await (redeemPoints as unknown as Handler)({
      ...GUEST_REQ,
      data: { promotionId: "promo-1" },
    })) as { ok: boolean; code: string; duplicate?: boolean };
    expect(res.code).toBe("RDM-OLD-1111");
    expect(res.duplicate).toBe(true);
    expect(fakes.rewards["guest-9"].points).toBe(200);
  });

  it("fails closed on insufficient balance", async () => {
    fakes.rewards = { "guest-9": { uid: "guest-9", points: 10 } };
    await expect(
      (redeemPoints as unknown as Handler)({ ...GUEST_REQ, data: { promotionId: "promo-1" } }),
    ).rejects.toThrowError(expect.objectContaining({ code: "failed-precondition" }));
  });
});
