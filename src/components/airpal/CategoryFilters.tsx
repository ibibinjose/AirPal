import { triggerHapticSelection } from "@/lib/native";
import { cn } from "@/lib/cn";

export const CATEGORIES = [
  "All",
  "Events",
  "Dining & Cafes",
  "Outdoors & Walks",
  "Arts & Culture",
  "Wellness",
  "Local Perks",
] as const;

export type CategoryType = (typeof CATEGORIES)[number];

interface Props {
  value: CategoryType | string;
  onChange: (category: CategoryType) => void;
  className?: string;
}

export function CategoryFilters({ value, onChange, className }: Props) {
  return (
    <div
      role="tablist"
      aria-label="Filter experiences by category"
      className={cn(
        "flex items-center gap-2 overflow-x-auto no-scrollbar snap-x snap-mandatory overscroll-x-contain py-1 -mx-4 px-4 sm:mx-0 sm:px-0 scroll-smooth",
        className,
      )}
    >
      {CATEGORIES.map((cat) => {
        const isSelected = value === cat;
        return (
          <button
            key={cat}
            role="tab"
            aria-selected={isSelected}
            onClick={() => {
              void triggerHapticSelection();
              onChange(cat);
            }}
            className={cn(
              "inline-flex min-h-[44px] shrink-0 snap-start items-center justify-center rounded-full px-4.5 py-2 text-xs sm:text-sm font-semibold transition active:scale-95 cursor-pointer touch-manipulation select-none",
              isSelected
                ? "bg-brand text-white shadow-[0_4px_12px_-4px_rgba(24,5,219,0.35)]"
                : "border border-line bg-card text-mute hover:border-brand/40 hover:text-ink hover:bg-paper",
            )}
          >
            {cat}
          </button>
        );
      })}
    </div>
  );
}
