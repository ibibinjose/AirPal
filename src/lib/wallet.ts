import { toast } from "sonner";
import { publicSiteOrigin } from "./public-origin";
import { getNativePlatform, isNativeApp } from "./platform";
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
export function ticketWalletPassUrl(bookingId: string, token?: string): string {
  const origin = publicSiteOrigin();
  const base = origin + "/api/wallet/ticket/" + encodeURIComponent(bookingId) + ".pkpass";
  return token ? `${base}?token=${encodeURIComponent(token)}` : base;
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

    const isTicket = url.includes("/wallet/google/ticket/");
    const targetUrl = normalizeWalletUrl(url);
    const headers = isTicket ? await walletAuthHeaders() : {};
    const res = await fetch(targetUrl, { headers });
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
    const platform = getNativePlatform();
    if (platform === "android" || platform === "ios") {
      popup.close();
      window.open(destination.href, "_system");
      return true;
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
 * Public card passes and authenticated ticket passes (via token query param) both take this path.
 *
 * A HEAD preflight runs first so a missing pass or an unconfigured signer
 * shows an honest toast instead of downloading an error page as a "pass".
 */
export async function openAppleWalletPass(url: string, title?: string): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    const isTicket = url.includes("/wallet/ticket/");
    const user = isTicket ? getFirebaseAuth()?.currentUser : undefined;
    const token = user ? await user.getIdToken() : undefined;
    let targetUrl = normalizeWalletUrl(url);
    if (token && !targetUrl.includes("token=") && !targetUrl.includes("auth=")) {
      const sep = targetUrl.includes("?") ? "&" : "?";
      targetUrl = `${targetUrl}${sep}token=${encodeURIComponent(token)}`;
    }

    const headers = isTicket ? await walletAuthHeaders() : {};
    let check: Response;
    try {
      check = await fetch(targetUrl, { method: "HEAD", headers });
      if (check.status === 405) {
        check = await fetch(targetUrl, { headers });
      }
    } catch {
      // WebKit / CFNetwork on iOS can drop HTTP/2 HEAD responses with non-zero Content-Length
      // ("transfer closed with ... bytes remaining"). Fall back to GET.
      check = await fetch(targetUrl, { headers });
    }

    if (!check.ok) {
      toast.error(
        check.status === 501
          ? "Apple Wallet isn't set up yet — ask your host for another ticket option."
          : check.status === 404
            ? "This pass is not yet available in your account."
            : "Couldn't load the Wallet pass — try again.",
      );
      return false;
    }

    // On Apple platforms (iOS, iPadOS, macOS Safari), navigating directly to the .pkpass URL
    // triggers Apple's native PKAddPassesViewController dialog automatically.
    if (isApplePlatform()) {
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
