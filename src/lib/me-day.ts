import type { BookingWithId } from "@/hooks/useMyBookings";
import type { CatchUpItem } from "@/lib/catchup";

/** Pure day-list filters for the Me dashboard (moved from MePage). */

export function todayAppointments(items: CatchUpItem[], today: string): CatchUpItem[] {
  return items.filter((item) => !item.isReminderOnly && item.date === today && item.status !== "dismissed");
}

export function todayTickets(bookings: BookingWithId[] | undefined, today: string): BookingWithId[] {
  if (!bookings) return [];
  return bookings.filter((b) => b.date === today);
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
  return bookings.filter((b) => !b.date || b.date >= today);
}
