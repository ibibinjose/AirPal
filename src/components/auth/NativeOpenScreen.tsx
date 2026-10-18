import { useEffect, useRef, useState, type TouchEvent, type KeyboardEvent } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import {
  ArrowRight,
  AtSign,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Compass,
  Flame,
  Gift,
  Heart,
  MapPin,
  Phone,
  QrCode,
  Radio,
  ShieldCheck,
  Shirt,
  Sparkles,
  Sun,
  Ticket,
  Users,
} from "lucide-react";
import { BRAND_TAGLINE, ECOSYSTEM } from "@/lib/brand";
import { isPassApp } from "@/lib/app-flavor";
import { useAuth } from "@/contexts/AuthContext";
import { SocialAuthButtons } from "@/components/auth/SocialAuthButtons";
import { Button } from "@/components/ui/Button";
import { triggerHaptic, triggerHapticSelection } from "@/lib/native";
import { cn } from "@/lib/cn";

export interface NativeOpenScreenProps {
  defaultFlavor?: "pass" | "me";
  onExplore?: () => void;
}

interface CityWeather {
  city: string;
  temp: string;
  condition: string;
  outfit: string;
  tip: string;
}

const CITIES: CityWeather[] = [
  {
    city: "Sydney",
    temp: "23°C",
    condition: "Sunny · Clear",
    outfit: "Linen Shirt & Loafers",
    tip: "Perfect for outdoor dining & sunset walks",
  },
  {
    city: "Melbourne",
    temp: "19°C",
    condition: "Partly Cloudy",
    outfit: "Light Overshirt & Chinos",
    tip: "Layered comfort for evening cool breeze",
  },
  {
    city: "Brisbane",
    temp: "26°C",
    condition: "Warm & Bright",
    outfit: "Breezy Cotton Tee & Shorts",
    tip: "High UV — grab sunglasses & hydration",
  },
];

