import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

export function ValidField({
  label,
  hint,
  ok,
  error,
  children,
}: {
  label?: string;
  hint?: string;
  ok?: boolean;
  error?: string | null;
  children: ReactNode;
}) {
  return (
    <label className="block">
      {label && <span className="text-[12px] font-semibold text-ink/70">{label}</span>}
      <div className={cn("relative", label && "mt-1")}>
        {children}
        {ok && !error && (
          <span
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600 dark:text-emerald-400"
            aria-hidden
          >
            <Check size={18} strokeWidth={2.6} />
          </span>
        )}
      </div>
      {(error || hint) && (
        <span className={cn("mt-1 block text-[12px]", error ? "text-red-600 dark:text-red-400" : "text-mute")}>
          {error || hint}
        </span>
      )}
    </label>
  );
}

/**
 * Shared field system: inset neu well at rest, brand ring on focus.
 * Use these constants for every text input / select / textarea so all
 * forms across bio, host, business, companion, circle, and auth match.
 */
export const fieldInput =
  "neu-inset h-12 w-full px-4 pr-10 text-[16px] sm:text-sm outline-none transition placeholder:text-mute/60 focus:ring-2 focus:ring-brand/20 disabled:opacity-60";

export const fieldSelect =
  "neu-inset h-12 w-full px-4 text-[16px] sm:text-sm outline-none transition focus:ring-2 focus:ring-brand/20 disabled:opacity-60";

export const fieldTextarea =
  "neu-inset min-h-28 w-full p-4 text-[16px] sm:text-sm outline-none transition placeholder:text-mute/60 focus:ring-2 focus:ring-brand/20 disabled:opacity-60";
