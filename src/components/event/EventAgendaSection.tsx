import { Clock } from "lucide-react";
import type { EventAgendaItem } from "@shared/event";

/** Timed run-sheet rendered as a Schedule timeline. Hidden when empty. */
export function EventAgendaSection({ agenda }: { agenda?: EventAgendaItem[] }) {
  if (!agenda || agenda.length === 0) return null;
  return (
    <section aria-label="Event schedule" className="rounded-3xl bg-card p-5 ring-1 ring-line space-y-3">
      <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-ink">
        <Clock size={14} className="text-accent" aria-hidden="true" />
        <span>Schedule & Timings</span>
      </h3>
      <ol className="space-y-0">
        {agenda.map((row, i) => (
          <li key={i} className="relative flex gap-3.5 pb-4 last:pb-0">
            {i < agenda.length - 1 && (
              <span aria-hidden className="absolute left-[5px] top-5 h-[calc(100%-1rem)] w-px bg-line" />
            )}
            <span
              aria-hidden
              className="mt-1.5 h-[11px] w-[11px] shrink-0 rounded-full bg-brand ring-4 ring-brand/15"
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold tabular-nums text-accent">{row.time}</p>
              <p className="text-sm font-semibold leading-snug text-ink">{row.title}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
