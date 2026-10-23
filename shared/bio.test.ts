import { describe, expect, it } from "vitest";
import {
  BIO_CATALOG_MAX,
  BIO_PUBLIC_PATH,
  BIO_THEMES,
  bioButtonLabel,
  bioKindLabel,
  bioThemeCssVars,
  catalogDeals,
  handleFromDomain,
  handleFromName,
  handleFromPlaceId,
  handleError,
  handleMatchesClaim,
  isBusinessKind,
  isClaimableBioProfile,
  isHexHandle,
  isSafeBioHref,
  isSocialLinkType,
  normalizeBioTheme,
  normalizeHandle,
  parseAtHandle,
  randomHexHandle,
  resolveBioTheme,
  resolveStatusPicks,
  sanitizeBioHref,
  sanitizeBioLinks,
  sanitizeCatalog,
  socialLinks,
  stackLinks,
} from "./bio";

describe("bio handle", () => {
  it("normalizes and validates", () => {
    expect(normalizeHandle("@CutBar")).toBe("cutbar");
    expect(handleError("ab")).toBeTruthy();
    expect(handleError("a".repeat(31))).toBeTruthy();
    expect(handleError("cutbar")).toBeNull();
    expect(handleError("host")).toBe("Taken");
    expect(handleError("vite")).toBe("Taken");
    expect(handleError("privacy")).toBe("Taken");
    expect(handleError("terms")).toBe("Taken");
    expect(handleError("cookies")).toBe("Taken");
    expect(handleError("about")).toBe("Taken");
    expect(handleError("contact")).toBe("Taken");
    expect(handleError("club")).toBe("Taken");
  });

  it("builds a valid hex handle", () => {
    const hex = randomHexHandle(8);
    expect(hex).toHaveLength(8);
    expect(isHexHandle(hex)).toBe(true);
    expect(handleError(hex)).toBeNull();
    expect(isHexHandle("cutbar")).toBe(false);
  });

  it("parses /@handle", () => {
    expect(parseAtHandle("/@cutbar")).toBe("cutbar");
    expect(parseAtHandle("/%40cutbar")).toBe("cutbar");
    expect(parseAtHandle("/q/sydney/cutbar")).toBeNull();
    expect(parseAtHandle("/partners")).toBeNull();
  });

  it("matches the public bio path without swallowing product routes", () => {
    expect(BIO_PUBLIC_PATH.test("/@cutbar")).toBe(true);
    expect(BIO_PUBLIC_PATH.exec("/@cutbar")?.[1]).toBe("cutbar");
    expect(BIO_PUBLIC_PATH.test("/@vite/client")).toBe(false);
    expect(BIO_PUBLIC_PATH.test("/partners")).toBe(false);
    expect(BIO_PUBLIC_PATH.test("/q/sydney/cutbar")).toBe(false);
  });

  it("keeps Maps and Call off the stacked list", () => {
    expect(
      stackLinks([
        { id: "1", type: "book", label: "Book", href: "https://x" },
        { id: "2", type: "maps", label: "Maps", href: "https://maps" },
        { id: "3", type: "call", label: "Call", href: "tel:1" },
      ]).map((l) => l.type),
    ).toEqual(["book"]);
    expect(
      socialLinks([
        { id: "1", type: "book", label: "Book", href: "https://x" },
        { id: "2", type: "instagram", label: "Instagram", href: "https://instagram.com/x" },
      ]).map((l) => l.type),
    ).toEqual(["instagram"]);
    expect(isSocialLinkType("tiktok")).toBe(true);
    expect(handleFromPlaceId("fortune-of-war")).toBe("fortuneofwar");
    expect(handleFromPlaceId("cut-bar-grill")).toBe("cutbargrill");
    expect(bioButtonLabel("CutBar")).toBe("@cutbar");
    expect(handleFromName("The Cut Bar & Grill")).toBe("cutbargrill");
    expect(handleFromName("Fortune of War")).toBe("fortunewar");
    expect(handleFromDomain("https://www.cutbar.com.au/menu")).toBe("cutbar");
    expect(handleMatchesClaim("cutbar", { name: "The Cut Bar", domain: "cutbar.com.au" })).toBe(true);
    expect(handleMatchesClaim("randomguest", { name: "The Cut Bar & Grill" })).toBe(false);
  });

  it("sanitizes catalog rows and caps length", () => {
    const rows = sanitizeCatalog("product", [
      { title: "  Ribeye  ", detail: "Charcoal", price: "$68", extra: true },
      { title: "" },
      ...Array.from({ length: 12 }, (_, i) => ({ title: `Item ${i}` })),
    ]);
    expect(rows[0]).toMatchObject({ kind: "product", title: "Ribeye", price: "$68" });
    expect(rows).toHaveLength(BIO_CATALOG_MAX);
  });

  it("falls back to the legacy single offer as a deal", () => {
    expect(catalogDeals({ deals: [], offer: { badge: "15% off", detail: "Till" } })).toEqual([
      { id: "offer", kind: "deal", title: "15% off", detail: "Till", badge: "Offer" },
    ]);
  });
});

