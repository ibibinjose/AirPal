import { describe, expect, it } from "vitest";
import {
  getNearbyArrivalPoints,
  getVenueArrivalOverview,
  resolvePrecinctGeo,
  SYDNEY_PRECINCT_ARRIVAL_HUBS,
} from "./arrival";

describe("arrival points and last-mile ranking", () => {
  it("includes curated Sydney precinct arrival hubs", () => {
    expect(SYDNEY_PRECINCT_ARRIVAL_HUBS.length).toBeGreaterThanOrEqual(10);
    const parkingHubs = SYDNEY_PRECINCT_ARRIVAL_HUBS.filter((h) => h.type === "parking");
    expect(parkingHubs.length).toBeGreaterThan(0);
  });

  it("ranks nearest parking by walking time for Enmore Theatre", () => {
    // Enmore Theatre coords: ~ -33.8992, 151.1744
    const enmoreGeo = { lat: -33.8992, lng: 151.1744 };
    const points = getNearbyArrivalPoints(enmoreGeo, { max: 3, filterType: "parking" });

    expect(points.length).toBeGreaterThan(0);
    // Nearest should be Edgeware Rd Car park (< 200m)
    expect(points[0].name).toBe("Edgeware Rd Car Park");
    expect(points[0].walkingMinutes).toBeLessThanOrEqual(5);
    expect(points[0].walkingLabel).toContain("min walk");
  });

  it("ranks nearest transit and parking for Sydney Opera House", () => {
    // Sydney Opera House coords: -33.8568, 151.2153
    const operaHouseGeo = { lat: -33.8568, lng: 151.2153 };
    const overview = getVenueArrivalOverview(operaHouseGeo);

    expect(overview.nearestParking).toBeDefined();
    expect(overview.nearestParking?.name).toBe("Sydney Opera House Car Park");
    expect(overview.nearestParking?.walkingMinutes).toBeLessThanOrEqual(3);

    expect(overview.nearestTransit).toBeDefined();
    expect(overview.nearestTransit?.name).toBe("Circular Quay Station & Wharves");
    expect(overview.nearestTransit?.walkingMinutes).toBeLessThanOrEqual(10);
  });

  it("filters by max walking time", () => {
    const farGeo = { lat: -33.7, lng: 150.9 }; // Far away from Sydney CBD
    const points = getNearbyArrivalPoints(farGeo, { maxWalkingMinutes: 15 });
    expect(points).toHaveLength(0);
  });

  it("resolves precinct geo anchors from names or suburbs", () => {
    const enmore = resolvePrecinctGeo("Enmore Theatre");
    expect(enmore.lat).toBeCloseTo(-33.8992, 2);

    const hordern = resolvePrecinctGeo("Hordern Pavilion, Moore Park");
    expect(hordern.lat).toBeCloseTo(-33.8935, 2);

    const fallback = resolvePrecinctGeo();
    expect(fallback.lat).toBeCloseTo(-33.8688, 2);
  });
});
