import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ThemeToggle } from "./ThemeToggle";
import { getThemePreference, setThemePreference } from "@/lib/theme";

describe("ThemeToggle", () => {
  it("renders a small icon-only button with an accessible label", () => {
    const html = renderToStaticMarkup(createElement(ThemeToggle, { onBrand: true }));
    expect(html).toContain("<button");
    expect(html).toMatch(/aria-label="Switch to (dark|light) mode"/);
    expect(html).toContain("h-8.5");
    expect(html).toContain("w-8.5");
  });

  it("stays smaller than the bar height so the top bar height is unchanged", () => {
    const html = renderToStaticMarkup(createElement(ThemeToggle, { onBrand: true }));
    expect(html).not.toMatch(/h-1[01]/);
  });

  it("renders a compact black-and-white variant for the live strip", () => {
    const html = renderToStaticMarkup(createElement(ThemeToggle, { compact: true }));
    expect(html).toMatch(/aria-label="Switch to (dark|light) mode"/);
    expect(html).toContain('width="11"');
    expect(html).not.toContain("h-8.5");
    expect(html).toContain("text-ink");
  });

  it("persists an explicit choice through the shared theme engine", () => {
    setThemePreference("dark");
    expect(getThemePreference()).toBe("dark");
    const darkHtml = renderToStaticMarkup(createElement(ThemeToggle, { onBrand: true }));
    expect(darkHtml).toMatch(/aria-label="Switch to light mode"/);
    setThemePreference("light");
    expect(getThemePreference()).toBe("light");
    const lightHtml = renderToStaticMarkup(createElement(ThemeToggle, { onBrand: true }));
    expect(lightHtml).toMatch(/aria-label="Switch to dark mode"/);
    setThemePreference("system");
  });
});
