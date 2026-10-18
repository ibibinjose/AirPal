import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import { triggerHapticSelection } from "@/lib/native";

/**
 * AirPal companion design primitives (§24–§28, §43 of the brief).
 * Soft clay: white cards on mist, one brand action, short labels.
 */

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
  label: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="flex gap-1 overflow-x-auto rounded-full bg-card p-1 ring-1 ring-line no-scrollbar"
    >
      {options.map((o) => (
        <button
          key={o.id}
          role="tab"
          aria-selected={value === o.id}
          type="button"
          onClick={() => {
            if (value !== o.id) void triggerHapticSelection();
            onChange(o.id);
          }}
          className={cn(
            "min-h-[44px] shrink-0 flex-1 cursor-pointer touch-manipulation rounded-full px-3.5 sm:px-4 text-[13px] sm:text-[14px] font-semibold whitespace-nowrap transition active:scale-[0.98]",
            value === o.id
              ? "bg-brand text-white shadow-[0_6px_14px_-8px_rgba(18,22,20,0.3)]"
              : "text-mute hover:text-ink",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Thumb-reachable primary action (principle 8): a floating bar pinned above
 * the tab dock. One primary action; everything else stays secondary inline.
 * Detail pages using this must hide the global + Create (see AppShell).
 */
export function StickyAction({ primary, secondary }: { primary: ReactNode; secondary?: ReactNode }) {
  // Portaled to body: page wrappers use transform (pull-to-refresh), which
  // would trap `fixed` mid-page. Same pattern as Sheet.
  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed-element fixed inset-x-0 bottom-24 lg:bottom-6 z-30 pointer-events-none">
      <div className="mx-auto max-w-lg px-4">
        <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-card/95 p-2 shadow-xl ring-1 ring-line backdrop-blur-xl">
          <div className="min-w-0 flex-1">{primary}</div>
          {secondary}
        </div>
      </div>
    </div>,
    document.body,
  );
}
