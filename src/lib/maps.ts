import type { Geo } from "@shared/nearby";
import { getNativePlatform } from "./platform";

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
  const q = name ? `${name}, ${geo.lat},${geo.lng}` : `${geo.lat},${geo.lng}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

export function mapsPlaceIdUrl(placeId: string) {
  return `https://www.google.com/maps/search/?api=1&query_place_id=${encodeURIComponent(placeId)}`;
}

/** Check if the client environment is an Apple device (iOS, iPadOS, macOS, or Capacitor iOS). */
export function isAppleDevice(): boolean {
  if (getNativePlatform() === "ios") return true;
  if (typeof navigator !== "undefined" && navigator.userAgent) {
    return /iPhone|iPad|iPod|Macintosh/i.test(navigator.userAgent);
  }
  return false;
}

export type DirectionsMode = "driving" | "walking" | "transit";

/**
 * Generates an Apple Maps web/deep-link URL.
 * dirflg: 'd' (driving), 'w' (walking), 'r' (transit)
 */
export function appleMapsDirectionsUrl(options: {
  destination: Geo;
  destinationName?: string;
  mode?: DirectionsMode;
}): string {
  const { destination, destinationName, mode = "driving" } = options;
  const dirflg = mode === "walking" ? "w" : mode === "transit" ? "r" : "d";
  const daddr = destinationName
    ? `${destinationName}, ${destination.lat},${destination.lng}`
    : `${destination.lat},${destination.lng}`;
  return `https://maps.apple.com/?daddr=${encodeURIComponent(daddr)}&dirflg=${dirflg}`;
}

/**
 * Generates a Google Maps directions URL with travel mode.
 */
export function googleMapsDirectionsUrl(options: {
  destination: Geo;
  destinationName?: string;
  mode?: DirectionsMode;
}): string {
  const { destination, destinationName, mode = "driving" } = options;
  const dest = destinationName
    ? `${destinationName} ${destination.lat},${destination.lng}`
    : `${destination.lat},${destination.lng}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}&travelmode=${mode}`;
}

/**
 * Calculates great-circle distance in meters between two coordinates using the Haversine formula.
 */
export function calculateHaversineDistanceMeters(a: Geo, b: Geo): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (a.lat * Math.PI) / 180;
  const phi2 = (b.lat * Math.PI) / 180;
  const deltaPhi = ((b.lat - a.lat) * Math.PI) / 180;
  const deltaLambda = ((b.lng - a.lng) * Math.PI) / 180;

  const sinDeltaPhi = Math.sin(deltaPhi / 2);
  const sinDeltaLambda = Math.sin(deltaLambda / 2);
  const chord = sinDeltaPhi * sinDeltaPhi + Math.cos(phi1) * Math.cos(phi2) * sinDeltaLambda * sinDeltaLambda;
  const angularDistance = 2 * Math.atan2(Math.sqrt(chord), Math.sqrt(1 - chord));

  return Math.round(R * angularDistance);
}

/**
 * Estimates walking time in minutes based on average human urban walking speed (80 meters/min = ~4.8 km/h).
 */
export function estimateWalkingMinutes(meters: number, metersPerMinute = 80): number {
  if (meters <= 0) return 0;
  return Math.max(1, Math.round(meters / metersPerMinute));
}

/**
 * Formats a metric distance into human-friendly string (e.g. "180m", "1.2km").
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${meters}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

/**
 * Formats walking time and distance in Possie-style last-mile format (e.g. "3 min walk (240m)").
 */
export function formatWalkingTime(meters: number): string {
  if (meters < 40) return "< 1 min walk";
  const mins = estimateWalkingMinutes(meters);
  return `${mins} min walk (${formatDistance(meters)})`;
}

/**
 * Returns dual navigation URLs for both Apple Maps and Google Maps.
 */
export function getDualNavigationUrls(options: { destination: Geo; destinationName?: string; mode?: DirectionsMode }): {
  apple: string;
  google: string;
  primary: "apple" | "google";
} {
  return {
    apple: appleMapsDirectionsUrl(options),
    google: googleMapsDirectionsUrl(options),
    primary: isAppleDevice() ? "apple" : "google",
  };
}
