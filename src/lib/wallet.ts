import { toast } from "sonner";
import { publicSiteOrigin } from "./public-origin";
import { getNativePlatform } from "./native";
import { getFirebaseAuth } from "./firebase";

async function walletAuthHeaders(): Promise<HeadersInit> {
  const user = getFirebaseAuth()?.currentUser;
  if (!user) return {};
  return { Authorization: `Bearer ${await user.getIdToken()}` };
}

/**
 * Checks if the current environment is an Apple device (iOS, iPadOS, macOS)
 * where .pkpass files are natively recognized and added to Apple Wallet.
 */
export function isApplePlatform(): boolean {
  if (getNativePlatform() === "ios") return true;
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const platform =
    (navigator as unknown as { userAgentData?: { platform?: string } }).userAgentData?.platform ||
    navigator.platform ||
    "";
  return /iPhone|iPad|iPod|Macintosh/i.test(ua) || /iPhone|iPad|iPod|Mac/i.test(platform);
}

/**
 * Returns the public URL for a ticket's Apple Wallet .pkpass bundle.
 */
export function ticketWalletPassUrl(bookingId: string): string {
  const origin = publicSiteOrigin();
  return origin + "/api/wallet/ticket/" + encodeURIComponent(bookingId) + ".pkpass";
}

/**
 * Returns the public URL for an AirPal profile / business card Apple Wallet .pkpass bundle.
 */
export function businessCardWalletPassUrl(handle: string): string {
  const origin = publicSiteOrigin();
  return origin + "/api/wallet/card/" + encodeURIComponent(handle) + ".pkpass";
}

/**
 * Google Wallet save-link endpoints (answer `{ saveUrl }` JSON — the client
 * opens the pay.google.com save link, which installs the pass).
 */
export function googleWalletTicketUrl(bookingId: string): string {
  const origin = publicSiteOrigin();
  return origin + "/api/wallet/google/ticket/" + encodeURIComponent(bookingId);
}

export function googleWalletCardUrl(handle: string): string {
  const origin = publicSiteOrigin();
  return origin + "/api/wallet/google/card/" + encodeURIComponent(handle);
}

/**
 * In local development, rewrites public airpal.me URL to relative /api/wallet
 * so requests route via the Vite dev server proxy without CORS complications.
 */
function normalizeWalletUrl(url: string): string {
  if (
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
  ) {
    return url.replace(/^https?:\/\/airpal\.me/, "");
  }
  return url;
}

/**
 * Fetches the signed Google save link and opens it. Honest toasts for the
 * unconfigured (501) and missing (404) states — never a dead link.
 */
export async function openGoogleWalletPass(url: string): Promise<boolean> {
  if (typeof window === "undefined") return false;
  let walletWindow: Window | null = null;
  try {
    walletWindow = window.open("about:blank", "_blank");
    if (!walletWindow) {
      toast.error("Allow pop-ups to continue to Google Wallet.");
      return false;
    }
    const popup = walletWindow;
    popup.opener = null;

    const targetUrl = normalizeWalletUrl(url);
    const res = await fetch(targetUrl, { headers: await walletAuthHeaders() });
    if (!res.ok) {
      popup.close();
      toast.error(
        res.status === 501
          ? "Google Wallet isn't set up yet — ask your host for another ticket option."
          : res.status === 404
            ? "This pass is not yet available in your account."
            : "Couldn't load the Wallet pass — try again.",
      );
      return false;
    }
    const { saveUrl } = (await res.json()) as { saveUrl?: string };
    if (!saveUrl) {
      popup.close();
      toast.error("Couldn't load the Wallet pass — try again.");
      return false;
    }
    const destination = new URL(saveUrl);
    if (destination.origin !== "https://pay.google.com" || !destination.pathname.startsWith("/gp/v/save/")) {
      popup.close();
      toast.error("Couldn't load the Wallet pass — try again.");
      return false;
    }
    popup.location.replace(destination.href);
    return true;
  } catch (err) {
    walletWindow?.close();
    console.error("Failed to open Google Wallet pass:", err);
    toast.error("Couldn't load the Wallet pass — try again.");
    return false;
  }
}

/**
 * Opens or downloads the Apple Wallet pass.
 * On iOS/macOS Safari and native iOS Capacitor, navigating directly to a .pkpass
 * URL triggers the native PKAddPassesViewController dialog automatically.
 * Public card passes take that direct path; ticket passes keep the
 * authenticated download below because a navigation cannot carry headers.
 *
 * A HEAD preflight runs first so a missing pass or an unconfigured signer
 * shows an honest toast instead of downloading an error page as a "pass".
 */
export async function openAppleWalletPass(url: string, title?: string): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    const targetUrl = normalizeWalletUrl(url);
    const headers = await walletAuthHeaders();
    const head = await fetch(targetUrl, { method: "HEAD", headers });
    if (!head.ok) {
      toast.error(
        head.status === 501
          ? "Apple Wallet isn't set up yet — ask your host for another ticket option."
          : head.status === 404
            ? "This pass is not yet available in your account."
            : "Couldn't load the Wallet pass — try again.",
      );
      return false;
    }
    // Public card passes need no auth, so on Apple platforms hand the real
    // .pkpass URL to the OS: only a top-level navigation opens Wallet — a
    // blob download never triggers the Add sheet.
    if (isApplePlatform() && targetUrl.includes("/wallet/card/")) {
      if (getNativePlatform() === "ios") {
        // In iOS WKWebView / Capacitor, opening with target '_system' delegates
        // the .pkpass mime type to iOS Safari, which automatically displays
        // the native PKAddPassesViewController "Add to Apple Wallet" sheet.
        window.open(targetUrl, "_system");
      } else {
        window.location.assign(targetUrl);
      }
      return true;
    }
    const pass = await fetch(targetUrl, { headers });
    if (!pass.ok) throw new Error("Pass download failed");
    const blobUrl = URL.createObjectURL(await pass.blob());
    if (getNativePlatform() === "ios") {
      // Authenticated ticket passes still download here: a navigation cannot
      // carry the auth header, so blob delivery is the honest fallback.
      window.open(blobUrl, "_system");
      return true;
    }
    const a = document.createElement("a");
    a.href = blobUrl;
    a.rel = "noopener noreferrer";
    a.target = "_blank";
    if (title) a.download = title.toLowerCase().replace(/[^a-z0-9]/g, "-") + ".pkpass";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    return true;
  } catch (err) {
    console.error("Failed to open Apple Wallet pass:", err);
    toast.error("Couldn't load the Wallet pass — try again.");
    return false;
  }
}
