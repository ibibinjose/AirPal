import { useLocation } from "wouter";
import { cn } from "@/lib/cn";
import { BRAND_TAGLINE } from "@/lib/brand";
import { isPassApp } from "@/lib/app-flavor";

export type BrandMarkMode = "auto" | "master" | "me" | "pass";

export interface BrandMarkProps {
  compact?: boolean;
  invert?: boolean;
  forceLight?: boolean;
  withTagline?: boolean;
  mode?: BrandMarkMode;
  className?: string;
}

export function BrandMark({
  compact = false,
  invert = false,
  forceLight = false,
  withTagline = false,
  mode = "auto",
  className,
}: BrandMarkProps) {
  const [location] = useLocation();

  let resolvedMode: "master" | "me" | "pass" = "me";
  if (mode !== "auto") {
    resolvedMode = mode;
  } else if (
    isPassApp() ||
    location === "/pass" ||
    location.startsWith("/pass/") ||
    location.startsWith("/events") ||
    location.startsWith("/e/") ||
    location.startsWith("/deals") ||
    location.startsWith("/me/tickets") ||
    location.startsWith("/ticket/") ||
    location === "/event" ||
    location.startsWith("/event/") ||
    location.startsWith("/scan")
  ) {
    resolvedMode = "pass";
  } else if (
    location === "/about" ||
    location === "/trust" ||
    location === "/terms" ||
    location === "/privacy" ||
    location === "/business" ||
    location === "/partners" ||
    location === "/founders"
  ) {
    resolvedMode = "master";
  } else {
    resolvedMode = "me";
  }

  const lightLogoSrc = {
    master: "/brand/airpal-logo.png",
    me: "/brand/airpal-me-logo.png",
    pass: "/brand/airpal-pass-logo.png",
  }[resolvedMode];

  const whiteLogoSrc = {
    master: "/brand/airpal-logo-white.png",
    me: "/brand/airpal-me-logo-white.png",
    pass: "/brand/airpal-pass-logo-white.png",
  }[resolvedMode];

  const brandAlt = {
    master: "AirPal",
    me: "AirPal Me",
    pass: "AirPal Pass",
  }[resolvedMode];

  if (compact) {
    return (
      <span className={cn("inline-flex items-center shrink-0 select-none", className)}>
        {invert ? (
          <img
            src="/brand/airpal-mark-white.png"
            alt={brandAlt}
            className="h-8.5 w-8.5 sm:h-9 sm:w-9 object-contain shrink-0"
          />
        ) : forceLight ? (
          <img src="/logo-mark.png" alt={brandAlt} className="h-8.5 w-8.5 sm:h-9 sm:w-9 object-contain shrink-0" />
        ) : (
          <>
            <img
              src="/brand/airpal-mark-white.png"
              alt={brandAlt}
              className="h-8.5 w-8.5 sm:h-9 sm:w-9 object-contain shrink-0 hidden dark:block"
            />
            <picture className="flex items-center dark:hidden">
              <source srcSet="/brand/airpal-mark-white.png" media="(prefers-color-scheme: dark)" />
              <img src="/logo-mark.png" alt={brandAlt} className="h-8.5 w-8.5 sm:h-9 sm:w-9 object-contain shrink-0" />
            </picture>
          </>
        )}
        <span className="sr-only">{brandAlt}</span>
      </span>
    );
  }

  return (
    <span className={cn("inline-flex items-center gap-2.5 sm:gap-3 shrink-0 select-none", className)}>
      <div
        className={cn(
          "flex items-center justify-center rounded-xl shrink-0 shadow-2xs transition-colors",
          "h-9.5 w-9.5 p-1 sm:h-10 sm:w-10 sm:p-1.5",
          invert
            ? "bg-brand/90 ring-1 ring-white/20"
            : forceLight
              ? "bg-white ring-1 ring-black/10 shadow-xs"
              : "bg-white dark:bg-brand/90 ring-1 ring-line/70 dark:ring-white/20",
        )}
      >
        {invert ? (
          <img src="/brand/airpal-mark-white.png" alt="" className="h-full w-full object-contain" />
        ) : forceLight ? (
          <img src="/logo-mark.png" alt="" className="h-full w-full object-contain" />
        ) : (
          <>
            <img src="/brand/airpal-mark-white.png" alt="" className="h-full w-full object-contain hidden dark:block" />
            <picture className="flex items-center justify-center h-full w-full dark:hidden">
              <source srcSet="/brand/airpal-mark-white.png" media="(prefers-color-scheme: dark)" />
              <img src="/logo-mark.png" alt="" className="h-full w-full object-contain" />
            </picture>
          </>
        )}
      </div>
      <div className="flex flex-col text-left justify-center min-w-0">
        {invert ? (
          <img
            src={whiteLogoSrc}
            alt={brandAlt}
            className={cn(
              "w-auto object-contain shrink-0 transition-opacity",
              resolvedMode === "pass" ? "h-6 sm:h-6.5 md:h-7" : "h-6.5 sm:h-7 md:h-7.5",
            )}
          />
        ) : forceLight ? (
          <img
            src={lightLogoSrc}
            alt={brandAlt}
            className={cn(
              "w-auto object-contain shrink-0 transition-opacity",
              resolvedMode === "pass" ? "h-6 sm:h-6.5 md:h-7" : "h-6.5 sm:h-7 md:h-7.5",
            )}
          />
        ) : (
          <>
            <img
              src={whiteLogoSrc}
              alt={brandAlt}
              className={cn(
                "w-auto object-contain shrink-0 transition-opacity hidden dark:block",
                resolvedMode === "pass" ? "h-6 sm:h-6.5 md:h-7" : "h-6.5 sm:h-7 md:h-7.5",
              )}
            />
            <picture className="flex items-center dark:hidden">
              <source srcSet={whiteLogoSrc} media="(prefers-color-scheme: dark)" />
              <img
                src={lightLogoSrc}
                alt={brandAlt}
                className={cn(
                  "w-auto object-contain shrink-0 transition-opacity",
                  resolvedMode === "pass" ? "h-6 sm:h-6.5 md:h-7" : "h-6.5 sm:h-7 md:h-7.5",
                )}
              />
            </picture>
          </>
        )}
        {withTagline && (
          <span
            className={cn(
              "text-[9.5px] font-semibold tracking-wider uppercase mt-0.5 leading-none",
              invert ? "text-white/75" : forceLight ? "text-neutral-900 font-bold" : "text-accent dark:text-white/75",
            )}
          >
            {BRAND_TAGLINE}
          </span>
        )}
        <span className="sr-only">{brandAlt}</span>
      </div>
    </span>
  );
}
