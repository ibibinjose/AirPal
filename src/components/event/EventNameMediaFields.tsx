import { Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { ImageField } from "@/components/media/ImageField";
import { EventCoverPresetSelector } from "@/components/event/EventCoverPresets";

const SWATCHES = [
  { id: "#004eff", label: "Blue", bg: "bg-blue-600", ring: "ring-blue-600" },
  { id: "#8b5cf6", label: "Violet", bg: "bg-purple-500", ring: "ring-purple-500" },
  { id: "#10b981", label: "Emerald", bg: "bg-emerald-500", ring: "ring-emerald-500" },
  { id: "#f59e0b", label: "Amber", bg: "bg-amber-500", ring: "ring-amber-500" },
  { id: "#f43f5e", label: "Rose", bg: "bg-rose-500", ring: "ring-rose-500" },
  { id: "#06b6d4", label: "Cyan", bg: "bg-cyan-500", ring: "ring-cyan-500" },
];

export function EventNameMediaFields({
  name,
  shortWhy,
  coverImage,
  themeColor,
  nameRequired,
  coverOptionalLabel,
  nameError,
  onName,
  onNameBlur,
  onShortWhy,
  onCoverImage,
  onThemeColor,
}: {
  name: string;
  shortWhy: string;
  coverImage: string;
  themeColor: string;
  nameRequired?: boolean;
  coverOptionalLabel?: boolean;
  nameError?: string | null;
  onName: (v: string) => void;
  onNameBlur?: () => void;
  onShortWhy: (v: string) => void;
  onCoverImage: (v: string) => void;
  onThemeColor: (v: string) => void;
}) {
  return (
    <>
      <div>
        <label
          htmlFor="event-name-input"
          className="text-xs font-semibold uppercase tracking-wider text-mute mb-1.5 block"
        >
          Event Name{nameRequired ? " *" : ""}
        </label>
        <input
          id="event-name-input"
          value={name}
          onChange={(e) => onName(e.target.value)}
          onBlur={onNameBlur}
          placeholder="e.g. The Rocks Weekend Market or Sydney Design Expo"
          required={nameRequired}
          aria-invalid={Boolean(nameError)}
          aria-describedby={nameError ? "event-name-error" : undefined}
          className={cn(
            "h-12 w-full rounded-2xl border bg-paper px-4 text-sm outline-none transition focus:ring-2",
            nameError
              ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20"
              : "border-line focus:border-brand focus:ring-brand/20",
          )}
        />
        {nameError && (
          <p id="event-name-error" role="alert" className="mt-1 text-xs font-semibold text-rose-600 dark:text-rose-400">
            {nameError}
          </p>
        )}
      </div>

      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-mute mb-1.5 block">
          Tagline / 1-Line Highlight
        </label>
        <input
          value={shortWhy}
          maxLength={100}
          onChange={(e) => onShortWhy(e.target.value)}
          placeholder="e.g. 80+ artisanal stalls, food trucks, and live music by the harbour"
          className="h-12 w-full rounded-2xl border border-line bg-paper px-4 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
      </div>

      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-mute mb-1.5 block">
          Cover Banner Image{coverOptionalLabel ? " (Optional)" : ""}
        </label>
        <ImageField kind="cover" value={coverImage} onChange={(src) => onCoverImage(src || "")} />
        <EventCoverPresetSelector currentUrl={coverImage} onSelect={(url) => onCoverImage(url)} className="pt-2" />
      </div>

      <div className="pt-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-mute mb-2 block">
          Ambient Page Accent
        </label>
        <div className="flex flex-wrap items-center gap-3">
          {SWATCHES.map((swatch) => (
            <button
              key={swatch.id}
              type="button"
              onClick={() => onThemeColor(swatch.id)}
              title={swatch.label}
              className={cn(
                "h-8 w-8 sm:h-9 sm:w-9 rounded-full transition transform active:scale-90 flex items-center justify-center ring-2 ring-offset-2 ring-offset-card cursor-pointer",
                themeColor === swatch.id
                  ? `${swatch.ring} scale-110 shadow-md`
                  : "ring-transparent hover:scale-105 opacity-80 hover:opacity-100",
                swatch.bg,
              )}
            >
              {themeColor === swatch.id && <Check size={16} className="text-white stroke-[3]" />}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
