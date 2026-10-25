import { useEffect, useState } from "react";
import { Moon, Sun } from "@/components/icons";
import { getThemePreference, setThemePreference, type ThemeMode } from "@/lib/theme";
import { syncNativeChrome, triggerHapticSelection } from "@/lib/native";
import { cn } from "@/lib/cn";

function prefersDarkOs(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  try {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  } catch {
    return false;
  }
}

function isDarkActive(mode: ThemeMode): boolean {
  if (mode === "dark") return true;
  if (mode === "light") return false;
  return prefersDarkOs();
}

/**
 * Small dark/light toggle for the top bar. Fixed 34-36px footprint so the
 * h-10/h-11 bar height never changes; uses the shared theme engine
 * (`src/lib/theme.ts`) so Settings > Appearance stays in sync.
 * `compact` renders a tiny monochrome (text-ink: black in day, white in
 * night) icon for the 10px Live Now strip without changing its height.
 */
export function ThemeToggle({ onBrand = false, compact = false }: { onBrand?: boolean; compact?: boolean }) {
  const [mode, setMode] = useState<ThemeMode>(() => getThemePreference());
  const dark = isDarkActive(mode);

  useEffect(() => {
    if (mode !== "system") return;
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => setMode(getThemePreference());
    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", sync);
      return () => mq.removeEventListener("change", sync);
    }
    return undefined;
  }, [mode]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onStorage = (e: StorageEvent) => {
      if (e.key === "airpal_theme") setMode(getThemePreference());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const label = dark ? "Switch to light mode" : "Switch to dark mode";

  return (
    <button
      type="button"
      onClick={() => {
        void triggerHapticSelection();
        const next = dark ? "light" : "dark";
        setThemePreference(next);
        setMode(next);
        void syncNativeChrome();
      }}
      aria-label={label}
      title={label}
      aria-pressed={dark}
      className={
        compact
          ? "relative flex min-h-0 shrink-0 touch-manipulation items-center text-ink transition-opacity hover:opacity-70 active:scale-95 cursor-pointer after:absolute after:-inset-x-2 after:-inset-y-[17px] after:content-['']"
          : cn(
              "relative grid h-8.5 w-8.5 sm:h-9 sm:w-9 min-h-[34px] min-w-[34px] shrink-0 touch-manipulation place-items-center rounded-full ring-1 transition-transform active:scale-95 cursor-pointer after:absolute after:-inset-1.5 after:content-['']",
              onBrand
                ? "text-white bg-white/15 hover:bg-white/25 ring-white/35"
                : "text-ink bg-card hover:bg-paper ring-line",
            )
      }
    >
      {dark ? (
        <Sun size={compact ? 11 : 17} strokeWidth={2.2} className="shrink-0" aria-hidden="true" />
      ) : (
        <Moon size={compact ? 11 : 17} strokeWidth={2.2} className="shrink-0" aria-hidden="true" />
      )}
    </button>
  );
}
