import { useEffect, useState } from "react";
import { Download, Users } from "lucide-react";
import type { BioSubscriberRow } from "@shared/airpal-security";
import { listBioSubscribersRemote, liveBackendEnabled } from "@/lib/functions";
import { triggerHaptic } from "@/lib/native";

function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function toCsv(rows: BioSubscriberRow[]): string {
  const head = "email,name,city,consented_at,subscribed_at";
  const body = rows.map((row) => [row.email, row.name, row.city, row.consentAt, row.createdAt].map(csvCell).join(","));
  return [head, ...body].join("\n");
}

export function BioSubscribersPanel({ handle }: { handle: string }) {
  const [rows, setRows] = useState<BioSubscriberRow[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!liveBackendEnabled()) return;
    let cancelled = false;
    setFailed(false);
    listBioSubscribersRemote({ handle })
      .then((res) => {
        if (!cancelled) setRows(res.rows);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [handle]);

  function exportCsv() {
    if (!rows || rows.length === 0) return;
    void triggerHaptic("light");
    const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `airpal-subscribers-${handle}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  if (!liveBackendEnabled()) return null;

  return (
    <div className="mt-6 rounded-3xl border border-line bg-card p-5 sm:p-6 shadow-clay">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wider text-accent flex items-center gap-2">
          <Users size={14} />
          <span>Subscribers · {rows ? rows.length : "…"}</span>
        </p>
        {rows && rows.length > 0 && (
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-4 text-xs font-bold text-accent ring-1 ring-line transition hover:bg-brand/5 active:scale-95 cursor-pointer"
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>
        )}
      </div>

      {rows === null && !failed && <p className="mt-3 text-sm text-mute">Loading subscribers…</p>}
      {failed && rows === null && (
        <p className="mt-3 text-sm text-mute">
          Couldn&apos;t load subscribers. Check your connection and reopen this tab.
        </p>
      )}
      {rows !== null && rows.length === 0 && (
        <p className="mt-3 text-xs leading-relaxed text-mute">
          No subscribers yet — everyone who joins your list from your public bio will appear here with their consent
          timestamp. Unsubscribed addresses drop off automatically.
        </p>
      )}
      {rows !== null && rows.length > 0 && (
        <ul className="mt-3 space-y-2">
          {rows.slice(0, 50).map((row) => (
            <li
              key={row.email}
              className="flex items-center gap-3 rounded-2xl bg-paper px-3.5 py-2.5 ring-1 ring-line/70"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-ink">{row.name || row.email}</span>
                <span className="block truncate text-[11px] text-mute">
                  {row.email}
                  {row.city ? ` · ${row.city}` : ""}
                </span>
              </span>
              <span className="shrink-0 text-[10px] font-medium text-mute">
                {row.createdAt ? row.createdAt.slice(0, 10) : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
