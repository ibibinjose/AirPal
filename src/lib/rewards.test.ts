import { describe, expect, it } from "vitest";
import { rewardReasonLabel, sortTransactionsNewestFirst, type RewardTransaction } from "./rewards";

function tx(id: string, at: string | undefined, delta: number): RewardTransaction {
  return { id, delta, reason: "referral_bonus", at };
}

describe("sortTransactionsNewestFirst", () => {
  it("orders newest first and keeps untimestamped rows last", () => {
    const rows = [tx("a", "2026-01-01T00:00:00Z", 5), tx("b", undefined, 5), tx("c", "2026-06-01T00:00:00Z", -10)];
    expect(sortTransactionsNewestFirst(rows).map((r) => r.id)).toEqual(["c", "a", "b"]);
  });

  it("does not mutate the input", () => {
    const rows = [tx("a", "2026-01-01T00:00:00Z", 5)];
    sortTransactionsNewestFirst(rows);
    expect(rows.map((r) => r.id)).toEqual(["a"]);
  });
});

describe("rewardReasonLabel", () => {
  it("labels known ledger reasons", () => {
    expect(rewardReasonLabel("referral_bonus")).toBe("Mate joined with your link");
    expect(rewardReasonLabel("points_redeemed")).toBe("Reward redeemed");
    expect(rewardReasonLabel("event_check_in")).toBe("Checked in at the door");
    expect(rewardReasonLabel("deal_redeemed")).toBe("Deal redeemed in-store");
    expect(rewardReasonLabel("giveaway_entry")).toBe("Giveaway entry");
  });

  it("falls through unknown codes unchanged instead of hiding them", () => {
    expect(rewardReasonLabel("mystery_bonus")).toBe("mystery_bonus");
  });
});
