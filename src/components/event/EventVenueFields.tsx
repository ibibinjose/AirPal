import { Check, ExternalLink, Globe, Lock, MapPin, Video } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import { CITY_OPTIONS } from "@/lib/cities";
import { mapsPlaceUrl } from "@/lib/maps";
import { PlaceAddressField, type PickedPlace } from "@/components/forms/PlaceAddressField";
import type { EventLocationType } from "@shared/event";

export function EventVenueFields({
  title,
  locationType,
  venue,
  address,
  city,
  room,
  geo,
  virtualUrl,
  mapName,
  datalistId,
  showRoom,
  onLocationType,
  onVenue,
  onAddress,
  onCity,
  onRoom,
  onVirtualUrl,
  onGeo,
}: {
  title: string;
  locationType: EventLocationType;
  venue: string;
  address: string;
  city: string;
  room: string;
  geo: { lat: number; lng: number } | undefined;
  virtualUrl: string;
  mapName: string;
  datalistId: string;
  showRoom?: boolean;
  onLocationType: (v: EventLocationType) => void;
  onVenue: (v: string) => void;
  onAddress: (v: string) => void;
  onCity: (v: string) => void;
  onRoom: (v: string) => void;
  onVirtualUrl: (v: string) => void;
  onGeo: (v: { lat: number; lng: number } | undefined) => void;
}) {
  const onPick = (picked: PickedPlace) => {
    onVenue(picked.label.split(",")[0] || picked.label);
    onAddress(picked.label);
    onGeo(picked.geo);
    if (picked.city) onCity(picked.city);
    toast.success(`Pinned venue: ${picked.label}`);
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wider text-accent">{title}</p>
        <span className="text-[11px] text-mute flex items-center gap-1">
          {locationType === "in_person" ? (
            <>
              <MapPin size={12} className="text-accent" /> Google Maps Linked
            </>
          ) : locationType === "virtual" ? (
            <>
              <Globe size={12} className="text-accent" /> Online Gathering
            </>
          ) : (
            <>
              <Lock size={12} className="text-amber-500" /> Private Venue
            </>
          )}
        </span>
      </div>

      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-mute mb-1.5 block">Location Format</label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: "in_person", label: "In Person", icon: MapPin },
            { id: "virtual", label: "Virtual", icon: Video },
            { id: "secret", label: "Secret TBA", icon: Lock },
          ].map((mode) => {
            const on = locationType === mode.id;
            const Icon = mode.icon;
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => onLocationType(mode.id as EventLocationType)}
                className={cn(
                  "flex min-h-[44px] items-center justify-center gap-1.5 whitespace-nowrap rounded-2xl px-2 py-2.5 text-xs font-bold transition active:scale-95 ring-1 cursor-pointer",
                  on
                    ? "bg-brand text-white ring-brand shadow-sm"
                    : "bg-paper text-mute ring-line hover:text-ink hover:bg-card",
                )}
              >
                <Icon size={14} className="shrink-0" />
                <span>{mode.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {locationType === "in_person" && (
        <>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-mute mb-1.5 block">
              Search Venue on Google Maps
            </label>
            <PlaceAddressField
              value={venue || address}
              placeholder="Search venue (e.g. Overseas Passenger Terminal, Sydney)"
              onChange={(val) => {
                onVenue(val);
                onAddress(val);
              }}
              onPick={onPick}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-mute mb-1.5 block">City</label>
              <input
                value={city}
                list={datalistId}
                onChange={(e) => onCity(e.target.value)}
                placeholder="e.g. Sydney"
                className="h-12 w-full rounded-2xl border border-line bg-paper px-4 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
              <datalist id={datalistId}>
                {CITY_OPTIONS.map((c) => (
                  <option key={c.id} value={c.label} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-mute mb-1.5 block">
                Venue {showRoom ? "Name / Precinct" : "Short Label"}
              </label>
              <input
                value={venue}
                onChange={(e) => onVenue(e.target.value)}
                placeholder={showRoom ? undefined : "e.g. Argyle Precinct"}
                className="h-12 w-full rounded-2xl border border-line bg-paper px-4 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </div>
          </div>

          {showRoom && (
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-mute mb-1.5 block">
                Room / Hall / Stage (Optional)
              </label>
              <input
                value={room}
                onChange={(e) => onRoom(e.target.value)}
                placeholder="e.g. Boardroom 5+6, Great Hall, Main stage"
                className="h-12 w-full rounded-2xl border border-line bg-paper px-4 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </div>
          )}

          {geo && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-paper px-3 py-2 text-xs text-mute border border-line/70">
              <span className="flex items-center gap-1.5 text-ink font-medium">
                <Check size={14} className="shrink-0 text-emerald-600" />
                GPS Pinned: {geo.lat.toFixed(4)}, {geo.lng.toFixed(4)}
              </span>
              <a
                href={mapsPlaceUrl(geo, venue || mapName)}
                target="_blank"
                rel="noreferrer"
                className="text-accent font-semibold hover:underline inline-flex items-center gap-1 whitespace-nowrap"
              >
                View map <ExternalLink size={12} className="shrink-0" />
              </a>
            </div>
          )}
        </>
      )}

      {locationType === "virtual" && (
        <div className="space-y-3.5">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-mute mb-1.5 block">
              Stream or Video Meeting URL
            </label>
            <input
              value={virtualUrl}
              onChange={(e) => onVirtualUrl(e.target.value)}
              placeholder="e.g. https://zoom.us/j/... or https://meet.google.com/..."
              className="h-12 w-full rounded-2xl border border-line bg-paper px-4 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-mute">Quick links:</span>
            {[
              { label: "Zoom", prefix: "https://zoom.us/j/" },
              { label: "Google Meet", prefix: "https://meet.google.com/" },
              { label: "YouTube Live", prefix: "https://youtube.com/live/" },
            ].map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => {
                  if (!virtualUrl.startsWith("http")) onVirtualUrl(p.prefix);
                }}
                className="rounded-full bg-paper px-2.5 py-1 text-[11px] font-semibold text-ink border border-line hover:border-brand hover:text-accent transition active:scale-95 shadow-2xs"
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-mute mb-1.5 block">
                Timezone City Anchor
              </label>
              <input
                value={city}
                list={datalistId}
                onChange={(e) => onCity(e.target.value)}
                placeholder="e.g. Sydney"
                className="h-12 w-full rounded-2xl border border-line bg-paper px-4 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-mute mb-1.5 block">
                Virtual Platform Label
              </label>
              <input
                value={venue}
                onChange={(e) => onVenue(e.target.value)}
                placeholder="e.g. Zoom Interactive Room or YouTube Stream"
                className="h-12 w-full rounded-2xl border border-line bg-paper px-4 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </div>
          </div>

          <div className="rounded-2xl bg-brand/5 p-3 text-[11px] text-mute border border-brand/15 leading-relaxed">
            🔒 <strong>Pass Protected:</strong> The stream URL is guarded and only revealed to registered guests on
            their AirPal Pass or calendar ticket.
          </div>
        </div>
      )}

      {locationType === "secret" && (
        <div className="space-y-3.5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-mute mb-1.5 block">
                City / Vicinity
              </label>
              <input
                value={city}
                list={datalistId}
                onChange={(e) => onCity(e.target.value)}
                placeholder="e.g. Sydney"
                className="h-12 w-full rounded-2xl border border-line bg-paper px-4 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-mute mb-1.5 block">
                Neighborhood / Suburb Hint
              </label>
              <input
                value={venue}
                onChange={(e) => onVenue(e.target.value)}
                placeholder="e.g. Surry Hills / Secret Rooftop"
                className="h-12 w-full rounded-2xl border border-line bg-paper px-4 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-mute mb-1.5 block">
              Arrival / Door Secret Code (Announced on Pass)
            </label>
            <input
              value={address}
              onChange={(e) => onAddress(e.target.value)}
              placeholder="e.g. 42 Reservoir St (Buzzer 3), Sydney NSW 2010"
              className="h-12 w-full rounded-2xl border border-line bg-paper px-4 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </div>

          <div className="rounded-2xl bg-amber-500/10 p-3 text-[11px] text-amber-900 dark:text-amber-200 border border-amber-500/20 leading-relaxed">
            🔒 <strong>Confidential Venue:</strong> The exact street address is kept hidden from public discovery pages
            and sent directly to approved ticket holders.
          </div>
        </div>
      )}
    </>
  );
}
