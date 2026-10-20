import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { PartnerApplication } from "@shared/partner";
import type { Promotion } from "@shared/promotions";
import { BusinessPartnerEmpty, PartnerApplicationTracker, PartnerOfferList } from "./BusinessPartnerPage";

vi.mock("wouter", () => ({
  useLocation: () => ["/business/partner", vi.fn()],
  Link: ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) =>
    createElement("a", { href, className }, children),
}));

function application(overrides: Partial<PartnerApplication>): PartnerApplication {
  return {
    id: "app-1",
    applicantUid: "u123",
    businessName: "Demo Coffee House",
    category: "coffee",
    contactName: "Sam Owner",
    contactEmail: "owner@example.com",
    pitch: "An obviously-fake demo pitch for testing.",
    status: "submitted",
    createdAt: "2026-02-01T00:00:00.000Z",
    updatedAt: "2026-02-02T00:00:00.000Z",
    ...overrides,
  };
}

describe("BusinessPartnerPage", () => {
  it("gates non-partners with an honest empty state linking to apply", () => {
    const html = renderToStaticMarkup(createElement(BusinessPartnerEmpty));

    expect(html).toContain("You are not a Pass partner yet");
    expect(html).toContain("Apply to partner");
    expect(html).toContain("Browse partners");
  });

  it("tracks submitted, needs-info, and rejected states with reasons", () => {
    const html = renderToStaticMarkup(
      createElement(PartnerApplicationTracker, {
        applications: [
          application({ id: "a1", status: "submitted" }),
          application({ id: "a2", status: "under_review", adminNote: "Please add opening hours." }),
          application({ id: "a3", status: "rejected", adminNote: "Outside coverage area." }),
        ],
      }),
    );

    expect(html).toContain("Application status");
    expect(html).toContain("Submitted");
    expect(html).toContain("Needs info");
    expect(html).toContain("Please add opening hours.");
    expect(html).toContain("Rejected");
    expect(html).toContain("Outside coverage area.");
  });

  it("renders nothing when there are no applications", () => {
    const html = renderToStaticMarkup(createElement(PartnerApplicationTracker, { applications: [] }));
    expect(html).toBe("");
  });

  it("links offers to live deals, promotion management, and live events only", () => {
    const offer = {
      id: "promo-1",
      title: "Demo guest perk",
      prizeValue: "15% off",
      targetType: "event",
      targetId: "evt-123",
      sponsorName: "Demo Coffee House",
      status: "live",
    } as unknown as Promotion;
    const html = renderToStaticMarkup(
      createElement(PartnerOfferList, { offers: [offer], partnerName: "Demo Coffee House" }),
    );

    expect(html).toContain("Demo guest perk");
    expect(html).toContain("/deals/promo-1");
    expect(html).toContain("/business/promotions");
    expect(html).toContain("/e/evt-123");
  });

  it("points at promotion management when there are no live offers", () => {
    const html = renderToStaticMarkup(
      createElement(PartnerOfferList, { offers: [], partnerName: "Demo Coffee House" }),
    );

    expect(html).toContain("No live offers right now");
    expect(html).toContain("/business/promotions/new");
  });
});