export function NativeOpenScreen({ defaultFlavor, onExplore }: NativeOpenScreenProps = {}) {
  const { loginWithSocial, authReady } = useAuth();
  const [, nav] = useLocation();
  const [busy, setBusy] = useState(false);

  // Ecosystem lens: AirPal Pass (Events & Access) vs AirPal.me (Life & Bio)
  const initialFlavor = defaultFlavor || (isPassApp() ? "pass" : "me");
  const [flavor, setFlavor] = useState<"pass" | "me">(initialFlavor);
  const [activeSlide, setActiveSlide] = useState(0);

  // Interactive widget micro-states
  const [ticketScanned, setTicketScanned] = useState(false);
  const [perkRevealed, setPerkRevealed] = useState(false);
  const [selectedCityIdx, setSelectedCityIdx] = useState(0);
  const [waveCount, setWaveCount] = useState(4);
  const [hasWaved, setHasWaved] = useState(false);
  const [customHandle, setCustomHandle] = useState("alex");

  // Touch gesture & auto-advance management
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const isPausedRef = useRef(false);

  const isPass = flavor === "pass";
  const currentProduct = isPass ? ECOSYSTEM.pass : ECOSYSTEM.me;

  // Auto-advance showcase every 5 seconds when idle
  useEffect(() => {
    const timer = setInterval(() => {
      if (!isPausedRef.current) {
        setActiveSlide((prev) => (prev + 1) % 3);
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [flavor]);

  const handleSelectFlavor = (nextFlavor: "pass" | "me") => {
    if (nextFlavor !== flavor) {
      void triggerHapticSelection();
      setFlavor(nextFlavor);
      setActiveSlide(0);
    }
  };

  const handleNextSlide = () => {
    void triggerHapticSelection();
    setActiveSlide((prev) => (prev + 1) % 3);
  };

  const handlePrevSlide = () => {
    void triggerHapticSelection();
    setActiveSlide((prev) => (prev - 1 + 3) % 3);
  };

  // Touch swipe gesture handlers (Native iOS / Android swipe feel)
  const handleTouchStart = (e: TouchEvent) => {
    isPausedRef.current = true;
    const touch = e.touches[0];
    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
  };

  const handleTouchEnd = (e: TouchEvent) => {
    isPausedRef.current = false;
    if (touchStartX.current === null || touchStartY.current === null) return;
    const touch = e.changedTouches[0];
    const diffX = touch.clientX - touchStartX.current;
    const diffY = touch.clientY - touchStartY.current;

    // Minimum horizontal swipe distance of 40px and more horizontal than vertical
    if (Math.abs(diffX) > 40 && Math.abs(diffX) > Math.abs(diffY)) {
      if (diffX < 0) {
        handleNextSlide();
      } else {
        handlePrevSlide();
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "ArrowRight") {
      handleNextSlide();
    } else if (e.key === "ArrowLeft") {
      handlePrevSlide();
    }
  };

  const activeCity = CITIES[selectedCityIdx];

  // ==========================================
  // PASS SLIDES (Events, Passes, Perks)
  // ==========================================
  const passSlides = [
    {
      kicker: "Events & Access",
      title: "Live Concerts & Festivals",
      desc: "Instant booking for club nights, gigs, and cultural festivals with zero hidden fees.",
      icon: Ticket,
      accent: "text-blue-500",
      accentBg: "bg-blue-500/10",
      widget: (
        <div className="relative overflow-hidden rounded-2xl bg-card/95 p-3.5 ring-1 ring-line/80 shadow-2xs">
          {/* Hologram metallic foil stripe */}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-cyan-400 via-rose-400 to-amber-300 opacity-80" />

          <div className="flex items-center justify-between text-[11px] font-bold text-accent pt-0.5">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
              AIRPAL PASS · ALL ACCESS
            </span>
            <span className="flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
              <Flame size={11} className="fill-current" />
              Selling Fast
            </span>
          </div>

          <p className="mt-1.5 font-display text-sm font-bold text-ink">South Asian Summer Fest &apos;26</p>

          <div className="mt-2 flex items-center justify-between text-[11px] text-mute">
            <span className="flex items-center gap-1">
              <MapPin size={12} className="text-accent" /> Sydney Showground
            </span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">Tier 1 Early Bird</span>
          </div>

          {/* Audio Equalizer & Interactive Test */}
          <div className="mt-2.5 flex items-center justify-between rounded-xl bg-surface px-2.5 py-1.5 text-[11px] text-mute ring-1 ring-line/50">
            <div className="flex items-center gap-2">
              <div className="flex items-end gap-0.5 h-3">
                <span className="w-1 bg-brand rounded-full h-2 animate-pulse" />
                <span className="w-1 bg-brand rounded-full h-3.5 animate-pulse" style={{ animationDelay: "150ms" }} />
                <span className="w-1 bg-brand rounded-full h-1.5 animate-pulse" style={{ animationDelay: "300ms" }} />
              </div>
              <span className="text-[10px] font-medium text-ink">Live Stage Lineup</span>
            </div>
            <span className="text-[10px] font-bold text-accent">Apple &amp; Google Wallet Ready</span>
          </div>
        </div>
      ),
    },
    {
      kicker: "Digital Wallet",
      title: "Fast QR & Mobile Passes",
      desc: "One-tap Apple & Google Wallet passbook. Offline-first scanner for instantaneous door entry.",
      icon: QrCode,
      accent: "text-emerald-600 dark:text-emerald-400",
      accentBg: "bg-emerald-500/10",
      widget: (
        <div className="relative overflow-hidden rounded-2xl bg-card/95 p-3.5 ring-1 ring-line/80 shadow-2xs">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                void triggerHaptic("success");
                setTicketScanned(true);
                toast.success("Door scanner simulated: Admission confirmed!");
                setTimeout(() => setTicketScanned(false), 3000);
              }}
              className="relative grid h-14 w-14 place-items-center rounded-xl bg-ink text-paper shrink-0 shadow-inner group cursor-pointer active:scale-95 transition"
              aria-label="Simulate door scan"
            >
              <QrCode size={26} strokeWidth={2.2} />
              {/* Animated scan laser */}
              <div className="absolute inset-x-1 top-1 h-0.5 bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse" />
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-ink">Live Dynamic Door Pass</p>
                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                  {ticketScanned ? "Admitted" : "Ready"}
                </span>
              </div>
              <p className="text-[11px] text-mute mt-0.5 truncate">Tap QR code to simulate gate scan</p>
              <div className="mt-1.5 flex items-center gap-1.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={12} className="shrink-0" />
                <span>{ticketScanned ? "Verified Gate 3 Door Entry" : "Offline-cached · Fast admission"}</span>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      kicker: "Partner Perks",
      title: "Secret Dining & VIP Perks",
      desc: "Exclusive partner perks, 2-for-1 dining privileges, and guestlist invitations across cities.",
      icon: Sparkles,
      accent: "text-amber-500",
      accentBg: "bg-amber-500/10",
      widget: (
        <div className="relative overflow-hidden rounded-2xl bg-card/95 p-3.5 ring-1 ring-line/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
                <Gift size={16} />
              </div>
              <div>
                <p className="text-xs font-bold text-ink leading-none">The Rooftop Sydney</p>
                <p className="text-[10px] text-mute mt-0.5">Verified Hospitality Partner</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                void triggerHaptic("light");
                setPerkRevealed((prev) => !prev);
              }}
              className="rounded-full bg-amber-500/15 px-2.5 py-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-500/25 transition cursor-pointer active:scale-95"
            >
              {perkRevealed ? "AIRPAL-VIP-WELCOME" : "Tap to Unlock"}
            </button>
          </div>
          <div className="mt-2 rounded-xl bg-surface p-2 ring-1 ring-line/50 text-[11px]">
            <p className="font-semibold text-ink">2-for-1 Welcome Cocktail &amp; 15% Off Dining</p>
            <p className="text-[10px] text-mute mt-0.5">Show your AirPal Pass at arrival · Save $28</p>
          </div>
        </div>
      ),
    },
  ];

  // ==========================================
  // ME SLIDES (Daily Flow, Circles, Universal Bio)
  // ==========================================
  const meSlides = [
    {
      kicker: "Morning Intelligence",
      title: "Daily Flow & Outfits",
      desc: "Real-time weather forecast, smart outfit engine, and today's schedule all in one place.",
      icon: Calendar,
      accent: "text-blue-500",
      accentBg: "bg-blue-500/10",
      widget: (
        <div className="relative overflow-hidden rounded-2xl bg-card/95 p-3.5 ring-1 ring-line/80 shadow-2xs">
          {/* City weather selector pills */}
          <div className="flex items-center justify-between pb-1.5 border-b border-line/40">
            <div className="flex items-center gap-1">
              {CITIES.map((c, i) => (
                <button
                  key={c.city}
                  type="button"
                  onClick={() => {
                    void triggerHapticSelection();
                    setSelectedCityIdx(i);
                  }}
                  className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-bold transition cursor-pointer active:scale-95",
                    selectedCityIdx === i
                      ? "bg-brand text-white shadow-2xs"
                      : "text-mute hover:text-ink hover:bg-black/5 dark:hover:bg-white/5",
                  )}
                >
                  {c.city}
                </button>
              ))}
            </div>
            <span className="flex items-center gap-1 text-[10px] font-bold text-amber-500">
              <Sun size={12} /> {activeCity.temp}
            </span>
          </div>

          <div className="mt-2 flex items-center gap-2.5 rounded-xl bg-surface p-2 ring-1 ring-line/50">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-brand/10 text-accent shrink-0">
              <Shirt size={16} />
            </div>
            <div className="min-w-0 flex-1 text-[11px]">
              <p className="font-bold text-ink truncate">{activeCity.outfit}</p>
              <p className="text-[10px] text-mute leading-tight truncate">{activeCity.tip}</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      kicker: "Networking Circle",
      title: "Live Circles & Presence",
      desc: "Effortless group hangouts, real-time presence check-ins, and living memory walls.",
      icon: Users,
      accent: "text-indigo-500",
      accentBg: "bg-indigo-500/10",
      widget: (
        <div className="relative overflow-hidden rounded-2xl bg-card/95 p-3.5 ring-1 ring-line/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <span className="text-xs font-bold text-ink">Sydney Weekend Explorers</span>
            </div>
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
              {waveCount} Checked In
            </span>
          </div>

          <div className="mt-2 flex items-center justify-between text-[11px] text-mute bg-surface rounded-xl p-2 ring-1 ring-line/50">
            <span className="flex items-center gap-1.5 truncate">
              <Radio size={13} className="text-emerald-500 shrink-0" />
              <span>Darling Harbour Radar</span>
            </span>
            <button
              type="button"
              onClick={() => {
                void triggerHaptic("medium");
                setHasWaved(true);
                setWaveCount((c) => (hasWaved ? c : c + 1));
                toast.success("Wave sent to friends checked in nearby!");
              }}
              className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2.5 py-0.5 text-[10px] font-bold text-accent hover:bg-brand/20 transition cursor-pointer active:scale-95"
            >
              <Heart size={11} className={hasWaved ? "fill-current text-rose-500" : ""} />
              <span>{hasWaved ? "Waved!" : "Wave"}</span>
            </button>
          </div>
        </div>
      ),
    },
    {
      kicker: "Universal Identity",
      title: "Digital Bio & @handle",
      desc: "Claim your verified @handle. One universal profile across both AirPal Me and AirPal Pass.",
      icon: AtSign,
      accent: "text-emerald-600 dark:text-emerald-400",
      accentBg: "bg-emerald-500/10",
      widget: (
        <div className="relative overflow-hidden rounded-2xl bg-card/95 p-3.5 ring-1 ring-line/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-full bg-brand text-white font-bold text-xs shadow-xs">
                @
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-xs font-bold text-ink">@{customHandle || "you"}</span>
                  <ShieldCheck size={12} className="text-accent shrink-0" />
                </div>
                <p className="text-[10px] text-mute">Connector Rank 4 · Sydney</p>
              </div>
            </div>
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
              Available
            </span>
          </div>

          <div className="mt-2 flex items-center gap-2 bg-surface rounded-xl p-1.5 ring-1 ring-line/50">
            <span className="pl-1.5 text-[11px] font-medium text-mute shrink-0">airpal.me/@</span>
            <input
              type="text"
              value={customHandle}
              onChange={(e) => setCustomHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
              placeholder="choose_handle"
              maxLength={15}
              className="w-full bg-transparent text-[11px] font-bold text-ink focus:outline-none"
            />
          </div>
        </div>
      ),
    },
  ];

  const currentSlides = isPass ? passSlides : meSlides;
  const slide = currentSlides[activeSlide] || currentSlides[0];

  return (
    <div
      data-testid="native-open-screen"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="relative flex min-h-dvh w-full flex-col justify-between overflow-x-hidden bg-paper px-4 pb-[max(1.75rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-6 select-none focus:outline-none"
    >
      {/* Dynamic Ambient Background Lights (Optical Refraction Source with Physics Animation) */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        {/* Primary AirPal Brand Blue Orb */}
        <div className="animate-float-slow absolute -left-20 -top-20 h-84 w-84 rounded-full bg-brand/22 blur-[90px] dark:bg-brand/35" />
        {/* Secondary Sky/Cyan Specular Light Beam */}
        <div className="animate-float-reverse absolute -right-24 top-1/4 h-84 w-84 rounded-full bg-sky-400/20 blur-[96px] dark:bg-sky-500/25" />
        {/* Warm Sunlight Honey Aura */}
        <div className="animate-float-slow absolute -bottom-16 left-1/4 h-76 w-76 rounded-full bg-amber-400/14 blur-[84px] dark:bg-amber-500/18" />
        {/* Vignette Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-paper/60" />
      </div>

      {/* Top Header Dock: Brand Emblem & Lens Segmented Switcher */}
      <header className="relative z-20 mx-auto w-full max-w-sm pt-1">
        <div className="apple-liquid-glass-dock flex items-center justify-between rounded-full p-1.5 shadow-sm">
          {/* Brand Mark with Accent */}
          <div className="flex items-center gap-2 pl-2">
            <img
              src="/logo-mark.png"
              alt="AirPal"
              className="h-7 w-7 rounded-lg bg-white object-contain p-0.5 shadow-2xs ring-1 ring-black/5 dark:bg-neutral-900 dark:ring-white/10"
            />
            <span className="font-display text-sm font-bold tracking-tight text-ink">
              AirPal
              {isPass ? <span className="text-accent"> Pass</span> : <span className="text-accent">.me</span>}
            </span>
          </div>

          {/* Liquid Glass Segmented Lens Switcher */}
          <div
            role="tablist"
            aria-label="Ecosystem View"
            className="flex items-center rounded-full bg-surface/90 p-0.5 ring-1 ring-line/70"
          >
            <button
              type="button"
              role="tab"
              aria-selected={flavor === "pass"}
              onClick={() => handleSelectFlavor("pass")}
              className={cn(
                "min-h-[34px] px-3.5 rounded-full text-xs font-semibold transition cursor-pointer active:scale-95 touch-manipulation",
                flavor === "pass"
                  ? "bg-brand text-white shadow-xs font-bold"
                  : "text-mute hover:text-ink hover:bg-black/5 dark:hover:bg-white/5",
              )}
            >
              Pass
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={flavor === "me"}
              onClick={() => handleSelectFlavor("me")}
              className={cn(
                "min-h-[34px] px-3.5 rounded-full text-xs font-semibold transition cursor-pointer active:scale-95 touch-manipulation",
                flavor === "me"
                  ? "bg-brand text-white shadow-xs font-bold"
                  : "text-mute hover:text-ink hover:bg-black/5 dark:hover:bg-white/5",
              )}
            >
              Me
            </button>
          </div>
        </div>
      </header>

      {/* Center Hero: WWDC Liquid Glass Specular Showcase Card with Touch Swipe */}
      <main
        className="relative z-10 mx-auto my-auto w-full max-w-sm py-3"
        onMouseEnter={() => {
          isPausedRef.current = true;
        }}
        onMouseLeave={() => {
          isPausedRef.current = false;
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="apple-liquid-glass-hero caustic-sheen glass-sheen relative overflow-hidden rounded-[28px] p-5 shadow-2xl">
          {/* Glass Specular Accent Beam */}
          <div
            className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-white/20 blur-2xl"
            aria-hidden="true"
          />

          {/* Slide Header with navigation arrows */}
          <div className="relative z-10 flex items-center justify-between">
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase",
                slide.accentBg,
                slide.accent,
              )}
            >
              {slide.kicker}
            </span>
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold text-accent uppercase tracking-widest">{BRAND_TAGLINE}</span>
            </div>
          </div>

          <div className="relative z-10 mt-2.5">
            <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-ink leading-tight">
              {slide.title}
            </h1>
            <p className="mt-1 text-xs text-mute leading-relaxed line-clamp-2">{slide.desc}</p>
            <p className="mt-2 text-[11px] font-medium text-ink/75 leading-snug border-t border-line/50 pt-2 truncate">
              {currentProduct.coreJob}
            </p>
          </div>

          {/* Interactive Feature Widget Preview */}
          <div className="relative z-10 mt-3.5 transition-all duration-300">{slide.widget}</div>

          {/* Carousel Stepper / Indicator with Side Arrow Slops */}
          <div className="relative z-10 mt-4 flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={handlePrevSlide}
              aria-label="Previous slide"
              className="grid h-7 w-7 place-items-center rounded-full text-mute hover:text-ink hover:bg-black/5 dark:hover:bg-white/5 active:scale-90 transition cursor-pointer"
            >
              <ChevronLeft size={16} />
            </button>

            {/* Stepper Dots */}
            <div className="flex items-center gap-1.5">
              {currentSlides.map((item, idx) => {
                const active = idx === activeSlide;
                return (
                  <button
                    key={item.title}
                    type="button"
                    aria-label={`Show ${item.kicker}`}
                    onClick={() => {
                      void triggerHapticSelection();
                      setActiveSlide(idx);
                    }}
                    className="min-h-[28px] min-w-[28px] flex items-center justify-center cursor-pointer transition active:scale-90"
                  >
                    <span
                      className={cn(
                        "block h-1.5 rounded-full transition-all duration-300",
                        active ? "w-6 bg-brand" : "w-1.5 bg-line/80 hover:bg-mute",
                      )}
                    />
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleNextSlide}
              aria-label="Next slide"
              className="grid h-7 w-7 place-items-center rounded-full text-mute hover:text-ink hover:bg-black/5 dark:hover:bg-white/5 active:scale-90 transition cursor-pointer"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Universal Ecosystem Trust Anchor */}
        <div className="mt-2.5 flex items-center justify-center">
          <div className="apple-liquid-glass-light flex items-center gap-1.5 rounded-full px-3.5 py-1 text-[11px] font-medium text-mute ring-1 ring-white/60 dark:ring-white/10 shadow-2xs">
            <ShieldCheck size={13} className="text-accent shrink-0" />
            <span>One account for both AirPal Me &amp; AirPal Pass</span>
          </div>
        </div>
      </main>

      {/* Bottom Action Sheet: Floating Liquid Glass Action Dock */}
      <footer className="relative z-20 mx-auto w-full max-w-sm pt-1">
        <div className="apple-liquid-glass-dock relative rounded-[28px] p-4 shadow-xl space-y-2">
          {!authReady ? (
            <p className="py-6 text-center text-sm text-mute" role="status">
              Opening AirPal…
            </p>
          ) : (
            <>
              {/* Native Quick Social Auth (Apple & Google) */}
              <SocialAuthButtons
                busy={busy}
                onSocial={async (provider) => {
                  setBusy(true);
                  try {
                    await loginWithSocial(provider);
                    toast.success("Signed in to AirPal");
                  } finally {
                    setBusy(false);
                  }
                }}
              />

              {/* Primary Call to Action */}
              <Button
                variant="primary"
                size="lg"
                className="w-full min-h-[48px] h-12 text-[15px] font-bold shadow-clay transition active:scale-[0.98]"
                disabled={busy}
                onClick={() => {
                  void triggerHaptic("medium");
                  const target = customHandle
                    ? `/start?tab=signup&handle=${encodeURIComponent(customHandle)}`
                    : "/start?tab=signup";
                  nav(target);
                }}
              >
                <span>Create Free Account</span>
                <ArrowRight size={16} />
              </Button>

              {/* Secondary Phone Login Action */}
              <Button
                variant="ghost"
                className="w-full min-h-[44px] h-11 text-sm font-semibold transition active:scale-[0.98]"
                disabled={busy}
                onClick={() => {
                  void triggerHaptic("light");
                  nav("/start?tab=signin");
                }}
              >
                <Phone size={15} />
                <span>Sign In with Mobile Number</span>
              </Button>

              {/* Guest Exploration / Browse Without Account */}
              <div className="flex items-center justify-center pt-0.5">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    void triggerHaptic("light");
                    if (onExplore) {
                      onExplore();
                    } else {
                      nav(flavor === "pass" ? "/pass" : "/");
                    }
                  }}
                  className="inline-flex min-h-[44px] items-center gap-1.5 text-xs font-semibold text-mute hover:text-ink transition cursor-pointer"
                >
                  <Compass size={13} />
                  <span>Explore as Guest</span>
                </button>
              </div>
            </>
          )}

          {/* Legal Compliance Footer */}
          <p className="pt-1 text-center text-[10px] leading-relaxed text-mute">
            By continuing you agree to AirPal{" "}
            <button
              type="button"
              className="font-semibold text-ink underline min-h-[24px]"
              onClick={() => nav("/terms")}
            >
              Terms
            </button>{" "}
            and{" "}
            <button
              type="button"
              className="font-semibold text-ink underline min-h-[24px]"
              onClick={() => nav("/privacy")}
            >
              Privacy
            </button>
            . Accounts are for people 18+.
          </p>
        </div>
      </footer>
    </div>
  );
}
