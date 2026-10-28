import { describe, expect, it } from "vitest";
import { venueStreetReady } from "./venue-readiness";

describe("venueStreetReady", () => {
  it("accepts a full street address", () => {
    expect(venueStreetReady("1 Test St\nSydney NSW 2000\nAustralia")).toBe(true);
  });

  it("rejects blanks and bare suburbs with no street line", () => {
    expect(venueStreetReady("")).toBe(false);
    expect(venueStreetReady(null)).toBe(false);
    expect(venueStreetReady("Sydney NSW 2000")).toBe(false);
  });

  it("rejects a duplicated locality line masquerading as a street (finding 14)", () => {
    expect(venueStreetReady("Sydney NSW 2000\nSydney NSW 2000\nAustralia")).toBe(false);
  });
});
