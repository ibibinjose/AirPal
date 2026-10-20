import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DEMO_PASS_PARTNERS } from "@shared/partner";
import type { Promotion } from "@shared/promotions";
import { PassPartnerDetailView, PassPartnerNotFound } from "./PassPartnerDetailPage";

vi.mock("wouter", () => ({
  useLocation: () => ["/pass/partners/demo-coffee-house", vi.fn()],
  Link: ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) =>
    createElement("a", { href, className }, children),
}));

const partner = DEMO_PASS_PARTNERS[0]!;

const offer = {
  id: "promo-1",
  title: "Demo guest perk",
  prizeValue: "15% off",
  locationText: "Demo Lane",
  targetType: "event",
  targetId: "evt-123",
  sponsorName: "Demo Coffee House",
  status: "live",
} as unknown as Promotion;

describe("PassPartnerDetailPage", () => {
  it("renders about, how-to-earn, and live offers with deep links", () => {
    const html = renderToStaticMarkup(createElement(PassPartnerDetailView, { partner, offers: [offer], related: [] }));

    expect(html).toContain("Demo Coffee House");
    expect(html).toContain("About");
    expect(html).toContain("How to earn the perk");
    expect(html).toContain("Live offers");
    expect(html).toContain("Demo guest perk");
    expect(html).toContain("/deals/promo-1");
    expect(html).toContain("/e/evt-123");
  });

  it("notes when there are no live offers", () => {
    const html = renderToStaticMarkup(createElement(PassPartnerDetailView, { partner, offers: [], related: [] }));

    expect(html).toContain("No live offers right now");
  });

  it("renders a graceful not-found for unknown slugs", () => {
    const html = renderToStaticMarkup(createElement(PassPartnerNotFound, { slug: "no-such-place" }));

    expect(html).toContain("We could not find that partner");
    expect(html).toContain("no-such-place");
    expect(html).toContain("Browse partners");
  });
});
