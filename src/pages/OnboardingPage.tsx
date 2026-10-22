import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  AtSign,
  Building2,
  CalendarDays,
  Check,
  Fingerprint,
  MapPin,
  QrCode,
  Sparkles,
  Ticket,
  User,
  UtensilsCrossed,
} from "lucide-react";
import { handleFromName, normalizeHandle } from "@shared/bio";
import { Button } from "@/components/ui/Button";
import { ValidField, fieldInput } from "@/components/forms/ValidField";
import { useAuth } from "@/contexts/AuthContext";
import { useBio } from "@/contexts/BioContext";
import { useHandleStatus } from "@/hooks/useHandleStatus";
import { triggerHaptic, triggerHapticSelection } from "@/lib/native";
import { cn } from "@/lib/cn";
import { PageLoading } from "@/components/ui/PageLoading";

type OnboardingStep = 1 | 2 | 3;

interface InterestOption {
  id: string;
  badge: string;
  title: string;
  desc: string;
  icon: typeof Ticket;
  color: string;
  bg: string;
  targetPath: string;
}

const INTEREST_OPTIONS: InterestOption[] = [
  {
    id: "events",
    badge: "AirPal Pass",
    title: "Live Concerts, Gigs & Festivals",
    desc: "Discover live music, cultural nights & club events with zero ticket booking fees.",
    icon: Ticket,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    targetPath: "/pass",
  },
  {
    id: "dining",
    badge: "Deals & Places",
    title: "Member Dining Perks & Secret Spots",
    desc: "Unlock 2-for-1 drinks, exclusive dining savings & curated local neighborhood gems.",
    icon: UtensilsCrossed,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    targetPath: "/deals",
  },
  {
    id: "circle",
    badge: "AirPal.Me",
    title: "Networking & 1-on-1 Catch-Ups",
    desc: "Share your digital bio card, propose coffee meetups & connect with mutuals nearby.",
    icon: Sparkles,
    color: "text-accent",
    bg: "bg-brand/10",
    targetPath: "/circle",
  },
  {
    id: "calendar",
    badge: "Personal Agenda",
    title: "Smart Calendar & Experience Schedule",
    desc: "Your event tickets, reservations & catch-ups automatically synced in one agenda.",
    icon: CalendarDays,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    targetPath: "/calendar",
  },
  {
    id: "host",
    badge: "Business Hub",
    title: "Host Events or List a Venue",
    desc: "Door QR scanning, ticket studio, promotion creator & business bio tools.",
    icon: Building2,
    color: "text-sky-500",
    bg: "bg-sky-500/10",
    targetPath: "/business",
  },
];

const CITIES = [
  "Sydney",
  "Melbourne",
  "Brisbane",
  "Gold Coast",
  "Perth",
  "Adelaide",
  "Canberra",
  "Newcastle",
  "Auckland",
];

const AVATAR_GRADIENTS = [
  { id: "azure", label: "Electric Azure", class: "from-blue-600 via-indigo-600 to-sky-500" },
  { id: "sunset", label: "Sunset Coral", class: "from-rose-500 via-pink-600 to-amber-400" },
  { id: "emerald", label: "Mint Emerald", class: "from-emerald-500 via-teal-600 to-cyan-500" },
  { id: "violet", label: "Royal Violet", class: "from-purple-600 via-violet-600 to-fuchsia-500" },
  { id: "midnight", label: "Midnight Gold", class: "from-neutral-900 via-neutral-800 to-amber-500" },
];

