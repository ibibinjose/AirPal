import { BUSINESS_CATEGORIES, type BusinessCategoryId } from "@shared/business";

/**
 * Claim-form categories. Hospitality (food, drink, stay) leads because venue
 * claims are a hospitality flow; every other AirPal category stays available
 * so non-hospitality venues are never locked out.
 */
export const HOSPITALITY_CATEGORY_IDS: BusinessCategoryId[] = ["eat", "coffee", "bar", "club", "stay"];

export function hospitalityClaimCategories(): Array<{ id: BusinessCategoryId; label: string; line: string }> {
  return HOSPITALITY_CATEGORY_IDS.map((id) => {
    const hit = BUSINESS_CATEGORIES.find((row) => row.id === id);
    return { id, label: hit?.label || id, line: hit?.line || "" };
  });
}

export function otherClaimCategories(): Array<{ id: BusinessCategoryId; label: string; line: string }> {
  return BUSINESS_CATEGORIES.filter((row) => !HOSPITALITY_CATEGORY_IDS.includes(row.id)).map((row) => ({
    id: row.id,
    label: row.label,
    line: row.line,
  }));
}

export function claimCategoryLabel(id: string): string {
  return BUSINESS_CATEGORIES.find((row) => row.id === id)?.label || "Venue";
}

export function isHospitalityCategory(id: string): boolean {
  return (HOSPITALITY_CATEGORY_IDS as string[]).includes(id);
}
