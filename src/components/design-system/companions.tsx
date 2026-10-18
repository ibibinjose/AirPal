import type { ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * AirPal companion design primitives (§24–§28, §43 of the brief).
 * Soft clay: white cards on mist, one brand action, short labels.
 */

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
