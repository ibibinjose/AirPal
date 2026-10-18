import type { CalendarEvent, SavedEvent, UserEventState } from "@shared/event";
import { formatEventTimeRange } from "./calendar-utils";

/** Overlay device user-state onto a Firestore calendar base (pure, shared). */
export function overlayUserState(
  base: Omit<CalendarEvent, "isGoing" | "isInterested" | "isLiked">,
  userStates: Record<string, UserEventState>,
  savedEvents: SavedEvent[],
): CalendarEvent {
  const state = userStates[base.id];
  const isSaved = savedEvents.some((se) => se.eventId === base.id);
  const isRescheduled = Boolean(state?.rescheduledDate && state.rescheduledDate !== base.date);
  const date = state?.rescheduledDate || base.date;
  const startsAt = state?.rescheduledStartsAt || base.startsAt;
  const endsAt = state?.rescheduledEndsAt || base.endsAt;
  const timeLabel = isRescheduled ? formatEventTimeRange(startsAt, endsAt) || base.timeLabel : base.timeLabel;
  return {
    ...base,
    date,
    startsAt,
    endsAt,
    timeLabel,
    isRescheduled,
    originalDate: base.date,
    isGoing: state?.status === "going",
    isInterested: state?.status === "interested" || (!state?.status && isSaved),
    isLiked: Boolean(state?.liked),
  };
}
