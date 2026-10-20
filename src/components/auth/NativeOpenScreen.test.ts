import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NativeOpenScreen } from "./NativeOpenScreen";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    loginWithSocial: vi.fn(),
    authReady: true,
  }),
}));

vi.mock("wouter", () => ({
  useLocation: () => ["/", vi.fn()],
}));

vi.mock("@/lib/native", () => ({
  triggerHaptic: vi.fn(),
  triggerHapticSelection: vi.fn(),
  isNativeApp: () => true,
}));

describe("NativeOpenScreen", () => {
  it("renders brand opening copy and sign-in actions", () => {
    const html = renderToStaticMarkup(createElement(NativeOpenScreen));
    expect(html).toContain('data-testid="native-open-screen"');
    expect(html).toContain("AirPal");
    expect(html).toContain("Life Made Easy.");
    expect(html).toContain("Continue with Google");
    expect(html).toContain("Continue with Apple");
    expect(html).toContain("Sign In with Email");
    expect(html).toContain("Create Free Account");
  });

  it("renders liquid glass effect materials and specular highlights", () => {
    const html = renderToStaticMarkup(createElement(NativeOpenScreen));
    expect(html).toContain("apple-liquid-glass-dock");
    expect(html).toContain("apple-liquid-glass-hero");
    expect(html).toContain("apple-liquid-glass-light");
    expect(html).toContain("glass-sheen");
    expect(html).toContain("caustic-sheen");
    expect(html).toContain("animate-float-slow");
    expect(html).toContain("animate-float-reverse");
  });

  it("renders the ecosystem lens switcher with Pass and Me options", () => {
    const html = renderToStaticMarkup(createElement(NativeOpenScreen));
    expect(html).toContain('role="tablist"');
    expect(html).toContain('aria-label="Ecosystem View"');
    expect(html).toContain("Pass");
    expect(html).toContain("Me");
  });

  it("renders Pass-specific feature cards when defaultFlavor='pass'", () => {
    const html = renderToStaticMarkup(createElement(NativeOpenScreen, { defaultFlavor: "pass" }));
    expect(html).toContain("Live Concerts &amp; Festivals");
    expect(html).toContain("AIRPAL PASS · ALL ACCESS");
    expect(html).toContain("Apple &amp; Google Wallet Ready");
  });

  it("renders Me-specific feature cards when defaultFlavor='me'", () => {
    const html = renderToStaticMarkup(createElement(NativeOpenScreen, { defaultFlavor: "me" }));
    expect(html).toContain("Daily Flow &amp; Outfits");
    expect(html).toContain("23°C");
    expect(html).toContain("Linen Shirt &amp; Loafers");
  });

  it("renders carousel navigation arrows and universal ecosystem reassurance", () => {
    const html = renderToStaticMarkup(createElement(NativeOpenScreen));
    expect(html).toContain('aria-label="Previous slide"');
    expect(html).toContain('aria-label="Next slide"');
    expect(html).toContain("One account for both AirPal Me &amp; AirPal Pass");
    expect(html).toContain("Explore as Guest");
  });
});
