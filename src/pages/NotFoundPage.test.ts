import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("wouter", () => ({
  useLocation: () => ["/missing-page", vi.fn()],
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => createElement("a", { href }, children),
}));
vi.mock("@/contexts/LocaleContext", () => ({
  useLocale: () => ({ lang: "en", setLang: () => {}, t: (key: string) => key }),
}));

import { NotFoundPage } from "./NotFoundPage";

describe("NotFoundPage", () => {
  it("offers a way back plus pillar recovery links", () => {
    const markup = renderToStaticMarkup(createElement(NotFoundPage));
    expect(markup).toContain("Go back");
    expect(markup).toContain("explore");
    expect(markup).toContain('href="/pass"');
    expect(markup).toContain('href="/events"');
    expect(markup).toContain('href="/calendar"');
  });
});
