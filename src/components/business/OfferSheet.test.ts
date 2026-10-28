import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { buildOfferPayload, dealToDraft, OfferForm, EMPTY_OFFER_DRAFT } from "./OfferForm";

describe("buildOfferPayload", () => {
  it("rejects blank and too-short headlines with a fix-it message", () => {
    expect(buildOfferPayload({ ...EMPTY_OFFER_DRAFT })).toEqual({
      error: "Give your offer a clear headline (3+ characters).",
    });
    expect(buildOfferPayload({ ...EMPTY_OFFER_DRAFT, headline: "ab" })).toHaveProperty("error");
  });

  it("fills badge and claim-hint defaults and joins terms", () => {
    const result = buildOfferPayload({ headline: "2-for-1 drinks", badge: "", window: "", terms: "Show pass" });
    expect(result).toEqual({
      payload: {
        badge: "Member Perk",
        detail: "2-for-1 drinks — Show pass",
        claimHint: "Show AirPal Pass QR at counter",
      },
    });
  });

  it("keeps explicit badge, window, and bare headlines", () => {
    const result = buildOfferPayload({
      headline: "Free coffee",
      badge: "10% OFF",
      window: "Thu–Sun",
      terms: "",
    });
    expect(result).toEqual({
      payload: { badge: "10% OFF", detail: "Free coffee", claimHint: "Thu–Sun" },
    });
  });
});

describe("dealToDraft", () => {
  it("prefills the form from the live deal", () => {
    expect(dealToDraft({ badge: "10% OFF", detail: "Free coffee", claimHint: "Thu–Sun" })).toEqual({
      headline: "Free coffee",
      badge: "10% OFF",
      window: "Thu–Sun",
      terms: "",
    });
  });

  it("starts blank without a live deal", () => {
    expect(dealToDraft(null)).toEqual(EMPTY_OFFER_DRAFT);
    expect(dealToDraft(undefined)).toEqual(EMPTY_OFFER_DRAFT);
  });
});

describe("OfferForm sheet", () => {
  it("renders one shared set of fields with labels", () => {
    const markup = renderToStaticMarkup(
      createElement(OfferForm, {
        initial: EMPTY_OFFER_DRAFT,
        submitLabel: "Publish to /deals",
        busy: false,
        onSubmit: () => {},
      }),
    );
    expect(markup).toContain("Offer Headline");
    expect(markup).toContain("Badge Pill");
    expect(markup).toContain("Redemption Window");
    expect(markup).toContain("Terms &amp; Counter Instructions");
    expect(markup).toContain("Publish to /deals");
    expect(markup).toContain('for="offer-headline"');
  });
});
