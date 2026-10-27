import { useState } from "react";
import { TriangleAlert } from "lucide-react";
import { triggerHaptic } from "@/lib/native";

const STORAGE_KEY = "airpal:plan-before-you-go-dismissed";

/**
 * Possie-style safety interstitial, adapted for AirPal trust rails.
 * "Plan before you go" — dismissible, remembered on-device, never blocks.
 */
export function PlanBeforeYouGo({ storageKey = STORAGE_KEY }: { storageKey?: string }) {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(storageKey) === "1";
    } catch {
      return false;
    }
  });
  if (dismissed) return null;

  return (
    <div className="mt-4 flex items-start gap-3 rounded-2xl bg-card px-4 py-3 ring-1 ring-line">
      <TriangleAlert size={16} className="mt-0.5 shrink-0 text-[#ffb224]" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-ink">Plan before you go</p>
        <p className="mt-0.5 text-xs leading-relaxed text-mute">
          Don&apos;t use your phone while driving. Check open hours first — when you&apos;re ready, we hand you over to
          Google or Apple Maps for the last leg.
        </p>
      </div>
      <button
        type="button"
        onClick={() => {
          void triggerHaptic("light");
          try {
            localStorage.setItem(storageKey, "1");
          } catch {
            /* private mode — notice simply reappears next visit */
          }
          setDismissed(true);
        }}
        className="inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full px-3 text-xs font-bold text-accent ring-1 ring-line hover:bg-paper active:scale-95 cursor-pointer touch-manipulation"
      >
        Got it
      </button>
    </div>
  );
}
