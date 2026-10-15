import type { Geo } from "@shared/nearby";

/** Trim and fix a common paste error: extra leading A on a 39-char AIza key. */
export function normalizeMapsKey(raw: string | undefined | null): string {
  const key = String(raw || "").trim();
  if (key.startsWith("AAIza") && key.length === 40) return key.slice(1);
  return key;
}

export function mapsKey() {
  const key = normalizeMapsKey(import.meta.env.VITE_GOOGLE_MAPS_API_KEY);
  if (!key && import.meta.env.DEV && typeof console !== "undefined") {
    // Dev-only: guest surfaces fall back to a keyless embed, but interactive
    // Stay maps need a rebuild after setting VITE_GOOGLE_MAPS_API_KEY (.env → vite build).
    console.warn("[maps] VITE_GOOGLE_MAPS_API_KEY is empty — using keyless embed fallback.");
  }
  return key;
}

export function mapsSearchUrl(query: string, geo?: Geo) {
  const q = geo ? `${query}@${geo.lat},${geo.lng}` : query;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

export function mapsPlaceUrl(geo: Geo, name?: string) {
  const q = name ? `${name} ${geo.lat},${geo.lng}` : `${geo.lat},${geo.lng}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

export function mapsPlaceIdUrl(placeId: string) {
  return `https://www.google.com/maps/search/?api=1&query_place_id=${encodeURIComponent(placeId)}`;
}
