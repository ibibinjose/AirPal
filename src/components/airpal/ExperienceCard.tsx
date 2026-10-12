import { ArrowUpRight, MapPin, Plus, Check } from "lucide-react";
import { type ExperienceItem } from "@/lib/curated-experiences";
import { usePlans } from "@/contexts/PlanContext";
import { triggerHaptic } from "@/lib/native";
import { cn } from "@/lib/cn";

interface Props {
  item: ExperienceItem;
  onSelect: (item: ExperienceItem) => void;
  compact?: boolean;
}

export function ExperienceCard({ item, onSelect, compact = false }: Props) {
  const { myPlans, createPlan, deletePlan } = usePlans();

  // Check if item is saved in user's plans
  const existingPlan = myPlans.find((p) => p.title.toLowerCase() === item.title.toLowerCase() || p.id === item.id);
  const isSaved = Boolean(existingPlan);

  const handleToggleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    void triggerHaptic("medium");
    if (isSaved && existingPlan) {
      await deletePlan(existingPlan.id);
    } else {
      await createPlan({
        title: item.title,
        type: "walk",
        theme: "sunset",
        date: item.starts_at ? item.starts_at.split("T")[0] : new Date().toISOString().split("T")[0],
        time: item.open_hour ? `${String(item.open_hour).padStart(2, "0")}:00` : "12:00",
        destination: item.venue,
        heroImage: item.image,
        notes: item.description,
      });
    }
  };

  return (
    <article
      onClick={() => onSelect(item)}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-card shadow-xs transition duration-200 hover:border-brand/40 hover:shadow-md cursor-pointer",
        compact ? "max-w-sm" : "w-full",
      )}
    >
      {/* Photo header */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-paper">
        <img
          src={item.image}
          alt={item.title}
          loading="lazy"
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-60" />

        {/* Badge */}
        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold text-ink shadow-xs backdrop-blur-md dark:bg-black/80 dark:text-white">
          {item.badge || item.category}
        </span>

        {/* Arrow Button */}
        <span
          className="absolute right-3 bottom-3 grid h-8 w-8 place-items-center rounded-full bg-white/90 text-ink shadow-xs transition group-hover:bg-brand group-hover:text-white dark:bg-black/80 dark:text-white dark:group-hover:bg-brand"
          aria-hidden="true"
        >
          <ArrowUpRight size={15} />
        </span>
      </div>

      {/* Copy / Info */}
      <div className="flex flex-1 flex-col justify-between p-4">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-mute">
            {item.category}
            {item.starts_at
              ? ` · ${new Intl.DateTimeFormat("en-AU", { month: "short", day: "numeric" }).format(new Date(item.starts_at))}`
              : ""}
          </div>
          <h3 className="mt-1 font-display text-base font-bold text-ink leading-snug group-hover:text-accent transition-colors">
            {item.title}
          </h3>
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-mute">
            <MapPin size={13} className="shrink-0 text-accent/80" />
            <span className="truncate">{item.area || item.venue}</span>
          </p>
        </div>

        {/* Bottom bar */}
        <div className="mt-4 flex items-center justify-between border-t border-line/80 pt-3">
          <div className="text-xs font-semibold text-mute">
            <span>{item.price_label || "Free"}</span>
            <span className="mx-1.5 opacity-40">·</span>
            <span>{item.duration || "Drop in"}</span>
          </div>

          <button
            type="button"
            onClick={handleToggleSave}
            title={isSaved ? "Saved to your day" : "Add to your day"}
            aria-label={isSaved ? "Saved to your day" : "Add to your day"}
            className={cn(
              "grid h-8 w-8 place-items-center rounded-full border transition active:scale-90 cursor-pointer",
              isSaved
                ? "border-emerald-500 bg-emerald-500 text-white"
                : "border-line bg-paper text-mute hover:border-brand hover:text-accent",
            )}
          >
            {isSaved ? <Check size={15} strokeWidth={2.5} /> : <Plus size={16} strokeWidth={2.5} />}
          </button>
        </div>
      </div>
    </article>
  );
}
