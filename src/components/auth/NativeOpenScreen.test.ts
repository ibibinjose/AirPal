import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NativeOpenScreen } from "./NativeOpenScreen";

const auth = { loginWithSocial: vi.fn(), authReady: true, hasEnrolledBiometrics: false };

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => auth,
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
  it("renders logo, tagline and every sign-in action", () => {
    const html = renderToStaticMarkup(createElement(NativeOpenScreen));
    expect(html).toContain('data-testid="native-open-screen"');
    expect(html).toContain('src="/logo-mark.png"');
    expect(html).toContain("AirPal");
    expect(html).toContain("Life Made Easy.");
    expect(html).toContain("Continue with Google");
    expect(html).toContain("Continue with Apple");
    expect(html).toContain("Sign In with Email");
    expect(html).toContain("Create Free Account");
    expect(html).toContain("Explore as Guest");
  });

  it("uses a single h1 and keeps touch targets at 44px+", () => {
    const html = renderToStaticMarkup(createElement(NativeOpenScreen));
    expect(html.match(/<h1/g)?.length).toBe(1);
    expect(html).toContain("min-h-[48px]");
    expect(html).toContain("min-h-[44px]");
  });

  it("shows Pass copy for the Pass shell", () => {
    const html = renderToStaticMarkup(createElement(NativeOpenScreen, { defaultFlavor: "pass" }));
    expect(html).toContain(" Pass");
    expect(html).toContain("Discover what&#x27;s happening. Get access. Save money.");
  });

  it("shows Me copy for the AirPal shell", () => {
    const html = renderToStaticMarkup(createElement(NativeOpenScreen, { defaultFlavor: "me" }));
    expect(html).toContain(".me");
    expect(html).toContain("Discover what&#x27;s on. Catch up. Share with your Circle and pals.");
  });

  it("shows the branded loader instead of actions until auth is ready", () => {
    auth.authReady = false;
    const html = renderToStaticMarkup(createElement(NativeOpenScreen));
    auth.authReady = true;
    expect(html).toContain("Opening AirPal");
    expect(html).not.toContain("Create Free Account");
  });

  it("carries no demo widgets or fake data", () => {
    const html = renderToStaticMarkup(createElement(NativeOpenScreen));
    expect(html).not.toContain("Rooftop");
    expect(html).not.toContain("23°C");
    expect(html).not.toContain("Simulate");
  });
});
