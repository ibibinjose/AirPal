import { Check } from "lucide-react";
import { BIO_THEMES } from "@shared/bio";
import { cn } from "@/lib/cn";
import { triggerHaptic } from "@/lib/native";

export function BioThemePicker({
  value,
  onSelect,
}: {
  value?: string;
  onSelect: (themeId: string | undefined) => void;
}) {
  const current = value || "airpal";
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
      {BIO_THEMES.map((theme) => {
        const selected = current === theme.id;
        return (
          <button
            key={theme.id}
            type="button"
            onClick={() => {
              void triggerHaptic("selection");
              onSelect(theme.id === "airpal" ? undefined : theme.id);
            }}
            aria-pressed={selected}
            className={cn(
              "rounded-2xl border p-2.5 text-left transition active:scale-95 cursor-pointer",
              selected
                ? "border-brand ring-2 ring-brand/30 bg-brand/[0.04]"
                : "border-line bg-paper hover:border-brand/40",
            )}
          >
            <span
              className="flex h-16 flex-col items-center justify-center gap-1.5 overflow-hidden rounded-xl px-3"
              style={{ backgroundColor: theme.pageBg }}
            >
              <span
                className="h-4 w-full"
                style={{ backgroundColor: theme.buttonBg, borderRadius: Math.min(theme.buttonRadius, 8) }}
              />
              <span className="h-1.5 w-2/3 rounded-full" style={{ backgroundColor: theme.accent }} />
            </span>
            <span className="mt-1.5 flex items-center justify-between px-0.5">
              <span className="text-xs font-semibold text-ink">{theme.name}</span>
              {selected && <Check size={14} className="text-accent" />}
            </span>
          </button>
        );
      })}
    </div>
  );
}
