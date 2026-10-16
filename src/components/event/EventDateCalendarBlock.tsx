import { useMemo } from "react";
import { Clock } from "lucide-react";
import { AddToCalendarMenu } from "@/components/calendar/AddToCalendarMenu";
import type { CalendarEvent } from "@shared/event";
import { cn } from "@/lib/cn";

export interface EventDateCalendarBlockProps {
  event: CalendarEvent;
  className?: string;
}

const MONTH_NAMES = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

export function EventDateCalendarBlock({ event, className }: EventDateCalendarBlockProps) {
  const { month, dayNum, fullDateString, timezoneLabel } = useMemo(() => {
    const at = new Date(event.startsAt);
    const valid = !Number.isNaN(at.getTime());
    const m = valid ? MONTH_NAMES[at.getMonth()] : "EVENT";
    const d = valid ? String(at.getDate()) : "·";

    let dateStr = event.date;
    if (valid) {
      dateStr = at.toLocaleDateString("en-AU", {
        weekday: "long",
        month: "short",
        day: "numeric",
      });
    }

    // Determine user or event timezone
    let tz = "AEST";
    try {
      const match = at.toLocaleTimeString("en-AU", { timeZoneName: "short" }).split(" ");
      tz = match[match.length - 1] || "Local Time";
    } catch {
      tz = "Local Time";
    }

    return {
      month: m,
      dayNum: d,
      fullDateString: dateStr,
      timezoneLabel: tz,
    };
  }, [event.startsAt, event.date]);

  return (
    <div className={cn("rounded-3xl bg-card p-4 sm:p-5 ring-1 ring-line", className)}>
      <div className="flex items-start gap-4">
        {/* Apple Calendar Square Badge */}
        <div className="flex flex-col items-center justify-between h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-paper ring-1 ring-line select-none">
          <div className="w-full bg-rose-600/90 dark:bg-rose-500 py-0.5 text-center text-[11px] font-black tracking-wider text-white uppercase">
            {month}
          </div>
          <div className="flex-1 flex items-center justify-center font-display text-xl font-black text-ink leading-none tabular-data">
            {dayNum}
          </div>
        </div>

        {/* Date, Time & Add to Calendar */}
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-bold text-ink truncate">{fullDateString}</h2>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-mute">
            <span className="flex items-center gap-1 font-medium text-ink">
              <Clock size={12} className="text-accent" aria-hidden="true" />
              {event.timeLabel}
            </span>
            <span aria-hidden="true">·</span>
            <span className="text-xs font-medium text-mute/80">{timezoneLabel}</span>
          </div>

          <div className="mt-2.5">
            <AddToCalendarMenu
              event={event}
              className="w-full sm:w-auto"
              buttonClassName="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-paper px-4 py-1.5 text-sm font-semibold text-ink ring-1 ring-line hover:bg-card hover:ring-brand/30 transition active:scale-95 cursor-pointer touch-manipulation"
              label="Add to Calendar"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
