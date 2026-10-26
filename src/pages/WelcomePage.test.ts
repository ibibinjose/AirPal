import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { WelcomePage } from "./WelcomePage";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    loginWithSocial: vi.fn(),
    authReady: true,
  }),
}));

vi.mock("wouter", () => ({
  useLocation: () => ["/welcome", vi.fn()],
}));

vi.mock("@/lib/native", () => ({
  triggerHaptic: vi.fn(),
  triggerHapticSelection: vi.fn(),
  isNativeApp: () => true,
}));

describe("WelcomePage", () => {
  it("renders the welcome screen with brand identity and actions", () => {
    const html = renderToStaticMarkup(createElement(WelcomePage));
    expect(html).toContain('data-testid="native-open-screen"');
    expect(html).toContain("AirPal");
    expect(html).toContain("Life Made Easy.");
    expect(html).toContain("Create Free Account");
  });
});
