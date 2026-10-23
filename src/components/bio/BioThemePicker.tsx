import { Check } from "lucide-react";
import { BIO_THEMES, resolveBioTheme } from "@shared/bio";
import { cn } from "@/lib/cn";
import { triggerHaptic } from "@/lib/native";

export function BioThemePicker({
  value,
  onSelect,
}: {
  value?: string;
  onSelect: (themeId: string | undefined) => void;
}) {
  // Stored values may predate the six-theme set; resolve through the legacy
  // remap so a retired pick still highlights its successor.
  const current = resolveBioTheme(value).id;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5" role="radiogroup" aria-label="Public page theme">
      {BIO_THEMES.map((theme) => {
        const selected = current === theme.id;
        return (
          <button
            key={theme.id}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-pressed={selected}
            aria-label={`${theme.name} theme: ${theme.blurb}`}
            title={`${theme.name} — ${theme.blurb}`}
            onClick={() => {
              void triggerHaptic("selection");
              onSelect(theme.id === "airpal" ? undefined : theme.id);
            }}
            className={cn(
              "min-h-[44px] rounded-2xl border p-2.5 text-left transition active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1",
              selected
                ? "border-brand ring-2 ring-brand/30 bg-brand/[0.04]"
                : "border-line bg-paper hover:border-brand/40",
            )}
          >
            {/* Mini page mock: page bg frames a surface card (ink + accent + muted),
                then the live button fill. Mirrors the real card-on-page layering so
                a low-contrast pairing is visible before selecting. */}
            <span
              className="flex flex-col justify-center gap-1.5 overflow-hidden rounded-xl border px-2 py-2"
              style={{ backgroundColor: theme.pageBg, borderColor: theme.border }}
            >
              <span
                className="flex items-center gap-1.5 rounded-md px-1.5 py-1"
                style={{ backgroundColor: theme.surface }}
              >
                <span
                  className="h-3 w-3 shrink-0 rounded-full ring-1 ring-black/10"
                  style={{ backgroundColor: theme.accent }}
                />
                <span className="h-1.5 w-1/2 rounded-full" style={{ backgroundColor: theme.ink, opacity: 0.9 }} />
              </span>
              <span
                className="flex h-5 w-full items-center justify-center text-[9px] font-bold"
                style={{
                  backgroundColor: theme.buttonBg,
                  color: theme.buttonText,
                  borderRadius: Math.min(theme.buttonRadius, 10),
                }}
              >
                Aa
              </span>
              <span className="rounded-md px-1.5 py-1" style={{ backgroundColor: theme.surface }}>
                <span
                  className="block h-1 w-2/3 rounded-full"
                  style={{ backgroundColor: theme.muted, opacity: 0.85 }}
                />
              </span>
            </span>
            <span className="mt-1.5 flex items-center justify-between gap-1 px-0.5">
              <span className="min-w-0">
                <span className="block truncate text-xs font-semibold text-ink">{theme.name}</span>
                <span className="block truncate text-[10px] font-normal text-mute">{theme.blurb}</span>
              </span>
              {selected && <Check size={14} className="shrink-0 text-accent" />}
            </span>
          </button>
        );
      })}
    </div>
  );
}
