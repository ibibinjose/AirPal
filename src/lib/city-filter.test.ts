import { describe, expect, it } from "vitest";
import { businessCategoryForPlace } from "@shared/business";
import { THE_ROCKS_PLACES } from "@shared/the-rocks-data";
import { placesAround, placesInCity, toursForPrecinct } from "./catalog";

const ROCKS = { lat: -33.85945, lng: 151.20835 };
const MELB = { lat: -37.8136, lng: 144.9631 };
const ASHFIELD = { lat: -33.8889, lng: 151.1256 };

const rows = [
  { id: "rox-cafe", precinctId: "the-rocks", geo: ROCKS },
  { id: "local-shop", precinctId: "local", geo: ROCKS },
  { id: "melb-lane", precinctId: "melbourne-cbd", geo: MELB },
  { id: "no-geo", precinctId: "melbourne-cbd" },
];

const tours = [
  { id: "t1", city: "Sydney" },
  { id: "t2", city: "Melbourne" },
] as Parameters<typeof toursForPrecinct>[1];

describe("city-strict catalog", () => {
  it("does not treat Ashfield GPS as The Rocks catalogue", () => {
    expect(placesAround(rows, ASHFIELD).map((r) => r.id)).toEqual([]);
    expect(
      placesAround(rows, ROCKS)
        .map((r) => r.id)
        .sort(),
    ).toEqual(["local-shop", "rox-cafe"]);
  });

  it("shows Sydney stock for Sydney", () => {
    expect(
      placesInCity(rows, "Sydney")
        .map((r) => r.id)
        .sort(),
    ).toEqual(["local-shop", "rox-cafe"]);
    // No city, no default stock: honest empty instead of another city's dump.
    expect(placesInCity(rows, undefined)).toEqual([]);
  });

  it("shows only places near the chosen city, never The Rocks", () => {
    expect(placesInCity(rows, "Melbourne").map((r) => r.id)).toEqual(["melb-lane"]);
    expect(placesInCity(rows, "Perth")).toEqual([]);
  });

  it("resolves a second-city corpus under its own city with a real photo", () => {
    const melb = [
      { id: "flinders-market", precinctId: "melbourne-cbd", category: "shops", geo: MELB },
      {
        id: "laneway-ramen",
        precinctId: "melbourne-cbd",
        category: "eat",
        geo: { lat: -37.814, lng: 144.9633 },
        heroImage: "https://upload.wikimedia.org/wikipedia/commons/1/2.jpg",
      },
      {
        id: "yarra-stay",
        precinctId: "melbourne-cbd",
        category: "stay",
        geo: { lat: -37.8136, lng: 144.9631 },
        heroImage: "https://upload.wikimedia.org/wikipedia/commons/3/4.jpg",
      },
      { id: "gallery-late", precinctId: "melbourne-cbd", category: "things", geo: MELB },
    ];
    expect(
      placesInCity(melb, "Melbourne")
        .map((p) => p.id)
        .sort(),
    ).toEqual(["flinders-market", "gallery-late", "laneway-ramen", "yarra-stay"]);
    const cats = new Set(placesInCity(melb, "Melbourne").map((p) => p.category));
    expect([...cats].sort()).toEqual(["eat", "shops", "stay", "things"]);
    expect(placesInCity(melb, "Sydney")).toEqual([]);
    // Every photo must be a verified Commons file — no guessed URLs. Venues
    // with no verified photo yet render clean ink cards instead.
    for (const p of melb) {
      const img = (p as { heroImage?: string }).heroImage;
      if (img === undefined) {
        expect(img, p.id).toBeUndefined();
      } else {
        expect(img, p.id).toMatch(/^https:\/\/upload\.wikimedia\.org\//);
      }
    }
  });

  it("keeps Rocks stock out of Melbourne's Host picks pool", () => {
    const melb = [{ id: "melb-lighthouse", precinctId: "melbourne-cbd", geo: MELB }];
    const ids = placesInCity([...THE_ROCKS_PLACES, ...melb], "Melbourne").map((p) => p.id);
    expect(ids).toContain("melb-lighthouse");
    expect(ids.some((id) => THE_ROCKS_PLACES.some((r) => r.id === id))).toBe(false);
  });

  it("shelves seed places under matching listing categories", () => {
    expect(businessCategoryForPlace("stay")).toBe("stay");
    expect(businessCategoryForPlace("eat")).toBe("eat");
    expect(businessCategoryForPlace("shops")).toBe("shops");
    expect(businessCategoryForPlace("things")).toBe("things");
    expect(businessCategoryForPlace("nope")).toBe("things");
  });

  it("returns only matching walks, or [] for cities with none", () => {
    expect(toursForPrecinct("Melbourne", tours).map((t) => t.id)).toEqual(["t2"]);
    expect(toursForPrecinct("Perth", tours)).toEqual([]);
    expect(toursForPrecinct("", tours)).toHaveLength(2);
  });
});
