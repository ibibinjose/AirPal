import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { glanceItemTab, MeOverview } from "./MeOverview";
import type { OverviewGlanceItem } from "./MeOverview";

vi.mock("wouter", () => ({
  useLocation: () => ["/me", vi.fn()],
}));

const noop = () => {};
const baseProps = {
  todayTotalCount: 1,
  agendaLoading: false,
  upcomingItems: [] as OverviewGlanceItem[],
  upcomingCatchupsCount: 0,
  upcomingTicketsCount: 0,
  hasPass: false,
  onGoTab: noop,
  onAddPlan: noop,
};

describe("glanceItemTab", () => {
  it("routes each kind to its full tab", () => {
    expect(glanceItemTab({ kind: "catchup" })).toBe("appointments");
    expect(glanceItemTab({ kind: "plan" })).toBe("today");
    expect(glanceItemTab({ kind: "ticket" })).toBe("tickets");
  });
});

describe("MeOverview", () => {
  it("renders tappable glance rows that name their destination", () => {
    const items: OverviewGlanceItem[] = [
      { id: "c1", title: "Coffee with Ana", sub: "Coffee · 10:00", kind: "catchup" },
    ];
    const markup = renderToStaticMarkup(createElement(MeOverview, { ...baseProps, todayItems: items }));
    expect(markup).toContain("Coffee with Ana");
    expect(markup).toContain("open in Catch-up");
    expect(markup).toContain("<button");
  });

  it("gives the empty upcoming state a Browse Pass action", () => {
    const markup = renderToStaticMarkup(createElement(MeOverview, { ...baseProps, todayItems: [] }));
    expect(markup).toContain("Nothing coming up");
    expect(markup).toContain("Browse Pass");
  });
});