export function OnboardingPage() {
  const [, nav] = useLocation();
  const search = useSearch();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const next = params.get("next") || "";
  const initialHandleParam = params.get("handle") || "";

  const { user, authReady, biometricsSupported, biometricLabel, hasEnrolledBiometrics, enrollUserBiometrics } =
    useAuth();
  const { mine, createProfile } = useBio();

  const [step, setStep] = useState<OnboardingStep>(1);
  const [name, setName] = useState(() => mine?.name || user?.displayName || "");
  const [handle, setHandle] = useState(() => initialHandleParam || mine?.handle || "");
  const [city, setCity] = useState(() => mine?.city || "Sydney");
  const [avatarTheme, setAvatarTheme] = useState("azure");
  const [selectedInterests, setSelectedInterests] = useState<string[]>(["events", "dining"]);
  const [busy, setBusy] = useState(false);
  const [enrollingBiometrics, setEnrollingBiometrics] = useState(false);

  const handleStatus = useHandleStatus(handle, mine?.id);

  // Auto-fill suggested handle from user name or email if empty
  useEffect(() => {
    if (!handle) {
      if (initialHandleParam) {
        setHandle(normalizeHandle(initialHandleParam));
      } else if (name) {
        const h = handleFromName(name);
        if (h) setHandle(h);
      } else if (user?.email) {
        const prefix = user.email.split("@")[0] || "";
        const h = normalizeHandle(prefix);
        if (h) setHandle(h);
      }
    }
  }, [handle, initialHandleParam, name, user?.email]);

  useEffect(() => {
    if (!name && user?.displayName) {
      setName(user.displayName);
    }
  }, [name, user?.displayName]);

  const handleOk = handleStatus.ok;
  const nameOk = name.trim().length >= 2;

  const currentGradient = useMemo(() => {
    return AVATAR_GRADIENTS.find((g) => g.id === avatarTheme) || AVATAR_GRADIENTS[0];
  }, [avatarTheme]);

  const initials = useMemo(() => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "A";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }, [name]);

  function toggleInterest(id: string) {
    void triggerHapticSelection();
    setSelectedInterests((prev) => {
      if (prev.includes(id)) {
        // Keep at least one selected
        if (prev.length <= 1) return prev;
        return prev.filter((item) => item !== id);
      }
      return [...prev, id];
    });
  }

  // Handle Step 1 -> Step 2
  function handleGoToStep2() {
    if (!nameOk) {
      toast.error("Please enter your name");
      return;
    }
    if (!handleOk) {
      toast.error(handleStatus.reason || "Please choose an available @handle");
      return;
    }
    void triggerHaptic("light");
    setStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Handle Step 2 -> Step 3 (Save Profile & Reveal Pass)
  async function handleFinishOnboarding() {
    if (!nameOk || !handleOk) {
      toast.error("Please check your profile details");
      setStep(1);
      return;
    }

    setBusy(true);
    try {
      const cleanHandle = normalizeHandle(handle);
      await createProfile({
        handle: cleanHandle,
        name: name.trim(),
        city: city.trim() || "Sydney",
        shortWhy: "On AirPal",
        kind: "person",
      });

      void triggerHaptic("success");
      setStep(3);
      window.scrollTo({ top: 0, behavior: "smooth" });
      toast.success("Welcome aboard! Your AirPal Pass is ready.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to complete onboarding.");
    } finally {
      setBusy(false);
    }
  }

  // Handle Step 3 Biometric Enrollment
  async function handleEnrollBio() {
    setEnrollingBiometrics(true);
    try {
      await enrollUserBiometrics();
      void triggerHaptic("success");
      toast.success(`${biometricLabel} enabled for 1-tap sign in!`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not enable biometrics.");
    } finally {
      setEnrollingBiometrics(false);
    }
  }

  // Primary Destination Resolution
  function finishAndGo() {
    void triggerHaptic("medium");
    if (next && next.startsWith("/") && !next.startsWith("/start") && !next.startsWith("/onboard")) {
      nav(next);
      return;
    }
    // If user chose Events, land them on /pass; if Circle, land on /circle; else /
    if (selectedInterests.includes("events")) {
      nav("/pass");
    } else if (selectedInterests.includes("circle")) {
      nav("/circle");
    } else {
      nav("/");
    }
  }

  // Wait for auth initialization
  if (!authReady) {
    return <PageLoading />;
  }

  // If user is not authenticated yet, gate gently with a link to sign up
  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <div className="rounded-3xl bg-card p-6 md:p-8 ring-1 ring-line shadow-clay">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand/10 text-accent">
            <Sparkles size={26} />
          </div>
          <h1 className="font-display mt-4 text-2xl font-bold text-ink">Welcome to AirPal</h1>
          <p className="mt-2 text-xs md:text-sm text-mute leading-relaxed">
            Create your account to claim your personal @handle, set up your universal passbook, and discover live
            experiences.
          </p>
          <div className="mt-6 space-y-3">
            <Button
              className="w-full min-h-[48px] font-bold"
              onClick={() => nav(`/start?tab=signup&next=${encodeURIComponent("/onboarding")}`)}
            >
              <span>Create Free Account</span>
              <ArrowRight size={16} />
            </Button>
            <Button
              variant="ghost"
              className="w-full min-h-[44px]"
              onClick={() => nav(`/start?tab=signin&next=${encodeURIComponent("/onboarding")}`)}
            >
              <span>Already have an account? Sign In</span>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-8 md:py-12 pb-[calc(env(safe-area-inset-bottom,0px)+6.5rem)]">
      {/* Brand & Ecosystem Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-3.5 py-1 text-xs font-bold text-accent ring-1 ring-brand/20">
          <Sparkles size={13} />
          <span>AIRPAL · LIFE MADE EASY</span>
        </div>
        <h1 className="font-display mt-3 text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
          {step === 1 && "Set Up Your Identity"}
          {step === 2 && "Choose Your Experience"}
          {step === 3 && "Welcome to AirPal!"}
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-mute">
          {step === 1 && "One universal profile for your Link-in-Bio, tickets, and network."}
          {step === 2 && "Personalize your live experience radar & dining perks."}
          {step === 3 && "Your universal digital passbook is ready."}
        </p>
      </div>

      {/* Stepper Progress Bar */}
      <div className="mb-6 flex items-center justify-center gap-2">
        {[1, 2, 3].map((s) => {
          const isDone = s < step;
          const isCurrent = s === step;
          return (
            <div key={s} className="flex items-center gap-2">
              <div
                className={cn(
                  "grid h-7 w-7 place-items-center rounded-full text-xs font-bold transition-all duration-300",
                  isDone
                    ? "bg-emerald-600 text-white shadow-xs"
                    : isCurrent
                      ? "bg-brand text-white shadow-[0_4px_12px_-4px_rgba(24,5,219,0.4)] ring-2 ring-brand/30"
                      : "bg-paper text-mute ring-1 ring-line",
                )}
              >
                {isDone ? <Check size={14} strokeWidth={2.5} /> : s}
              </div>
              <span
                className={cn(
                  "text-xs font-semibold hidden sm:inline",
                  isCurrent ? "text-ink" : isDone ? "text-emerald-600" : "text-mute",
                )}
              >
                {s === 1 ? "Identity" : s === 2 ? "Interests" : "Passbook"}
              </span>
              {s < 3 && <div className="h-0.5 w-6 sm:w-10 bg-line" />}
            </div>
          );
        })}
      </div>

      {/* ======================================================== */}
      {/* STEP 1: IDENTITY & @HANDLE */}
      {/* ======================================================== */}
      {step === 1 && (
        <div className="space-y-6">
          {/* Live Interactive Wallet Pass Preview */}
          <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-neutral-900 to-neutral-950 p-5 sm:p-6 text-white shadow-2xl ring-1 ring-white/10">
            {/* Hologram metallic foil accent */}
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-cyan-400 via-rose-400 to-amber-300 opacity-90" />

            <div className="flex items-center justify-between text-[11px] font-bold text-white/70">
              <span className="flex items-center gap-1.5 uppercase tracking-wider">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                AirPal Universal Pass
              </span>
              <span className="flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-semibold text-white/90">
                <MapPin size={11} className="text-amber-400" />
                {city}
              </span>
            </div>

            <div className="mt-5 flex items-center gap-4">
              <div
                className={cn(
                  "grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br text-xl font-black text-white shadow-lg ring-2 ring-white/30 shrink-0",
                  currentGradient.class,
                )}
              >
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-display text-xl sm:text-2xl font-bold truncate text-white">
                  {name.trim() || "Your Name"}
                </h3>
                <p className="text-sm font-semibold text-accent/90 truncate">
                  @{normalizeHandle(handle) || "yourhandle"}
                </p>
                <div className="mt-1 flex items-center gap-2 text-[10px] text-white/60">
                  <span>AirPal.Me + AirPal Pass</span>
                  <span>·</span>
                  <span className="text-emerald-400 font-bold">Verified Single Account</span>
                </div>
              </div>
            </div>
          </div>

          {/* Form Fields */}
          <div className="rounded-3xl bg-card p-6 sm:p-7 ring-1 ring-line shadow-clay space-y-4">
            {/* Full Name */}
            <ValidField label="Your Full Name" ok={nameOk} error={name && !nameOk ? "At least 2 characters" : null}>
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mute" />
                <input
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alex Rivera"
                  className={cn(fieldInput, "pl-10 text-[16px] sm:text-sm")}
                  required
                />
              </div>
            </ValidField>

            {/* Handle Selection */}
            <ValidField
              label="Claim your unique @handle"
              ok={handleOk}
              error={handle && !handleStatus.checking && !handleOk ? handleStatus.reason || "Taken" : null}
              hint={
                handleStatus.checking
                  ? "Checking availability…"
                  : handle && handleOk
                    ? `✓ airpal.me/@${normalizeHandle(handle)} is free!`
                    : "Used for your personal link-in-bio, friends hub, and event passes."
              }
            >
              <div className="relative">
                <AtSign size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mute" />
                <input
                  type="text"
                  autoCapitalize="none"
                  autoComplete="username"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  placeholder="alex"
                  className={cn(fieldInput, "pl-10 text-[16px] sm:text-sm")}
                  required
                />
              </div>
            </ValidField>

            {/* City Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink">Primary City</label>
              <div className="flex flex-wrap gap-1.5">
                {CITIES.map((c) => {
                  const active = city === c;
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        void triggerHapticSelection();
                        setCity(c);
                      }}
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-semibold transition active:scale-95 cursor-pointer",
                        active
                          ? "bg-brand text-white shadow-xs"
                          : "bg-paper text-mute ring-1 ring-line hover:text-ink hover:bg-black/5 dark:hover:bg-white/5",
                      )}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Avatar Style Palette */}
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-semibold text-ink">Avatar Vibe</label>
              <div className="flex items-center gap-3">
                {AVATAR_GRADIENTS.map((g) => {
                  const active = avatarTheme === g.id;
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => {
                        void triggerHapticSelection();
                        setAvatarTheme(g.id);
                      }}
                      title={g.label}
                      className={cn(
                        "h-9 w-9 rounded-full bg-gradient-to-br transition-all duration-200 cursor-pointer active:scale-90 flex items-center justify-center",
                        g.class,
                        active ? "ring-2 ring-brand ring-offset-2 scale-110 shadow-md" : "opacity-80 hover:opacity-100",
                      )}
                    >
                      {active && <Check size={14} className="text-white" strokeWidth={3} />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Next Action */}
            <Button
              className="w-full min-h-[48px] text-sm font-bold shadow-xs cursor-pointer mt-4"
              disabled={!nameOk || !handleOk}
              onClick={handleGoToStep2}
            >
              <span>Continue to Interests</span>
              <ArrowRight size={16} />
            </Button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* STEP 2: INTERESTS & LENS SELECTION */}
      {/* ======================================================== */}
      {step === 2 && (
        <div className="space-y-5">
          <div className="rounded-3xl bg-card p-6 sm:p-7 ring-1 ring-line shadow-clay">
            <h2 className="font-display text-lg sm:text-xl font-bold text-ink">What brings you to AirPal?</h2>
            <p className="mt-1 text-xs text-mute leading-relaxed">
              Select the experiences you love. You can change these anytime in your settings.
            </p>

            <div className="mt-5 space-y-3">
              {INTEREST_OPTIONS.map((opt) => {
                const active = selectedInterests.includes(opt.id);
                const Icon = opt.icon;
                return (
                  <div
                    key={opt.id}
                    onClick={() => toggleInterest(opt.id)}
                    className={cn(
                      "flex items-start gap-3.5 rounded-2xl p-4 ring-1 transition-all duration-200 cursor-pointer active:scale-[0.99]",
                      active
                        ? "bg-brand/5 ring-brand/50 shadow-xs"
                        : "bg-paper ring-line hover:bg-paper/80 hover:ring-mute/40",
                    )}
                  >
                    <div
                      className={cn(
                        "grid h-10 w-10 shrink-0 place-items-center rounded-xl transition",
                        opt.bg,
                        opt.color,
                      )}
                    >
                      <Icon size={20} strokeWidth={2} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-mute">{opt.badge}</span>
                        <div
                          className={cn(
                            "grid h-5 w-5 place-items-center rounded-full text-white text-[10px] transition",
                            active ? "bg-brand" : "ring-1 ring-line bg-paper",
                          )}
                        >
                          {active && <Check size={12} strokeWidth={3} />}
                        </div>
                      </div>
                      <h3 className="font-semibold text-sm text-ink mt-0.5">{opt.title}</h3>
                      <p className="text-xs text-mute mt-0.5 leading-relaxed">{opt.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Step Navigation Controls */}
            <div className="mt-6 flex items-center gap-3">
              <Button
                variant="ghost"
                className="min-h-[48px] px-4 cursor-pointer"
                onClick={() => {
                  void triggerHaptic("light");
                  setStep(1);
                }}
              >
                <ArrowLeft size={16} />
                <span>Back</span>
              </Button>
              <Button
                className="flex-1 min-h-[48px] text-sm font-bold shadow-xs cursor-pointer"
                disabled={busy || selectedInterests.length === 0}
                loading={busy}
                onClick={handleFinishOnboarding}
              >
                {busy ? "Minting your pass…" : "Claim My Pass & Bio"}
                <ArrowRight size={16} />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* STEP 3: CELEBRATION & UNIVERSAL PASS READY */}
      {/* ======================================================== */}
      {step === 3 && (
        <div className="space-y-6 text-center">
          {/* Holographic Master Brand Pass Card */}
          <div className="relative overflow-hidden rounded-[32px] bg-neutral-950 p-6 sm:p-8 text-white shadow-2xl ring-1 ring-white/15">
            {/* Hologram metallic foil stripe */}
            <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-cyan-400 via-rose-400 via-amber-300 to-indigo-400 opacity-90 animate-pulse" />

            <div className="flex items-center justify-between text-xs font-bold text-white/80">
              <span className="flex items-center gap-1.5 uppercase tracking-widest text-[11px]">
                <Sparkles size={13} className="text-amber-400" />
                AirPal Universal Pass
              </span>
              <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400 ring-1 ring-emerald-500/40">
                ACTIVE
              </span>
            </div>

            {/* Profile Avatar & Details */}
            <div className="mt-6 flex flex-col items-center">
              <div
                className={cn(
                  "grid h-20 w-20 place-items-center rounded-3xl bg-gradient-to-br text-2xl font-black text-white shadow-xl ring-4 ring-white/20",
                  currentGradient.class,
                )}
              >
                {initials}
              </div>
              <h2 className="font-display mt-3 text-2xl font-bold text-white tracking-tight">{name}</h2>
              <Link
                href={`/@${normalizeHandle(handle)}`}
                className="mt-1 font-semibold text-accent hover:underline text-sm inline-flex items-center gap-1"
              >
                <span>@{normalizeHandle(handle)}</span>
              </Link>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-white/70">
                <MapPin size={13} className="text-amber-400" />
                <span>{city}, Australia</span>
                <span>·</span>
                <span>Universal Member</span>
              </div>
            </div>

            {/* Simulated QR Check-in Code */}
            <div className="mt-6 inline-flex flex-col items-center rounded-2xl bg-white p-3 shadow-md">
              <QrCode size={96} className="text-neutral-900" />
              <span className="mt-1 font-mono text-[9px] font-bold text-neutral-600 tracking-wider">
                airpal.me/@{normalizeHandle(handle)}
              </span>
            </div>

            <p className="mt-4 text-[11px] text-white/60">
              Show this pass for member dining discounts, door festival admissions, and quick contact sharing.
            </p>
          </div>

          {/* Optional Biometrics Enrollment Prompt */}
          {biometricsSupported && !hasEnrolledBiometrics && (
            <div className="rounded-3xl bg-card p-5 ring-1 ring-line shadow-clay flex items-center justify-between text-left gap-3">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand/10 text-accent">
                  <Fingerprint size={22} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-ink">Enable {biometricLabel} sign-in?</h4>
                  <p className="text-[11px] text-mute">1-tap instant access on this device without passwords.</p>
                </div>
              </div>
              <Button
                size="sm"
                variant="tonal"
                disabled={enrollingBiometrics}
                loading={enrollingBiometrics}
                onClick={handleEnrollBio}
                className="min-h-[40px] text-xs font-semibold shrink-0 cursor-pointer"
              >
                Enable
              </Button>
            </div>
          )}

          {/* Action CTAs */}
          <div className="space-y-3">
            <Button
              className="w-full min-h-[50px] text-base font-bold shadow-clay cursor-pointer"
              onClick={finishAndGo}
            >
              <span>Start Exploring</span>
              <ArrowRight size={18} />
            </Button>
            <div className="flex items-center justify-center gap-4 text-xs font-semibold">
              <Link href={`/@${normalizeHandle(handle)}`} className="text-accent hover:underline">
                View My Bio Profile
              </Link>
              <span className="text-mute">·</span>
              <Link href="/me" className="text-mute hover:text-ink">
                Account Settings
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
