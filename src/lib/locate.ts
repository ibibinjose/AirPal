import { locationFromNominatim, type HostLocationFields } from "@shared/geo-address";
import type { Geo } from "@shared/nearby";
import { requestDeviceGeo } from "./geo-locate";

/**
 * Device position plus a best-effort reverse-geocode for business forms.
 * Position comes from the single device-geo path (native Capacitor first,
 * then web); only the Nominatim lookup lives here. Rejects when no fix —
 * callers surface the message as the failure toast.
 */
export async function locateBusiness(): Promise<{ geo: Geo; fields?: HostLocationFields }> {
  const geo = await requestDeviceGeo({ highAccuracy: true });
  if (!geo) throw new Error("Allow location for this place");
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${geo.lat}&lon=${geo.lng}`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return { geo };
    const data = (await res.json()) as { address?: Record<string, string>; lat?: string; lon?: string };
    return { geo, fields: locationFromNominatim({ ...data, lat: String(geo.lat), lon: String(geo.lng) }) };
  } catch {
    return { geo };
  }
}
