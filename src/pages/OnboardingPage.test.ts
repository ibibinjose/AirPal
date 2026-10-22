import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { OnboardingPage } from "./OnboardingPage";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { uid: "test-uid", displayName: "Alex Rivera", email: "alex@example.com" },
    authReady: true,
    biometricsSupported: true,
    biometricLabel: "Face ID",
    hasEnrolledBiometrics: false,
    enrollUserBiometrics: vi.fn(),
  }),
}));

vi.mock("@/contexts/BioContext", () => ({
  useBio: () => ({
    mine: null,
    createProfile: vi.fn(),
  }),
}));

vi.mock("@/hooks/useHandleStatus", () => ({
  useHandleStatus: () => ({
    ok: true,
    reason: undefined,
    checking: false,
  }),
}));

vi.mock("wouter", () => ({
  useLocation: () => ["/onboarding", vi.fn()],
  useSearch: () => "",
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => createElement("a", { href }, children),
}));

vi.mock("@/lib/native", () => ({
  triggerHaptic: vi.fn(),
  triggerHapticSelection: vi.fn(),
}));

describe("OnboardingPage", () => {
  it("renders step 1 with wallet pass preview and identity inputs", () => {
    const html = renderToStaticMarkup(createElement(OnboardingPage));
    expect(html).toContain("Set Up Your Identity");
    expect(html).toContain("AirPal Universal Pass");
    expect(html).toContain("Claim your unique @handle");
    expect(html).toContain("Primary City");
    expect(html).toContain("Continue to Interests");
  });
});
