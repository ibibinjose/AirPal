import { useEffect, useState } from "react";
import { hideNativeSplash } from "@/lib/native";
import { BRAND_TAGLINE } from "@/lib/brand";
import { isPassApp } from "@/lib/app-flavor";

interface NativeSplashTransitionProps {
  /**
   * How long the branded splash is held visible before starting fade (ms).
   * Defaults to 2200ms on first opening, 250ms on subsequent in-session loads.
   */
  holdDuration?: number;
  /**
   * Fade out animation duration (ms).
   * Default: 500ms.
   */
  fadeDuration?: number;
}

const FIRST_OPEN_KEY = "airpal_opened_splash";

/**
 * Branded fade-out transition for the native splash screen.
 * Displays the Tantumi artwork with seamless dark background matching the OS launch screen,
 * coordinates with Capacitor's SplashScreen plugin, and smoothly dissolves into the app shell.
 */
export function NativeSplashTransition({ holdDuration, fadeDuration = 500 }: NativeSplashTransitionProps) {
  const [mounted, setMounted] = useState(true);
  const [fading, setFading] = useState(false);
  const isPass = isPassApp();

  useEffect(() => {
    // Determine duration: on cold launch / first opening in session, hold for ~2.2s.
    // On warm in-session navigations, hold for 250ms for snappy response.
    let resolvedHold = holdDuration;
    if (resolvedHold === undefined) {
      try {
        const alreadyOpened = sessionStorage.getItem(FIRST_OPEN_KEY);
        if (!alreadyOpened) {
          sessionStorage.setItem(FIRST_OPEN_KEY, "1");
          resolvedHold = 2200;
        } else {
          resolvedHold = 250;
        }
      } catch {
        resolvedHold = 2200;
      }
    }

    // Dismiss OS-level splash screen
    void hideNativeSplash({ fadeOutDuration: fadeDuration });

    const holdTimer = setTimeout(() => {
      setFading(true);
      const unmountTimer = setTimeout(() => {
        setMounted(false);
      }, fadeDuration);
      return () => clearTimeout(unmountTimer);
    }, resolvedHold);

    return () => clearTimeout(holdTimer);
  }, [holdDuration, fadeDuration]);

  if (!mounted) return null;

  return (
    <div
      aria-hidden="true"
      id="native-splash-transition"
      data-testid="native-splash-transition"
      className="fixed inset-0 z-[99999] bg-[#14161B] pointer-events-none select-none flex flex-col items-center justify-center p-6 transition-opacity ease-out"
      style={{
        opacity: fading ? 0 : 1,
        transitionDuration: `${fadeDuration}ms`,
        backgroundImage: "radial-gradient(circle at 50% 45%, rgba(0, 78, 255, 0.15) 0%, rgba(20, 22, 27, 0) 65%)",
      }}
    >
      <div className="relative flex flex-col items-center justify-center max-w-sm w-full">
        {/* Ambient specular halo */}
        <div
          className="absolute -inset-4 rounded-3xl bg-brand/10 blur-2xl opacity-60 pointer-events-none"
          aria-hidden="true"
        />

        {/* Tantumi Splash Image */}
        <div className="relative z-10 w-full flex justify-center">
          <img
            src="/brand/tantumi.jpg"
            alt="AirPal"
            draggable={false}
            className="max-w-[min(82vw,340px)] max-h-[min(54vh,400px)] rounded-3xl object-contain shadow-2xl ring-1 ring-white/10"
          />
        </div>

        {/* Brand Headline & Tagline */}
        <div className="relative z-10 mt-6 text-center space-y-1.5">
          <div className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            AirPal
            {isPass ? <span className="text-[#3b82f6]"> Pass</span> : <span className="text-[#3b82f6]">.me</span>}
          </div>
          <div className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.22em] text-[#3b82f6]">
            {BRAND_TAGLINE}
          </div>

          {/* Smooth breathing indicator pill */}
          <div className="pt-3 flex justify-center">
            <div className="h-1 w-12 rounded-full bg-white/20 overflow-hidden">
              <div className="h-full w-full bg-[#3b82f6] rounded-full motion-safe:animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
