import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { RouteErrorBoundary } from "./RouteErrorBoundary";

function fallbackFor(err: Error) {
  const boundary = new RouteErrorBoundary({ children: null });
  boundary.state = { err };
  return renderToStaticMarkup(boundary.render());
}

describe("RouteErrorBoundary", () => {
  it("always offers a home escape alongside retry actions", () => {
    const markup = fallbackFor(new Error("boom"));
    expect(markup).toContain("Try again");
    expect(markup).toContain("Reload");
    expect(markup).toContain("Back to home");
    expect(markup).toContain('href="/"');
  });

  it("points chunk-load failures at reload plus the home escape", () => {
    const markup = fallbackFor(new Error("Loading chunk 42 failed"));
    expect(markup).toContain("Reload page");
    expect(markup).toContain("Back to home");
  });
});
