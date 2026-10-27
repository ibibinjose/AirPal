import { describe, expect, it } from "vitest";
import type { BioProfile } from "@shared/bio";
import { canViewProfile, isProfileOwner } from "./profile-stats";

function makeBio(overrides: Partial<BioProfile> = {}): BioProfile {
  return {
    id: "bio-1",
    handle: "alex",
    name: "Alex",
    shortWhy: "Coffee lover",
    city: "Sydney",
    category: "eat",
    hours: "9am-5pm",
    openNow: true,
    products: [],
    services: [],
    deals: [],
    links: [],
    ...overrides,
  } as BioProfile;
}

describe("isProfileOwner", () => {
  const bio = makeBio({ ownerUid: "u1", ownerEmail: "alex@example.com" });

  it("matches by uid, email, or handle", () => {
    expect(isProfileOwner({ uid: "u1" }, bio)).toBe(true);
    expect(isProfileOwner({ email: "alex@example.com" }, bio)).toBe(true);
    expect(isProfileOwner({ handle: "@alex" }, bio)).toBe(true);
    expect(isProfileOwner({ uid: "u2" }, bio)).toBe(false);
    expect(isProfileOwner(null, bio)).toBe(false);
  });
});

describe("canViewProfile", () => {
  const social = { isFollowing: () => false, isFollower: () => false };
  const connected = { isFollowing: () => true, isFollower: () => false };
  const followedBy = { isFollowing: () => false, isFollower: () => true };

  it("lets the owner always see, even when private", () => {
    const bio = makeBio({ kind: "person", visibility: "private", ownerUid: "u1" });
    expect(canViewProfile({ uid: "u1" }, bio, social)).toBe(true);
  });

  it("keeps business storefronts public", () => {
    const bio = makeBio({ kind: "business", visibility: "private" });
    expect(canViewProfile(null, bio, social)).toBe(true);
  });

  it("keeps business storefronts public when visibility was never set", () => {
    const bio = makeBio({ kind: "business", visibility: undefined });
    expect(canViewProfile(null, bio, social)).toBe(true);
    expect(canViewProfile({ uid: "stranger" }, bio, social)).toBe(true);
  });

  it("recognises the venue owner by email or handle when the uid is missing", () => {
    const bio = makeBio({ kind: "business", ownerEmail: "owner@example.com" });
    expect(canViewProfile({ email: "owner@example.com" }, bio, social)).toBe(true);
    expect(canViewProfile({ handle: "@alex" }, bio, social)).toBe(true);
    expect(canViewProfile({ uid: "stranger" }, bio, social)).toBe(true);
  });

  it("opens public person profiles to signed-out guests", () => {
    const bio = makeBio({ kind: "person", visibility: "public" });
    expect(canViewProfile(null, bio, social)).toBe(true);
  });

  it("hides private person profiles from everyone but the owner", () => {
    const bio = makeBio({ kind: "person", visibility: "private" });
    expect(canViewProfile({ uid: "u2" }, bio, connected)).toBe(false);
    expect(canViewProfile(null, bio, social)).toBe(false);
  });

  it("defaults person profiles to friends-only for connected viewers", () => {
    const bio = makeBio({ kind: "person" });
    expect(canViewProfile(null, bio, social)).toBe(false);
    expect(canViewProfile({ uid: "u2" }, bio, social)).toBe(false);
    expect(canViewProfile({ uid: "u2" }, bio, connected)).toBe(true);
    expect(canViewProfile({ uid: "u2" }, bio, followedBy)).toBe(true);
  });
});
