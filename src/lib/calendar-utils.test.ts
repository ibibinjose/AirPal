import { describe, expect, it } from "vitest";
import type { CalendarEvent } from "@shared/event";
import {
  areTimeIntervalsOverlapping,
  BOOKING_THEMES,
  CATEGORY_THEMES,
  estimateWalkFromRocks,
  filterCalendarEvents,
  getEventBookingStatus,
  getEventSlotTagTheme,
  initialMonthFor,
  isFreeAdmission,
  isWeekendDay,
  toDateStr,
} from "./calendar-utils";

function event(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: "ev-1",
    title: "Rocks Market",
    description: "A market day",
    startsAt: "2026-10-17T10:00:00+11:00",
    endsAt: "2026-10-17T12:00:00+11:00",
    date: "2026-10-17",
    timeLabel: "10:00 AM – 12:00 PM",
    city: "Sydney",
    venue: "Playfair Hall",
    category: "market",
    categoryLabel: "Markets",
    source: "local",
    isLocal: true,
    isGoing: false,
    isInterested: false,
    isLiked: false,
    ...overrides,
  };
}

describe("getEventBookingStatus", () => {
  it("prioritises rescheduled over every other flag", () => {
    expect(getEventBookingStatus(event({ isRescheduled: true, isGoing: true }))).toBe("rescheduled");
  });

  it("ranks going above interested", () => {
    expect(getEventBookingStatus(event({ isGoing: true, isInterested: true }))).toBe("booked");
    expect(getEventBookingStatus(event({ isInterested: true }))).toBe("tentative");
  });

  it("falls back to explore", () => {
    expect(getEventBookingStatus(event())).toBe("explore");
  });
});

describe("getEventSlotTagTheme", () => {
  it("returns the booking theme in booking mode", () => {
    expect(getEventSlotTagTheme(event({ isGoing: true }), "booking")).toEqual(BOOKING_THEMES.booked);
  });

  it("returns the category theme in category mode", () => {
    expect(getEventSlotTagTheme(event({ category: "music" }))).toEqual(CATEGORY_THEMES.music);
  });

  it("falls back to the market theme for unknown categories", () => {
    expect(getEventSlotTagTheme(event({ category: "nope" as CalendarEvent["category"] }))).toEqual(
      CATEGORY_THEMES.market,
    );
  });
});

describe("isWeekendDay", () => {
  it("flags Saturday and Sunday", () => {
    expect(isWeekendDay(new Date(2026, 9, 17))).toBe(true); // Saturday
    expect(isWeekendDay(new Date(2026, 9, 18))).toBe(true); // Sunday
  });

  it("rejects weekdays", () => {
    expect(isWeekendDay(new Date(2026, 9, 19))).toBe(false); // Monday
    expect(isWeekendDay(new Date(2026, 9, 21))).toBe(false); // Wednesday
  });
});

describe("isFreeAdmission", () => {
  it("treats missing prices as free", () => {
    expect(isFreeAdmission()).toBe(true);
    expect(isFreeAdmission("")).toBe(true);
  });

  it("recognises free phrasings and zero prices", () => {
    expect(isFreeAdmission("Free")).toBe(true);
    expect(isFreeAdmission("Free entry included")).toBe(true);
    expect(isFreeAdmission("$0")).toBe(true);
    expect(isFreeAdmission("0")).toBe(true);
  });

  it("rejects paid prices", () => {
    expect(isFreeAdmission("$25")).toBe(false);
    expect(isFreeAdmission("25")).toBe(false);
  });
});

describe("toDateStr", () => {
  it("zero-pads month and day", () => {
    expect(toDateStr(new Date(2026, 9, 5))).toBe("2026-10-05");
    expect(toDateStr(new Date(2026, 0, 1))).toBe("2026-01-01");
  });
});

describe("initialMonthFor", () => {
  it("opens on the nearest upcoming event month", () => {
    const month = initialMonthFor([{ date: "2026-11-05" }, { date: "2026-10-20" }], "2026-10-18");
    expect(month.getFullYear()).toBe(2026);
    expect(month.getMonth()).toBe(9);
    expect(month.getDate()).toBe(1);
  });

  it("falls back to the latest event month when all are past", () => {
    const month = initialMonthFor([{ date: "2026-08-05" }, { date: "2026-09-05" }], "2026-10-18");
    expect(month.getMonth()).toBe(8);
  });

  it("falls back to the current month when there are no events", () => {
    const month = initialMonthFor([], "2026-10-18");
    expect(month.getFullYear()).toBe(2026);
    expect(month.getMonth()).toBe(9);
  });
});

describe("areTimeIntervalsOverlapping", () => {
  it("detects overlapping intervals", () => {
    expect(
      areTimeIntervalsOverlapping(
        "2026-10-17T10:00:00+11:00",
        "2026-10-17T12:00:00+11:00",
        "2026-10-17T11:00:00+11:00",
        "2026-10-17T13:00:00+11:00",
      ),
    ).toBe(true);
  });

  it("treats back-to-back slots as non-overlapping", () => {
    expect(
      areTimeIntervalsOverlapping(
        "2026-10-17T10:00:00+11:00",
        "2026-10-17T12:00:00+11:00",
        "2026-10-17T12:00:00+11:00",
        "2026-10-17T14:00:00+11:00",
      ),
    ).toBe(false);
  });

  it("returns false for unparsable timestamps", () => {
    expect(
      areTimeIntervalsOverlapping("nope", "also-nope", "2026-10-17T10:00:00+11:00", "2026-10-17T11:00:00+11:00"),
    ).toBe(false);
  });
});

describe("estimateWalkFromRocks", () => {
  it("recognises in-The-Rocks venues", () => {
    expect(estimateWalkFromRocks("Playfair Hotel").minutes).toBe(2);
  });

  it("recognises the Opera House stroll", () => {
    expect(estimateWalkFromRocks("Sydney Opera House").minutes).toBe(14);
  });

  it("falls back for unknown venues", () => {
    expect(estimateWalkFromRocks("Somewhere Else").label).toBe("Under 15 min from Stay");
  });
});

describe("filterCalendarEvents", () => {
  const events = [
    event({ id: "a", isGoing: true, category: "music", categoryLabel: "Live Music", ticketPrice: "$25" }),
    event({ id: "b", isInterested: true, ticketPrice: "Free" }),
  ];

  it("filters by attendance flag", () => {
    expect(filterCalendarEvents(events, "going").map((e) => e.id)).toEqual(["a"]);
  });

  it("filters by free admission", () => {
    expect(filterCalendarEvents(events, "free").map((e) => e.id)).toEqual(["b"]);
  });

  it("filters by category", () => {
    expect(filterCalendarEvents(events, "all", "", "music").map((e) => e.id)).toEqual(["a"]);
  });

  it("matches search queries against title", () => {
    expect(filterCalendarEvents(events, "all", "market").length).toBe(2);
    expect(filterCalendarEvents(events, "all", "opera").length).toBe(0);
  });
});
