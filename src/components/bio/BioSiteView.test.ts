import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { BioProfile } from "@shared/bio";
import { BioSiteModal, BioSiteView } from "./BioSiteView";

vi.mock("@/hooks/useScrollLock", () => ({
  useScrollLock: () => undefined,
}));

function profile(): BioProfile {
  return {
    id: "b1",
    handle: "bibin",
    kind: "person",
    name: "Bibin Jose",
    shortWhy: "Coffee first, community always.",
    city: "Ashfield",
    category: "things",
    hours: "",
    openNow: false,
    products: [],
    services: [],
    deals: [],
    links: [
      { id: "l1", type: "website", label: "My portfolio", href: "https://example.com" },
      { id: "l2", type: "instagram", label: "Instagram", href: "https://instagram.com/bibin" },
      { id: "l3", type: "call", label: "Call", href: "tel:+61123456789" },
    ],
  };
}

describe("BioSiteView", () => {
  it("renders a biosites-style card from the handle profile", () => {
    const markup = renderToStaticMarkup(
      createElement(BioSiteView, {
        profile: profile(),
        siteUrl: "https://airpal.bio/bio/@bibin",
      }),
    );
    expect(markup).toContain("Bibin Jose");
    expect(markup).toContain("@bibin");
    expect(markup).toContain("Ashfield");
    expect(markup).toContain("My portfolio");
    expect(markup).toContain("https://example.com");
    expect(markup).toContain("Instagram");
    expect(markup).toContain("Copy BioSite link");
    expect(markup).toContain("airpal.bio/bio/@bibin");
  });

  it("renders nothing when the modal is closed", () => {
    const markup = renderToStaticMarkup(
      createElement(BioSiteModal, {
        open: false,
        onClose: () => undefined,
        profile: profile(),
        siteUrl: "https://airpal.bio/bio/@bibin",
      }),
    );
    expect(markup).toBe("");
  });
});
