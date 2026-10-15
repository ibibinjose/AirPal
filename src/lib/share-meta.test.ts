import { describe, expect, it } from "vitest";
import { routeMetaFor } from "./share-meta";

describe("routeMetaFor", () => {
  it("titles core V1 surfaces distinctly", () => {
    expect(routeMetaFor("/")?.title).toContain("AirPal.Me");
    expect(routeMetaFor("/circle")?.title).toContain("Circle");
    // Renamed Stay & Guide (Oct 2026 founder rebrand); route unchanged.
    expect(routeMetaFor("/concierge")?.title).toContain("Guide");
    expect(routeMetaFor("/deals")?.title).toContain("Deals");
    expect(routeMetaFor("/events")?.title).toContain("Events");
  });

  it("falls back to the brand default on unknown and removed paths", () => {
    expect(routeMetaFor("/somewhere-new")?.title).toContain("AirPal.Me");
    expect(routeMetaFor("/mate")?.title).toContain("AirPal.Me");
    expect(routeMetaFor("/fashion")?.title).toContain("AirPal.Me");
    expect(routeMetaFor("/now")?.title).toContain("AirPal.Me");
    expect(routeMetaFor("/explore")?.title).toContain("AirPal.Me");
    expect(routeMetaFor("/guide")?.title).toContain("AirPal.Me");
    expect(routeMetaFor("/plan")?.title).toContain("AirPal.Me");
  });

  it("leaves dynamic detail pages to their own tags", () => {
    expect(routeMetaFor("/e/ev_1")).toBeNull();
    expect(routeMetaFor("/@someone")).toBeNull();
  });
});
