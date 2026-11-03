import { describe, expect, it } from "vitest";
import { REFERRAL_POINTS } from "@shared/promotions";
import { memberStanding, perJoinPointsLabel, PER_JOIN_POINTS } from "./member-standing";

describe("member standing", () => {
  it("uses the rewards ledger for points and circleLevel for rank", () => {
    const standing = memberStanding({
      points: 0,
      hasHandle: true,
      sharingCity: true,
      invited: false,
      memberCount: 2,
    });
    expect(standing.points).toBe(0);
    expect(standing.quest.points).toBe(60);
    expect(standing.level).toEqual({ rank: 3, name: "Connector" });
    expect(standing.perJoin).toBe(REFERRAL_POINTS);
    expect(PER_JOIN_POINTS).toBe(5);
    expect(perJoinPointsLabel()).toBe("+5 points when someone joins with your link.");
  });
});
