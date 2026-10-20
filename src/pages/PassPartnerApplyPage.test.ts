import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PassPartnerApplyPage } from "./PassPartnerApplyPage";

const { fakes } = vi.hoisted(() => ({ fakes: { search: "" } }));

vi.mock("wouter", () => ({
  useLocation: () => ["/pass/partners/apply", vi.fn()],
  useSearch: () => fakes.search,
  Link: ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) =>
    createElement("a", { href, className }, children),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { uid: "u123", email: "owner@example.com" } }),
}));

describe("PassPartnerApplyPage", () => {
  it("renders the multi-field application form with inline-error slots", () => {
    const html = renderToStaticMarkup(createElement(PassPartnerApplyPage));

    expect(html).toContain("Become a partner");
    expect(html).toContain("Business name");
    expect(html).toContain("Category");
    expect(html).toContain("Contact name");
    expect(html).toContain("Contact email");
    expect(html).toContain("Website");
    expect(html).toContain("Why should Pass members visit?");
    expect(html).toContain("Submit application");
  });

  it("prefills the business name from ?business= when claiming a listing", () => {
    fakes.search = "business=Adidas";
    try {
      const html = renderToStaticMarkup(createElement(PassPartnerApplyPage));
      expect(html).toContain('value="Adidas"');
      expect(html).toContain("You’re claiming");
    } finally {
      fakes.search = "";
    }
  });
});
