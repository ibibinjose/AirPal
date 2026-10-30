import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { VenueProfileTab, type VenueProfileValues } from "./VenueProfileTab";
import { emptyAddress } from "@shared/geo-address";

vi.mock("wouter", () => ({
  Link: ({ children, href, className }: Record<string, unknown>) => createElement("a", { href, className }, children),
  useLocation: () => ["/business", vi.fn()],
  useSearch: () => "",
  useRoute: () => [false, {}],
}));

// Heavy children need app contexts (local time, uploads, freshness jobs) that
// don't exist in the node test env — stub them; this suite covers the tab's
// own form wiring, not theirs.
vi.mock("@/components/business/GooglePlaceImport", () => ({
  GooglePlaceImportCard: () => createElement("div", { "data-testid": "place-import" }),
}));
vi.mock("@/components/host/HostFreshnessBanner", () => ({
  HostFreshnessBanner: () => createElement("div", { "data-testid": "freshness" }),
}));
vi.mock("@/components/media/ImageField", () => ({
  ImageField: ({ value }: { value: string }) =>
    createElement("div", { "data-testid": "hero-field" }, value || "no-hero"),
}));

const values: VenueProfileValues = {
  name: "QA Test Venue",
  address: { ...emptyAddress("AU"), line1: "1 Test St", city: "Sydney" },
  hours: "Mon–Sun · 9am–5pm",
  shortWhy: "QA test venue, please ignore.",
  description: "A venue used by automated checks.",
  phone: "+61 400 000 000",
  geo: { lat: -33.86, lng: 151.2 },
  category: "eat",
  hero: "",
};

const handlers = {
  onChange: () => undefined,
  onSubmit: () => undefined,
  onImportPlace: () => undefined,
  onHeroChange: () => undefined,
  onLocate: () => undefined,
  onConfirmHours: () => undefined,
};

function renderHtml(extra: Partial<typeof values> = {}, busy = false) {
  return renderToStaticMarkup(
    createElement(VenueProfileTab, {
      listing: { handle: "qatestvenue", hoursVerifiedAt: "2026-01-01T00:00:00Z" },
      values: { ...values, ...extra },
      busy,
      locating: false,
      ...handlers,
    }),
  );
}

describe("VenueProfileTab", () => {
  it("renders the venue form with live values", () => {
    const html = renderHtml();
    expect(html).toContain("Venue Details &amp; Media");
    expect(html).toContain("Google Place Sync");
    expect(html).toContain('value="QA Test Venue"');
    expect(html).toContain("Save Venue Changes");
  });

  it("disables the save button while saving", () => {
    expect(renderHtml({}, true)).toContain("disabled");
  });

  it("warns when the street address is missing", () => {
    const html = renderHtml({ address: emptyAddress("AU") });
    expect(html).toContain("suburb alone is not enough to save");
  });

  it("shows the pinned GPS state when located", () => {
    expect(renderHtml()).toContain("GPS Pinned");
    const html = renderHtml({ geo: undefined });
    expect(html).toContain("Use My Location");
  });
});
