import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { RewardsBalance } from "./RewardsBalance";
import { RewardsEarnList } from "./RewardsEarnList";
import { RewardsCatalog } from "./RewardsCatalog";
import { RewardsHistory } from "./RewardsHistory";
import { RewardsBusinessCta } from "./RewardsBusinessCta";
import type { Promotion } from "@shared/promotions";

vi.mock("wouter", () => ({
  Link: ({ children, href, className }: Record<string, unknown>) => createElement("a", { href, className }, children),
}));

describe("Rewards components", () => {
  it("renders signed-in member points balance, redeemed count, and referral count", () => {
    const markup = renderToStaticMarkup(
      createElement(RewardsBalance, {
        points: 125,
        redeemedCount: 3,
        referralCount: 4,
        loading: false,
        signedIn: true,
      }),
    );

    expect(markup).toContain("AirPal Rewards balance");
    expect(markup).toContain("125");
    expect(markup).toContain("3");
    expect(markup).toContain("rewards redeemed");
    expect(markup).toContain("4");
    expect(markup).toContain("mates joined");
    expect(markup).not.toContain("Sign in to earn");
  });

  it("renders signed-out state with sign-in CTA", () => {
    const markup = renderToStaticMarkup(
      createElement(RewardsBalance, {
        points: 0,
        redeemedCount: 0,
        referralCount: 0,
        loading: false,
        signedIn: false,
      }),
    );

    expect(markup).toContain("–");
    expect(markup).toContain("Sign in to earn");
    expect(markup).toContain('href="/start"');
  });

  it("renders earn rules list with live points amounts and 44px touch targets", () => {
    const markup = renderToStaticMarkup(createElement(RewardsEarnList));
    expect(markup).toContain("How to earn");
    expect(markup).toContain("Bring a mate");
    expect(markup).toContain("Get scanned in");
    expect(markup).toContain("Redeem in-store");
    expect(markup).toContain("Spend points");
    expect(markup).toContain("min-h-[44px]");
  });

  it("renders points-priced catalog and marks affordable vs unaffordable offers", () => {
    const items: Promotion[] = [
      {
        id: "promo-1",
        ownerUid: "u1",
        kind: "promotion",
        status: "live",
        title: "Free Flat White",
        description: "Morning coffee perk",
        category: "Food & Drink",
        mechanicType: "reward",
        sponsorName: "Surry Hills Roasters",
        pointsCost: 20,
        createdAt: "2026-10-01T00:00:00Z",
        updatedAt: "2026-10-01T00:00:00Z",
      },
      {
        id: "promo-2",
        ownerUid: "u1",
        kind: "promotion",
        status: "live",
        title: "VIP Backstage Pass",
        description: "Festival upgrade",
        category: "Music & Nightlife",
        mechanicType: "reward",
        sponsorName: "Harbour Live",
        pointsCost: 100,
        createdAt: "2026-10-01T00:00:00Z",
        updatedAt: "2026-10-01T00:00:00Z",
      },
    ];

    const markup = renderToStaticMarkup(
      createElement(RewardsCatalog, {
        items,
        balance: 50,
        loading: false,
        signedIn: true,
      }),
    );

    expect(markup).toContain("Free Flat White");
    expect(markup).toContain("20 pts");
    expect(markup).toContain("bg-emerald-500/10");
    expect(markup).toContain("VIP Backstage Pass");
    expect(markup).toContain("100 pts");
  });

  it("renders points transaction history for signed-in members and hides for signed-out", () => {
    const signedOutMarkup = renderToStaticMarkup(
      createElement(RewardsHistory, {
        rows: [],
        loading: false,
        signedIn: false,
      }),
    );
    expect(signedOutMarkup).toBe("");

    const signedInMarkup = renderToStaticMarkup(
      createElement(RewardsHistory, {
        rows: [
          { id: "tx-1", uid: "u1", delta: 10, reason: "event_checkin", at: "2026-10-30T10:00:00Z" },
          { id: "tx-2", uid: "u1", delta: -15, reason: "offer_redeem", at: "2026-10-30T12:00:00Z" },
        ],
        loading: false,
        signedIn: true,
      }),
    );
    expect(signedInMarkup).toContain("+10");
    expect(signedInMarkup).toContain("-15");
  });

  it("renders business CTA linking to /business", () => {
    const markup = renderToStaticMarkup(createElement(RewardsBusinessCta));
    expect(markup).toContain('href="/business"');
    expect(markup).toContain("For business");
    expect(markup).toContain("Fund rewards for your customers");
  });
});
