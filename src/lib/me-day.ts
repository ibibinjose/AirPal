import type { BookingWithId } from "@/hooks/useMyBookings";
import type { CatchUpItem } from "@/lib/catchup";
import type { CalendarEvent } from "@shared/event";

/** Pure day-list filters for the Me dashboard (moved from MePage). */

export function todayAppointments(items: CatchUpItem[], today: string): CatchUpItem[] {
  return items.filter((item) => !item.isReminderOnly && item.date === today && item.status !== "dismissed");
}

function isLiveBooking(booking: BookingWithId): boolean {
  return booking.status !== "cancelled" && booking.status !== "refunded";
}

export function todayTickets(bookings: BookingWithId[] | undefined, today: string): BookingWithId[] {
  if (!bookings) return [];
  return bookings.filter((b) => isLiveBooking(b) && b.date === today);
}

export function pendingAppointments(items: CatchUpItem[]): CatchUpItem[] {
  return items.filter((item) => !item.isReminderOnly && item.status === "pending");
}

export function upcomingScheduledAppointments(items: CatchUpItem[], today: string): CatchUpItem[] {
  return items
    .filter(
      (item) =>
        !item.isReminderOnly &&
        item.status !== "dismissed" &&
        item.status !== "pending" &&
        (!item.date || item.date >= today),
    )
    .sort((a, b) => ((a.date || "") > (b.date || "") ? 1 : -1));
}

export function upcomingTickets(bookings: BookingWithId[] | undefined, today: string): BookingWithId[] {
  if (!bookings) return [];
  return bookings.filter((b) => isLiveBooking(b) && (!b.date || b.date >= today));
}

/**
 * Personal plans committed for today: calendar events the user marked Going
 * (including rescheduled ones — `CalendarEvent.date` already reflects the
 * rescheduled date). Interested-only saves are tentative, so they stay out of
 * the Today agenda and live under /calendar instead.
 */
export function todayPersonalPlans(events: CalendarEvent[] | undefined, today: string): CalendarEvent[] {
  if (!events) return [];
  return events.filter((e) => e.isGoing && e.date === today).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}
