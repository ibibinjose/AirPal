import { normalizeHandle } from "@shared/bio";

/** Public BioSite home. Override locally with VITE_BIO_ORIGIN. */
export function bioSiteOrigin(): string {
  const env = (import.meta.env?.VITE_BIO_ORIGIN as string | undefined)?.trim().replace(/\/$/, "");
  if (env) return env;
  return "https://airpal.bio";
}

/** Canonical in-app BioSite path: /bio/@handle (never collides with /bio/setup). */
export function bioSitePath(handle: string): string {
  return `/bio/@${normalizeHandle(handle)}`;
}

/** Absolute BioSite URL for a handle (QR codes, share sheets, OG tags). */
export function bioSiteUrl(handle: string, origin: string = bioSiteOrigin()): string {
  return `${origin.replace(/\/$/, "")}${bioSitePath(handle)}`;
}

/**
 * Origin to display while viewing: the live BioSite domain in production,
 * but the current origin on localhost (where airpal.bio isn't served) and
 * when already browsing on airpal.bio. Keeps QR codes and copy-link
 * targets reachable from wherever the page is actually open.
 */
export function bioSiteDisplayOrigin(): string {
  if (typeof window === "undefined") return bioSiteOrigin();
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1" || host === "[::1]") return window.location.origin;
  if (/(^|\.)airpal\.bio$/i.test(host)) return window.location.origin;
  return bioSiteOrigin();
}

/** Extract the handle from a /bio/@handle path. Anything else yields "". */
export function parseBioSiteHandle(path: string): string {
  const match = /^\/bio\/@([^/?#]+)/i.exec(path || "");
  return normalizeHandle(match?.[1] || "");
}
