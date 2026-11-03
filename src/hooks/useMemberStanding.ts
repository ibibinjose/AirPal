import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useBio } from "@/contexts/BioContext";
import { useSocial } from "@/contexts/SocialContext";
import { hasMarkedCircleInvite } from "@/lib/circle";
import { listPeople } from "@/lib/people";
import { memberStanding } from "@/lib/member-standing";
import { subscribeRewardBalance } from "@/lib/rewards";

function countCircleMembers(sets: {
  followed: Set<string>;
  followers: Set<string>;
  liked: Set<string>;
  likedBy: Set<string>;
}): number {
  const ids = new Set<string>();
  for (const set of [sets.followed, sets.followers, sets.liked, sets.likedBy]) {
    set.forEach((handle) => {
      const h = handle.trim().toLowerCase();
      if (h) ids.add(h);
    });
  }
  for (const person of listPeople()) {
    const h = (person.handle || person.id || "").trim().toLowerCase();
    if (h) ids.add(h);
  }
  return ids.size;
}

/** Ledger points, connector level, and the per-join amount for /rewards and /circle. */
export function useMemberStanding(invitedOverride?: boolean) {
  const { user, authReady } = useAuth();
  const { mine } = useBio();
  const { followedHandles, followerHandles, likedHandles, likedByHandles } = useSocial();
  const [points, setPoints] = useState(0);
  const [pointsLoading, setPointsLoading] = useState(true);

  useEffect(() => {
    if (!authReady) return;
    setPointsLoading(true);
    return subscribeRewardBalance((balance) => {
      setPoints(balance.points);
      setPointsLoading(false);
    });
  }, [authReady, user?.uid]);

  const invited = invitedOverride ?? hasMarkedCircleInvite();
  const memberCount = useMemo(
    () =>
      countCircleMembers({
        followed: followedHandles,
        followers: followerHandles,
        liked: likedHandles,
        likedBy: likedByHandles,
      }),
    [followedHandles, followerHandles, likedHandles, likedByHandles],
  );

  const standing = useMemo(
    () =>
      memberStanding({
        points,
        hasHandle: Boolean(mine?.handle),
        sharingCity: Boolean(mine?.city),
        invited,
        memberCount,
      }),
    [points, mine?.handle, mine?.city, invited, memberCount],
  );

  return { ...standing, pointsLoading, signedIn: Boolean(user) };
}
