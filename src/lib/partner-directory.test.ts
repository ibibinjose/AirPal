import { describe, expect, it } from "vitest";
import { PARTNER_DIRECTORY_SOURCE, UNCLAIMED_PARTNERS, filterUnclaimedPartners } from "./partner-directory";

describe("unclaimed partner directory", () => {
  it("holds sourced names only — no links, offers, or partnership claims", () => {
    expect(UNCLAIMED_PARTNERS.length).toBeGreaterThan(100);
    expect(PARTNER_DIRECTORY_SOURCE).toContain("public names only");
    const seen = new Set<string>();
    for (const name of UNCLAIMED_PARTNERS) {
      expect(name.length).toBeGreaterThanOrEqual(2);
      expect(name).not.toMatch(/https?:|\[|\]/);
      const key = name.toLowerCase();
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });

  it("filters by substring, case-insensitive, blank returns all", () => {
    expect(filterUnclaimedPartners(UNCLAIMED_PARTNERS, "adidas")).toEqual(["Adidas"]);
    expect(filterUnclaimedPartners(UNCLAIMED_PARTNERS, "  ")).toHaveLength(UNCLAIMED_PARTNERS.length);
    expect(filterUnclaimedPartners(UNCLAIMED_PARTNERS, "zzz-no-such-brand")).toEqual([]);
  });
});
