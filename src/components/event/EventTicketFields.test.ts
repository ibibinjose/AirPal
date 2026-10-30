import { describe, expect, it } from "vitest";
import { ticketValuesToCents, validateTickets, type TicketFieldValues } from "./EventTicketFields";

function free(overrides: Partial<TicketFieldValues> = {}): TicketFieldValues {
  return { paid: false, price: "25", capacity: "40", tiers: [], ...overrides };
}

function paid(overrides: Partial<TicketFieldValues> = {}): TicketFieldValues {
  return { paid: true, price: "25", capacity: "40", tiers: [], ...overrides };
}

describe("validateTickets capacity", () => {
  it("validates capacity for free events too", () => {
    expect(validateTickets(free({ capacity: "0" }))).toMatch(/capacity/i);
    expect(validateTickets(free({ capacity: "abc" }))).toMatch(/capacity/i);
    expect(validateTickets(free({ capacity: "2001" }))).toMatch(/capacity/i);
  });

  it("accepts a set or empty capacity on free events", () => {
    expect(validateTickets(free({ capacity: "120" }))).toBeNull();
    expect(validateTickets(free({ capacity: "" }))).toBeNull();
  });

  it("still requires a price on paid events", () => {
    expect(validateTickets(paid({ price: "0" }))).toMatch(/price/i);
    expect(validateTickets(paid({ price: "25", capacity: "40" }))).toBeNull();
  });
});

describe("ticketValuesToCents capacity", () => {
  it("keeps event capacity for free events so the door list gates on it", () => {
    expect(ticketValuesToCents(free({ capacity: "120" }))).toEqual({
      ticketPriceCents: undefined,
      capacity: 120,
      ticketTiers: undefined,
    });
  });

  it("treats empty capacity as unlimited on free events", () => {
    expect(ticketValuesToCents(free({ capacity: "" })).capacity).toBeUndefined();
  });

  it("keeps paid pricing and capacity together", () => {
    expect(ticketValuesToCents(paid({ price: "25", capacity: "40" }))).toEqual({
      ticketPriceCents: 2500,
      capacity: 40,
      ticketTiers: undefined,
    });
  });

  it("drops invalid capacity instead of saving garbage", () => {
    expect(ticketValuesToCents(free({ capacity: "abc" })).capacity).toBeUndefined();
  });
});
