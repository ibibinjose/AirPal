import { describe, expect, it } from "vitest";
import { haversineMeters, mapsUrl, walkLabel } from "./geo";

describe("haversineMeters", () => {
  it("returns ~0 for the same point", () => {
    expect(haversineMeters({ lat: -33.86, lng: 151.2 }, { lat: -33.86, lng: 151.2 })).toBeCloseTo(0, 6);
  });

  it("measures Sydney to Melbourne at roughly 713km", () => {
    const meters = haversineMeters({ lat: -33.8688, lng: 151.2093 }, { lat: -37.8136, lng: 144.9631 });
    expect(meters).toBeGreaterThan(700_000);
    expect(meters).toBeLessThan(730_000);
  });

  it("is symmetric", () => {
    const a = { lat: -33.86, lng: 151.2 };
    const b = { lat: -33.87, lng: 151.21 };
    expect(haversineMeters(a, b)).toBeCloseTo(haversineMeters(b, a), 6);
  });
});

describe("walkLabel", () => {
  it("floors at 1 min for very short distances", () => {
    expect(walkLabel(0)).toBe("1 min");
    expect(walkLabel(10)).toBe("1 min");
  });

  it("converts distance at ~80m per minute", () => {
    expect(walkLabel(160)).toBe("2 min");
    expect(walkLabel(800)).toBe("10 min");
  });

  it("switches to hours past an hour", () => {
    expect(walkLabel(5000)).toBe("1 h");
    expect(walkLabel(9600)).toBe("2 h");
  });
});

describe("mapsUrl", () => {
  it("links by place name when given", () => {
    expect(mapsUrl({ lat: 0, lng: 0 }, "The Rocks")).toBe("https://maps.google.com/?q=The%20Rocks");
  });

  it("links by lat,lng when no name is given", () => {
    expect(mapsUrl({ lat: -33.86, lng: 151.2 })).toBe("https://maps.google.com/?q=-33.86,151.2");
  });
});
