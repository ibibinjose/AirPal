import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TabBar } from "./TabBar";

vi.mock("wouter", () => ({
  useLocation: () => ["/", vi.fn()],
}));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: undefined }) }));
vi.mock("@/contexts/BioContext", () => ({ useBio: () => ({ mine: undefined }) }));
vi.mock("@/lib/keyboard", () => ({ useVirtualKeyboard: () => ({ isKeyboardOpen: false }) }));

describe("TabBar", () => {
  it("keeps the active tab icon an outline (never a solid fill)", () => {
    const markup = renderToStaticMarkup(createElement(TabBar, { path: "/" }));
    // The active tab carries aria-current and renders its lucide icon.
    expect(markup).toContain('aria-current="page"');
    expect(markup).toContain("<svg");
    // Solid-filling an outline icon turns it into an unreadable blob on the pill.
    expect(markup).not.toContain('fill="currentColor"');
    expect(markup).toContain('fill="none"');
  });

  it("has no plan tab", () => {
    const markup = renderToStaticMarkup(createElement(TabBar, { path: "/plan" }));
    expect(markup).not.toContain(">Plan<");
    expect(markup).not.toContain(">Trips<");
  });

  it("renders pass tabs when navigating within AirPal Pass mode", () => {
    const markup = renderToStaticMarkup(createElement(TabBar, { path: "/pass" }));
    expect(markup).toContain(">Pass<");
    expect(markup).toContain(">Events<");
    expect(markup).toContain(">Tickets<");
    expect(markup).toContain(">Scan<");
    expect(markup).toContain(">Bio<");
  });

  it("renders Home, Place, Community, Friends, and Me tabs in companion mode", () => {
    const markup = renderToStaticMarkup(createElement(TabBar, { path: "/" }));
    expect(markup).toContain(">Home<");
    expect(markup).toContain(">Place<");
    expect(markup).toContain(">Community<");
    expect(markup).toContain(">Friends<");
    expect(markup).toContain(">Me<");
    expect(markup).not.toContain(">Now<");
    expect(markup).not.toContain(">Plan<");
    expect(markup).not.toContain(">Bio<");
  });
});
