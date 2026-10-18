import { describe, expect, it } from "vitest";
import {
  businessCategoryForPlace,
  isBusinessCategory,
  listingToPlace,
  placeCategoryFor,
  type BusinessListing,
} from "./business";

function listing(overrides: Partial<BusinessListing> = {}): BusinessListing {
  return {
    id: "biz-1",
    placeId: "place-1",
    name: "Test Cafe",
    category: "coffee",
    placeCategory: "coffee",
    address: "1 Test St",
    geo: { lat: -33.86, lng: 151.2 },
    hours: "9-5",
    shortWhy: "Great coffee",
    status: "active",
    precinctId: "the-rocks",
    ...overrides,
  };
}

describe("placeCategoryFor", () => {
  it("maps a 1:1 category id to its place shelf", () => {
    expect(placeCategoryFor("coffee")).toBe("coffee");
    expect(placeCategoryFor("stay")).toBe("stay");
  });

  it("maps grouped ids to their shared place shelf", () => {
    expect(placeCategoryFor("bar")).toBe("eat");
    expect(placeCategoryFor("club")).toBe("eat");
    expect(placeCategoryFor("fashion")).toBe("shops");
  });

  it("falls back to eat for unknown ids", () => {
    expect(placeCategoryFor("nope")).toBe("eat");
    expect(placeCategoryFor("")).toBe("eat");
  });
});

describe("businessCategoryForPlace", () => {
  it("reverse-maps a place shelf to a listing category", () => {
    expect(businessCategoryForPlace("stay")).toBe("stay");
    expect(businessCategoryForPlace("coffee")).toBe("coffee");
  });

  it("picks the first listing category shelving a shared place", () => {
    // eat, bar and club all shelve under "eat"; eat is listed first.
    expect(businessCategoryForPlace("eat")).toBe("eat");
  });

  it("falls back to things for unknown shelves", () => {
    expect(businessCategoryForPlace("nope")).toBe("things");
  });
});

describe("isBusinessCategory", () => {
  it("accepts known category ids", () => {
    expect(isBusinessCategory("eat")).toBe(true);
    expect(isBusinessCategory("wellness")).toBe(true);
  });

  it("rejects place shelves and unknown ids", () => {
    expect(isBusinessCategory("nope")).toBe(false);
    expect(isBusinessCategory("")).toBe(false);
  });
});

describe("listingToPlace", () => {
  it("carries identity, deal and contact fields across", () => {
    const place = listingToPlace(
      listing({
        deal: { badge: "10% off", detail: "Show pass" },
        handle: "testcafe",
        phone: "0400",
      }),
    );
    expect(place.id).toBe("place-1");
    expect(place.name).toBe("Test Cafe");
    expect(place.source).toBe("partner");
    expect(place.deal).toEqual({ badge: "10% off", detail: "Show pass" });
    expect(place.handle).toBe("testcafe");
    expect(place.phone).toBe("0400");
  });

  it("maps active status through and inactive anything-else", () => {
    expect(listingToPlace(listing({ status: "active" })).status).toBe("active");
    expect(listingToPlace(listing({ status: "inactive" })).status).toBe("inactive");
  });

  it("marks featured/partner plans and verified owners as partners", () => {
    expect(listingToPlace(listing({ plan: "featured" })).verifiedPartner).toBe(true);
    expect(listingToPlace(listing({ plan: "partner" })).verifiedPartner).toBe(true);
    expect(listingToPlace(listing({ verifiedOwner: true })).verifiedPartner).toBe(true);
    expect(listingToPlace(listing({ plan: "presence" })).verifiedPartner).toBe(false);
  });

  it("falls back to updatedAt when hours were never verified", () => {
    expect(listingToPlace(listing({ updatedAt: "2026-01-01" })).hoursVerifiedAt).toBe("2026-01-01");
    expect(listingToPlace(listing({ hoursVerifiedAt: "2026-02-01", updatedAt: "2026-01-01" })).hoursVerifiedAt).toBe(
      "2026-02-01",
    );
  });
});
