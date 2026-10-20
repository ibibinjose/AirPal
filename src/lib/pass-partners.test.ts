import { describe, expect, it } from "vitest";
import { DEMO_PASS_PARTNERS } from "@shared/partner";
import type { Promotion } from "@shared/promotions";
import { filterPassPartners, partnerCategoryLabel, promotionMatchesPartner } from "./pass-partners";

describe("pass-partners lib", () => {
  it("labels known categories and falls back for unknown ones", () => {
    expect(partnerCategoryLabel("coffee")).toBe("Coffee");
    expect(partnerCategoryLabel("nope")).toBe("Partner");
  });

  it("filters by category and searches name, tagline, and description", () => {
    const all = filterPassPartners(DEMO_PASS_PARTNERS, { search: "", category: "All" });
    expect(all).toHaveLength(4);

    const coffee = filterPassPartners(DEMO_PASS_PARTNERS, { search: "", category: "coffee" });
    expect(coffee.map((p) => p.slug)).toEqual(["demo-coffee-house"]);

    const searched = filterPassPartners(DEMO_PASS_PARTNERS, { search: "bike", category: "All" });
    expect(searched.map((p) => p.slug)).toEqual(["demo-bike-repair-co"]);

    const none = filterPassPartners(DEMO_PASS_PARTNERS, { search: "zzz-no-match", category: "All" });
    expect(none).toHaveLength(0);
  });

  it("matches live promotions by sponsor name only", () => {
    const promo = { sponsorName: "  Demo Coffee House " } as Promotion;
    expect(promotionMatchesPartner(promo, "Demo Coffee House")).toBe(true);
    expect(promotionMatchesPartner(promo, "Demo Bike Repair Co")).toBe(false);
    expect(promotionMatchesPartner({ sponsorName: "" } as Promotion, "Demo Coffee House")).toBe(false);
  });
});
