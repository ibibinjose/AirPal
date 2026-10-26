import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { OnboardingPage } from "./OnboardingPage";

let mockUser: { uid: string; displayName: string; email: string } | null = {
  uid: "test-uid",
  displayName: "Alex Rivera",
  email: "alex@example.com",
};

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: mockUser,
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
  it("renders step 1 with name, handle and city only", () => {
    mockUser = { uid: "test-uid", displayName: "Alex Rivera", email: "alex@example.com" };
    const html = renderToStaticMarkup(createElement(OnboardingPage));
    expect(html).toContain("Who are you?");
    expect(html).toContain("Your @handle");
    expect(html).toContain("City");
    expect(html).toContain("Continue");
    expect(html).toContain("min-h-[44px]");
    expect(html.match(/<h1/g)?.length).toBe(1);
    expect(html).not.toContain("Interests");
    expect(html).not.toContain("Avatar");
  });

  it("renders sign-up prompt when user is not authenticated", () => {
    mockUser = null;
    const html = renderToStaticMarkup(createElement(OnboardingPage));
    expect(html).toContain("Welcome to AirPal");
    expect(html).toContain("Create Free Account");
    expect(html).toContain("Already have an account? Sign In");
  });
});
