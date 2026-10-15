import { describe, expect, it } from "vitest";
import { BUSINESS_CATEGORIES } from "@shared/business";
import {
  claimCategoryLabel,
  hospitalityClaimCategories,
  isHospitalityCategory,
  otherClaimCategories,
} from "./claim-categories";

describe("claim categories", () => {
  it("leads with hospitality and keeps every category available", () => {
    const hospitality = hospitalityClaimCategories();
    expect(hospitality.map((row) => row.id)).toEqual(["eat", "coffee", "bar", "club", "stay"]);
    const rest = otherClaimCategories();
    expect(new Set([...hospitality, ...rest].map((row) => row.id))).toEqual(
      new Set(BUSINESS_CATEGORIES.map((row) => row.id)),
    );
  });

  it("labels categories and detects hospitality", () => {
    expect(claimCategoryLabel("bar")).toBe("Bar");
    expect(claimCategoryLabel("stay")).toBe("Stay");
    expect(claimCategoryLabel("nope")).toBe("Venue");
    expect(isHospitalityCategory("coffee")).toBe(true);
    expect(isHospitalityCategory("parking")).toBe(false);
  });
});
