import { describe, expect, it } from "vitest";
import type { CalendarEvent, SavedEvent, UserEventState } from "@shared/event";
import { overlayUserState } from "./event-user-state";

type Base = Omit<CalendarEvent, "isGoing" | "isInterested" | "isLiked">;

function base(partial?: Partial<Base>): Base {
  return {
    id: "e1",
    title: "T",
    description: "D",
    startsAt: "2026-09-15T18:00:00+10:00",
    endsAt: "2026-09-15T21:00:00+10:00",
    date: "2026-09-15",
    timeLabel: "6–9 PM",
    city: "Sydney",
    venue: "Hall",
    category: "music",
    categoryLabel: "Live Music",
    source: "local",
    isLocal: true,
    ...partial,
  };
}

function state(partial: Partial<UserEventState>): UserEventState {
  return { eventId: "e1", updatedAt: "2026-09-15T00:00:00+10:00", ...partial };
}

function saved(): SavedEvent {
  return { eventId: "e1", name: "T", flavour: "event_space", savedAt: "2026-09-15T00:00:00+10:00" };
}

describe("overlayUserState", () => {
  it("marks going/interested/liked from user state", () => {
    const out = overlayUserState(base(), { e1: state({ status: "going", liked: true }) }, []);
    expect(out.isGoing).toBe(true);
    expect(out.isInterested).toBe(false);
    expect(out.isLiked).toBe(true);
    expect(out.isRescheduled).toBe(false);
  });

  it("treats saved events as interested until a status is set", () => {
    expect(overlayUserState(base(), {}, [saved()]).isInterested).toBe(true);
    const decided = overlayUserState(base(), { e1: state({ status: "going" }) }, [saved()]);
    expect(decided.isGoing).toBe(true);
    expect(decided.isInterested).toBe(false);
  });

  it("applies rescheduled dates and keeps the original", () => {
    const out = overlayUserState(
      base(),
      {
        e1: state({
          status: "going",
          rescheduledDate: "2026-09-16",
          rescheduledStartsAt: "2026-09-16T18:00:00+10:00",
          rescheduledEndsAt: "2026-09-16T21:00:00+10:00",
        }),
      },
      [],
    );
    expect(out.isRescheduled).toBe(true);
    expect(out.date).toBe("2026-09-16");
    expect(out.originalDate).toBe("2026-09-15");
  });
});
