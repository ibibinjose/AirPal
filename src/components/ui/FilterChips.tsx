import { isValidElement, useRef, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import { triggerHapticSelection } from "@/lib/native";

export type FilterChipOption<T extends string> = {
  id: T;
  label: string;
  icon?: LucideIcon | ReactNode;
  /** Active result count shown beside the label. Undefined hides the badge. */
  count?: number;
};

function ChipIcon({ icon }: { icon: LucideIcon | ReactNode }) {
  if (!icon) return null;
  // Renderable nodes (emoji strings, elements) go straight in; anything
  // else is a Lucide component (forwardRef objects included).
  if (isValidElement(icon) || typeof icon === "string" || typeof icon === "number") {
    return (
      <span className="shrink-0" aria-hidden>
        {icon}
      </span>
    );
  }
  const Icon = icon as LucideIcon;
  return <Icon size={14} className="shrink-0" aria-hidden />;
}

function chipClass(on: boolean): string {
  return cn(
    "flex min-h-[44px] shrink-0 touch-manipulation cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-[13px] font-semibold transition active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
    on ? "bg-brand text-white shadow-xs" : "bg-card text-mute ring-1 ring-line hover:bg-paper hover:text-ink",
  );
}

type BaseProps<T extends string> = {
  options: Array<FilterChipOption<T>>;
  ariaLabel: string;
  className?: string;
};

type SingleProps<T extends string> = BaseProps<T> & {
  mode?: "single";
  value: T;
  onChange: (id: T) => void;
};

type MultiProps<T extends string> = BaseProps<T> & {
  mode: "multi";
  values: T[];
  onToggle: (id: T) => void;
  onClear?: () => void;
  clearLabel?: string;
};

export type FilterChipsProps<T extends string> = SingleProps<T> | MultiProps<T>;

/**
 * The one filter-chip language for the whole app. Single mode is a
 * radiogroup (arrow keys move, one filter always on); multi mode is a
 * toggle group with an optional clear-all. Active is always brand.
 */
export function FilterChips<T extends string>(props: FilterChipsProps<T>) {
  const { options, ariaLabel, className } = props;
  const multi = props.mode === "multi";
  const rowRef = useRef<HTMLDivElement>(null);

  function onRowKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (multi) return;
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    const chips = Array.from(rowRef.current?.querySelectorAll<HTMLButtonElement>("[role='radio']") || []);
    if (chips.length === 0) return;
    event.preventDefault();
    const active = document.activeElement as HTMLElement | null;
    const idx = chips.findIndex((el) => el === active);
    const step = event.key === "ArrowRight" ? 1 : -1;
    const next = chips[(idx < 0 ? (step > 0 ? 0 : chips.length - 1) : idx + step + chips.length) % chips.length];
    next?.focus();
    const id = next?.dataset.chipId as T | undefined;
    if (id) {
      void triggerHapticSelection();
      (props as SingleProps<T>).onChange(id);
    }
  }

  const selected = multi ? (props as MultiProps<T>).values : [(props as SingleProps<T>).value];

  return (
    <div
      ref={rowRef}
      role={multi ? "group" : "radiogroup"}
      aria-label={ariaLabel}
      onKeyDown={onRowKeyDown}
      className={cn(
        "no-scrollbar -mx-4 flex items-center gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0",
        className,
      )}
    >
      {options.map((option) => {
        const on = selected.includes(option.id);
        return (
          <button
            key={option.id}
            type="button"
            data-chip-id={option.id}
            role={multi ? undefined : "radio"}
            aria-checked={multi ? undefined : on}
            aria-pressed={multi ? on : undefined}
            onClick={() => {
              void triggerHapticSelection();
              if (multi) (props as MultiProps<T>).onToggle(option.id);
              else (props as SingleProps<T>).onChange(option.id);
            }}
            className={chipClass(on)}
          >
            {option.icon && <ChipIcon icon={option.icon} />}
            <span className="whitespace-nowrap">{option.label}</span>
            {typeof option.count === "number" && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
                  on ? "bg-white/20 text-white" : "bg-paper text-mute ring-1 ring-line",
                )}
              >
                {option.count}
              </span>
            )}
          </button>
        );
      })}
      {multi && selected.length > 0 && (props as MultiProps<T>).onClear && (
        <button
          type="button"
          onClick={() => {
            void triggerHapticSelection();
            (props as MultiProps<T>).onClear?.();
          }}
          aria-label={(props as MultiProps<T>).clearLabel || `Clear ${selected.length} filters`}
          className="flex min-h-[44px] shrink-0 touch-manipulation cursor-pointer items-center gap-1 rounded-full bg-paper px-3.5 py-2 text-xs font-bold text-ink ring-1 ring-line transition hover:bg-card active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          <X size={13} aria-hidden />
          <span className="tabular-nums">{selected.length}</span>
        </button>
      )}
    </div>
  );
}
