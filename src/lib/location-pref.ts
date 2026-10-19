import type { Geo } from "@shared/nearby";
import { CITY_OPTIONS, knownCityCenter } from "./cities";
import { safeGetItem, safeGetJSON, safeRemoveItem, safeSetItem, safeSetJSON } from "./safe-storage";

export type LocationChoice =
  { mode: "auto" } | { mode: "gps" } | { mode: "stay" } | { mode: "city"; city: string; lat: number; lng: number };

const CHOICE_KEY = "airpal.location.v1";
const SHARE_KEY = "airpal.location.share";

export function loadLocationChoice(): LocationChoice {
  try {
    if (typeof window !== "undefined" && window.location?.search) {
      const urlCity = new URLSearchParams(window.location.search).get("city");
      if (urlCity) {
        const match = CITY_OPTIONS.find(
          (c) => c.label.toLowerCase() === urlCity.toLowerCase() || c.id.toLowerCase() === urlCity.toLowerCase(),
        );
        const center = match ? { lat: match.lat, lng: match.lng } : knownCityCenter(urlCity);
        if (center) {
          return { mode: "city", city: match?.label || urlCity, lat: center.lat, lng: center.lng };
        }
      }
    }
    const parsed = safeGetJSON<LocationChoice | null>(CHOICE_KEY, null);
    if (!parsed || typeof parsed !== "object") return { mode: "auto" };
    if (parsed.mode === "city" && parsed.city && Number.isFinite(parsed.lat) && Number.isFinite(parsed.lng))
      return parsed;
    if (parsed.mode === "gps" || parsed.mode === "stay" || parsed.mode === "auto") return { mode: parsed.mode };
  } catch {
    /* ignore */
  }
  return { mode: "auto" };
}

export function saveLocationChoice(choice: LocationChoice) {
  safeSetJSON(CHOICE_KEY, choice);
}

export function loadShareLocation(): boolean {
  return safeGetItem(SHARE_KEY) === "1";
}

export function saveShareLocation(on: boolean) {
  if (on) safeSetItem(SHARE_KEY, "1");
  else safeRemoveItem(SHARE_KEY);
}

const LAST_GPS_KEY = "airpal.location.lastGps";

export function saveLastGps(geo: Geo & { city?: string }) {
  safeSetJSON(LAST_GPS_KEY, { lat: geo.lat, lng: geo.lng, city: geo.city || "" });
}

export function loadLastGps(): (Geo & { city?: string }) | null {
  const parsed = safeGetJSON<{ lat?: number; lng?: number; city?: string } | null>(LAST_GPS_KEY, null);
  if (!parsed || !Number.isFinite(parsed.lat) || !Number.isFinite(parsed.lng)) return null;
  return { lat: Number(parsed.lat), lng: Number(parsed.lng), city: parsed.city };
}
