import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppleWalletButton } from "./AppleWalletButton";
import { GoogleWalletButton } from "./GoogleWalletButton";

vi.mock("@/lib/native", () => ({
  triggerHaptic: vi.fn().mockResolvedValue(undefined),
}));

describe("Wallet badge buttons", () => {
  it("renders official Apple Wallet badge button with Add to Apple Wallet text and passbook icon", () => {
    const markup = renderToStaticMarkup(createElement(AppleWalletButton));
    expect(markup).toContain('aria-label="Add to Apple Wallet"');
    expect(markup).toContain("Add to");
    expect(markup).toContain("Apple Wallet");
    // Beige passbook housing and 4 card colors
    expect(markup).toContain("#DEDBD3");
    expect(markup).toContain("#3697F3");
    expect(markup).toContain("#F6B91D");
    expect(markup).toContain("#5FC343");
    expect(markup).toContain("#F26758");
  });

  it("renders official Google Wallet pill badge button with Add to Google Wallet text and multi-color icon", () => {
    const markup = renderToStaticMarkup(createElement(GoogleWalletButton));
    expect(markup).toContain('aria-label="Add to Google Wallet"');
    expect(markup).toContain("Add to");
    expect(markup).toContain("Google Wallet");
    expect(markup).toContain("rounded-full");
    // Google brand 4 colors
    expect(markup).toContain("#34A853");
    expect(markup).toContain("#FBBC04");
    expect(markup).toContain("#EA4335");
    expect(markup).toContain("#4285F4");
  });
});

