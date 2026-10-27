import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BusinessPage } from "./BusinessPage";

const searchBox = vi.hoisted(() => ({ current: "?tab=place" }));
vi.mock("wouter", () => ({
  useLocation: () => ["/business", vi.fn()],
  useSearch: () => searchBox.current,
  Link: ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) =>
    createElement("a", { href, className }, children),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { uid: "u123", email: "owner@example.com", displayName: "QA Owner", emailVerified: true },
    authReady: true,
    logout: vi.fn(),
  }),
}));

const listing = {
  id: "list-qa",
  placeId: "place-qa",
  ownerUid: "u123",
  ownerEmail: "owner@example.com",
  name: "AirPal QA Test Venue",
  category: "eat",
  placeCategory: "eat",
  address: "1 Test St\nSydney NSW 2000\nAustralia",
  geo: { lat: -33.86, lng: 151.2 },
  hours: "Mon–Sun · 9am–9pm",
  shortWhy: "QA venue",
  handle: "airpalqatestvenue",
  status: "active",
  precinctId: "sydney",
  hoursVerifiedAt: new Date().toISOString(),
};

const mineBox = vi.hoisted(() => ({ listing: null as typeof listing | null }));
mineBox.listing = listing;
vi.mock("@/contexts/ListingsContext", () => ({
  useListings: () => ({
    listings: mineBox.listing ? [mineBox.listing] : [],
    mine: mineBox.listing,
    myListings: mineBox.listing ? [mineBox.listing] : [],
    selectedListingId: null,
    setSelectedListingId: vi.fn(),
    remoteLoaded: true,
    version: 1,
    createPlace: vi.fn(),
    savePlace: vi.fn(),
    saveDeal: vi.fn(),
    confirmHours: vi.fn(),
    deleteListing: vi.fn(),
  }),
}));

vi.mock("@/contexts/BioContext", () => ({
  useBio: () => ({
    mine: { id: "bio-person", handle: "airpalqa", name: "QA Owner", kind: "person", city: "Sydney" },
    business: undefined,
    biosReady: true,
    updateProfile: vi.fn(),
    createProfile: vi.fn(),
  }),
}));

vi.mock("@/hooks/useLocalNow", () => ({
  useLocalNow: () => ({ here: { lat: -33.86, lng: 151.2 }, city: "Sydney" }),
}));

vi.mock("@/contexts/LocaleContext", () => ({
  useLocale: () => ({ locale: "en-AU", region: "AU" }),
}));

describe("BusinessPage direct ?tab=place load", () => {
  it("renders the venue tab without throwing", () => {
    searchBox.current = "?tab=place";
    const markup = renderToStaticMarkup(createElement(BusinessPage));
    expect(markup).toContain("Venue Details");
  });

  it("renders the default place tab without a query string", () => {
    searchBox.current = "";
    const markup = renderToStaticMarkup(createElement(BusinessPage));
    expect(markup).toContain("Venue Details");
  });
});

describe("BusinessPage without a venue", () => {
  it("renders the launch CTA without throwing", () => {
    searchBox.current = "?tab=place";
    mineBox.listing = null;
    try {
      const markup = renderToStaticMarkup(createElement(BusinessPage));
      expect(markup).toContain("Launch your business");
    } finally {
      mineBox.listing = listing;
    }
  });
});
