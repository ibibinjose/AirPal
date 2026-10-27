import { MapPin, Navigation } from "lucide-react";
import type { Geo } from "@shared/nearby";
import { mapsPlaceUrl, mapsSearchUrl } from "@/lib/maps";
import { triggerHaptic } from "@/lib/native";

/**
 * Possie-style last-leg handoff. AirPal never rebuilds turn-by-turn
 * navigation — it hands over to Google Maps or Apple Maps instead.
 * Renders nothing when there is no destination to hand off.
 */
export function appleMapsUrl(geo: Geo | undefined, label: string): string {
  const q = encodeURIComponent(label);
  return geo ? `https://maps.apple.com/?q=${q}&ll=${geo.lat},${geo.lng}` : `https://maps.apple.com/?q=${q}`;
}

export function DirectionsHandoff({ geo, label, address }: { geo?: Geo; label: string; address?: string }) {
  const name = (label || "").trim();
  if (!name && !geo) return null;
  const destination = name || (address || "").trim() || "Destination";
  const googleUrl = geo ? mapsPlaceUrl(geo, destination) : mapsSearchUrl(destination, undefined);

  const linkCls =
    "inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-card px-4 text-xs font-bold text-ink ring-1 ring-line hover:bg-paper active:scale-95 transition cursor-pointer touch-manipulation";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold text-mute">Get there:</span>
      <a
        href={googleUrl}
        target="_blank"
        rel="noreferrer"
        aria-label={`Open ${destination} in Google Maps`}
        onClick={() => {
          void triggerHaptic("light");
        }}
        className={linkCls}
      >
        <Navigation size={13} className="text-accent" aria-hidden="true" />
        <span>Google Maps</span>
      </a>
      <a
        href={appleMapsUrl(geo, destination)}
        target="_blank"
        rel="noreferrer"
        aria-label={`Open ${destination} in Apple Maps`}
        onClick={() => {
          void triggerHaptic("light");
        }}
        className={linkCls}
      >
        <MapPin size={13} className="text-accent" aria-hidden="true" />
        <span>Apple Maps</span>
      </a>
    </div>
  );
}
