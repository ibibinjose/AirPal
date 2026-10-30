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
      rewards: {} as Record<string, Record<string, unknown>>,
      grants: {} as Record<string, Record<string, unknown>>,
      rewardTx: [] as Record<string, unknown>[],
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
  db: {
    collection: (name: string) => {
      if (name === "rewards") return { doc: (id: string) => docRef(fakes.rewards, id) };
      if (name === "reward_grants") return { doc: (id: string) => docRef(fakes.grants, id) };
      if (name === "reward_transactions") {
        return {
          add: async (data: Record<string, unknown>) => {
            const id = `tx-${fakes.rewardTx.length}`;
            fakes.rewardTx.push({ id, ...data });
            return { id };
          },
        };
      }
      throw new Error(`unexpected collection ${name}`);
    },
    runTransaction: async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        get: (ref: { get: () => Promise<unknown> }) => ref.get(),
        set: (ref: { set: (d: unknown, o?: unknown) => unknown }, data: unknown, opts?: unknown) => {
          void ref.set(data, opts);
        },
      };
      return fn(tx);
    },
  },
}));

vi.mock("firebase-functions/v2/https", () => ({
  HttpsError: FakeHttpsError,
  onCall: vi.fn((_opts: unknown, handler: unknown) => handler),
}));

import { grantPoints } from "./rewards";

describe("grantPoints idempotency", () => {
  beforeEach(() => {
    fakes.rewards = {};
    fakes.grants = {};
    fakes.rewardTx = [];
  });

  it("mints once, then replays duplicates without double-minting", async () => {
    const first = await grantPoints("guest-9", 10, "event_check_in", "bk-1");
    expect(first).toEqual({ duplicate: false });
    expect(fakes.rewards["guest-9"]).toMatchObject({ uid: "guest-9", points: 10 });
    expect(fakes.rewardTx).toHaveLength(1);

    const second = await grantPoints("guest-9", 10, "event_check_in", "bk-1");
    expect(second).toEqual({ duplicate: true });
    expect(fakes.rewards["guest-9"]).toMatchObject({ points: 10 });
    expect(fakes.rewardTx).toHaveLength(1);
  });

  it("treats a different refId as a separate earn", async () => {
    await grantPoints("guest-9", 10, "event_check_in", "bk-1");
    const other = await grantPoints("guest-9", 10, "event_check_in", "bk-2");
    expect(other).toEqual({ duplicate: false });
    expect(fakes.rewards["guest-9"]).toMatchObject({ points: 20 });
  });

  it("accumulates across reasons for the same member", async () => {
    await grantPoints("guest-9", 10, "event_check_in", "bk-1");
    await grantPoints("guest-9", 5, "deal_redeemed", "TEA-1234");
    expect(fakes.rewards["guest-9"]).toMatchObject({ points: 15 });
    expect(fakes.rewardTx).toHaveLength(2);
  });

  it("no-ops on missing uid or zero delta", async () => {
    expect(await grantPoints("", 10, "event_check_in", "bk-1")).toEqual({ duplicate: false });
    expect(await grantPoints("guest-9", 0, "event_check_in", "bk-1")).toEqual({ duplicate: false });
    expect(fakes.rewards["guest-9"]).toBeUndefined();
    expect(fakes.rewardTx).toHaveLength(0);
  });
});
