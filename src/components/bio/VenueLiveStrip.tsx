import { cn } from "@/lib/cn";

/**
 * Public venue live strip: open state, hours, and the live offer badge that
 * jumps to the offers section. Status is always icon + text, never color alone.
 */
export function VenueLiveStrip({
  openNow,
  hours,
  offerBadge,
}: {
  openNow?: boolean;
  hours?: string;
  offerBadge?: string | null;
}) {
  return (
    <p className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[14px] font-semibold">
      <span
        aria-hidden="true"
        className={cn("h-2 w-2 shrink-0 rounded-full", openNow ? "bg-emerald-500" : "bg-red-500")}
      />
      <span className={cn(openNow ? "text-emerald-600" : "text-red-500")}>{openNow ? "Open now" : "Closed"}</span>
      {hours && <span className="font-normal text-mute">· {hours}</span>}
      {offerBadge && (
        <a
          href="#bio-offers"
          className="inline-flex min-h-[44px] items-center gap-1 font-semibold text-accent hover:underline"
        >
          <span aria-hidden="true">·</span>
          <span className="truncate">{offerBadge} live</span>
        </a>
      )}
    </p>
  );
}
