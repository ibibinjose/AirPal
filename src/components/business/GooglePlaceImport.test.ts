import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { GooglePlaceImportCard } from "./GooglePlaceImport";

vi.mock("@/hooks/useLocalNow", () => ({
  useLocalNow: () => ({ here: { lat: -33.86, lng: 151.2 }, city: "Sydney" }),
}));

describe("GooglePlaceImportCard variants", () => {
  it("bare renders the search without any card chrome or duplicate heading", () => {
    const markup = renderToStaticMarkup(createElement(GooglePlaceImportCard, { variant: "bare", onImport: () => {} }));
    expect(markup).toContain("The Glenmore Hotel");
    expect(markup).not.toContain("Import or sync the listing");
    expect(markup).not.toContain("From Google");
    expect(markup).not.toContain("rounded-3xl");
  });

  it("card keeps its heading and chrome for standalone panels", () => {
    const markup = renderToStaticMarkup(createElement(GooglePlaceImportCard, { variant: "card", onImport: () => {} }));
    expect(markup).toContain("Import or sync the listing");
    expect(markup).toContain("The Glenmore Hotel");
  });
});
