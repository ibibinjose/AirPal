import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Button } from "./Button";

describe("Button", () => {
  it("renders gold with dark readable text, never white on gold", () => {
    const markup = renderToStaticMarkup(createElement(Button, { variant: "gold" }, "Claim"));
    expect(markup).toContain("badge-gold");
    expect(markup).not.toContain("text-white");
  });

  it("has no glass variant anymore", () => {
    const markup = renderToStaticMarkup(createElement(Button, { variant: "glass" as never }, "Go"));
    expect(markup).not.toContain("apple-liquid-glass-light");
  });

  it("keeps primary on white text", () => {
    const markup = renderToStaticMarkup(createElement(Button, { variant: "primary" }, "Go"));
    expect(markup).toContain("bg-brand");
    expect(markup).toContain("text-white");
  });
});
