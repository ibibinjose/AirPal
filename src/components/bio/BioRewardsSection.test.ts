import { describe, expect, it, vi } from "vitest";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BioRewardsSection } from "./BioRewardsSection";
import type { BioProfile } from "@shared/bio";

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

describe("BioRewardsSection", () => {
  it("renders door check-in, in-store perk and rewards pass pillars", () => {
    const markup = renderToStaticMarkup(
      createElement(BioRewardsSection, {
        bio: TEST_BIO,
        pointsBalance: 45,
        deals: [],
        onClaimDeal: vi.fn(),
      }),
    );
    expect(markup).toContain("Rewards &amp; Perks at AirPal QA Test Host");
    expect(markup).toContain("+10 pts");
    expect(markup).toContain("Door Check-In");
    expect(markup).toContain("+5 pts");
    expect(markup).toContain("In-Store Perks");
    expect(markup).toContain("45 pts");
    expect(markup).toContain("Rewards Catalog");
  });

  it("renders active business deals and claim button", () => {
    const markup = renderToStaticMarkup(
      createElement(BioRewardsSection, {
        bio: TEST_BIO,
        pointsBalance: 0,
        deals: [
          {
            id: "deal-1",
            kind: "deal",
            title: "Free House Cocktail with Main",
            detail: "Order any main dish and receive a signature cocktail.",
            badge: "Member Perk",
          },
        ],
        liveOffer: {
          badge: "Happy Hour",
          detail: "Half price appetizers from 4pm to 6pm.",
          title: "Happy Hour Special",
        },
        onClaimDeal: vi.fn(),
      }),
    );
    expect(markup).toContain("Active Perks at this Venue (2)");
    expect(markup).toContain("Free House Cocktail with Main");
    expect(markup).toContain("Happy Hour Special");
    expect(markup).toContain("Claim This Perk");
    expect(markup).toContain("Claim Deal");
  });
});
