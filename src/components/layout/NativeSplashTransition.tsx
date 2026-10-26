import { useEffect, useState } from "react";
import { hideNativeSplash } from "@/lib/native";
import { BRAND_TAGLINE } from "@/lib/brand";
import { isPassApp } from "@/lib/app-flavor";

interface NativeSplashTransitionProps {
  /**
   * How long the branded splash is held visible after providers finish mounting before starting fade (ms).
   * Default: 250ms.
   */
  holdDuration?: number;
  /**
   * Fade out animation duration (ms).
   * Default: 350ms.
   */
  fadeDuration?: number;
}

/**
 * Branded fade-out transition for the native splash screen.
 * Mounts after AppProviders finish initialization, coordinates with Capacitor's
 * SplashScreen plugin to fade out the native splash window, and smoothly dissolves
 * the branded overlay into the app shell.
 */
export function NativeSplashTransition({ holdDuration = 250, fadeDuration = 350 }: NativeSplashTransitionProps) {
  const [mounted, setMounted] = useState(true);
  const [fading, setFading] = useState(false);
  const isPass = isPassApp();

  useEffect(() => {
    // When AppProviders finish mounting, tell native layer to smoothly fade out the OS splash
    void hideNativeSplash({ fadeOutDuration: fadeDuration });

    // Hold the branded overlay briefly for visual continuity, then fade out
    const holdTimer = setTimeout(() => {
      setFading(true);
      const unmountTimer = setTimeout(() => {
        setMounted(false);
      }, fadeDuration);
      return () => clearTimeout(unmountTimer);
    }, holdDuration);

    return () => clearTimeout(holdTimer);
  }, [holdDuration, fadeDuration]);

  if (!mounted) return null;

  return (
    <div
      aria-hidden="true"
      id="native-splash-transition"
      data-testid="native-splash-transition"
      className="fixed inset-0 z-[99999] bg-white pointer-events-none select-none transition-opacity ease-out"
      style={{
        opacity: fading ? 0 : 1,
        transitionDuration: `${fadeDuration}ms`,
      }}
    >
      {/* Same size + position as the native launch image, so handoff has no jump. */}
      <img
        src="/logo-mark.png"
        alt="AirPal"
        draggable={false}
        className="absolute left-1/2 top-1/2 w-[30vmin] -translate-x-1/2 -translate-y-1/2 object-contain"
      />
      <div className="absolute inset-x-0 top-[calc(50%+19vmin)] px-6 text-center">
        <div className="font-display text-2xl font-bold tracking-tight text-[#0b1220]">
          AirPal
          {isPass ? <span className="text-[#004eff]"> Pass</span> : <span className="text-[#004eff]">.me</span>}
        </div>
        <div className="mt-1.5 text-[11px] font-semibold uppercase tracking-widest text-[#004eff]">{BRAND_TAGLINE}</div>
      </div>
    </div>
  );
}
