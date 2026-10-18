import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import {
  ArrowRight,
  AtSign,
  Calendar,
  CheckCircle2,
  Compass,
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

export function NativeOpenScreen({ defaultFlavor, onExplore }: NativeOpenScreenProps = {}) {
  const { loginWithSocial, authReady } = useAuth();
  const [, nav] = useLocation();
  const [busy, setBusy] = useState(false);

  // Ecosystem lens toggle: AirPal Pass (Events & Access) vs AirPal.me (Life & Bio)
  const initialFlavor = defaultFlavor || (isPassApp() ? "pass" : "me");
  const [flavor, setFlavor] = useState<"pass" | "me">(initialFlavor);
  const [activeSlide, setActiveSlide] = useState(0);
  const isPausedRef = useRef(false);

  const isPass = flavor === "pass";
  const currentProduct = isPass ? ECOSYSTEM.pass : ECOSYSTEM.me;

  // Auto-advance showcase every 4.5 seconds when not interacted with
  useEffect(() => {
    const timer = setInterval(() => {
      if (!isPausedRef.current) {
        setActiveSlide((prev) => (prev + 1) % 3);
      }
    }, 4500);
    return () => clearInterval(timer);
  }, [flavor]);

  const passSlides = [
    {
      kicker: "Events & Access",
      title: "Live Concerts & Festivals",
      desc: "Instant booking for club nights, gigs, and cultural festivals with zero hidden fees.",
      badge: "Tier 1 Early Bird",
      icon: Ticket,
      accent: "text-blue-500",
      accentBg: "bg-blue-500/10",
      widget: (
        <div className="relative overflow-hidden rounded-2xl bg-card/90 p-3.5 ring-1 ring-line/80 shadow-2xs">
          <div className="flex items-center justify-between text-[11px] font-bold text-accent">
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
              AIRPAL PASS · ALL ACCESS
            </span>
            <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[10px] text-accent">Verified</span>
          </div>
          <p className="mt-1 font-display text-sm font-bold text-ink">South Asian Summer Fest &apos;26</p>
          <div className="mt-2 flex items-center justify-between text-[11px] text-mute">
            <span className="flex items-center gap-1">
              <MapPin size={12} className="text-accent" /> Sydney Showground
            </span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">Admit 1</span>
          </div>
          <div className="mt-2.5 flex items-center gap-1.5 rounded-xl bg-surface px-2.5 py-1 text-[10px] text-mute ring-1 ring-line/50">
            <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
            <span>Apple &amp; Google Wallet Ready · Instant QR</span>
          </div>
        </div>
      ),
    },
    {
      kicker: "Digital Wallet",
      title: "Fast QR & Mobile Passes",
      desc: "One-tap Apple & Google Wallet passbook. Offline-first scanner for instantaneous door entry.",
      badge: "Instant Scan",
      icon: QrCode,
      accent: "text-emerald-600 dark:text-emerald-400",
      accentBg: "bg-emerald-500/10",
      widget: (
        <div className="relative overflow-hidden rounded-2xl bg-card/90 p-3.5 ring-1 ring-line/80 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-ink text-paper shrink-0 shadow-inner">
              <QrCode size={24} strokeWidth={2.2} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-ink">Live Dynamic Door Pass</p>
              <p className="text-[11px] text-mute mt-0.5">High-speed verification at venue gates</p>
              <div className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                <span>Offline-cached &amp; door scanner ready</span>
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
      badge: "Member Privileges",
      icon: Sparkles,
      accent: "text-amber-500",
      accentBg: "bg-amber-500/10",
      widget: (
        <div className="relative overflow-hidden rounded-2xl bg-card/90 p-3.5 ring-1 ring-line/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
                <Sparkles size={16} />
              </div>
              <div>
                <p className="text-xs font-bold text-ink leading-none">The Rooftop Sydney</p>
                <p className="text-[10px] text-mute mt-0.5">Verified Hospitality Partner</p>
              </div>
            </div>
            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
              Perk
            </span>
          </div>
          <div className="mt-2 rounded-xl bg-surface p-2 ring-1 ring-line/50 text-[11px]">
            <p className="font-semibold text-ink">2-for-1 Welcome Cocktail &amp; 15% Off Dining</p>
            <p className="text-[10px] text-mute mt-0.5">Show your AirPal Pass at arrival</p>
          </div>
        </div>
      ),
    },
  ];

  const meSlides = [
    {
      kicker: "Morning Intelligence",
      title: "Daily Flow & Outfits",
      desc: "Real-time weather forecast, smart outfit engine, and today's schedule all in one place.",
      badge: "Smart Forecast",
      icon: Calendar,
      accent: "text-blue-500",
      accentBg: "bg-blue-500/10",
      widget: (
        <div className="relative overflow-hidden rounded-2xl bg-card/90 p-3.5 ring-1 ring-line/80 shadow-2xs">
          <div className="flex items-center justify-between text-[11px]">
            <span className="flex items-center gap-1 font-semibold text-ink">
              <Sun size={13} className="text-amber-500" /> 23°C Sunny · Sydney CBD
            </span>
            <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-accent">0% Rain</span>
          </div>
          <div className="mt-2 flex items-center gap-2 rounded-xl bg-surface p-2 ring-1 ring-line/50">
            <div className="grid h-7 w-7 place-items-center rounded-lg bg-brand/10 text-accent shrink-0">
              <Shirt size={14} />
            </div>
            <div className="min-w-0 flex-1 text-[11px]">
              <p className="font-semibold text-ink truncate">Light Linen Shirt &amp; Loafers</p>
              <p className="text-[10px] text-mute leading-tight">Comfortable for warm afternoon + evening</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      kicker: "Networking Circle",
      title: "Live Circles & Presence",
      desc: "Effortless group hangouts, real-time presence check-ins, and living memory walls.",
      badge: "Real-time",
      icon: Users,
      accent: "text-indigo-500",
      accentBg: "bg-indigo-500/10",
      widget: (
        <div className="relative overflow-hidden rounded-2xl bg-card/90 p-3.5 ring-1 ring-line/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <span className="text-xs font-bold text-ink">Sydney Weekend Explorers</span>
            </div>
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
              4 Nearby
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-mute bg-surface rounded-xl p-2 ring-1 ring-line/50">
            <span className="flex items-center gap-1 truncate">
              <Radio size={12} className="text-emerald-500 shrink-0" /> Live Presence Check-In
            </span>
            <span className="font-medium text-ink shrink-0">Darling Harbour</span>
          </div>
        </div>
      ),
    },
    {
      kicker: "Universal Identity",
      title: "Digital Bio & @handle",
      desc: "Claim your verified @handle. One universal profile across both AirPal Me and AirPal Pass.",
      badge: "Universal Bio",
      icon: AtSign,
      accent: "text-emerald-600 dark:text-emerald-400",
      accentBg: "bg-emerald-500/10",
      widget: (
        <div className="relative overflow-hidden rounded-2xl bg-card/90 p-3.5 ring-1 ring-line/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-full bg-brand text-white font-bold text-xs shadow-xs">
                @
              </div>
              <div>
                <p className="text-xs font-bold text-ink leading-tight">@alex</p>
                <p className="text-[10px] text-mute">Connector Rank 4 · Sydney</p>
              </div>
            </div>
            <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-bold text-accent">Universal</span>
          </div>
          <p className="mt-2 text-[11px] text-mute bg-surface rounded-xl p-2 ring-1 ring-line/50 leading-snug">
            Single universal account across events, tickets, circles, and bio.
          </p>
        </div>
      ),
    },
  ];

  const currentSlides = isPass ? passSlides : meSlides;
  const slide = currentSlides[activeSlide] || currentSlides[0];

  const handleSelectFlavor = (nextFlavor: "pass" | "me") => {
    if (nextFlavor !== flavor) {
      void triggerHapticSelection();
      setFlavor(nextFlavor);
      setActiveSlide(0);
    }
  };

  const handleSelectSlide = (idx: number) => {
    void triggerHapticSelection();
    setActiveSlide(idx);
  };

  return (
    <div
      data-testid="native-open-screen"
      className="relative flex min-h-dvh w-full flex-col justify-between overflow-x-hidden bg-paper px-4 pb-[max(1.75rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-6 select-none"
    >
      {/* Dynamic Ambient Background Lights (Liquid Glass Optical Refraction Source) */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        {/* Primary AirPal Brand Blue Ambient Aura */}
        <div className="absolute -left-20 -top-20 h-80 w-80 rounded-full bg-brand/20 blur-[88px] dark:bg-brand/30" />
        {/* Secondary Sky/Indigo Light Beam */}
        <div className="absolute -right-24 top-1/4 h-80 w-80 rounded-full bg-sky-400/20 blur-[92px] dark:bg-sky-500/25" />
        {/* Subtle Sunlight Warmth Refraction */}
        <div className="absolute -bottom-16 left-1/4 h-72 w-72 rounded-full bg-amber-400/12 blur-[80px] dark:bg-amber-500/15" />
        {/* Silky Vignette overlay */}
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
                "min-h-[32px] px-3 rounded-full text-xs font-semibold transition cursor-pointer active:scale-95",
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
                "min-h-[32px] px-3 rounded-full text-xs font-semibold transition cursor-pointer active:scale-95",
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

      {/* Center Hero: WWDC Liquid Glass Specular Showcase Card */}
      <main
        className="relative z-10 mx-auto my-auto w-full max-w-sm py-4"
        onMouseEnter={() => {
          isPausedRef.current = true;
        }}
        onMouseLeave={() => {
          isPausedRef.current = false;
        }}
        onTouchStart={() => {
          isPausedRef.current = true;
        }}
        onTouchEnd={() => {
          isPausedRef.current = false;
        }}
      >
        <div className="apple-liquid-glass-hero glass-sheen relative overflow-hidden rounded-[28px] p-5 shadow-2xl">
          {/* Glass Specular Accent Beam */}
          <div
            className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-white/20 blur-2xl"
            aria-hidden="true"
          />

          {/* Slide Header */}
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
            <span className="text-[10px] font-bold text-accent uppercase tracking-widest">{BRAND_TAGLINE}</span>
          </div>

          <div className="relative z-10 mt-2.5">
            <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-ink leading-tight">
              {slide.title}
            </h1>
            <p className="mt-1 text-xs text-mute leading-relaxed line-clamp-2">{slide.desc}</p>
            <p className="mt-2 text-[11px] font-medium text-ink/70 leading-snug border-t border-line/50 pt-2 truncate">
              {currentProduct.coreJob}
            </p>
          </div>

          {/* Interactive Feature Widget Preview */}
          <div className="relative z-10 mt-4 transition-all duration-300">{slide.widget}</div>

          {/* Carousel Stepper / Indicator Dots */}
          <div className="relative z-10 mt-4 flex items-center justify-center gap-1.5 pt-1">
            {currentSlides.map((item, idx) => {
              const active = idx === activeSlide;
              return (
                <button
                  key={item.title}
                  type="button"
                  aria-label={`Show ${item.kicker}`}
                  onClick={() => handleSelectSlide(idx)}
                  className={cn(
                    "min-h-[28px] min-w-[28px] flex items-center justify-center cursor-pointer transition active:scale-90",
                  )}
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
        </div>

        {/* Universal Ecosystem Trust Anchor */}
        <div className="mt-3 flex items-center justify-center">
          <div className="apple-liquid-glass-light flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium text-mute ring-1 ring-white/60 dark:ring-white/10 shadow-2xs">
            <ShieldCheck size={13} className="text-accent shrink-0" />
            <span>One account for both AirPal Me &amp; AirPal Pass</span>
          </div>
        </div>
      </main>

      {/* Bottom Action Sheet: Floating Liquid Glass Action Dock */}
      <footer className="relative z-20 mx-auto w-full max-w-sm pt-2">
        <div className="apple-liquid-glass-dock relative rounded-[28px] p-4 shadow-xl space-y-2">
          {!authReady ? (
            <p className="py-6 text-center text-sm text-mute" role="status">
              Opening AirPal…
            </p>
          ) : (
            <>
              {/* Native Quick Social Auth */}
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
                  nav("/start?tab=signup");
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
