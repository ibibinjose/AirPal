import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("@/lib/functions", () => ({
  liveBackendEnabled: () => true,
  validateEventCouponRemote: vi.fn(),
}));
vi.mock("@/lib/native", () => ({
  triggerHaptic: () => undefined,
}));
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { EventRegistrationCard } from "./EventRegistrationCard";

const BASE = {
  eventId: "evt-1",
  paidCents: 2500,
  isGoing: false,
  buying: false,
  tier: "standard",
  spots: 1,
  onTierChange: () => undefined,
  onSpotsChange: () => undefined,
  onSubmit: () => undefined,
};

describe("EventRegistrationCard", () => {
  it("renders named tiers from the event instead of legacy tiers", () => {
    const markup = renderToStaticMarkup(
      createElement(EventRegistrationCard, {
        ...BASE,
        tier: "vip",
        tiers: [
          { id: "general", name: "General", priceCents: 2500 },
          { id: "vip", name: "VIP", priceCents: 5000 },
        ],
      }),
    );
    expect(markup).toContain("General");
    expect(markup).toContain("VIP");
    expect(markup).not.toContain("Group (4)");
  });

  it("renders a server-validated coupon field for paid events, none for free", () => {
    const paid = renderToStaticMarkup(createElement(EventRegistrationCard, BASE));
    expect(paid).toContain("Coupon or promo code");
    const free = renderToStaticMarkup(createElement(EventRegistrationCard, { ...BASE, paidCents: 0 }));
    expect(free).not.toContain("Coupon or promo code");
    expect(free).toContain("Register Free Pass");
  });

  it("never mentions global hardcoded codes", () => {
    const markup = renderToStaticMarkup(createElement(EventRegistrationCard, BASE));
    expect(markup).not.toContain("AIRPAL5");
    expect(markup).not.toContain("VIP10");
    expect(markup).not.toContain("EARLYBIRD");
    expect(markup).not.toContain("COMMUNITY20");
  });
});
