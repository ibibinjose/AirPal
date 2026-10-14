import { describe, expect, it } from "vitest";
import {
  V3_CANONICAL_COLLECTIONS,
  isV3OrderState,
  isV3Rsvp,
  parseV3Capacity,
  parseV3Currency,
  parseV3Handle,
  parseV3IdempotencyKey,
  parseV3IsoTime,
  parseV3ListLimit,
  parseV3MoneyCents,
  parseV3RedemptionLimit,
  parseV3Uid,
  publicV3Event,
  publicV3Place,
  sanitizeV3Links,
} from "./v3-contract";

describe("V3 contract validation", () => {
  it("normalizes a valid handle and refuses invalid identifiers", () => {
    expect(parseV3Handle("  Bibin.Jose  ")).toBe("bibin.jose");
    expect(() => parseV3Handle("no spaces")).toThrow("Handle is invalid.");
    expect(() => parseV3Handle("ab")).toThrow("Handle is invalid.");
  });

  it("accepts only complete ISO instants", () => {
    expect(parseV3IsoTime("2026-10-14T18:30:00+11:00", "Start")).toBe("2026-10-14T18:30:00+11:00");
    expect(() => parseV3IsoTime("tomorrow", "Start")).toThrow("Start must be an ISO date-time.");
  });

  it("bounds capacity and deal redemptions", () => {
    expect(parseV3Capacity(undefined)).toBe(0);
    expect(parseV3Capacity(42)).toBe(42);
    expect(() => parseV3Capacity(-1)).toThrow("Capacity");
    expect(parseV3RedemptionLimit(2)).toBe(2);
    expect(() => parseV3RedemptionLimit(0)).toThrow("Redemption limit");
  });

  it("keeps profile links https/http or safe app actions only", () => {
    expect(
      sanitizeV3Links([
        { id: "site", label: "My site", href: "https://example.com" },
        { id: "call", label: "Call", href: "tel:+61400000000" },
      ]),
    ).toHaveLength(2);
    expect(() => sanitizeV3Links([{ id: "bad", label: "Bad", href: "javascript:alert(1)" }])).toThrow(
      "URL is invalid.",
    );
  });

  it("pins the 14 canonical collections", () => {
    expect([...V3_CANONICAL_COLLECTIONS]).toEqual([
      "users",
      "handles",
      "profiles",
      "places",
      "events",
      "plans",
      "tickets",
      "orders",
      "deals",
      "dealClaims",
      "cohorts",
      "conversations",
      "audits",
      "rateLimits",
    ]);
  });

  it("accepts invited RSVPs and all order states", () => {
    expect(isV3Rsvp("invited")).toBe(true);
    expect(isV3Rsvp("going")).toBe(true);
    expect(isV3Rsvp("maybe")).toBe(true);
    expect(isV3Rsvp("declined")).toBe(true);
    expect(isV3Rsvp("ghosting")).toBe(false);
    for (const state of ["pending", "paid", "refunded", "cancelled", "failed"]) {
      expect(isV3OrderState(state)).toBe(true);
    }
    expect(isV3OrderState("browser-says-paid")).toBe(false);
  });

  it("requires safe idempotency keys, money, currency, limits, and uids", () => {
    expect(parseV3IdempotencyKey("order-abc-123")).toBe("order-abc-123");
    expect(() => parseV3IdempotencyKey("short")).toThrow("Idempotency key");
    expect(() => parseV3IdempotencyKey("has spaces in key!")).toThrow("Idempotency key");
    expect(parseV3MoneyCents(2500, "Price")).toBe(2500);
    expect(() => parseV3MoneyCents(-1, "Price")).toThrow("Price");
    expect(() => parseV3MoneyCents(10.5, "Price")).toThrow("Price");
    expect(parseV3Currency("aud")).toBe("AUD");
    expect(parseV3Currency(undefined)).toBe("AUD");
    expect(() => parseV3Currency("AU")).toThrow("Currency");
    expect(parseV3ListLimit(undefined)).toBe(20);
    expect(parseV3ListLimit(5)).toBe(5);
    expect(() => parseV3ListLimit(500)).toThrow("Limit");
    expect(parseV3Uid("uid-123")).toBe("uid-123");
    expect(() => parseV3Uid("ab")).toThrow("User is invalid.");
  });

  it("strips owner and trust fields from public projections", () => {
    const place = publicV3Place({
      id: "place-1",
      ownerUid: "owner-1",
      status: "published",
      name: "Harbour Hall",
      description: "Venue",
      city: "Sydney",
      category: "venue",
      address: "1 Harbour Rd",
      createdAt: "now",
      updatedAt: "now",
    });
    expect(place).not.toHaveProperty("ownerUid");
    expect(place).toMatchObject({ id: "place-1", name: "Harbour Hall" });
    const event = publicV3Event({
      id: "event-1",
      organiserUid: "org-1",
      status: "published",
      title: "Rooftop Sessions",
      description: "Live music",
      city: "Sydney",
      venueName: "Harbour Hall",
      startsAt: "2026-11-01T19:00:00+11:00",
      capacity: 100,
      issuedCount: 3,
      ticketing: "paid",
      priceCents: 4500,
      currency: "AUD",
      createdAt: "now",
      updatedAt: "now",
    });
    expect(event).not.toHaveProperty("organiserUid");
    expect(event).not.toHaveProperty("issuedCount");
    expect(event).toMatchObject({ id: "event-1", priceCents: 4500 });
  });
});
