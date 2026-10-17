import { describe, expect, it } from "vitest";
import {
  EVENT_LOCATION_TYPES,
  cleanCapacity,
  cleanEventHandles,
  cleanStallLocation,
  cleanTicketCents,
  cleanTicketTiers,
  couponPrice,
  expandWeeklyRecurrence,
  isEventLocationType,
  isExpoEventId,
  normalizeCouponCode,
  parseStallCsv,
  sanitizeAgenda,
  stallCsvTemplate,
  stallFieldLabels,
  stallUnitDisplay,
  validateCouponDraft,
} from "./event";

describe("event csv", () => {
  it("parses a stall sheet", () => {
    const rows = parseStallCsv(`name,category,booth,shortWhy,offer
Salted Caramel Co,eat,A12,Handmade caramels,2 for $10
Harbour Linen,shops,B04,Washed linen,
`);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ name: "Salted Caramel Co", category: "eat", booth: "A12", offer: "2 for $10" });
    expect(rows[1]?.offer).toBeFalsy();
  });

  it("accepts expo/market column names for business, stall number and handle", () => {
    const rows = parseStallCsv(`business name,stand number,@handle,category,about
Harbour Linen,214,harbourlinen,shops,Washed linen
`);
    expect(rows[0]).toMatchObject({
      name: "Harbour Linen",
      booth: "214",
      handle: "harbourlinen",
      category: "shops",
      shortWhy: "Washed linen",
    });
  });

  it("detects expo ids", () => {
    expect(isExpoEventId("evt-rocks-market")).toBe(true);
    expect(isExpoEventId("rocks-markets-weekend")).toBe(false);
  });
});

describe("stall field labels", () => {
  it("uses stand vs stall vs booth by flavour", () => {
    expect(stallFieldLabels("expo").unit).toBe("Stand number");
    expect(stallFieldLabels("market").unit).toBe("Stall number");
    expect(stallFieldLabels("event_space").unit).toBe("Booth number");
    expect(stallUnitDisplay("expo", "214")).toBe("Stand 214");
    expect(stallUnitDisplay("market", "A12")).toBe("Stall A12");
    expect(stallCsvTemplate("market")).toContain("business name");
    expect(stallCsvTemplate("expo")).toContain("stand number");
    expect(stallCsvTemplate("market")).toContain("location");
  });

  it("parses floor locations from csv", () => {
    const rows = parseStallCsv(`name,booth,location,category
Salted Caramel Co,A12,Aisle C Bay 12,eat
Harbour Linen,B04,,shops
`);
    expect(rows[0]).toMatchObject({ booth: "A12", location: "Aisle C Bay 12" });
    expect(rows[1]?.location).toBeUndefined();
  });

  it("cleans floor locations", () => {
    expect(cleanStallLocation("  Aisle C · Bay 12  ")).toBe("Aisle C · Bay 12");
    expect(cleanStallLocation("   ")).toBeUndefined();
    expect(cleanStallLocation(undefined)).toBeUndefined();
    expect(cleanStallLocation("x".repeat(200))?.length).toBe(120);
  });

  it("cleans ticket cents and capacity", () => {
    expect(cleanTicketCents(2500)).toBe(2500);
    expect(cleanTicketCents("25.99")).toBe(25);
    expect(cleanTicketCents(-5)).toBeUndefined();
    expect(cleanTicketCents("free")).toBeUndefined();
    expect(cleanCapacity(40)).toBe(40);
    expect(cleanCapacity(0)).toBeUndefined();
    expect(cleanCapacity(2001)).toBeUndefined();
    expect(cleanCapacity(2.5)).toBeUndefined();
  });

  it("validates event location types", () => {
    expect(isEventLocationType("in_person")).toBe(true);
    expect(isEventLocationType("virtual")).toBe(true);
    expect(isEventLocationType("secret")).toBe(true);
    expect(isEventLocationType("metaverse")).toBe(false);
    expect(isEventLocationType(undefined)).toBe(false);
    expect(isEventLocationType(null)).toBe(false);
    expect(EVENT_LOCATION_TYPES).toEqual(["in_person", "virtual", "secret"]);
  });
});

