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
  it("formats trailing cells after October 31 with their actual month name (November)", () => {
    // October 2026: October 31 is Saturday, trailing day Sunday is Nov 1, 2026
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

    // The trailing cell for November 1 must be labeled with its actual month (November 2026)
    // rather than duplicating October 2026.
    expect(markup).toContain('aria-label="1 November 2026"');
    const oct1Matches = markup.match(/aria-label="1 October 2026"/g);
    expect(oct1Matches).toHaveLength(1);
  });
});