describe("bio href allowlist", () => {
  it("allows http(s), tel, mailto, and site-relative links", () => {
    expect(isSafeBioHref("https://thecut.bar/menu")).toBe(true);
    expect(isSafeBioHref("http://example.com")).toBe(true);
    expect(isSafeBioHref("tel:+61400123123")).toBe(true);
    expect(isSafeBioHref("mailto:hello@airpal.me")).toBe(true);
    expect(isSafeBioHref("/@cutbar")).toBe(true);
  });

  it("blocks javascript, data, and other dangerous schemes", () => {
    expect(isSafeBioHref("javascript:alert(1)")).toBe(false);
    expect(isSafeBioHref("  JaVaScRiPt:alert(1)")).toBe(false);
    expect(isSafeBioHref("data:text/html,<script>alert(1)</script>")).toBe(false);
    expect(isSafeBioHref("vbscript:msgbox(1)")).toBe(false);
    expect(isSafeBioHref("ftp://files.example.com")).toBe(false);
    expect(isSafeBioHref("")).toBe(false);
    expect(isSafeBioHref(undefined)).toBe(false);
  });

  it("strips unsafe hrefs when sanitizing catalog rows", () => {
    const rows = sanitizeCatalog("product", [
      { title: "Good", href: "https://thecut.bar" },
      { title: "Evil", href: "javascript:alert(1)" },
    ]);
    expect(rows[0]?.href).toBe("https://thecut.bar");
    expect(rows[1]?.href).toBeUndefined();
    expect(sanitizeBioHref("data:text/html,x")).toBeUndefined();
  });

  it("keeps Instagram, Facebook, X, and website links", () => {
    const rows = sanitizeBioLinks([
      { id: "1", type: "instagram", label: "Instagram", href: "https://instagram.com/maya" },
      { id: "2", type: "facebook", label: "Facebook", href: "https://facebook.com/maya" },
      { id: "3", type: "x", label: "X", href: "https://x.com/maya" },
      { id: "4", type: "website", label: "Site", href: "https://maya.example" },
      { id: "5", type: "instagram", label: "Bad", href: "javascript:alert(1)" },
    ]);
    expect(rows.map((row) => row.type)).toEqual(["instagram", "facebook", "x", "website"]);
    expect(rows).toHaveLength(4);
  });
});

describe("claimable bio profiles", () => {
  it("offers claim only for ownerless business listings", () => {
    expect(isClaimableBioProfile({ id: "place-x", kind: "business" }, false)).toBe(true);
    expect(isClaimableBioProfile({ id: "stall-x", kind: "business" }, false)).toBe(true);
    expect(isClaimableBioProfile({ id: "bio-abc123", kind: "business" }, false)).toBe(true);
    expect(isClaimableBioProfile({ id: "event-1", kind: "business" }, false)).toBe(false);
  });

  it("never offers claim on person profiles", () => {
    expect(isClaimableBioProfile({ id: "bio-bibinjose", kind: "person" }, false)).toBe(false);
    expect(isClaimableBioProfile({ id: "bio-abc123", kind: "person" }, false)).toBe(false);
    expect(isClaimableBioProfile({ id: "place-x" }, false)).toBe(false);
  });

  it("never offers claim to the owner or when owned", () => {
    expect(isClaimableBioProfile({ id: "place-x", kind: "business" }, true)).toBe(false);
    expect(isClaimableBioProfile({ id: "place-x", kind: "business", ownerUid: "u1" }, false)).toBe(false);
  });
});

describe("profile kind identifier", () => {
  it("labels businesses and individuals", () => {
    expect(bioKindLabel("business")).toBe("Business");
    expect(bioKindLabel("person")).toBe("Individual");
    expect(bioKindLabel(undefined)).toBe("Individual");
    expect(bioKindLabel(null)).toBe("Individual");
  });

  it("detects business kind only for exact match", () => {
    expect(isBusinessKind("business")).toBe(true);
    expect(isBusinessKind("person")).toBe(false);
    expect(isBusinessKind(undefined)).toBe(false);
  });
});

