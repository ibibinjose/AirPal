import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PulsePage } from "./PulsePage";

vi.mock("wouter", () => ({
  useLocation: () => ["/host/pulse", vi.fn()],
  useParams: () => ({}),
  Link: ({ children, href, ...rest }: Record<string, unknown>) => createElement("a", { href, ...rest }, children),
}));

const listingsBox = vi.hoisted(() => ({ venues: [] as { id: string; name: string; status: string }[] }));
vi.mock("@/contexts/ListingsContext", () => ({
  useListings: () => ({ myListings: listingsBox.venues }),
}));

const authBox = vi.hoisted(() => ({ user: null as null | { uid: string } }));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: authBox.user }),
}));

describe("PulsePage host hub", () => {
  it("lists signed-in host venues with door actions", () => {
    authBox.user = { uid: "u1" };
    listingsBox.venues = [
      { id: "v1", name: "Harbour Bar", status: "active" },
      { id: "v2", name: "Draft Venue", status: "draft" },
    ];
    const markup = renderToStaticMarkup(createElement(PulsePage));
    expect(markup).toContain("Your venues tonight");
    expect(markup).toContain("Harbour Bar");
    expect(markup).toContain("Live on the map");
    expect(markup).toContain("Draft — finish setup");
    expect(markup).toContain('href="/scan"');
    expect(markup).toContain('href="/business"');
  });

  it("stays an explainer with no venues or signed out", () => {
    authBox.user = { uid: "u1" };
    listingsBox.venues = [];
    expect(renderToStaticMarkup(createElement(PulsePage))).not.toContain("Your venues tonight");

    authBox.user = null;
    listingsBox.venues = [{ id: "v1", name: "Harbour Bar", status: "active" }];
    expect(renderToStaticMarkup(createElement(PulsePage))).not.toContain("Your venues tonight");
  });
});
