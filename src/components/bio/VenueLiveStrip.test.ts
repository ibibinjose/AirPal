import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { VenueLiveStrip } from "./VenueLiveStrip";

describe("VenueLiveStrip", () => {
  it("shows open state, hours, and the live offer link", () => {
    const markup = renderToStaticMarkup(
      createElement(VenueLiveStrip, { openNow: true, hours: "9am–9pm", offerBadge: "10% OFF" }),
    );
    expect(markup).toContain("Open now");
    expect(markup).toContain("9am–9pm");
    expect(markup).toContain("10% OFF live");
    expect(markup).toContain('href="#bio-offers"');
  });

  it("shows closed with no offer link when nothing is live", () => {
    const markup = renderToStaticMarkup(createElement(VenueLiveStrip, { openNow: false }));
    expect(markup).toContain("Closed");
    expect(markup).not.toContain("live</span>");
    expect(markup).not.toContain('href="#bio-offers"');
  });
});