describe("event coupons", () => {
  it("normalizes codes to uppercase alphanumerics", () => {
    expect(normalizeCouponCode("mates10")).toBe("MATES10");
    expect(normalizeCouponCode("  early-bird!! ")).toBe("EARLYBIRD");
    expect(normalizeCouponCode("ab")).toBe("");
    expect(normalizeCouponCode("x".repeat(17))).toBe("");
    expect(normalizeCouponCode(undefined)).toBe("");
  });

  it("rejects bad drafts with actionable errors", () => {
    expect(validateCouponDraft({ code: "ok", percentOff: 10 })).toEqual(["Code must be 3–16 letters or numbers."]);
    expect(validateCouponDraft({ code: "MATES10", percentOff: 0 })).toEqual([
      "Discount must be a whole percent from 1 to 90.",
    ]);
    expect(validateCouponDraft({ code: "MATES10", percentOff: 91 })).toEqual([
      "Discount must be a whole percent from 1 to 90.",
    ]);
    expect(validateCouponDraft({ code: "MATES10", percentOff: 25, maxRedemptions: 0 })).toEqual([
      "Redemption cap must be 1–100000.",
    ]);
    expect(validateCouponDraft({ code: "MATES10", percentOff: 25 })).toEqual([]);
  });

  it("prices discounts without trusting client math", () => {
    expect(couponPrice(2500, 10)).toBe(2250);
    expect(couponPrice(2500, 0)).toBe(2500);
    expect(couponPrice(2500, 99)).toBe(250);
    expect(couponPrice(-5, 10)).toBe(0);
  });
});

describe("weekly recurrence", () => {
  it("expands N weekly instances preserving duration", () => {
    const out = expandWeeklyRecurrence("2026-11-01T18:00:00.000Z", "2026-11-01T21:00:00.000Z", 3);
    expect(out).toHaveLength(3);
    expect(out[0]?.startsAt).toBe("2026-11-01T18:00:00.000Z");
    expect(out[1]?.startsAt).toBe("2026-11-08T18:00:00.000Z");
    expect(out[2]?.endsAt).toBe("2026-11-15T21:00:00.000Z");
  });

  it("clamps counts and fails closed on bad dates", () => {
    expect(expandWeeklyRecurrence("2026-11-01T18:00:00.000Z", "2026-11-01T21:00:00.000Z", 99)).toHaveLength(12);
    expect(expandWeeklyRecurrence("nope", "nope", 4)).toHaveLength(1);
  });
});

describe("event ticket tiers", () => {
  it("cleans tier rows for storage", () => {
    expect(
      cleanTicketTiers([
        { id: "vip", name: "VIP", priceCents: 5000, capacity: 20 },
        { id: "vip", name: "Dupe", priceCents: 1000 },
        { id: "", name: "No id", priceCents: 1000 },
        { id: "free", name: "Freebie", priceCents: 0 },
      ]),
    ).toEqual([
      { id: "vip", name: "VIP", priceCents: 5000, capacity: 20 },
      { id: "free", name: "Freebie", priceCents: 0 },
    ]);
    expect(cleanTicketTiers([])).toBeUndefined();
    expect(cleanTicketTiers("nope")).toBeUndefined();
  });
});

describe("event agenda", () => {
  it("cleans run-sheet rows and caps at twelve", () => {
    expect(
      sanitizeAgenda([
        { time: "6:00pm", title: "Doors open" },
        { time: "", title: "" },
        { time: "  ", title: "  " },
        "nope",
        null,
      ]),
    ).toEqual([{ time: "6:00pm", title: "Doors open" }]);
    expect(sanitizeAgenda([])).toBeUndefined();
    expect(sanitizeAgenda("nope")).toBeUndefined();
    const many = Array.from({ length: 20 }, (_, i) => ({ time: `${i}`, title: `Item ${i}` }));
    expect(sanitizeAgenda(many)).toHaveLength(12);
  });
});

describe("event handle lists", () => {
  it("cleans sponsor handles and drops dupes and blanks", () => {
    expect(cleanEventHandles(["@HarbourBar", "harbourbar", "  ", "", null, 42])).toEqual(["harbourbar", "42"]);
    expect(cleanEventHandles([])).toBeUndefined();
    expect(cleanEventHandles("nope")).toBeUndefined();
    const many = Array.from({ length: 30 }, (_, i) => `s${i}`);
    expect(cleanEventHandles(many)).toHaveLength(20);
  });
});
