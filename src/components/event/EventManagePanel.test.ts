import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("wouter", () => ({
  useRoute: () => [false, {}],
  useLocation: () => ["/", vi.fn()],
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => createElement("a", { href }, children),
}));
vi.mock("@/contexts/EventsContext", () => ({
  useEvents: () => ({
    upsertEvent: vi.fn(),
  }),
}));
vi.mock("@/components/event/EventShareModal", () => ({
  EventShareModal: () => null,
}));
vi.mock("@/lib/calendar-export", () => ({
  downloadIcs: vi.fn(),
}));
vi.mock("@/components/ui/Button", () => ({
  Button: ({ children, ...rest }: { children: React.ReactNode }) =>
    createElement("button", { type: "button", ...rest }, children),
}));

import { EventManagePanel } from "./EventManagePanel";
import type { EventRecord } from "@shared/event";

const EVENT = {
  id: "evt-123",
  name: "Rocks Night Market",
  flavour: "market",
  startsAt: new Date().toISOString(),
  endsAt: new Date().toISOString(),
  venue: "The Rocks",
  city: "Sydney",
  description: "Night market",
  shortWhy: "Market",
} as EventRecord;

describe("EventManagePanel", () => {
  it("links day-of ops to the real event, with no fabricated numbers", () => {
    const markup = renderToStaticMarkup(createElement(EventManagePanel, { event: EVENT }));
    expect(markup).toContain("/e/evt-123/guests");
    expect(markup).toContain("/scan");
    expect(markup).toContain("Clone as draft");
    expect(markup).toContain("Cancel event");
    expect(markup).not.toContain("1,842");
    expect(markup).not.toContain("priya");
  });
});
