import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ProfileMenu } from "./ProfileMenu";

vi.mock("wouter", () => ({
  useLocation: () => ["/", vi.fn()],
}));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: undefined, isAdmin: false, isHost: false, logout: vi.fn() }),
}));
vi.mock("@/contexts/BioContext", () => ({
  useBio: () => ({ mine: undefined, business: undefined, biosReady: true, updateProfile: vi.fn() }),
}));
vi.mock("@/contexts/EventsContext", () => ({
  useEvents: () => ({ myEvent: undefined }),
}));

describe("ProfileMenu", () => {
  it("exposes a named menu trigger for guests and leaks no rows while closed", () => {
    const markup = renderToStaticMarkup(createElement(ProfileMenu));
    expect(markup).toContain('aria-label="Menu and sign in"');
    expect(markup).toContain('aria-haspopup="menu"');
    expect(markup).toContain("min-h-[40px]");
    expect(markup).toContain("min-w-[40px]");
    expect(markup).not.toContain('role="menuitem"');
  });

  it("announces the signed-in status in the trigger label", async () => {
    vi.resetModules();
    vi.doMock("wouter", () => ({ useLocation: () => ["/me", vi.fn()] }));
    vi.doMock("@/contexts/AuthContext", () => ({
      useAuth: () => ({
        user: { displayName: "Bibin", email: "bibin@example.com" },
        isAdmin: false,
        isHost: false,
        logout: vi.fn(),
      }),
    }));
    vi.doMock("@/contexts/BioContext", () => ({
      useBio: () => ({
        mine: { handle: "bibinjose", name: "Bibin Jose", kind: "person", availabilityStatus: "available" },
        business: undefined,
        biosReady: true,
        updateProfile: vi.fn(),
      }),
    }));
    const { ProfileMenu: SignedInMenu } = await import("./ProfileMenu");
    const markup = renderToStaticMarkup(createElement(SignedInMenu));
    expect(markup).toContain('aria-label="Account menu,');
    expect(markup).not.toContain('role="menuitem"');
  });
});
