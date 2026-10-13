import { useLocation } from "wouter";
import { PILLARS, getActivePillar } from "@/lib/pillars";
import { triggerHapticSelection } from "@/lib/native";
import { cn } from "@/lib/cn";

export function MobilePillarsNav({ path }: { path: string }) {
  const [, nav] = useLocation();
  const activePillar = getActivePillar(path);

  return (
    <div className="border-b border-line/60 bg-paper/90 backdrop-blur-2xl lg:hidden">
      {/* 4 Core Pillar Buttons */}
      <nav aria-label="Core categories" className="grid grid-cols-4 gap-1.5 px-3 py-1.5">
        {PILLARS.map((pillar) => {
          const isActive = pillar.id === activePillar?.id;
          const Icon = pillar.icon;
          return (
            <button
              key={pillar.id}
              type="button"
              aria-current={isActive ? "page" : undefined}
              onClick={() => {
                void triggerHapticSelection();
                nav(pillar.href);
              }}
              className={cn(
                "flex min-h-[44px] flex-col sm:flex-row items-center justify-center gap-1 rounded-xl px-2 py-1.5 text-xs font-semibold transition active:scale-95 cursor-pointer touch-manipulation select-none",
                isActive
                  ? "bg-brand text-white shadow-[0_3px_10px_-2px_rgba(24,5,219,0.35)]"
                  : "bg-card/70 text-ink ring-1 ring-line/60 hover:bg-card hover:text-ink",
              )}
            >
              <Icon size={15} className={isActive ? "text-white" : "text-accent"} />
              <span className="truncate text-[11.5px] sm:text-xs tracking-tight">{pillar.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Contextual Sub-Links for the Active Pillar */}
      {activePillar && (
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar px-3 pb-2 pt-0.5">
          {activePillar.subLinks.map((sub) => {
            const isSubActive =
              sub.href === path ||
              (sub.href !== "/explore" &&
                sub.href !== "/events" &&
                sub.href !== "/plan" &&
                sub.href !== "/me" &&
                path.startsWith(sub.href));
            return (
              <button
                key={sub.href}
                type="button"
                onClick={() => {
                  void triggerHapticSelection();
                  nav(sub.href);
                }}
                className={cn(
                  "inline-flex min-h-[32px] shrink-0 touch-manipulation items-center rounded-full px-3 text-[11px] font-semibold transition active:scale-95",
                  isSubActive
                    ? "bg-card text-brand font-bold ring-1 ring-brand/30 shadow-2xs"
                    : "text-mute hover:text-ink hover:bg-card/60",
                )}
              >
                {sub.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
