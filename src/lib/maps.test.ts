import { describe, expect, it } from "vitest";
import {
  appleMapsDirectionsUrl,
  calculateHaversineDistanceMeters,
  estimateWalkingMinutes,
  formatDistance,
  formatWalkingTime,
  getDualNavigationUrls,
  googleMapsDirectionsUrl,
  mapsPlaceUrl,
  mapsSearchUrl,
  normalizeMapsKey,
} from "./maps";

describe("normalizeMapsKey", () => {
  const valid = `AIzaSy${"A".repeat(33)}`;

  it("trims whitespace", () => {
    expect(normalizeMapsKey(`  ${valid}  `)).toBe(valid);
  });

  it("strips a doubled leading A on a 40-character AIza key", () => {
    expect(valid).toHaveLength(39);
    expect(normalizeMapsKey(`A${valid}`)).toBe(valid);
  });

  it("leaves already-valid keys unchanged", () => {
    expect(normalizeMapsKey(valid)).toBe(valid);
  });

  it("returns empty for missing values", () => {
    expect(normalizeMapsKey(undefined)).toBe("");
    expect(normalizeMapsKey("")).toBe("");
  });
});

describe("maps URLs", () => {
  it("builds a search URL with coordinates", () => {
    expect(mapsSearchUrl("cafe", { lat: -33.86, lng: 151.21 })).toContain("cafe%40-33.86%2C151.21");
  });

  it("builds a place URL from a name and geo", () => {
    expect(mapsPlaceUrl({ lat: -33.86, lng: 151.21 }, "Harbour")).toContain("Harbour");
  });

  it("builds Apple Maps directions URLs with driving and walking modes", () => {
    const geo = { lat: -33.899, lng: 151.175 };
    const driveUrl = appleMapsDirectionsUrl({ destination: geo, destinationName: "Enmore Theatre", mode: "driving" });
    expect(driveUrl).toContain("maps.apple.com");
    expect(driveUrl).toContain("dirflg=d");
    expect(driveUrl).toContain("Enmore%20Theatre");

    const walkUrl = appleMapsDirectionsUrl({ destination: geo, mode: "walking" });
    expect(walkUrl).toContain("dirflg=w");
  });

  it("builds Google Maps directions URLs with travel modes", () => {
    const geo = { lat: -33.899, lng: 151.175 };
    const url = googleMapsDirectionsUrl({ destination: geo, destinationName: "Enmore Theatre", mode: "walking" });
    expect(url).toContain("google.com/maps/dir");
    expect(url).toContain("travelmode=walking");
    expect(url).toContain("Enmore%20Theatre");
  });

  it("provides dual navigation links with platform awareness", () => {
    const geo = { lat: -33.8568, lng: 151.2153 };
    const dual = getDualNavigationUrls({ destination: geo, destinationName: "Sydney Opera House" });
    expect(dual.apple).toContain("maps.apple.com");
    expect(dual.google).toContain("google.com/maps/dir");
    expect(["apple", "google"]).toContain(dual.primary);
  });
});

describe("walking & distance calculations", () => {
  it("calculates haversine distance between two coordinates", () => {
    // Distance between Circular Quay (-33.861, 151.210) and Sydney Opera House (-33.8568, 151.2153) ~ 650m
    const dist = calculateHaversineDistanceMeters({ lat: -33.861, lng: 151.21 }, { lat: -33.8568, lng: 151.2153 });
    expect(dist).toBeGreaterThan(500);
    expect(dist).toBeLessThan(800);
  });

  it("estimates walking time based on urban walking pace", () => {
    expect(estimateWalkingMinutes(0)).toBe(0);
    expect(estimateWalkingMinutes(160)).toBe(2);
    expect(estimateWalkingMinutes(400)).toBe(5);
  });

  it("formats distances cleanly", () => {
    expect(formatDistance(350)).toBe("350m");
    expect(formatDistance(1200)).toBe("1.2km");
  });

  it("formats walking time in Possie last-mile style", () => {
    expect(formatWalkingTime(20)).toBe("< 1 min walk");
    expect(formatWalkingTime(240)).toBe("3 min walk (240m)");
  });
});
