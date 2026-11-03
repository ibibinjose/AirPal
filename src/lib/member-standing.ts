import { REFERRAL_POINTS } from "@shared/promotions";
import { circleQuestProgress } from "./circle";

/**
 * Spendable points and the per-join grant.
 *
 * Canonical points are the `rewards/{uid}` ledger written by `grantPoints`.
 * Circle quest totals (20/20/25/20) are a local checklist and are not granted,
 * which is why Circle could show 60 pts while Rewards showed 0.
 *
 * Canonical per-join amount is `REFERRAL_POINTS` (5). Cloud Functions grant
 * that when someone joins with a referral link. The invite quest's 25 is only
 * a local score for copying a link, so it is not the join amount.
 *
 * Level stays `circleLevel()` — the only connector rank function.
 */
export const PER_JOIN_POINTS = REFERRAL_POINTS;

export function perJoinPointsLabel(): string {
  return `+${PER_JOIN_POINTS} points when someone joins with your link.`;
}

export function memberStanding(input: {
  points: number;
  hasHandle: boolean;
  sharingCity: boolean;
  invited: boolean;
  memberCount: number;
}) {
  const quest = circleQuestProgress({
    hasHandle: input.hasHandle,
    sharingCity: input.sharingCity,
    invited: input.invited,
    memberCount: input.memberCount,
  });
  return {
    points: Math.max(0, Math.floor(Number.isFinite(input.points) ? input.points : 0)),
    level: quest.level,
    quest,
    perJoin: PER_JOIN_POINTS,
  };
}
