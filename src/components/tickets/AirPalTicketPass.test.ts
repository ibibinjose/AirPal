import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ticketQrHref } from "./AirPalTicketPass";
import { isTicketId, ticketIdFromSearch, type Booking } from "@shared/booking";

const base = {
  requestId: "r1",
  customerUid: "u1",
  providerUid: "u9",
  providerKind: "business",
  providerName: "Spark",
  title: "Closing",
  suburb: "Sydney",
  date: "2026-09-25",
  time: "16:00",
  priceCents: 0,
  feeCents: 0,
  paymentStatus: "unpaid",
  payoutStatus: "unpaid",
  status: "pending",
  cancelReason: "",
  spots: 1,
  createdAt: "",
  updatedAt: "",
} as unknown as Booking & { id: string };

describe("ticketQrHref", () => {
  it("points event tickets at the session page", () => {
    expect(ticketQrHref({ ...base, id: "b1", eventId: "spark26-001" })).toContain("/e/spark26-001?ticket=b1");
  });

  it("falls back to the dedicated gate page", () => {
    expect(ticketQrHref({ ...base, id: "b3" })).toContain("/ticket/b3");
  });

  it("emits links the gate panel parses back", () => {
    const eventHref = ticketQrHref({ ...base, id: "b1", eventId: "spark26-001" });
    expect(ticketIdFromSearch(eventHref.slice(eventHref.indexOf("?")))).toBe("b1");
    const gateHref = ticketQrHref({ ...base, id: "b3" });
    const segment = gateHref.slice(gateHref.lastIndexOf("/") + 1);
    expect(segment).toBe("b3");
    expect(isTicketId(segment)).toBe(true);
  });

  it("conforms to touch ergonomics and explicit transitions", () => {
    const src = readFileSync(resolve(import.meta.dirname, "./AirPalTicketPass.tsx"), "utf8");
    expect(src).not.toContain("transition-all");
    expect(src).toContain("min-h-[44px]");
    expect(src).toContain("aria-label=");
  });
});
