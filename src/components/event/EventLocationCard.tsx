import { useState } from "react";
import { Check, Copy, ExternalLink, Globe, Lock, MapPin, Navigation, ShieldCheck, Video } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import type { EventLocationType } from "@shared/event";

export interface EventLocationCardProps {
  venue: string;
  room?: string;
  address?: string;
  city: string;
  geo?: { lat: number; lng: number };
  locationType?: EventLocationType;
  virtualUrl?: string;
  /** How to find the group at the venue. Absent = block hidden. */
  directions?: string;
  className?: string;
}

export function EventLocationCard({
  venue,
  room,
  address,
  city,
  geo,
  locationType = "in_person",
  virtualUrl,
  directions,
  className,
}: EventLocationCardProps) {
  const [copied, setCopied] = useState(false);

  // VIRTUAL MODE
  if (locationType === "virtual") {
    return (
      <div className={cn("rounded-3xl bg-card p-4 sm:p-5 ring-1 ring-line space-y-4", className)}>
        <div className="flex items-center justify-between border-b border-line/50 pb-3">
          <div className="flex items-center gap-1.5 text-sm font-bold text-ink">
            <Video size={14} className="text-accent" aria-hidden="true" />
            <span>Virtual Experience · Online Stream</span>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-accent">
            <Globe size={10} aria-hidden="true" /> Online
          </span>
        </div>

        <div>
          <h3 className="text-base font-bold text-ink">{venue || "Online Live Stream & Interactive Gathering"}</h3>
          <p className="mt-0.5 text-sm text-mute leading-relaxed">
            {address || "Accessible globally from your phone or browser"}
          </p>
        </div>

        <div className="rounded-2xl bg-paper/90 p-3.5 border border-line/70 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-ink">
            <span className="grid h-7 w-7 place-items-center rounded-xl bg-brand/15 text-accent ring-1 ring-brand/20">
              <ShieldCheck size={14} />
            </span>
            <span>Stream Access Gate</span>
          </div>
          <p className="text-xs text-mute leading-relaxed">
            {virtualUrl
              ? "Live stream link is protected and delivered with your AirPal Pass."
              : "Meeting coordinates & streaming room details are issued to registered pass holders."}
          </p>
          {virtualUrl && (
            <div className="pt-1">
              <a
                href={/^https?:\/\//i.test(virtualUrl) ? virtualUrl : `https://${virtualUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full min-h-[44px] items-center justify-center gap-1.5 rounded-full bg-brand px-3 text-sm font-bold text-white shadow-xs hover:bg-brand/90 transition active:scale-98 touch-manipulation"
              >
                <Video size={13} aria-hidden="true" />
                <span>Open Virtual Stream</span>
                <ExternalLink size={11} className="opacity-80" aria-hidden="true" />
              </a>
            </div>
          )}
        </div>
      </div>
    );
  }

  // SECRET / TBA MODE
  if (locationType === "secret") {
    return (
      <div className={cn("rounded-3xl bg-card p-4 sm:p-5 ring-1 ring-line space-y-4", className)}>
        <div className="flex items-center justify-between border-b border-line/50 pb-3">
          <div className="flex items-center gap-1.5 text-sm font-bold text-ink">
            <Lock size={14} className="text-amber-500" aria-hidden="true" />
            <span>Secret Venue · Confidential</span>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-amber-900 dark:text-amber-300 ring-1 ring-amber-400/30">
            TBA to Guests
          </span>
        </div>

        <div>
          <h3 className="text-base font-bold text-ink">{venue || "Secret Location"}</h3>
          <p className="mt-0.5 text-sm text-mute leading-relaxed">
            {city ? `General vicinity: ${city}` : "Location announced before event"}
          </p>
        </div>

        <div className="rounded-2xl bg-amber-500/10 p-4 border border-amber-500/20 space-y-1.5">
          <div className="flex items-center gap-2 text-sm font-bold text-ink">
            <Lock size={13} className="text-amber-600 dark:text-amber-400" aria-hidden="true" />
            <span>Revealed Upon Confirmation</span>
          </div>
          <p className="text-xs text-mute leading-relaxed">
            Exact address and private entry instructions are kept confidential to curb uninvited crashers. Approved
            ticket holders will see coordinates in their AirPal Pass.
          </p>
        </div>
      </div>
    );
  }

  // IN-PERSON MODE (Default)
  const displayTitle = [venue, room].filter(Boolean).join(" · ") || city || "Venue Location";
  const displayAddress = address || (venue ? `${venue}, ${city}` : city);

  const mapQuery = encodeURIComponent(geo ? `${geo.lat},${geo.lng}` : address || `${venue}, ${city}`);
  const directionsUrl = `https://www.google.com/maps/search/?api=1&query=${mapQuery}`;

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(displayAddress);
      setCopied(true);
      toast.success("Address copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy address");
    }
  };

  return (
    <div className={cn("rounded-3xl bg-card p-4 sm:p-5 ring-1 ring-line space-y-4", className)}>
      <div className="flex items-center justify-between border-b border-line/50 pb-3">
        <div className="flex items-center gap-1.5 text-sm font-bold text-ink">
          <MapPin size={14} className="text-accent" aria-hidden="true" />
          <span>Location &amp; Venue</span>
        </div>
        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-[44px] items-center gap-1 text-xs font-bold text-accent hover:underline touch-manipulation"
        >
          <span>Directions</span>
          <ExternalLink size={11} aria-hidden="true" />
        </a>
      </div>

      <div>
        <h3 className="text-base font-bold text-ink">{displayTitle}</h3>
        <p className="mt-0.5 text-sm text-mute leading-relaxed">{displayAddress}</p>
        {directions && (
          <p className="mt-2 rounded-2xl bg-paper px-3.5 py-2.5 text-[13px] leading-relaxed text-ink ring-1 ring-line/70">
            <span className="font-bold">Finding us: </span>
            {directions}
          </p>
        )}
      </div>

      {/* Map Embed Container */}
      <div className="relative aspect-[16/8] sm:aspect-[16/7] w-full overflow-hidden rounded-2xl bg-paper ring-1 ring-line/60">
        <iframe
          title={`Map of ${displayTitle}`}
          src={`https://www.google.com/maps?q=${mapQuery}&z=15&output=embed`}
          className="h-full w-full border-0 filter contrast-[1.02] opacity-90 dark:opacity-80"
          loading="lazy"
        />
        {/* Soft overlay on corners for sleek Liquid Glass look */}
        <div className="absolute inset-0 pointer-events-none rounded-2xl ring-1 ring-inset ring-black/5 dark:ring-white/10" />
      </div>

      {/* Address Action Bar */}
      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={copyAddress}
          className="flex-1 inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-full bg-paper px-3 text-sm font-semibold text-ink ring-1 ring-line hover:bg-card hover:ring-brand/30 transition active:scale-95 cursor-pointer touch-manipulation"
        >
          {copied ? (
            <Check size={13} className="text-emerald-600" aria-hidden="true" />
          ) : (
            <Copy size={13} className="text-mute" aria-hidden="true" />
          )}
          <span>{copied ? "Copied" : "Copy Address"}</span>
        </button>

        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-full bg-paper px-3 text-sm font-semibold text-ink ring-1 ring-line hover:bg-card hover:ring-brand/30 transition active:scale-95 cursor-pointer touch-manipulation"
        >
          <Navigation size={13} className="text-accent" aria-hidden="true" />
          <span>Get Directions</span>
        </a>
      </div>
    </div>
  );
}
