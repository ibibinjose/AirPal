import type { BioProfile, BioVisibility } from "@shared/bio";

export type ProfileViewer = {
  uid?: string;
  email?: string;
  handle?: string;
} | null;

export function isProfileOwner(
  viewer: ProfileViewer,
  bio: Pick<BioProfile, "ownerUid" | "ownerEmail" | "handle">,
): boolean {
  if (!viewer) return false;
  const viewerHandle = viewer.handle?.trim().toLowerCase().replace(/^@/, "");
  return Boolean(
    (viewer.uid && bio.ownerUid === viewer.uid) ||
    (viewer.email && bio.ownerEmail === viewer.email) ||
    (viewerHandle && viewerHandle === bio.handle.trim().toLowerCase()),
  );
}

export type ProfileSocial = {
  isFollowing: (handle: string) => boolean;
  isFollower: (handle: string) => boolean;
};

/**
 * Who can see a profile. The owner always can; business storefronts stay
 * public. Person profiles default to friends-only (connected either way);
 * private hides from everyone but the owner.
 */
export function canViewProfile(
  viewer: ProfileViewer,
  bio: Pick<BioProfile, "kind" | "visibility" | "ownerUid" | "ownerEmail" | "handle">,
  social: ProfileSocial,
): boolean {
  if (isProfileOwner(viewer, bio)) return true;
  if (bio.kind === "business") return true;
  const visibility: BioVisibility = bio.visibility ?? "friends";
  if (visibility === "public") return true;
  if (!viewer) return false;
  if (visibility === "private") return false;
  return social.isFollowing(bio.handle) || social.isFollower(bio.handle);
}
