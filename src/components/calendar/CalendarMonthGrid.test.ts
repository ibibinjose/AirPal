import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CalendarMonthGrid } from "./CalendarMonthGrid";
import { CalendarDragProvider } from "./CalendarDragContext";

vi.mock("wouter", () => ({
  useLocation: () => ["/calendar", vi.fn()],
  Link: ({ children, href, className }: Record<string, unknown>) => createElement("a", { href, className }, children),
}));

vi.mock("./CalendarDragContext", () => ({
  useCalendarDrag: () => ({
    draggedEvent: null,
    dragOverDate: null,
    dragCollision: null,
    isDragging: false,
    autoSnapOnCollision: true,
    setAutoSnapOnCollision: vi.fn(),
    startDrag: vi.fn(),
    endDrag: vi.fn(),
    setDragOverDate: vi.fn(),
    dropOnDate: vi.fn(),
    checkDateCollision: vi.fn(),
    reschedulingEvent: null,
    setReschedulingEvent: vi.fn(),
  }),
  CalendarDragProvider: ({ children }: { children: unknown }) => children,
}));

describe("CalendarMonthGrid", () => {
  it("formats leading and trailing cells with their actual month names (September and November)", () => {
    // October 2026:
    // October 1 is Thursday; leading cells are Monday Sep 28, Tue Sep 29, Wed Sep 30.
    // October 31 is Saturday; trailing cell is Sunday Nov 1, 2026.
    const currentDate = new Date("2026-10-15T12:00:00");
    const markup = renderToStaticMarkup(
      createElement(
        CalendarDragProvider,
        null,
        createElement(CalendarMonthGrid, {
          currentDate,
          onChangeMonth: vi.fn(),
          onSelectDate: vi.fn(),
          events: [],
          todayStr: "2026-10-15",
        }),
      ),
    );

    // Leading cell for September 28 must be labeled as "28 September 2026" (not duplicating October)
    expect(markup).toContain('aria-label="28 September 2026"');
    const sep28Matches = markup.match(/aria-label="28 September 2026"/g);
    expect(sep28Matches).toHaveLength(1);

    // Trailing cell for November 1 must be labeled as "1 November 2026" (not duplicating October)
    expect(markup).toContain('aria-label="1 November 2026"');
    const nov1Matches = markup.match(/aria-label="1 November 2026"/g);
    expect(nov1Matches).toHaveLength(1);

    // October 28 and October 1 within the current month are each matched exactly once
    const oct28Matches = markup.match(/aria-label="28 October 2026"/g);
    expect(oct28Matches).toHaveLength(1);
    const oct1Matches = markup.match(/aria-label="1 October 2026"/g);
    expect(oct1Matches).toHaveLength(1);
  });
});
