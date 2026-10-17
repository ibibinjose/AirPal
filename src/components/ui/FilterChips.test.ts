import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Sparkles } from "lucide-react";
import { FilterChips } from "./FilterChips";

const OPTIONS = [
  { id: "all", label: "All", count: 12 },
  { id: "music", label: "Music", count: 5 },
  { id: "food", label: "Food" },
];

describe("FilterChips", () => {
  it("renders single-select as a radiogroup with the active chip checked", () => {
    const markup = renderToStaticMarkup(
      createElement(FilterChips, {
        options: OPTIONS,
        value: "music",
        onChange: () => undefined,
        ariaLabel: "Categories",
      }),
    );
    expect(markup).toContain('role="radiogroup"');
    expect(markup).toContain('aria-label="Categories"');
    expect(markup).toContain('role="radio"');
    expect(markup).toContain("Music");
    expect(markup).toContain("12");
    // Active chip is checked; inactive chips are not.
    expect(markup.match(/aria-checked="true"/g)?.length).toBe(1);
    expect(markup.match(/aria-checked="false"/g)?.length).toBe(2);
  });

  it("renders multi-select toggles with a clear button showing the count", () => {
    const markup = renderToStaticMarkup(
      createElement(FilterChips, {
        mode: "multi",
        options: OPTIONS,
        values: ["music", "food"],
        onToggle: () => undefined,
        onClear: () => undefined,
        ariaLabel: "Tags",
      }),
    );
    expect(markup).toContain('role="group"');
    expect(markup).toContain('aria-pressed="true"');
    expect(markup).toContain("Clear 2 filters");
  });

  it("renders Lucide components and emoji strings as icons", () => {
    const markup = renderToStaticMarkup(
      createElement(FilterChips, {
        options: [
          { id: "all", label: "All", icon: Sparkles },
          { id: "music", label: "Music", icon: "🎵" },
        ],
        value: "all",
        onChange: () => undefined,
        ariaLabel: "Categories",
      }),
    );
    expect(markup).toContain("<svg");
    expect(markup).toContain("🎵");
  });

  it("hides the clear button when nothing is selected", () => {
    const markup = renderToStaticMarkup(
      createElement(FilterChips, {
        mode: "multi",
        options: OPTIONS,
        values: [],
        onToggle: () => undefined,
        onClear: () => undefined,
        ariaLabel: "Tags",
      }),
    );
    expect(markup).not.toContain("Clear");
  });
});
