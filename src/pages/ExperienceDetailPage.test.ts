import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const { fakes } = vi.hoisted(() => ({
  fakes: { id: "rocks-night-market" },
}));

vi.mock("wouter", () => ({
  useRoute: (pattern: string) => {
    if (pattern === "/experience/:id") return [true, { id: fakes.id }];
    return [false, {}];
  },
  useLocation: () => ["/", vi.fn()],
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => createElement("a", { href }, children),
}));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: undefined }),
}));
vi.mock("@/contexts/LocaleContext", () => ({
  useLocale: () => ({ t: (key: string) => key }),
}));

import { ExperienceDetailPage } from "./ExperienceDetailPage";

function render(id: string) {
  fakes.id = id;
  return renderToStaticMarkup(createElement(ExperienceDetailPage));
}

describe("ExperienceDetailPage", () => {
  it("renders a curated experience as a full page, never a dialog", () => {
    const markup = render("rocks-night-market");
    expect(markup).toContain("The Rocks Weekend Night Market");
    expect(markup).toContain("<h1");
    expect(markup).not.toContain('role="dialog"');
  });

  it("renders not-found content for an unknown experience id", () => {
    const markup = render("no-such-experience");
    expect(markup).toContain("404");
  });
});
