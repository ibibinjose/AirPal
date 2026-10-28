import { Link } from "wouter";
import { Footprints } from "lucide-react";
import { triggerHapticSelection } from "@/lib/native";
import { cn } from "@/lib/cn";

/**
 * Possie-style ticket shortcut — "Popular · tap a ticket".
 * A perforated-stub button that filters or navigates, never filler:
 * callers pass real stub codes, titles, and subtitles from live data.
 * Walk estimates are straight-line approximations, labelled with `~`.
 */
export function stubCode(value?: string): string {
  const code = (value || "")
    .replace(/[^a-z0-9]/gi, "")
    .slice(0, 3)
    .toUpperCase();
  return code || "AIR";
}

type PossieTicketProps = {
  stub: string;
  title: string;
  subtitle?: string;
  /** Straight-line walk estimate label, e.g. "12 min walk". Shown with a `~` prefix. */
  walk?: string;
  href?: string;
  onSelect?: () => void;
  className?: string;
};

function TicketBody({ stub, title, subtitle, walk }: Omit<PossieTicketProps, "href" | "onSelect" | "className">) {
  return (
    <>
      <span aria-hidden="true" className="flex flex-col items-center justify-center gap-1 py-2">
        <span className="grid size-3.5 place-items-center rounded-full border-2 border-accent">
          <span className="size-1 rounded-full bg-[#ff6b4a]" />
        </span>
        <span className="font-mono text-[9px] font-semibold leading-none tracking-[0.08em] text-mute">{stub}</span>
      </span>
      <span className="flex min-w-0 flex-col justify-center border-l border-dashed border-line py-1.5 pl-2.5 pr-2.5 text-left">
        <span className="font-display block truncate text-[14px] font-semibold leading-[1.2]">{title}</span>
        <span className="mt-0.5 flex min-w-0 items-center gap-1 font-mono text-[10px] uppercase leading-[1.3] tracking-[0.08em] text-mute">
          {subtitle && <span className="truncate">{subtitle}</span>}
          {walk && (
            <span className="inline-flex shrink-0 items-center gap-0.5 tabular-nums">
              <Footprints size={11} aria-hidden="true" />
              <span>~{walk}</span>
            </span>
          )}
        </span>
      </span>
    </>
  );
}

export function PossieTicket({ stub, title, subtitle, walk, href, onSelect, className }: PossieTicketProps) {
  const cls = cn(
    "group grid h-[60px] min-h-[60px] w-full grid-cols-[44px_1fr] items-stretch rounded-xl bg-card text-left shadow-[0_10px_24px_-16px_rgb(15_23_42/0.45)] transition-[background-color] hover:bg-paper active:bg-paper",
    className,
  );
  const body = <TicketBody stub={stub} title={title} subtitle={subtitle} walk={walk} />;
  const label = walk ? `${title}, ${subtitle ?? ""}, about ${walk} away` : `${title}${subtitle ? `, ${subtitle}` : ""}`;

  if (href) {
    return (
      <Link
        href={href}
        aria-label={label}
        onClick={() => {
          void triggerHapticSelection();
          onSelect?.();
        }}
        className={cls}
      >
        {body}
      </Link>
    );
  }
  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => {
        void triggerHapticSelection();
        onSelect?.();
      }}
      className={cn(cls, "cursor-pointer touch-manipulation")}
    >
      {body}
    </button>
  );
}
