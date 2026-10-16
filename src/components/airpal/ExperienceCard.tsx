import { ArrowUpRight, MapPin } from "lucide-react";
import { type ExperienceItem } from "@/lib/curated-experiences";
import { cn } from "@/lib/cn";

interface Props {
  item: ExperienceItem;
  onSelect: (item: ExperienceItem) => void;
  compact?: boolean;
}

export function ExperienceCard({ item, onSelect, compact = false }: Props) {
  return (
    <article
      onClick={() => onSelect(item)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(item);
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`${item.title} — view details`}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-[28px] bg-card ring-1 ring-line/80 shadow-clay transition-[box-shadow,border-color] duration-200 hover:ring-brand/40 hover:shadow-clay-hover active:scale-[0.99] cursor-pointer",
        compact ? "max-w-sm" : "w-full",
      )}
    >
      {/* Photo header */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-paper">
        <img
          src={item.image}
          alt={item.title}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition-opacity duration-200 group-hover:opacity-95"
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
          <div className="text-[11px] font-bold uppercase tracking-wider text-mute">
            {item.category}
            {item.starts_at
              ? ` · ${new Intl.DateTimeFormat("en-AU", { month: "short", day: "numeric" }).format(new Date(item.starts_at))}`
              : ""}
          </div>
          <h3 className="mt-1 font-display text-base font-bold text-ink leading-snug text-balance group-hover:text-accent transition-colors">
            {item.title}
          </h3>
          <p className="mt-1.5 flex items-center gap-1.5 text-sm text-mute">
            <MapPin size={13} className="shrink-0 text-accent/80" aria-hidden="true" />
            <span className="truncate">{item.area || item.venue}</span>
          </p>
        </div>

        {/* Bottom bar */}
        <div className="mt-4 flex items-center justify-between border-t border-line/80 pt-3">
          <div className="text-sm font-semibold text-mute">
            <span>{item.price_label || "Free"}</span>
            <span className="mx-1.5 opacity-40">·</span>
            <span>{item.duration || "Drop in"}</span>
          </div>
        </div>
      </div>
    </article>
  );
}
