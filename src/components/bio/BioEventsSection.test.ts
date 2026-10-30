import { describe, expect, it, vi } from "vitest";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BioEventsSection } from "./BioEventsSection";
import type { BioProfile } from "@shared/bio";
import type { EventRecord } from "@shared/event";

vi.mock("wouter", () => ({
  Link: ({ children, href, className }: { children: ReactNode; href: string; className?: string }) =>
    createElement("a", { href, className }, children),
}));

const TEST_BIO: BioProfile = {
  id: "bio-testhost",
  handle: "airpalqatesthost",
  name: "AirPal QA Test Host",
  kind: "business",
  visibility: "public",
  city: "Sydney",
  category: "eat",
  shortWhy: "QA test venue",
  hours: "9am–9pm",
  openNow: true,
  deals: [],
  products: [],
  services: [],
  links: [],
};

const SAMPLE_EVENT: EventRecord = {
  id: "evt-test-1",
  name: "Saturday Sunset Acoustic Live",
  flavour: "event_space",
  city: "Sydney",
  venue: "AirPal QA Test Host",
  startsAt: "2026-10-31T19:00:00+11:00",
  endsAt: "2026-10-31T22:00:00+11:00",
  status: "live",
  ticketPriceCents: 2500,
  capacity: 50,
};

describe("BioEventsSection", () => {
  it("renders empty state with call to action when no events are scheduled", () => {
    const markup = renderToStaticMarkup(
      createElement(BioEventsSection, {
        events: [],
        bio: TEST_BIO,
        isOwner: false,
        onNavigate: vi.fn(),
      }),
    );
    expect(markup).toContain("No upcoming events scheduled yet");
    expect(markup).toContain("Explore Sydney Events");
  });

  it("renders owner create event button when owner views empty events", () => {
    const markup = renderToStaticMarkup(
      createElement(BioEventsSection, {
        events: [],
        bio: TEST_BIO,
        isOwner: true,
        onNavigate: vi.fn(),
      }),
    );
    expect(markup).toContain("Host Your First Event");
    expect(markup).toContain("Add Event");
  });

  it("renders event details, ticket price, calendar sync and pass button", () => {
    const markup = renderToStaticMarkup(
      createElement(BioEventsSection, {
        events: [SAMPLE_EVENT],
        bio: TEST_BIO,
        isOwner: false,
        onNavigate: vi.fn(),
      }),
    );
    expect(markup).toContain("Saturday Sunset Acoustic Live");
    expect(markup).toContain("$25.00");
    expect(markup).toContain("AirPal QA Test Host");
    expect(markup).toContain("Get Pass");
    expect(markup).toContain("Sync");
  });
});
