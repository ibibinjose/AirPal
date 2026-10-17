import { Clock, Plus, Trash2 } from "lucide-react";

export type AgendaRow = { time: string; title: string };

/** Timed run-sheet editor (max 12 rows). Empty rows are dropped on save. */
export function EventAgendaFields({ rows, onChange }: { rows: AgendaRow[]; onChange: (next: AgendaRow[]) => void }) {
  function setRow(index: number, patch: Partial<AgendaRow>) {
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wider">
          <span className="inline-flex items-center gap-1.5 text-accent">
            <Clock size={13} aria-hidden />
            <span>Schedule & Timings</span>
          </span>
        </p>
        <span className="text-[11px] text-mute">{rows.length}/12 · optional</span>
      </div>
      {rows.map((row, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            value={row.time}
            onChange={(e) => setRow(i, { time: e.target.value })}
            placeholder="6:30pm"
            maxLength={24}
            aria-label={`Agenda item ${i + 1} time`}
            className="h-11 w-24 shrink-0 rounded-xl border border-line bg-paper px-3 text-xs font-semibold text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 placeholder:text-mute/60"
          />
          <input
            value={row.title}
            onChange={(e) => setRow(i, { title: e.target.value })}
            placeholder="Game 1 (starts on time!)"
            maxLength={120}
            aria-label={`Agenda item ${i + 1} title`}
            className="h-11 min-w-0 flex-1 rounded-xl border border-line bg-paper px-3 text-xs font-medium text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 placeholder:text-mute/60"
          />
          <button
            type="button"
            onClick={() => onChange(rows.filter((_, j) => j !== i))}
            aria-label={`Remove agenda item ${i + 1}`}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-mute ring-1 ring-line transition hover:bg-red-500/10 hover:text-red-600 active:scale-95 cursor-pointer touch-manipulation"
          >
            <Trash2 size={15} />
          </button>
        </div>
      ))}
      {rows.length < 12 && (
        <button
          type="button"
          onClick={() => onChange([...rows, { time: "", title: "" }])}
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-paper px-4 text-xs font-bold text-accent ring-1 ring-line transition hover:bg-card active:scale-95 cursor-pointer touch-manipulation"
        >
          <Plus size={14} />
          <span>Add timing</span>
        </button>
      )}
    </div>
  );
}
