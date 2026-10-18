import { ExternalLink, MapPin } from "lucide-react";
import { Link } from "wouter";
import type { HerePin } from "@shared/here";
import { mapsUrl } from "@/lib/geo";

export function CircleHereBoard({
  pins,
  myHandle,
  onOpen,
}: {
  pins: HerePin[];
  myHandle?: string;
  onOpen?: (pin: HerePin) => void;
}) {
  if (!pins.length) return null;
  return (
    <section className="mt-3 rounded-[20px] bg-paper p-4 ring-1 ring-line/70" aria-label="People here now">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wider text-mute">Here now</p>
        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
          {pins.length} active
        </span>
      </div>
      <ul className="mt-2 divide-y divide-line/70">
        {pins.map((p) => {
          const isMe = p.handle === myHandle;
          return (
            <li key={p.handle} className="flex items-center gap-3 py-2.5">
              <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand/10 text-accent">
                <MapPin size={16} aria-hidden="true" />
                <span
                  className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-paper"
                  aria-hidden="true"
                />
              </span>
              {onOpen ? (
                <button
                  type="button"
                  className="min-h-[44px] min-w-0 flex-1 text-left cursor-pointer"
                  onClick={() => onOpen(p)}
                >
                  <p className="truncate text-sm font-bold text-ink">
                    {isMe ? "You" : p.name} <span className="font-normal text-mute">· {p.placeName}</span>
                  </p>
                  <p className="text-xs text-mute">
                    {isMe ? "Sharing with your Circle" : `@${p.handle} · Pinned at this place`}
                  </p>
                </button>
              ) : (
                <Link href={`/@${p.handle}`} className="flex min-h-[44px] min-w-0 flex-1 flex-col justify-center">
                  <p className="truncate text-sm font-bold text-ink hover:underline">
                    {isMe ? "You" : p.name} <span className="font-normal text-mute">· {p.placeName}</span>
                  </p>
                  <p className="text-xs text-mute">
                    {isMe ? "Sharing with your Circle" : `@${p.handle} · Pinned at this place`}
                  </p>
                </Link>
              )}
              {p.geo && (
                <a
                  href={mapsUrl(p.geo, p.placeName)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-[44px] shrink-0 items-center gap-1 rounded-full bg-card px-3 text-xs font-semibold text-accent ring-1 ring-line transition hover:bg-paper"
                >
                  <span>Maps</span>
                  <ExternalLink size={12} aria-hidden="true" />
                </a>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
