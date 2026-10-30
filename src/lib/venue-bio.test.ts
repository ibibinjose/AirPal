import { describe, expect, it } from "vitest";
import { listingDefaults } from "./listings";
import { shouldKeepBusinessBio, venueBioHandle, venueBioInput } from "./venue-bio";

function qaListing() {
  return listingDefaults({
    id: "list-5pi1fc5j",
    name: "AirPal QA Test Venue",
    category: "eat",
    placeCategory: "eat",
    address: "1 Test St\nSydney NSW 2000\nAustralia",
    shortWhy: "QA venue",
    description: "Waterfront dining with live music.",
    ownerUid: "u123",
    ownerEmail: "owner@example.com",
  });
}

describe("venue bio one-click input", () => {
  it("derives the public handle from the place id", () => {
    expect(venueBioHandle(qaListing())).toBe("pl5pi1fc5j");
  });

  it("prefers an explicitly stored listing handle", () => {
    expect(venueBioHandle({ ...qaListing(), handle: "qavenue" })).toBe("qavenue");
  });

  it("carries the real listing and place ids", () => {
    const input = venueBioInput(qaListing());
    expect(input?.listingId).toBe("list-5pi1fc5j");
    expect(input?.placeId).toBe("pl-5pi1fc5j");
    expect(input?.kind).toBe("business");
    expect(input?.city).toBe("Sydney");
  });

  it("carries the listing description as the bio about text", () => {
    expect(venueBioInput(qaListing())?.aboutText).toBe("Waterfront dining with live music.");
    expect(venueBioInput({ ...qaListing(), description: undefined })?.aboutText).toBeUndefined();
  });

  it("returns null when no handle can be derived", () => {
    const listing = { ...qaListing(), placeId: "!!" };
    expect(venueBioInput(listing)).toBeNull();
  });

  it("carries the listing trading hours for the venue bio header", () => {
    expect(venueBioInput({ ...qaListing(), hours: "Mon–Sun · 9am–5pm" })?.hours).toBe("Mon–Sun · 9am–5pm");
  });
});

describe("shouldKeepBusinessBio", () => {
  const venueOne = { listingId: "list-aaa" };

  it("starts fresh when there is no existing business bio", () => {
    expect(shouldKeepBusinessBio(null, "list-bbb")).toBe(false);
  });

  it("keeps inheriting for legacy edits with no listing context", () => {
    expect(shouldKeepBusinessBio(venueOne, undefined)).toBe(true);
  });

  it("keeps inheriting when re-saving the same venue", () => {
    expect(shouldKeepBusinessBio(venueOne, "list-aaa")).toBe(true);
  });

  it("starts fresh for a second venue so venue 1 data never copies over", () => {
    expect(shouldKeepBusinessBio(venueOne, "list-bbb")).toBe(false);
    expect(shouldKeepBusinessBio({ listingId: null }, "list-bbb")).toBe(false);
  });
});
