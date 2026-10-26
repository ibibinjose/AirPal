import { cn } from "@/lib/cn";

/**
 * The one AirPal loading mark: logo + a slim sweeping bar. Used by the launch
 * overlay, route Suspense fallbacks and page-level loading so every wait looks
 * like the same app. Motion is disabled under prefers-reduced-motion (CSS).
 */
export function BrandLoader({
  label = "Loading",
  size = "md",
  className,
}: {
  label?: string;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <div
      className={cn("flex flex-col items-center justify-center gap-4", className)}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <img
        src="/logo-mark.png"
        alt=""
        draggable={false}
        className={cn(
          "brand-loader-mark select-none rounded-2xl bg-white object-contain",
          size === "sm" ? "h-12 w-12" : "h-16 w-16",
        )}
      />
      <span className="brand-loader-bar" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </div>
  );
}
