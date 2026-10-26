import { describe, expect, it } from "vitest";
import type { BookingWithId } from "@/hooks/useMyBookings";
import type { CatchUpItem } from "@/lib/catchup";
import {
  pendingAppointments,
  todayAppointments,
  todayTickets,
  upcomingScheduledAppointments,
  upcomingTickets,
} from "./me-day";

const TODAY = "2026-09-15";

function catchUp(partial: Partial<CatchUpItem> & { id: string }): CatchUpItem {
  return {
    targetHandle: "marta",
    requesterName: "Marta",
    type: "coffee",
    createdAt: "2026-09-01T00:00:00+10:00",
    status: "accepted",
    ...partial,
  };
}

function ticket(partial: Partial<BookingWithId> & { id: string }): BookingWithId {
  return {
    requestId: "r1",
    customerUid: "u1",
    providerUid: "p1",
    providerKind: "host",
    providerName: "Host",
    title: "Gig",
    suburb: "Sydney",
    date: TODAY,
    time: "19:00",
    priceCents: 0,
    feeCents: 0,
    paymentStatus: "unpaid",
    status: "confirmed",
    cancelReason: "",
    createdAt: "2026-09-01T00:00:00+10:00",
    updatedAt: "2026-09-01T00:00:00+10:00",
    ...partial,
  } as BookingWithId;
}

describe("me day filters", () => {
  it("today lists exclude dismissed and off-day items", () => {
    const items = [
      catchUp({ id: "a", date: TODAY }),
      catchUp({ id: "b", date: TODAY, status: "dismissed" }),
      catchUp({ id: "c", date: "2026-09-16" }),
    ];
    expect(todayAppointments(items, TODAY).map((i) => i.id)).toEqual(["a"]);
    const tickets = [ticket({ id: "t1" }), ticket({ id: "t2", date: "2026-09-16" })];
    expect(todayTickets(tickets, TODAY).map((t) => t.id)).toEqual(["t1"]);
    expect(todayTickets(undefined, TODAY)).toEqual([]);
  });

  it("pending lists only pending, upcoming sorts by date and keeps dateless", () => {
    const items = [
      catchUp({ id: "late", date: "2026-09-20" }),
      catchUp({ id: "p", status: "pending" }),
      catchUp({ id: "early", date: "2026-09-16" }),
      catchUp({ id: "past", date: "2026-09-10" }),
      catchUp({ id: "nodate", date: undefined }),
      catchUp({ id: "gone", status: "dismissed" }),
    ];
    expect(pendingAppointments(items).map((i) => i.id)).toEqual(["p"]);
    expect(upcomingScheduledAppointments(items, TODAY).map((i) => i.id)).toEqual(["nodate", "early", "late"]);
    const tickets = [ticket({ id: "t1" }), ticket({ id: "t2", date: "2026-09-01" })];
    expect(upcomingTickets(tickets, TODAY).map((t) => t.id)).toEqual(["t1"]);
    expect(upcomingTickets(undefined, TODAY)).toEqual([]);
  });

  it("excludes cancelled and refunded tickets from today and upcoming", () => {
    const tickets = [
      ticket({ id: "live", status: "confirmed" }),
      ticket({ id: "cancelled", status: "cancelled" }),
      ticket({ id: "refunded", status: "refunded" }),
      ticket({ id: "future-cancelled", date: "2026-09-16", status: "cancelled" }),
      ticket({ id: "future-live", date: "2026-09-16", status: "confirmed" }),
    ];
    expect(todayTickets(tickets, TODAY).map((t) => t.id)).toEqual(["live"]);
    expect(upcomingTickets(tickets, TODAY).map((t) => t.id)).toEqual(["live", "future-live"]);
  });

  it("keeps reminder-only bookmarks out of every appointment list", () => {
    const items = [
      catchUp({ id: "rem", status: "pending", isReminderOnly: true }),
      catchUp({ id: "rem-today", status: "pending", isReminderOnly: true, date: TODAY }),
      catchUp({ id: "p", status: "pending" }),
    ];
    expect(pendingAppointments(items).map((i) => i.id)).toEqual(["p"]);
    expect(todayAppointments(items, TODAY).map((i) => i.id)).toEqual([]);
    expect(upcomingScheduledAppointments(items, TODAY).map((i) => i.id)).toEqual([]);
  });
});
