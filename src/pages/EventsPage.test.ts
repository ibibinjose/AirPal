import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { CalendarEvent } from "@shared/event";

const { fakes } = vi.hoisted(() => ({
  fakes: { search: "", remoteFailed: false, events: null as CalendarEvent[] | null },
}));

vi.mock("wouter", () => ({
  useLocation: () => ["/events", vi.fn()],
  useSearch: () => fakes.search,
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => createElement("a", { href }, children),
}));

function makeEvent(overrides: Partial<CalendarEvent> & { id: string }): CalendarEvent {
  return {
    title: "Test Event",
    description: "A test gathering",
    startsAt: "2026-10-25T19:00:00+11:00",
    endsAt: "2026-10-25T22:00:00+11:00",
    date: "2026-10-25",
    timeLabel: "Sat 7:00 PM",
    city: "Sydney",
    venue: "Darling Harbour",
    category: "culture",
    categoryLabel: "Cultural",
    source: "local",
    isLocal: true,
    isGoing: false,
    isInterested: false,
    isLiked: false,
    ...overrides,
  };
}

const EVENTS: CalendarEvent[] = [
  makeEvent({ id: "evt-diwali", title: "Diwali Night Market", date: "2026-10-25", venue: "Darling Harbour" }),
  makeEvent({
    id: "evt-jazz",
    title: "Jazz at the Rocks",
    date: "2026-10-26",
    venue: "The Rocks",
    category: "music",
    categoryLabel: "Concerts & Gigs",
  }),
  makeEvent({ id: "evt-past", title: "Old Laneway Gig", date: "2026-10-01" }),
];

vi.mock("@/contexts/EventsContext", () => ({
  useEvents: () => ({
    calendarEvents: fakes.events ?? EVENTS,
    events: [],
    userStates: {},
    remoteFailed: fakes.remoteFailed,
  }),
}));

vi.mock("@/contexts/LocalNowContext", () => ({
  useLocalNow: () => ({ city: "Sydney", today: "2026-10-20", chooseLocation: vi.fn() }),
}));

vi.mock("../components/calendar/CalendarEventCard", () => ({
  CalendarEventCard: ({ event }: { event: CalendarEvent }) =>
    createElement("div", { "data-testid": "event-card" }, event.title),
}));

import { EventsPage } from "./EventsPage";

function render(search = "", opts: { remoteFailed?: boolean; events?: CalendarEvent[] } = {}) {
  fakes.search = search;
  fakes.remoteFailed = opts.remoteFailed ?? false;
  fakes.events = opts.events ?? null;
  return renderToStaticMarkup(createElement(EventsPage));
}

describe("EventsPage search", () => {
  it("renders the search box and a result count for upcoming city events", () => {
    const markup = render();
    expect(markup).toContain('aria-label="Search events"');
    expect(markup).toContain("Search events, venues in Sydney");
    expect(markup).toContain("Diwali Night Market");
    expect(markup).toContain("Jazz at the Rocks");
    expect(markup).not.toContain("Old Laneway Gig");
    expect(markup).toContain("2 events");
  });

  it("seeds the query from ?q= and filters to matching events", () => {
    const markup = render("?q=jazz");
    expect(markup).toContain("Jazz at the Rocks");
    expect(markup).not.toContain("Diwali Night Market");
    expect(markup).toContain("1 event");
  });

  it("shows a query-aware empty state when nothing matches", () => {
    const markup = render("?q=zzz-no-such-event");
    expect(markup).not.toContain('data-testid="event-card"');
    expect(markup).toContain("No results for");
    expect(markup).toContain("zzz-no-such-event");
    expect(markup).toContain("Reset Filters");
  });

  it("keeps the city menu collapsed by default", () => {
    const markup = render();
    expect(markup).toContain('aria-expanded="false"');
    expect(markup).not.toContain("Choose your city");
  });

  it("says the refresh failed instead of claiming no events exist", () => {
    const markup = render("", { remoteFailed: true, events: [] });
    expect(markup).not.toContain('data-testid="event-card"');
    expect(markup).not.toContain("Nothing live in");
    expect(markup).toContain("refresh events");
  });
});
