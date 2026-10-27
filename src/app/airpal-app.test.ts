import { describe, expect, it } from "vitest";
import {
  APP_SECTIONS,
  CANONICAL_ROUTES,
  STATIC_ALIASES,
  canonicalRouteFor,
  patternMatches,
  routesForSection,
} from "@/app/airpal-app";

describe("one AirPal App registry", () => {
  it("has no duplicate canonical patterns", () => {
    const patterns = CANONICAL_ROUTES.map((r) => r.pattern);
    expect(new Set(patterns).size).toBe(patterns.length);
  });

  it("covers every section", () => {
    for (const section of APP_SECTIONS) {
      expect(routesForSection(section.id).length).toBeGreaterThan(0);
    }
  });

  it("resolves the headline pages to their sections", () => {
    expect(canonicalRouteFor("/")?.section).toBe("home");
    expect(canonicalRouteFor("/pass")?.section).toBe("pass");
    expect(canonicalRouteFor("/events")?.section).toBe("pass");
    expect(canonicalRouteFor("/e/abc")?.section).toBe("pass");
    expect(canonicalRouteFor("/places")?.section).toBe("discover");
    expect(canonicalRouteFor("/communities")?.section).toBe("discover");
    expect(canonicalRouteFor("/circle")?.section).toBe("circle");
    expect(canonicalRouteFor("/friends")?.section).toBe("circle");
    expect(canonicalRouteFor("/me")?.section).toBe("circle");
    expect(canonicalRouteFor("/bio/@bibin")?.section).toBe("circle");
    expect(canonicalRouteFor("/business")?.section).toBe("business");
    expect(canonicalRouteFor("/join/XYZ")?.section).toBe("business");
    expect(canonicalRouteFor("/host/pulse")?.section).toBe("business");
    expect(canonicalRouteFor("/deals/123")?.section).toBe("business");
    expect(canonicalRouteFor("/birthday-freebies/au")?.section).toBe("business");
    expect(canonicalRouteFor("/admin")?.section).toBe("admin");
    expect(canonicalRouteFor("/settings")?.section).toBe("system");
    expect(canonicalRouteFor("/getAirPalApp")?.section).toBe("system");
  });

  it("has no duplicate or self-referential static aliases", () => {
    const froms = STATIC_ALIASES.map((a) => a.from);
    expect(new Set(froms).size).toBe(froms.length);
    for (const alias of froms) {
      expect(canonicalRouteFor(alias)).toBeUndefined();
    }
    for (const alias of STATIC_ALIASES) {
      expect(alias.to).not.toBe(alias.from);
    }
  });

  it("redirects retired promo targets to live pillar routes", () => {
    const tos = new Map(STATIC_ALIASES.map((a) => [a.from, a.to]));
    expect(tos.get("/mate")).toBe("/friends");
    expect(tos.get("/experiences")).toBe("/events");
    expect(tos.get("/fashion")).toBe("/deals");
    for (const to of ["/friends", "/events", "/deals"]) {
      expect(canonicalRouteFor(to)).toBeDefined();
    }
  });

  it("matches params by whole segment only", () => {
    expect(patternMatches("/e/:id", "/e/abc")).toBe(true);
    expect(patternMatches("/e/:id", "/e/abc/guests")).toBe(false);
    expect(patternMatches("/join", "/join/ABC")).toBe(false);
    expect(patternMatches("/join/:code", "/join/ABC")).toBe(true);
  });

  it("matches @-scoped handle params without swallowing static pages", () => {
    expect(patternMatches("/bio/@:handle", "/bio/@bibin")).toBe(true);
    expect(patternMatches("/bio/@:handle", "/bio/setup")).toBe(false);
    expect(patternMatches("/bio/@:handle", "/bio/")).toBe(false);
  });
});
