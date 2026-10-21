import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ticketWalletPassUrl,
  businessCardWalletPassUrl,
  googleWalletTicketUrl,
  googleWalletCardUrl,
  isApplePlatform,
  openGoogleWalletPass,
} from "./wallet";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("wallet helper", () => {
  it("formats ticket wallet pass URL with booking id", () => {
    const url = ticketWalletPassUrl("booking-12345");
    expect(url).toContain("/api/wallet/ticket/booking-12345.pkpass");
  });

  it("formats business card wallet pass URL with handle", () => {
    const url = businessCardWalletPassUrl("airpalmate");
    expect(url).toContain("/api/wallet/card/airpalmate.pkpass");
  });

  it("handles handle characters safely with encoding", () => {
    const url = businessCardWalletPassUrl("mate special");
    expect(url).toContain("/api/wallet/card/mate%20special.pkpass");
  });

  it("isApplePlatform returns a boolean", () => {
    expect(typeof isApplePlatform()).toBe("boolean");
  });

  it("formats Google Wallet save-link URLs for tickets and cards", () => {
    expect(googleWalletTicketUrl("booking-12345")).toContain("/api/wallet/google/ticket/booking-12345");
    expect(googleWalletCardUrl("airpalmate")).toContain("/api/wallet/google/card/airpalmate");
  });

  it("opens a tab synchronously before navigating to the Google Wallet save URL", async () => {
    let resolveResponse!: (response: { ok: boolean; status: number; json: () => Promise<{ saveUrl: string }> }) => void;
    const response = new Promise<{
      ok: boolean;
      status: number;
      json: () => Promise<{ saveUrl: string }>;
    }>((resolve) => {
      resolveResponse = resolve;
    });
    const walletWindow = {
      opener: {} as Window | null,
      close: vi.fn(),
      location: { replace: vi.fn() },
    };
    const open = vi.fn(() => walletWindow);
    vi.stubGlobal("window", { location: { hostname: "airpal.me" }, open });
    vi.stubGlobal(
      "fetch",
      vi.fn(() => response),
    );

    const result = openGoogleWalletPass("/api/wallet/google/card/airpalme");

    expect(open).toHaveBeenCalledWith("about:blank", "_blank");
    expect(walletWindow.opener).toBeNull();

    const saveUrl = "https://pay.google.com/gp/v/save/header.payload.signature";
    resolveResponse({ ok: true, status: 200, json: async () => ({ saveUrl }) });

    await expect(result).resolves.toBe(true);
    expect(walletWindow.location.replace).toHaveBeenCalledWith(saveUrl);
  });
});
