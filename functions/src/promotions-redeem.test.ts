import { describe, expect, it } from "vitest";
import { promotionRedemptionId } from "./promotions";

describe("promotionRedemptionId", () => {
  it("is stable per member per offer so retries replay instead of recharging", () => {
    expect(promotionRedemptionId("uid-1", "promo-9")).toBe(promotionRedemptionId("uid-1", "promo-9"));
  });

  it("separates members and offers", () => {
    expect(promotionRedemptionId("uid-1", "promo-9")).not.toBe(promotionRedemptionId("uid-2", "promo-9"));
    expect(promotionRedemptionId("uid-1", "promo-9")).not.toBe(promotionRedemptionId("uid-1", "promo-10"));
  });

  it("sanitizes unsafe characters so the id is always a valid doc id", () => {
    const id = promotionRedemptionId("uid/1..", "promo 9/ok");
    expect(id).not.toMatch(/[/\s]/);
    expect(id.length).toBeGreaterThan(0);
  });
});
