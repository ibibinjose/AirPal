import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TodaySkeleton } from "./MeSections";

describe("TodaySkeleton", () => {
  it("renders an accessible loading status with the requested row count", () => {
    const markup = renderToStaticMarkup(createElement(TodaySkeleton, { lines: 2 }));
    expect(markup).toContain('role="status"');
    expect(markup).toContain("Loading your agenda");
    // Two placeholder rows
    expect(markup.split("neu-row").length - 1).toBe(2);
  });

  it("defaults to three rows", () => {
    const markup = renderToStaticMarkup(createElement(TodaySkeleton));
    expect(markup.split("neu-row").length - 1).toBe(3);
  });
});
