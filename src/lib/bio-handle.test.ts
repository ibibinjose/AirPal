import { describe, expect, it } from "vitest";
import { handleFromPlaceId, isClaimableBioProfile, type BioProfile } from "../../shared/bio";
import { hrefForPlace, hrefForStall, placeAsBio, resolvePublicBio, stallAsBio } from "./bio-handle";
import { listingDefaults, upsertCachedListing } from "./listings";
import { canViewProfile } from "./profile-stats";
import type { StallRecord } from "../../shared/event";

const SALTED_CARAMEL_STALL: StallRecord = {
  id: "st-salt",
  eventId: "evt-rocks-market",
  name: "Salted Caramel Co",
  category: "eat",
  booth: "A12",
  shortWhy: "Handmade caramels.",
  offer: "2 for $10",
  handle: "saltedcaramel",
  status: "active",
};

describe("bio handle joins", () => {
  it("opens a place on its @handle", () => {
    expect(handleFromPlaceId("fortune-of-war")).toBe("fortuneofwar");
    expect(hrefForPlace({ id: "fortune-of-war" })).toBe("/@fortuneofwar");
    expect(hrefForPlace({ id: "cut-bar-grill", handle: "cutbar" })).toBe("/@cutbar");
  });

  it("opens a stall on its @handle", () => {
    const stall = SALTED_CARAMEL_STALL;
    expect(hrefForStall(stall)).toBe("/@saltedcaramel");
    expect(hrefForStall({ id: "st-x", eventId: "evt-1" })).toBe("/e/evt-1/s/st-x");
  });

  it("builds a claimable stall bio", () => {
    const stall = SALTED_CARAMEL_STALL;
    const bio = stallAsBio(stall, "saltedcaramel");
    expect(bio.id).toBe("stall-st-salt");
    expect(bio.deals[0]?.title).toBe("2 for $10");
    expect(bio.eventId).toBe(stall.eventId);
  });

  it("marks synthetic place and stall bios as public businesses", () => {
    const placeBio = placeAsBio(
      {
        id: "pl-5pi1fc5j",
        name: "AirPal QA Test Venue",
        category: "eat",
        shortWhy: "QA venue",
        geo: { lat: 1, lng: 2 },
        source: "partner",
        status: "active",
        precinctId: "sydney",
      },
      "pl5pi1fc5j",
    );
    expect(placeBio.kind).toBe("business");
    expect(placeBio.visibility).toBe("public");
    const stallBio = stallAsBio(SALTED_CARAMEL_STALL, "saltedcaramel");
    expect(stallBio.kind).toBe("business");
    expect(stallBio.visibility).toBe("public");
  });

  it("shows synthetic venue bios to signed-out viewers and strangers", () => {
    const noSocial = { isFollowing: () => false, isFollower: () => false };
    const placeBio = placeAsBio(
      {
        id: "pl-5pi1fc5j",
        name: "AirPal QA Test Venue",
        category: "eat",
        shortWhy: "QA venue",
        geo: { lat: 1, lng: 2 },
        source: "partner",
        status: "active",
        precinctId: "sydney",
      },
      "pl5pi1fc5j",
    );
    expect(canViewProfile(null, placeBio, noSocial)).toBe(true);
    expect(canViewProfile({ uid: "stranger", email: "s@example.com", handle: "stranger" }, placeBio, noSocial)).toBe(
      true,
    );
  });

  it("resolves an owned listing with the owner attached and no claim banner", () => {
    upsertCachedListing(
      listingDefaults({
        id: "list-9pi1test",
        name: "Claim Test Venue",
        category: "eat",
        placeCategory: "eat",
        address: "1 Test St\nSydney NSW 2000\nAustralia",
        shortWhy: "Claim test",
        ownerUid: "u123",
        ownerEmail: "owner@example.com",
      }),
    );
    const bio = resolvePublicBio("pl9pi1test", () => undefined) as BioProfile;
    expect(bio.kind).toBe("business");
    expect(bio.ownerUid).toBe("u123");
    expect(isClaimableBioProfile(bio, false)).toBe(false);
  });

  it("copies maps and phone onto a place bio", () => {
    const bio = placeAsBio(
      {
        id: "fortune-of-war",
        name: "Fortune of War",
        category: "eat",
        shortWhy: "Oldest pub",
        geo: { lat: 1, lng: 2 },
        hours: "10am–late",
        source: "seed",
        status: "active",
        precinctId: "the-rocks",
        phone: "+61 2 0000",
        mapsPlaceId: "ChIJtest",
        deal: { badge: "Taste", detail: "With a meal." },
      },
      "fortuneofwar",
    );
    expect(bio.mapsPlaceId).toBe("ChIJtest");
    expect(bio.phone).toBe("+61 2 0000");
    expect(bio.deals[0]?.title).toBe("Taste");
    expect(bio.aboutText).toBeUndefined();
  });

  it("overlays owned listing hours and description onto public bio", () => {
    upsertCachedListing(
      listingDefaults({
        id: "list-venue2",
        placeId: "pl-venue2",
        name: "AirPal QA Test Host",
        category: "eat",
        placeCategory: "eat",
        address: "20 Test Lane\nSydney NSW 2000\nAustralia",
        shortWhy: "Second test venue",
        description: "Venue 2 unique about text",
        hours: "9am–5pm",
        handle: "airpalqatest",
        ownerUid: "u-qa",
        ownerEmail: "info@sarvamdaily.com",
      }),
    );
    const resolved = resolvePublicBio("airpalqatest", () => ({
      id: "bio-venue2",
      handle: "airpalqatest",
      name: "Old Name",
      kind: "business",
      visibility: "public",
      city: "Sydney",
      category: "eat",
      shortWhy: "Old why",
      aboutText: "Old description",
      hours: "9am–9pm",
      openNow: true,
      deals: [],
      products: [],
      services: [],
      links: [],
      listingId: "list-venue2",
    })) as BioProfile;

    expect(resolved.name).toBe("AirPal QA Test Host");
    expect(resolved.aboutText).toBe("Venue 2 unique about text");
    expect(resolved.hours).toBe("9am–5pm");
  });
});
