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
      className={cn("flex items-center gap-2 overflow-x-auto no-scrollbar py-2", className)}
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
              "inline-flex min-h-[38px] shrink-0 items-center justify-center rounded-full px-4 py-1.5 text-xs font-semibold transition active:scale-95 cursor-pointer touch-manipulation",
              isSelected
                ? "bg-brand text-white shadow-xs"
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
