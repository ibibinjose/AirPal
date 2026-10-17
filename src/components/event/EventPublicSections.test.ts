import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { EventAgendaSection } from "./EventAgendaSection";
import { EventRefundBlock } from "./EventRefundBlock";

describe("EventAgendaSection", () => {
  it("renders the run-sheet timeline", () => {
    const markup = renderToStaticMarkup(
      createElement(EventAgendaSection, {
        agenda: [
          { time: "6:00pm", title: "Doors open" },
          { time: "6:30pm", title: "Game 1" },
        ],
      }),
    );
    expect(markup).toContain("Schedule &amp; Timings");
    expect(markup).toContain("6:00pm");
    expect(markup).toContain("Game 1");
  });

  it("hides when the host set no timings", () => {
    expect(renderToStaticMarkup(createElement(EventAgendaSection, { agenda: [] }))).toBe("");
    expect(renderToStaticMarkup(createElement(EventAgendaSection, {}))).toBe("");
  });
});

describe("EventRefundBlock", () => {
  it("renders the host policy", () => {
    const markup = renderToStaticMarkup(
      createElement(EventRefundBlock, { policy: "No refunds, but tickets are transferable." }),
    );
    expect(markup).toContain("Refunds &amp; Transfers");
    expect(markup).toContain("transferable");
  });

  it("hides when no policy is set", () => {
    expect(renderToStaticMarkup(createElement(EventRefundBlock, {}))).toBe("");
    expect(renderToStaticMarkup(createElement(EventRefundBlock, { policy: "  " }))).toBe("");
  });
});
