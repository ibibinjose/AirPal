import { describe, expect, it } from "vitest";
import {
  BUSINESS_CATEGORY_PRESETS,
  BUSINESS_CTA_PRESETS,
  PERSONAL_CATEGORY_PRESETS,
  PERSONAL_CTA_PRESETS,
  formatFinalLinkHref,
  newCatalogItemError,
  newLinkError,
} from "./bio-edit-presets";

describe("bio edit presets", () => {
  it("offers personal and business categories and CTAs", () => {
    expect(PERSONAL_CATEGORY_PRESETS.length).toBeGreaterThan(0);
    expect(BUSINESS_CATEGORY_PRESETS.length).toBeGreaterThan(0);
    expect(PERSONAL_CTA_PRESETS).toContain("Catch Up");
    expect(BUSINESS_CTA_PRESETS).toContain("Book Table");
  });
});

describe("formatFinalLinkHref", () => {
  it("normalizes social handles to canonical urls", () => {
    expect(formatFinalLinkHref("instagram", "@alex_sydney")).toBe("https://instagram.com/alex_sydney");
    expect(formatFinalLinkHref("instagram", "https://instagram.com/alex_sydney/")).toBe(
      "https://instagram.com/alex_sydney",
    );
    expect(formatFinalLinkHref("x", "https://twitter.com/alexsydney")).toBe("https://x.com/alexsydney");
    expect(formatFinalLinkHref("whatsapp", "61400123456")).toBe("https://wa.me/61400123456");
  });

  it("handles call, http, bare domains, and blanks", () => {
    expect(formatFinalLinkHref("call", "0400 123 456")).toBe("tel:0400123456");
    expect(formatFinalLinkHref("call", "tel:+61234567890")).toBe("tel:+61234567890");
    expect(formatFinalLinkHref("website", "https://example.com/menu")).toBe("https://example.com/menu");
    expect(formatFinalLinkHref("website", "example.com/menu")).toBe("https://example.com/menu");
    expect(formatFinalLinkHref("website", "  ")).toBe("");
  });
});

describe("newLinkError", () => {
  it("flags empty and whitespace-only input instead of silently no-oping", () => {
    expect(newLinkError("website", "")).toContain("Enter a value first");
    expect(newLinkError("instagram", "   ")).toContain("Enter a value first");
  });

  it("flags invalid urls for website links", () => {
    expect(newLinkError("website", "not a url")).toContain("valid URL");
  });

  it("passes real values through", () => {
    expect(newLinkError("website", "https://example.com/menu")).toBeNull();
    expect(newLinkError("website", "example.com/menu")).toBeNull();
    expect(newLinkError("instagram", "alex_sydney")).toBeNull();
  });
});

describe("newCatalogItemError", () => {
  it("flags empty and whitespace-only titles instead of silently no-oping", () => {
    expect(newCatalogItemError("", 0)).toContain("title first");
    expect(newCatalogItemError("   ", 0)).toContain("title first");
  });

  it("flags a full category and passes valid items", () => {
    expect(newCatalogItemError("10% Off Coffee", 8)).toContain("full");
    expect(newCatalogItemError("10% Off Coffee", 3)).toBeNull();
  });
});
