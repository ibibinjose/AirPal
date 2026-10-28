import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Shared dashboard stat tile: label, value, hint, and an icon.
 * One shape for Me, Business, Admin, and Host dashboards.
 */
export function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  tone?: "brand" | "green" | "amber" | "red";
}) {
  return (
    <div className="neu-row p-4">
      <div className="flex items-center justify-between text-mute">
        <span className="text-xs font-semibold uppercase tracking-wider">{label}</span>
        <Icon
          size={16}
          aria-hidden="true"
          className={cn(
            tone === "green" && "text-emerald-500",
            tone === "amber" && "text-amber-500",
            tone === "red" && "text-red-500",
            (!tone || tone === "brand") && "text-accent",
          )}
        />
      </div>
      <p className="font-display mt-2 text-3xl font-bold tabular-nums text-ink">{value}</p>
      {hint ? <p className="mt-0.5 text-[11px] text-mute">{hint}</p> : null}
    </div>
  );
}
