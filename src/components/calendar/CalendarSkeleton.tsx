// Loading skeleton with shimmer effect for the calendar page.
export function CalendarSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 pb-[calc(env(safe-area-inset-bottom,0px)+6.5rem)] pt-4 md:px-6 md:pt-6">
      <div className="mb-8 space-y-4 animate-pulse">
        <div className="h-3 w-48 bg-gradient-to-r from-paper via-line to-paper bg-[length:200%_100%] animate-shimmer rounded" />
        <div className="h-10 w-80 bg-gradient-to-r from-paper via-line to-paper bg-[length:200%_100%] animate-shimmer rounded-xl" />
        <div className="h-4 w-full max-w-md bg-gradient-to-r from-paper via-line to-paper bg-[length:200%_100%] animate-shimmer rounded" />
      </div>

      <div className="mb-6 flex gap-2 overflow-x-hidden">
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div
            key={i}
            className="h-11 w-28 bg-gradient-to-r from-paper via-line to-paper bg-[length:200%_100%] animate-shimmer rounded-full shrink-0"
            style={{ animationDelay: `${i * 0.08}s` }}
          />
        ))}
      </div>

      <div className="rounded-3xl bg-card p-4 md:p-6 ring-1 ring-line/80 shadow-clay">
        <div className="space-y-4">
          <div className="h-8 w-40 bg-gradient-to-r from-paper via-line to-paper bg-[length:200%_100%] animate-shimmer rounded-xl mb-6" />

          {/* Weekday column header skeleton */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2 mb-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                className="h-10 bg-gradient-to-r from-paper via-line to-paper bg-[length:200%_100%] animate-shimmer rounded-xl"
              />
            ))}
          </div>

          {/* Column cells skeleton */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {Array.from({ length: 35 }).map((_, i) => (
              <div
                key={i}
                className="min-h-[68px] sm:min-h-[84px] md:min-h-[102px] bg-gradient-to-r from-paper via-line to-paper bg-[length:200%_100%] animate-shimmer rounded-2xl"
                style={{ animationDelay: `${(i % 7) * 0.05}s` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
