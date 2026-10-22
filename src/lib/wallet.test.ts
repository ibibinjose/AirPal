import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Capacitor } from "@capacitor/core";
import {
  ticketWalletPassUrl,
  businessCardWalletPassUrl,
  googleWalletTicketUrl,
  googleWalletCardUrl,
  isApplePlatform,
  openAppleWalletPass,
  openGoogleWalletPass,
} from "./wallet";

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: vi.fn(),
    getPlatform: vi.fn(),
  },
}));

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("wallet helper", () => {
  it("formats ticket wallet pass URL with booking id and optional token", () => {
    const url = ticketWalletPassUrl("booking-12345");
    expect(url).toContain("/api/wallet/ticket/booking-12345.pkpass");
    const tokenUrl = ticketWalletPassUrl("booking-12345", "token-xyz");
    expect(tokenUrl).toContain("/api/wallet/ticket/booking-12345.pkpass?token=token-xyz");
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

  it("delegates to system browser / intent on native Android shell", async () => {
    vi.mocked(Capacitor.getPlatform).mockReturnValue("android");
    const walletWindow = {
      opener: {} as Window | null,
      close: vi.fn(),
      location: { replace: vi.fn() },
    };
    const open = vi.fn(() => walletWindow);
    vi.stubGlobal("window", { location: { hostname: "airpal.me" }, open });
    const saveUrl = "https://pay.google.com/gp/v/save/android-token";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({ saveUrl }),
      })),
    );

    const result = await openGoogleWalletPass("/api/wallet/google/ticket/b1");
    expect(result).toBe(true);
    expect(walletWindow.close).toHaveBeenCalled();
    expect(open).toHaveBeenCalledWith(saveUrl, "_system");
  });
});

describe("openAppleWalletPass handoff", () => {
  const iPhoneUA =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
  const desktopUA =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

  function stubWindow() {
    const open = vi.fn();
    const assign = vi.fn();
    vi.stubGlobal("window", {
      location: { hostname: "airpal.me", assign },
      open,
      setTimeout: () => 0,
    });
    return { open, assign };
  }

  beforeEach(() => {
    vi.mocked(Capacitor.getPlatform).mockReset().mockReturnValue("web");
  });

  it("navigates directly to public card passes on Apple platforms", async () => {
    vi.stubGlobal("navigator", { userAgent: iPhoneUA });
    const { open, assign } = stubWindow();
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(openAppleWalletPass(businessCardWalletPassUrl("bibinjose"), "@bibinjose-AirPal-Pass")).resolves.toBe(
      true,
    );

    // HEAD preflight only — no authenticated GET, no blob round-trip.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/wallet/card/bibinjose.pkpass"),
      expect.objectContaining({ method: "HEAD" }),
    );
    expect(assign).toHaveBeenCalledWith(expect.stringContaining("/api/wallet/card/bibinjose.pkpass"));
    expect(open).not.toHaveBeenCalled();
  });

  it("navigates directly to ticket passes on Apple platforms", async () => {
    vi.stubGlobal("navigator", { userAgent: iPhoneUA });
    const { open, assign } = stubWindow();
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(openAppleWalletPass(ticketWalletPassUrl("b1"), "My Ticket")).resolves.toBe(true);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(assign).toHaveBeenCalledWith(expect.stringContaining("/api/wallet/ticket/b1.pkpass"));
    expect(open).not.toHaveBeenCalled();
  });

  it("delegates card passes to the system browser in the native iOS shell", async () => {
    vi.mocked(Capacitor.getPlatform).mockReturnValue("ios");
    const { open, assign } = stubWindow();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, status: 200 })),
    );

    await expect(openAppleWalletPass(businessCardWalletPassUrl("bibinjose"))).resolves.toBe(true);

    expect(open).toHaveBeenCalledWith(expect.stringContaining("/api/wallet/card/bibinjose.pkpass"), "_system");
    expect(assign).not.toHaveBeenCalled();
  });

  it("keeps the authenticated blob download for ticket passes", async () => {
    vi.stubGlobal("navigator", { userAgent: desktopUA });
    stubWindow();
    const anchor = { click: vi.fn(), href: "", rel: "", target: "", download: "" };
    const appended: unknown[] = [];
    const removed: unknown[] = [];
    vi.stubGlobal("document", {
      createElement: vi.fn(() => anchor),
      body: {
        appendChild: (node: unknown) => {
          appended.push(node);
        },
        removeChild: (node: unknown) => {
          removed.push(node);
        },
      },
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, status: 200 })
      .mockResolvedValueOnce({ ok: true, status: 200, blob: async () => new Blob(["pkpass"]) });
    vi.stubGlobal("fetch", fetchMock);

    await expect(openAppleWalletPass(ticketWalletPassUrl("booking-12345"), "My Ticket")).resolves.toBe(true);

    // HEAD preflight, then the authenticated GET the navigation cannot do.
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(anchor.download).toBe("my-ticket.pkpass");
    expect(anchor.click).toHaveBeenCalled();
    expect(appended).toContain(anchor);
    expect(removed).toContain(anchor);
  });
});
