import QRCode from "qrcode";
import jsQR from "jsqr";
import { parseVanityOrMarkerPath } from "@shared/airpal-urls";

export type QrIntent =
  | { kind: "marker"; markerId: string }
  | { kind: "vanity"; city: string; handle: string }
  | { kind: "pulse"; publicToken: string }
  | { kind: "url"; href: string }
  | { kind: "unknown"; raw: string };

export async function makeQrDataUrl(text: string, size = 280) {
  return QRCode.toDataURL(text, {
    margin: 1,
    width: size,
    errorCorrectionLevel: "H",
    color: { dark: "#121614", light: "#ffffff" },
  });
}

export function parseQrPayload(raw: string): QrIntent {
  const value = raw.trim();
  if (!value) return { kind: "unknown", raw: "" };

  // Handle direct @handle strings like "@xbibin" or "xbibin"
  if (value.startsWith("@")) {
    return { kind: "url", href: `/${value.toLowerCase()}` };
  }

  try {
    const url = new URL(value, typeof window === "undefined" ? "https://airpal.me" : window.location.origin);
    const qPath = parseVanityOrMarkerPath(url.pathname);
    if (qPath.kind === "marker") return { kind: "marker", markerId: qPath.markerId };
    if (qPath.kind === "vanity") return { kind: "vanity", city: qPath.city, handle: qPath.handle };

    // Pulse public: /pulse/:publicToken
    const pulse = url.pathname.match(/^\/pulse\/([^/]+)/);
    if (pulse?.[1]) {
      return { kind: "pulse", publicToken: decodeURIComponent(pulse[1]) };
    }

    // Wave codes: /w/CODE
    const wave = url.pathname.match(/^\/w\/([A-Za-z0-9]{4,8})/);
    if (wave?.[1]) {
      return { kind: "url", href: `/w/${wave[1].toUpperCase()}` };
    }

    // @handle URLs: /@username
    const at = url.pathname.match(/^\/@([a-z0-9._]{3,30})/i);
    if (at?.[1]) {
      return { kind: "url", href: `/@${at[1].toLowerCase()}` };
    }

    // Experience / Event / Ticket / Stay / Deals paths
    if (
      url.pathname.startsWith("/e/") ||
      url.pathname.startsWith("/event/") ||
      url.pathname.startsWith("/ticket/") ||
      url.pathname.startsWith("/stay/") ||
      url.pathname.startsWith("/deals/") ||
      url.pathname.startsWith("/p/") ||
      url.pathname.startsWith("/companion")
    ) {
      return { kind: "url", href: url.pathname + url.search };
    }

    const origin = typeof window === "undefined" ? "https://airpal.me" : window.location.origin;
    if (url.origin === origin || url.hostname.includes("airpal") || url.hostname.includes("localhost")) {
      return { kind: "url", href: url.pathname + url.search };
    }
  } catch {
    /* fall through */
  }

  const tagged = value.match(/^AIRPAL:MARKER:(.+)$/i);
  if (tagged?.[1]) return { kind: "marker", markerId: tagged[1] };
  return { kind: "unknown", raw: value };
}

export function pathForIntent(intent: QrIntent): string | null {
  switch (intent.kind) {
    case "marker":
      return `/q/${intent.markerId}`;
    case "vanity":
      return `/q/${intent.city}/${intent.handle}`;
    case "pulse":
      return `/pulse/${encodeURIComponent(intent.publicToken)}`;
    case "url":
      return intent.href;
    default:
      return null;
  }
}

/** Decodes a QR code from a user-selected image File using jsQR. */
export async function decodeQrFromImageFile(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      if (typeof e.target?.result !== "string") {
        resolve(null);
        return;
      }
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(null);
          return;
        }
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        resolve(code?.data || null);
      };
      img.onerror = () => resolve(null);
      img.src = e.target.result;
    };

    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}
