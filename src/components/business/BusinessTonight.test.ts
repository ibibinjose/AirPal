import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BusinessTonight, tonightActions } from "./BusinessTonight";

vi.mock("wouter", () => ({
  useLocation: () => ["/business", vi.fn()],
  Link: ({ children, href, className }: Record<string, unknown>) => createElement("a", { href, className }, children),
}));

describe("tonightActions", () => {
  it("queues setup, offer, and campaign for a fresh draft venue", () => {
    const actions = tonightActions({
      listingActive: false,
      listingName: "Test Venue",
      dealLive: false,
      campaigns: 0,
      rsvps: 0,
    });
    expect(actions.map((a) => a.id)).toEqual(["setup", "offer", "campaign"]);
    expect(actions[0].href).toBe("/business/setup");
  });

  it("caps the queue at three and prefers the door list when guests incoming", () => {
    const actions = tonightActions({
      listingActive: false,
      listingName: "Test Venue",
      dealLive: false,
      campaigns: 0,
      rsvps: 6,
    });
    expect(actions).toHaveLength(3);
    expect(actions.map((a) => a.id)).toEqual(["setup", "offer", "campaign"]);
  });

  it("is empty when everything is live with no incoming guests", () => {
    expect(tonightActions({ listingActive: true, listingName: "V", dealLive: true, campaigns: 2, rsvps: 0 })).toEqual(
      [],
    );
  });

  it("surfaces the door list when guests are incoming", () => {
    const actions = tonightActions({
      listingActive: true,
      listingName: "V",
      dealLive: true,
      campaigns: 2,
      rsvps: 6,
    });
    expect(actions.map((a) => a.id)).toEqual(["door"]);
    expect(actions[0].title).toContain("6 guests");
    expect(actions[0].href).toBe("/business?tab=list");
  });
});

describe("BusinessTonight", () => {
  it("renders the service card with door shortcut and belonging link", () => {
    const markup = renderToStaticMarkup(
      createElement(BusinessTonight, {
        listingName: "Test Venue",
        status: "active",
        hours: "Mon–Sun · 9am–9pm",
        dealLive: true,
        dealBadge: "10% OFF",
        campaigns: 2,
        rsvps: 6,
      }),
    );
    expect(markup).toContain("Live tonight");
    expect(markup).toContain("Open door list");
    expect(markup).toContain('href="/host/pulse"');
    expect(markup).toContain("6 guests");
  });

  it("shows setup help for a draft venue", () => {
    const markup = renderToStaticMarkup(
      createElement(BusinessTonight, {
        listingName: "Test Venue",
        status: "draft",
        hours: "",
        dealLive: false,
        campaigns: 0,
        rsvps: 0,
      }),
    );
    expect(markup).toContain("Not live yet");
    expect(markup).toContain("Finish getting live");
    expect(markup).toContain('href="/business/setup"');
  });
});