describe("bio themes", () => {
  it("accepts known presets and collapses the default", () => {
    expect(normalizeBioTheme("midnight")).toBe("midnight");
    expect(normalizeBioTheme("mono")).toBe("mono");
    expect(normalizeBioTheme("ember")).toBe("ember");
    expect(normalizeBioTheme("fluro")).toBe("fluro");
    expect(normalizeBioTheme("volt")).toBe("volt");
    expect(normalizeBioTheme("AirPal")).toBeUndefined();
    expect(normalizeBioTheme(undefined)).toBeUndefined();
    expect(normalizeBioTheme("evil-theme")).toBeUndefined();
  });

  it("remaps retired presets to their closest surviving theme", () => {
    expect(normalizeBioTheme("forest")).toBe("volt");
    expect(normalizeBioTheme("eucalypt")).toBe("volt");
    expect(normalizeBioTheme("reef")).toBe("volt");
    expect(normalizeBioTheme("sunset")).toBe("ember");
    expect(normalizeBioTheme("blush")).toBe("fluro");
    expect(normalizeBioTheme("wattle")).toBe("midnight");
    // Pale Ocean stays light: it collapses to the AirPal default.
    expect(normalizeBioTheme("ocean")).toBeUndefined();
    expect(resolveBioTheme("forest").id).toBe("volt");
    expect(resolveBioTheme("sunset").id).toBe("ember");
    expect(resolveBioTheme("blush").id).toBe("fluro");
    expect(resolveBioTheme("wattle").id).toBe("midnight");
    expect(resolveBioTheme("ocean").id).toBe("airpal");
  });

  it("resolves unknown values to the default preset", () => {
    expect(resolveBioTheme("midnight").id).toBe("midnight");
    expect(resolveBioTheme("volt").id).toBe("volt");
    expect(resolveBioTheme("nope").id).toBe("airpal");
    expect(resolveBioTheme(undefined).id).toBe("airpal");
  });

  it("ships six unique presets with picker copy", () => {
    const ids = new Set(BIO_THEMES.map((theme) => theme.id));
    expect(ids.size).toBe(BIO_THEMES.length);
    expect(BIO_THEMES.length).toBe(6);
    expect([...ids].sort()).toEqual(["airpal", "ember", "fluro", "midnight", "mono", "volt"]);
    for (const theme of BIO_THEMES) {
      expect(theme.name.trim().length).toBeGreaterThan(0);
      expect(theme.blurb.trim().length).toBeGreaterThan(0);
    }
  });

  it("keeps every preset readable in both schemes (4.5:1 text contrast)", () => {
    for (const theme of BIO_THEMES) {
      expect(contrastRatio(theme.ink, theme.pageBg)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(theme.muted, theme.pageBg)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(theme.buttonText, theme.buttonBg)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(theme.darkInk, theme.darkPageBg)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(theme.darkMuted, theme.darkPageBg)).toBeGreaterThanOrEqual(4.5);
      // Card surfaces carry the same text, so they must pass too.
      expect(contrastRatio(theme.ink, theme.surface)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(theme.muted, theme.surface)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(theme.darkInk, theme.darkSurface)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(theme.darkMuted, theme.darkSurface)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("never paints text and buttons in the same colour as the page", () => {
    for (const theme of BIO_THEMES) {
      // Button fills must stand apart from the page so CTAs never blend in.
      expect(contrastRatio(theme.buttonBg, theme.pageBg)).toBeGreaterThan(1.5);
      // Accent highlights must never match the page (Mono intentionally
      // pairs a black accent with black buttons on white).
      expect(theme.accent.toLowerCase()).not.toBe(theme.pageBg.toLowerCase());
    }
  });

  it("emits every CSS var the public page and preview consume", () => {
    const vars = bioThemeCssVars(resolveBioTheme("volt"));
    for (const key of [
      "--bio-bg",
      "--bio-surface",
      "--bio-border",
      "--bio-ink",
      "--bio-muted",
      "--bio-accent",
      "--bio-btn",
      "--bio-btn-text",
      "--bio-radius",
      "--bio-hero-from",
      "--bio-hero-to",
      "--bio-dark-bg",
      "--bio-dark-surface",
      "--bio-dark-ink",
      "--bio-dark-muted",
    ]) {
      expect(vars[key]).toBeTruthy();
    }
    expect(vars["--bio-radius"]).toMatch(/^\d+px$/);
    expect(vars["--bio-bg"]).toBe(resolveBioTheme("volt").pageBg);
  });
});

function channelToLinear(value: number): number {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function relativeLuminance(hex: string): number {
  const match = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) throw new Error(`Not a 6-digit hex color: ${hex}`);
  const raw = match[1];
  const r = channelToLinear(parseInt(raw.slice(0, 2), 16));
  const g = channelToLinear(parseInt(raw.slice(2, 4), 16));
  const b = channelToLinear(parseInt(raw.slice(4, 6), 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(a: string, b: string): number {
  const [lighter, darker] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
}

describe("status picks", () => {
  it("resolves saved values with safe defaults", () => {
    expect(resolveStatusPicks({})).toEqual({ status: "available", customText: "", emoji: "☕" });
    expect(resolveStatusPicks({ status: "busy", customStatus: "Heads down", emoji: "💻" })).toEqual({
      status: "busy",
      customText: "Heads down",
      emoji: "💻",
    });
  });
});
