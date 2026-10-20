import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DEMO_PASS_PARTNERS } from "@shared/partner";
import { UNCLAIMED_PARTNERS } from "@/lib/partner-directory";
import { PassPartnersDirectory } from "./PassPartnersPage";

const { fakes } = vi.hoisted(() => ({ fakes: { user: null as { uid: string } | null } }));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: fakes.user }),
}));

vi.mock("wouter", () => ({
  useLocation: () => ["/pass/partners", vi.fn()],
  Link: ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) =>
    createElement("a", { href, className }, children),
}));

vi.mock("@/components/search/SearchBar", () => ({
  SearchBar: ({ value, placeholder, ...rest }: { value: string; placeholder?: string }) =>
    createElement("input", {
      value,
      placeholder,
      "aria-label": (rest as { "aria-label"?: string })["aria-label"] ?? "Search",
      onChange: () => undefined,
    }),
}));

describe("PassPartnersPage directory", () => {
  it("lists partners with category badges and detail links", () => {
    const html = renderToStaticMarkup(
      createElement(PassPartnersDirectory, { partners: DEMO_PASS_PARTNERS, loading: false }),
    );

    expect(html).toContain("Partner directory");
    expect(html).toContain("Demo Coffee House");
    expect(html).toContain("/pass/partners/demo-coffee-house");
    expect(html).toContain("Become a partner");
    expect(html).toContain("Showing 4 of 4");
  });

  it("shows an empty state with apply + deals actions when there are no partners", () => {
    const html = renderToStaticMarkup(createElement(PassPartnersDirectory, { partners: [], loading: false }));

    expect(html).toContain("No partners yet");
    expect(html).toContain("Become a partner");
    expect(html).toContain("Browse deals");
  });

  it("shows a loading status while fetching", () => {
    const html = renderToStaticMarkup(createElement(PassPartnersDirectory, { partners: [], loading: true }));

    expect(html).toContain('role="status"');
  });

  it("lists unclaimed businesses as non-partners with claim links", () => {
    const html = renderToStaticMarkup(
      createElement(PassPartnersDirectory, { partners: DEMO_PASS_PARTNERS, loading: false }),
    );

    expect(html).toContain("Unclaimed directory");
    expect(html).toContain("More businesses");
    expect(html).toContain("aren’t AirPal partners yet");
    expect(html).toContain("Adidas");
    expect(html).toContain("/pass/partners/apply?business=Adidas");
    expect(html).toContain("/pass/partners/apply?business=Abrand%20Jeans");
    expect(html).toContain(`Showing 48 of ${UNCLAIMED_PARTNERS.length}`);
    // Capped initial render: tail of the alphabet stays behind "Show all".
    expect(html).not.toContain("The North Face");
  });

  it("shows login + signup shortcuts to signed-out visitors", () => {
    fakes.user = null;
    const html = renderToStaticMarkup(
      createElement(PassPartnersDirectory, { partners: DEMO_PASS_PARTNERS, loading: false }),
    );

    expect(html).toContain("Log in or create your account");
    expect(html).toContain("tab=signin");
    expect(html).toContain("tab=signup");
    expect(html).toContain("next=%2Fpass%2Fpartners%2Fapply");
    expect(html).toContain("role=business");
  });

  it("hides the auth shortcuts when signed in", () => {
    fakes.user = { uid: "u123" };
    try {
      const html = renderToStaticMarkup(
        createElement(PassPartnersDirectory, { partners: DEMO_PASS_PARTNERS, loading: false }),
      );
      expect(html).not.toContain("Log in or create your account");
    } finally {
      fakes.user = null;
    }
  });
});
