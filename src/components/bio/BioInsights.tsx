import { useEffect, useState } from "react";
import { BarChart3, MousePointerClick } from "lucide-react";
import type { BioLink } from "@shared/bio";
import type { GetBioLinkStatsResponse } from "@shared/airpal-security";
import { getBioLinkStatsRemote, liveBackendEnabled } from "@/lib/functions";
import { cn } from "@/lib/cn";

function linkLabel(links: BioLink[], linkId: string): string {
  const found = links.find((link) => link.id === linkId);
  if (found) return found.label || found.type;
  return "Removed link";
}

export function BioInsightsPanel({
  handle,
  profileId,
  links,
}: {
  handle: string;
  profileId: string;
  links: BioLink[];
}) {
  const [stats, setStats] = useState<GetBioLinkStatsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!liveBackendEnabled()) return;
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    getBioLinkStatsRemote({ handle, profileId, days: 30 })
      .then((res) => {
        if (!cancelled) setStats(res);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [handle, profileId]);

  if (!liveBackendEnabled()) {
    return (
      <div className="neu-section mt-6 p-6 text-center">
        <BarChart3 size={22} className="mx-auto text-mute" />
        <p className="mt-2 text-sm font-semibold text-ink">Insights need the live backend</p>
        <p className="mt-1 text-xs text-mute">Sign in with a connected account to see real tap analytics.</p>
      </div>
    );
  }

  if (loading && !stats) {
    return (
      <div className="neu-section mt-6 p-6 text-center">
        <p className="text-sm text-mute">Loading insights…</p>
      </div>
    );
  }

  if (failed && !stats) {
    return (
      <div className="neu-section mt-6 p-6 text-center">
        <p className="text-sm font-semibold text-ink">Couldn&apos;t load insights</p>
        <p className="mt-1 text-xs text-mute">Check your connection and try this tab again.</p>
      </div>
    );
  }

  const total = stats?.total ?? 0;
  const rows = stats?.byLink ?? [];
  const linkTotal = rows.reduce((sum, row) => sum + row.taps, 0);
  const days = (stats?.byDay ?? []).slice(-14);
  const maxDay = Math.max(1, ...days.map((d) => d.taps));

  return (
    <div className="mt-6 space-y-6">
      <div className="neu-section p-5 sm:p-6">
        <p className="text-xs font-bold uppercase tracking-wider text-accent flex items-center gap-2">
          <MousePointerClick size={14} />
          <span>Total Taps · Last 30 Days</span>
        </p>
        <p className="mt-2 font-display text-4xl font-bold tracking-tight text-ink">{total}</p>
        {total === 0 ? (
          <p className="mt-1 text-xs text-mute">No taps yet — share your bio link to start collecting real visits.</p>
        ) : (
          <p className="mt-1 text-xs text-mute">Counts every tap on your public bio, including link taps.</p>
        )}
      </div>

      {days.length > 0 && (
        <div className="neu-section p-5 sm:p-6">
          <p className="text-xs font-bold uppercase tracking-wider text-accent mb-3">Daily Taps · Last 14 Days</p>
          <div className="flex h-24 items-end gap-1.5" role="img" aria-label="Daily tap counts">
            {days.map((d) => (
              <div key={d.day} className="flex flex-1 flex-col items-center gap-1" title={`${d.day}: ${d.taps}`}>
                <div
                  className={cn("w-full rounded-t-md bg-brand/80", d.taps === 0 && "bg-line")}
                  style={{ height: `${Math.max(d.taps === 0 ? 4 : 8, Math.round((d.taps / maxDay) * 88))}px` }}
                />
                <span className="text-[9px] font-medium text-mute">{d.day.slice(5)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="neu-section p-5 sm:p-6">
        <p className="text-xs font-bold uppercase tracking-wider text-accent mb-3">Top Links</p>
        {rows.length === 0 ? (
          <p className="text-xs text-mute">No link taps yet. When visitors tap a link, it will rank here.</p>
        ) : (
          <ul className="space-y-2">
            {rows.slice(0, 10).map((row, index) => {
              const share = linkTotal > 0 ? Math.round((row.taps / linkTotal) * 100) : 0;
              return (
                <li key={row.linkId} className="neu-row flex items-center gap-3 px-3.5 py-2.5">
                  <span className="w-6 text-center text-xs font-bold text-mute">{index + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">
                    {linkLabel(links, row.linkId)}
                  </span>
                  <span className="text-xs font-mono text-mute">{share}%</span>
                  <span className="text-sm font-bold text-ink tabular-nums">{row.taps}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
