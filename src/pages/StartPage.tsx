import { useEffect, useRef, useState, useMemo, type FormEvent } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { toast } from "sonner";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  Sparkles,
  Store,
  User,
} from "lucide-react";
import { authErrorMessage } from "@shared/auth-email";
import { normalizeHandle } from "@shared/bio";
import { isEmail, passwordIssues } from "@shared/validate";
import { useHandleStatus } from "@/hooks/useHandleStatus";
import { Button } from "@/components/ui/Button";
import { ValidField, fieldInput } from "@/components/forms/ValidField";
import { VerifyEmailBanner } from "@/components/auth/VerifyEmailBanner";
import { AccountContacts } from "@/components/auth/AccountContacts";
import { PhoneLogin } from "@/components/auth/PhoneLogin";
import { SignupFlow } from "@/components/auth/SignupFlow";
import { SocialAuthButtons, SocialAuthDivider } from "@/components/auth/SocialAuthButtons";
import { PhoneField } from "@/components/forms/PhoneField";
import { isNativeApp, triggerHaptic, triggerHapticSelection } from "@/lib/native";
import { useVirtualKeyboard } from "@/lib/keyboard";
import { phonePasswordNeedsSms, phoneReady } from "@shared/phone-auth";
import { MeAvatar } from "@/components/auth/MeAvatar";
import { BiometricAuthButton } from "@/components/auth/BiometricAuthButton";
import { BiometricEnrollCard } from "@/components/auth/BiometricEnrollCard";
import { useAuth } from "@/contexts/AuthContext";
import { useBio } from "@/contexts/BioContext";
import { liveBackendEnabled } from "@/lib/functions";
import { normalizeInviteCode, recordAppInvite, resolveInviter, stashInviteRef, takeInviteRef } from "@/lib/app-invites";
import { PILLARS } from "@/lib/pillars";
import { cn } from "@/lib/cn";

export type AuthMode = "signin" | "signup" | "reset";
export type AuthMethod = "email" | "phone";

/**
 * Mobile typography hygiene: 16px font prevents iOS Safari and Android webviews
 * from triggering unexpected viewport auto-zooms upon input focus.
 */
const KEYBOARD_SAFE_INPUT = "text-[16px] sm:text-sm";

function nudgeIntoView(e: React.FocusEvent<HTMLElement>) {
  try {
    e.currentTarget.scrollIntoView({ behavior: "smooth", block: "center" });
  } catch {
    /* ignore fallback */
  }
}

export function StartPage() {
  const search = useSearch();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const tabParam = params.get("tab");
  const refParam = params.get("ref") || "";
  const next = params.get("next") || "";
  const roleParam = params.get("role") || "";
  const emailParam = params.get("email") || "";
  const [, nav] = useLocation();

  const {
    login,
    register,
    loginWithPhonePassword,
    loginWithSocial,
    user,
    sendVerificationEmail,
    requestPasswordReset,
    logout,
    hasEnrolledBiometrics,
  } = useAuth();
  const { mine, business, createProfile } = useBio();
  const { keyboardHeight } = useVirtualKeyboard();
  const [pendingGo, setPendingGo] = useState(false);

  const LAST_EMAIL_KEY = "airpal.last_signin_email";

  // Mode resolution
  const initialMode: AuthMode =
    tabParam === "reset"
      ? "reset"
      : tabParam === "signin"
        ? "signin"
        : tabParam === "signup" || tabParam === "email"
          ? "signup"
          : "signin";
  const initialMethod: AuthMethod = tabParam === "phone" ? "phone" : "email";

  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [method, setMethod] = useState<AuthMethod>(initialMethod);

  // Form inputs
  const [email, setEmail] = useState(
    () => emailParam || (typeof window !== "undefined" ? localStorage.getItem(LAST_EMAIL_KEY) || "" : ""),
  );
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Email Signup Specific inputs
  const [signupName, setSignupName] = useState("");
  const [signupHandle, setSignupHandle] = useState("");
  const [handleManual, setHandleManual] = useState(false);
  const [signupAdultConfirmed, setSignupAdultConfirmed] = useState(true);
  const handleStatus = useHandleStatus(signupHandle);
  const handleOk = handleStatus.ok;

  // UI state
  const [busy, setBusy] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [phoneSignup, setPhoneSignup] = useState(false);
  const [phoneLoginMode, setPhoneLoginMode] = useState<"sms" | "password">("password");
  const [signInPhone, setSignInPhone] = useState("");
  const [inlineError, setInlineError] = useState<{ message: string; code?: string } | null>(null);

  const emailOk = isEmail(email);
  const passOk = passwordIssues(password).length === 0;

  // Password Strength Meter
  const passwordStrength = useMemo(() => {
    if (!password) return { label: "", score: 0, color: "bg-line" };
    if (password.length < 6) return { label: "Too short", score: 1, color: "bg-red-500" };
    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
    else if (/[a-zA-Z]/.test(password)) score += 0.5;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^a-zA-Z0-9]/.test(password)) score += 1;

    if (score <= 1.5) return { label: "Weak", score: 1, color: "bg-red-500" };
    if (score <= 2.5) return { label: "Fair", score: 2, color: "bg-amber-500" };
    if (score <= 3.5) return { label: "Good", score: 3, color: "bg-blue-500" };
    return { label: "Strong", score: 4, color: "bg-emerald-500" };
  }, [password]);

  // Invite Attribution
  const [inviterHandle, setInviterHandle] = useState<string | null>(null);
  const inviteRecorded = useRef(false);
  useEffect(() => {
    stashInviteRef(refParam);
    const code = normalizeInviteCode(refParam);
    if (!code) {
      setInviterHandle(null);
      return;
    }
    let alive = true;
    void resolveInviter(code).then((inviter) => {
      if (alive) setInviterHandle(inviter?.handle || null);
    });
    return () => {
      alive = false;
    };
  }, [refParam]);

  useEffect(() => {
    if (inviteRecorded.current || !user) return;
    const code = takeInviteRef();
    if (!code) return;
    inviteRecorded.current = true;
    void (async () => {
      const inviter = await resolveInviter(code);
      if (!inviter || inviter.uid === user.uid) return;
      await recordAppInvite({
        inviterUid: inviter.uid,
        inviterHandle: inviter.handle,
        inviteeUid: user.uid,
        inviteeLabel: user.displayName || "New member",
      });
    })();
  }, [user]);

  // Sync tab param when search URL changes
  useEffect(() => {
    if (tabParam === "reset") setMode("reset");
    else if (tabParam === "signup" || tabParam === "email") {
      setMode("signup");
      setMethod("email");
    } else if (tabParam === "phone") {
      setMethod("phone");
    } else if (tabParam === "signin") {
      setMode("signin");
    }
    if (emailParam && !email) setEmail(emailParam);
  }, [tabParam, emailParam]);

  // Context & Role Intent Detection
  const contextTarget = (roleParam || next).toLowerCase();
  const isGuestStart = !/host|business|place|event|club/.test(contextTarget);

  const roleContext = useMemo(() => {
    const target = (roleParam || next).toLowerCase();
    if (target.includes("host")) {
      return {
        icon: Building2,
        kicker: "Host Workspace",
        title: "Sign in to Host Console",
        signupTitle: "Create your Host Account",
        desc: "Manage PBSA cohorts, 60-second Arrival Engine, Belonging Reports, and resident support.",
        color: "text-amber-600 dark:text-amber-400",
        bg: "bg-amber-500/10",
      };
    }
    if (target.includes("business") || target.includes("place")) {
      return {
        icon: Store,
        kicker: "Local Business Hub",
        title: "Sign in to Business Hub",
        signupTitle: "Open a Business Account",
        desc: "Publish verified perks and dining deals. Guests discover you on What's Open Now and in search.",
        color: "text-emerald-600 dark:text-emerald-400",
        bg: "bg-emerald-500/10",
      };
    }
    if (target.includes("event")) {
      return {
        icon: CalendarDays,
        kicker: "Event Organiser",
        title: "Sign in to Event Console",
        signupTitle: "Create Organiser Account",
        desc: "Unlimited events, tiered tickets, interactive coupons, door QR scanning, and CSV export.",
        color: "text-indigo-600 dark:text-indigo-400",
        bg: "bg-indigo-500/10",
      };
    }
    if (target.includes("club")) {
      return {
        icon: Sparkles,
        kicker: "Circles & Hangouts",
        title: "Sign in to Networking Circle",
        signupTitle: "Join AirPal Circle",
        desc: "Plan hangouts, vote on stops, RSVP with friends, and check in with live presence.",
        color: "text-accent",
        bg: "bg-brand/10",
      };
    }
    return {
      icon: ShieldCheck,
      kicker: "Single Universal Account",
      title: "Welcome to AirPal",
      signupTitle: "Create your AirPal Account",
      desc: "One login across Places, Communities, Friends, and Me — verified across Web, iOS & Android.",
      color: "text-accent",
      bg: "bg-brand/10",
    };
  }, [roleParam, next]);

  function afterInPath(): string {
    const dest = next.trim();
    if (dest.startsWith("/") && !dest.startsWith("//") && !dest.startsWith("/start")) return dest;
    if (roleParam === "host") return "/host";
    if (roleParam === "business" || business) return "/business";
    if (roleParam === "event") return "/event";
    if (isNativeApp()) return "/";
    return "/now";
  }

  useEffect(() => {
    if (!user || phoneSignup) return;
    if (pendingGo || (next && !next.startsWith("/start"))) {
      setPendingGo(false);
      nav(afterInPath());
    }
  }, [user, pendingGo, next, nav, phoneSignup, roleParam, business]);

  function switchMode(newMode: AuthMode) {
    void triggerHapticSelection();
    setMode(newMode);
    setInlineError(null);
    const p = new URLSearchParams(search);
    p.set("tab", newMode === "signup" ? "signup" : newMode === "reset" ? "reset" : "signin");
    if (method === "phone") p.set("tab", "phone");
    nav(`/start?${p.toString()}`);
  }

  function switchMethod(newMethod: AuthMethod) {
    void triggerHapticSelection();
    setMethod(newMethod);
    setInlineError(null);
    const p = new URLSearchParams(search);
    if (newMethod === "phone") p.set("tab", "phone");
    else p.set("tab", mode === "signup" ? "signup" : "signin");
    nav(`/start?${p.toString()}`);
  }

  function handleNameChange(val: string) {
    setSignupName(val);
    if (!handleManual) {
      const clean = val.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (clean.length >= 2) {
        setSignupHandle(clean.slice(0, 20));
      }
    }
  }

  function handleHandleChange(val: string) {
    setHandleManual(true);
    setSignupHandle(normalizeHandle(val));
  }

  async function handleEmailSignup(e: FormEvent) {
    e.preventDefault();
    setInlineError(null);

    const nameClean = signupName.trim();
    if (!nameClean || nameClean.length < 2) {
      setInlineError({ message: "Please enter your full name (at least 2 characters)." });
      return;
    }
    if (!emailOk) {
      setInlineError({ message: "Please enter a valid email address." });
      return;
    }
    if (!handleOk) {
      setInlineError({ message: handleStatus.reason || "Please choose a valid available @handle." });
      return;
    }
    if (!passOk) {
      setInlineError({ message: "Password must be at least 8 characters with letters and numbers." });
      return;
    }
    if (!signupAdultConfirmed) {
      setInlineError({ message: "Please confirm you are 18 years or older to join AirPal." });
      return;
    }

    setBusy(true);
    try {
      const cleanEmail = email.trim();
      localStorage.setItem(LAST_EMAIL_KEY, cleanEmail);
      await register(cleanEmail, nameClean, { password });

      try {
        const h = normalizeHandle(signupHandle);
        await createProfile({
          handle: h,
          name: nameClean,
          city: "Sydney",
          shortWhy: "On AirPal",
          kind: "person",
        });
      } catch {
        /* profile may already be initialized */
      }

      void triggerHaptic("medium");
      toast.success("Account created! Welcome to AirPal.");
      setPendingGo(true);
    } catch (err: unknown) {
      const errObj = err as { code?: string; message?: string };
      const code = errObj?.code || "";
      const msg = authErrorMessage(err, "Account creation failed");
      setInlineError({ message: msg, code });
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setInlineError(null);

    // Reset Password mode
    if (mode === "reset") {
      if (!emailOk) {
        setInlineError({ message: "Please enter a valid email address." });
        return;
      }
      setBusy(true);
      try {
        await requestPasswordReset(email.trim());
        setResetSent(true);
        void triggerHaptic("light");
        toast.success("Password reset link sent to your email.");
      } catch (err) {
        const msg = authErrorMessage(err, "Could not send reset email. Please try again.");
        setInlineError({ message: msg });
        toast.error(msg);
      } finally {
        setBusy(false);
      }
      return;
    }

    if (mode === "signup") {
      return handleEmailSignup(e);
    }

    if (mode === "signin" && method === "phone" && phoneLoginMode === "password") {
      if (!phoneReady(signInPhone)) {
        setInlineError({ message: "Enter your mobile number with country code." });
        return;
      }
      if (!password) {
        setInlineError({ message: "Please enter your password." });
        return;
      }
    } else if (mode === "signin") {
      if (!emailOk) {
        setInlineError({ message: "Please enter a valid email address." });
        return;
      }
      if (!password) {
        setInlineError({ message: "Please enter your password." });
        return;
      }
    }

    setBusy(true);
    try {
      if (mode === "signin" && method === "phone" && phoneLoginMode === "password") {
        await loginWithPhonePassword(signInPhone, password);
        void triggerHaptic("medium");
        toast.success("Signed in successfully!");
        setPendingGo(true);
      } else {
        const cleanEmail = email.trim();
        localStorage.setItem(LAST_EMAIL_KEY, cleanEmail);
        await login(cleanEmail, password);
        void triggerHaptic("medium");
        toast.success("Signed in successfully!");
        setPendingGo(true);
      }
    } catch (err: unknown) {
      const errObj = err as { code?: string; message?: string };
      const code = errObj?.code || "";
      const msg = authErrorMessage(err, "Sign in failed");

      if (!liveBackendEnabled()) {
        toast.message("Demo mode sign-in");
        setPendingGo(true);
      } else if (method === "phone" && phoneLoginMode === "password" && phonePasswordNeedsSms(err)) {
        setPhoneLoginMode("sms");
        setInlineError({ message: msg, code });
        toast.message(msg);
      } else {
        setInlineError({ message: msg, code });
        toast.error(msg);
      }
    } finally {
      setBusy(false);
    }
  }

  // ========================================================
  // ALREADY SIGNED IN VIEW: User & Identity Cockpit
  // ========================================================
  if (user && !phoneSignup) {
    const isHostUser = Boolean(user.propertyIds?.length || user.role === "host_admin" || user.role === "super_admin");
    return (
      <div className="mx-auto max-w-xl px-4 py-8 md:py-12 pb-[calc(env(safe-area-inset-bottom,0px)+6.5rem)]">
        {/* Profile Card */}
        <div className="rounded-3xl bg-card p-6 md:p-8 ring-1 ring-line shadow-clay text-center">
          <div className="mx-auto flex justify-center">
            <MeAvatar faceClassName="h-20 w-20 text-2xl shadow-md ring-2 ring-brand/20" />
          </div>
          <h1 className="font-display mt-4 text-2xl sm:text-3xl font-extrabold text-ink">
            {user.displayName || "Your AirPal Account"}
          </h1>
          {mine?.handle ? (
            <Link
              href={`/@${mine.handle}`}
              className="mt-1 inline-flex items-center gap-1 rounded-full bg-brand/10 px-3 py-1 text-xs font-bold text-accent hover:bg-brand/20 transition cursor-pointer"
            >
              <span>@{mine.handle}</span>
              <ArrowUpRight size={13} />
            </Link>
          ) : null}
          <p className="text-xs sm:text-sm text-mute mt-1.5">{user.email || user.phone || "Active Session"}</p>

          {/* Pending Destination Continuation */}
          {next && (
            <div className="mt-5 rounded-2xl bg-amber-500/10 p-3.5 text-left ring-1 ring-amber-500/25">
              <div className="flex items-center justify-between text-xs font-bold text-amber-800 dark:text-amber-300">
                <span>Destination Pending</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider">Ready</span>
              </div>
              <p className="truncate text-sm font-semibold text-ink mt-0.5">{next}</p>
              <Button
                size="sm"
                className="mt-2.5 w-full min-h-[44px] shadow-xs"
                onClick={() => {
                  void triggerHaptic("medium");
                  nav(next);
                }}
              >
                Continue to destination →
              </Button>
            </div>
          )}

          {/* Biometrics & Security Status */}
          <div className="mt-6 text-left space-y-3">
            <AccountContacts compact />
            <BiometricEnrollCard compact />
          </div>

          {user.email && user.emailVerified === false && (
            <div className="mt-4 text-left">
              <VerifyEmailBanner email={user.email} onSend={sendVerificationEmail} />
            </div>
          )}

          {/* 4 Core Pillars Shortcuts */}
          <div className="mt-8 text-left">
            <p className="text-[10px] font-black uppercase tracking-wider text-mute mb-2.5 px-1">
              The 4 Pillars · Quick Jump
            </p>
            <div className="grid grid-cols-2 gap-2">
              {PILLARS.map((pillar) => {
                const Icon = pillar.icon;
                return (
                  <button
                    key={pillar.id}
                    type="button"
                    onClick={() => {
                      void triggerHapticSelection();
                      nav(pillar.href);
                    }}
                    className="flex items-center gap-2.5 rounded-2xl bg-paper/80 p-3 ring-1 ring-line/70 hover:bg-paper hover:ring-brand/30 transition text-left cursor-pointer active:scale-[0.98]"
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-brand/10 text-accent">
                      <Icon size={16} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-xs font-bold text-ink leading-tight">{pillar.label}</span>
                      <span className="block text-[10px] text-mute truncate">{pillar.subLabel}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Connected Console Portals */}
          <div className="mt-6 space-y-2 text-left">
            <p className="text-[10px] font-black uppercase tracking-wider text-mute px-1">
              Host &amp; Business Portals
            </p>
            <Button
              variant="ghost"
              className="w-full min-h-[44px] justify-between text-xs"
              onClick={() => {
                void triggerHaptic("light");
                nav("/host");
              }}
            >
              <span className="flex items-center gap-2">
                <Building2 size={16} className="text-accent" />
                <span>{isHostUser ? "Host Console · Live Operator" : "Host Console · List a Place"}</span>
              </span>
              <ArrowRight size={14} className="text-mute" />
            </Button>

            <Button
              variant="ghost"
              className="w-full min-h-[44px] justify-between text-xs"
              onClick={() => {
                void triggerHaptic("light");
                nav("/business");
              }}
            >
              <span className="flex items-center gap-2">
                <Store size={16} className="text-accent" />
                <span>{business ? `Local Business (@${business.handle})` : "Business Hub · Merchant Deals"}</span>
              </span>
              <ArrowRight size={14} className="text-mute" />
            </Button>

            <Button
              variant="ghost"
              className="w-full min-h-[44px] justify-between text-xs"
              onClick={() => {
                void triggerHaptic("light");
                nav("/event");
              }}
            >
              <span className="flex items-center gap-2">
                <CalendarDays size={16} className="text-accent" />
                <span>Event Organiser Dashboard</span>
              </span>
              <ArrowRight size={14} className="text-mute" />
            </Button>
          </div>

          {/* Sign Out Button */}
          <div className="mt-8 border-t border-line/60 pt-4">
            <button
              type="button"
              onClick={() => {
                void triggerHaptic("light");
                void logout().then(() => nav("/"));
              }}
              className="min-h-[44px] px-4 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
            >
              Sign out of this device
            </button>
          </div>
        </div>
      </div>
    );
  }

  const RoleIcon = roleContext.icon;
  const RoleHeading = isGuestStart ? "h2" : "h1";

  // ========================================================
  // UNAUTHENTICATED AUTHENTICATION & ONBOARDING GATEWAY
  // ========================================================
  return (
    <div
      className="mx-auto max-w-lg px-4 py-8 md:py-12 pb-[calc(env(safe-area-inset-bottom,0px)+5rem)]"
      style={keyboardHeight > 0 ? { paddingBottom: keyboardHeight + 32 } : undefined}
    >
      {/* Editorial Welcome Header */}
      {isGuestStart && (
        <div className="mb-6 text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-3 py-1 text-xs font-bold text-accent">
            <Sparkles size={13} />
            <span>LIFE MADE EASY</span>
          </div>
          <h1 className="font-display mt-2.5 text-3xl sm:text-4xl font-black tracking-tight text-ink leading-tight">
            Find your place. <br />
            <span className="font-serif italic font-normal text-accent">Meet your people.</span>
          </h1>
          <p className="mx-auto mt-2 max-w-sm text-xs sm:text-sm text-mute leading-relaxed">
            One universal account across Places, Communities, Friends, and Me — ready on Web, iOS, and Android.
          </p>

          {/* 4 Pillars Mini-Badges */}
          <div className="mt-5 grid grid-cols-4 gap-2 text-center">
            {PILLARS.map((p) => {
              const Icon = p.icon;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    void triggerHapticSelection();
                    nav(p.href);
                  }}
                  className="flex flex-col items-center justify-center rounded-2xl bg-card p-2.5 ring-1 ring-line/80 hover:bg-paper hover:ring-brand/30 transition cursor-pointer active:scale-95"
                >
                  <span className="grid h-8 w-8 place-items-center rounded-xl bg-brand/10 text-accent mb-1">
                    <Icon size={16} />
                  </span>
                  <span className="text-[11px] font-bold text-ink">{p.label}</span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => {
              void triggerHaptic("light");
              nav("/explore");
            }}
            className="mt-3.5 inline-flex min-h-[44px] items-center gap-1 text-xs font-semibold text-accent hover:underline cursor-pointer"
          >
            <span>Browse first, join later</span>
            <ArrowRight size={13} />
          </button>
        </div>
      )}

      {/* Role / Context Banner */}
      <div className="mb-6 rounded-3xl bg-card p-4 sm:p-5 ring-1 ring-line shadow-clay">
        <div className="flex items-center gap-3.5">
          <span
            className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-2xl", roleContext.bg, roleContext.color)}
          >
            <RoleIcon size={22} strokeWidth={2} />
          </span>
          <div className="min-w-0 flex-1">
            <p className={cn("text-[10px] font-bold uppercase tracking-widest", roleContext.color)}>
              {roleContext.kicker}
            </p>
            <RoleHeading className="font-display text-lg sm:text-xl font-bold leading-tight text-ink mt-0.5">
              {mode === "reset"
                ? "Reset your password"
                : mode === "signup"
                  ? roleContext.signupTitle
                  : roleContext.title}
            </RoleHeading>
          </div>
        </div>
        <p className="mt-2.5 text-xs text-mute leading-relaxed">{roleContext.desc}</p>
      </div>

      {/* Referral Banner */}
      {mode === "signup" && inviterHandle && (
        <div className="mb-4 rounded-2xl ring-1 ring-brand/30 bg-brand/5 px-4 py-3 text-center text-xs sm:text-sm">
          <span>You’re invited by </span>
          <span className="font-bold text-accent">@{inviterHandle}</span>
          <span> — unlocks access to the </span>
          <Link href="/founders" className="font-bold text-accent hover:underline">
            Founders 100K pool
          </Link>
          .
        </div>
      )}

      {/* ======================================================== */}
      {/* MAIN AUTHENTICATION CARD */}
      {/* ======================================================== */}
      <div
        id="auth-card"
        className="rounded-3xl ring-1 ring-line bg-card/95 backdrop-blur-2xl p-6 sm:p-7 shadow-clay scroll-mt-6"
      >
        {mode === "reset" ? (
          /* Password Reset Flow */
          <div>
            <button
              type="button"
              onClick={() => switchMode("signin")}
              className="mb-4 inline-flex min-h-[44px] items-center gap-1.5 text-xs font-semibold text-accent hover:underline cursor-pointer"
            >
              <ArrowLeft size={14} />
              <span>Back to Sign In</span>
            </button>

            <h2 className="font-display text-xl sm:text-2xl font-bold text-ink">Forgot your password?</h2>
            <p className="mt-1 text-xs text-mute leading-relaxed">
              Enter your registered email address. We will send you a secure link to create a new password.
            </p>

            {inlineError && (
              <div className="mt-4 flex items-start gap-2.5 rounded-2xl bg-red-500/10 p-3.5 text-xs text-red-600 dark:text-red-400 ring-1 ring-red-500/25">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{inlineError.message}</span>
              </div>
            )}

            {resetSent ? (
              <div className="mt-5 rounded-2xl bg-emerald-500/10 p-5 text-center ring-1 ring-emerald-500/20">
                <CheckCircle2 size={28} className="mx-auto text-emerald-600 dark:text-emerald-400" />
                <p className="mt-2 text-sm font-bold text-ink">Reset link sent!</p>
                <p className="mt-1 text-xs text-mute">
                  Check your inbox for <span className="font-semibold text-ink">{email}</span>. Please also inspect your
                  spam folder.
                </p>
                <Button
                  size="sm"
                  variant="ghost"
                  className="mt-4 min-h-[44px] px-4 font-semibold"
                  onClick={() => switchMode("signin")}
                >
                  Return to Sign In
                </Button>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="mt-5 space-y-4">
                <ValidField label="Email Address" ok={emailOk}>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mute" />
                    <input
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      autoCapitalize="none"
                      enterKeyHint="go"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onFocus={nudgeIntoView}
                      placeholder="you@domain.com"
                      className={cn(fieldInput, "pl-10", KEYBOARD_SAFE_INPUT)}
                    />
                  </div>
                </ValidField>

                <Button
                  type="submit"
                  className="w-full min-h-[48px] text-sm font-bold shadow-xs cursor-pointer"
                  disabled={busy || !emailOk}
                  loading={busy}
                >
                  {busy ? "Sending link…" : "Email reset link"}
                </Button>
              </form>
            )}
          </div>
        ) : (
          /* Normal Sign In / Sign Up Flow */
          <div>
            {/* Primary Mode Segmented Control: Sign In vs Create Account */}
            <div className="relative flex rounded-full bg-paper p-1 ring-1 ring-line shadow-2xs">
              <button
                type="button"
                onClick={() => switchMode("signin")}
                aria-pressed={mode === "signin"}
                className={cn(
                  "flex-1 rounded-full min-h-[44px] text-center text-xs font-bold transition active:scale-[0.98] cursor-pointer",
                  mode === "signin"
                    ? "bg-brand text-white shadow-[0_4px_12px_-4px_rgba(24,5,219,0.35)]"
                    : "text-mute hover:text-ink",
                )}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => switchMode("signup")}
                aria-pressed={mode === "signup"}
                className={cn(
                  "flex-1 rounded-full min-h-[44px] text-center text-xs font-bold transition active:scale-[0.98] cursor-pointer",
                  mode === "signup"
                    ? "bg-brand text-white shadow-[0_4px_12px_-4px_rgba(24,5,219,0.35)]"
                    : "text-mute hover:text-ink",
                )}
              >
                Create Account
              </button>
            </div>

            {/* Method Toggle: Email vs Mobile SMS */}
            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => switchMethod("email")}
                aria-pressed={method === "email"}
                className={cn(
                  "inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-4 text-xs font-semibold transition active:scale-[0.98] cursor-pointer",
                  method === "email"
                    ? "bg-brand text-white shadow-xs"
                    : "bg-paper text-mute hover:text-ink ring-1 ring-line",
                )}
              >
                <Mail size={14} />
                <span>Email &amp; Password</span>
              </button>
              <button
                type="button"
                onClick={() => switchMethod("phone")}
                aria-pressed={method === "phone"}
                className={cn(
                  "inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-4 text-xs font-semibold transition active:scale-[0.98] cursor-pointer",
                  method === "phone"
                    ? "bg-brand text-white shadow-xs"
                    : "bg-paper text-mute hover:text-ink ring-1 ring-line",
                )}
              >
                <Phone size={14} />
                <span>Mobile SMS</span>
              </button>
            </div>

            {/* Inline Error Banner */}
            {inlineError && (
              <div className="mt-4 rounded-2xl bg-red-500/10 p-3.5 text-xs text-red-600 dark:text-red-400 ring-1 ring-red-500/25">
                <div className="flex items-start gap-2.5">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium">{inlineError.message}</p>
                    {inlineError.code === "auth/email-already-in-use" && (
                      <button
                        type="button"
                        onClick={() => switchMode("signin")}
                        className="mt-1 font-bold text-accent underline block cursor-pointer"
                      >
                        Sign in with this email instead →
                      </button>
                    )}
                    {(inlineError.code === "auth/wrong-password" || inlineError.code === "auth/invalid-credential") && (
                      <button
                        type="button"
                        onClick={() => switchMode("reset")}
                        className="mt-1 font-bold text-accent underline block cursor-pointer"
                      >
                        Forgot your password? Reset it here →
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Passkey / Biometric Login on Supported Devices */}
            {mode === "signin" && hasEnrolledBiometrics && (
              <div className="mt-4">
                <BiometricAuthButton variant="hero" onSuccess={() => setPendingGo(true)} />
              </div>
            )}

            {/* Apple & Google 1-Tap Social Auth */}
            <div className="mt-4">
              <SocialAuthButtons
                busy={busy}
                showBiometrics={false}
                onSocial={async (provider) => {
                  setInlineError(null);
                  await loginWithSocial(provider);
                  void triggerHaptic("medium");
                  toast.success("Signed in successfully!");
                  setPendingGo(true);
                }}
              />
              <SocialAuthDivider />
            </div>

            {/* Method Content: Mobile SMS vs Email Form */}
            {method === "phone" ? (
              mode === "signup" ? (
                <div className="mt-2">
                  <SignupFlow
                    onDone={() => {
                      setPhoneSignup(false);
                      setPendingGo(true);
                    }}
                  />
                </div>
              ) : (
                <div className="mt-4">
                  <div className="mb-3.5 flex justify-center gap-1 rounded-full bg-paper p-1 ring-1 ring-line">
                    <button
                      type="button"
                      onClick={() => setPhoneLoginMode("password")}
                      aria-pressed={phoneLoginMode === "password"}
                      className={cn(
                        "inline-flex min-h-[40px] items-center rounded-full px-4 text-xs font-semibold cursor-pointer",
                        phoneLoginMode === "password" ? "bg-brand text-white" : "text-mute",
                      )}
                    >
                      Password
                    </button>
                    <button
                      type="button"
                      onClick={() => setPhoneLoginMode("sms")}
                      aria-pressed={phoneLoginMode === "sms"}
                      className={cn(
                        "inline-flex min-h-[40px] items-center rounded-full px-4 text-xs font-semibold cursor-pointer",
                        phoneLoginMode === "sms" ? "bg-brand text-white" : "text-mute",
                      )}
                    >
                      SMS Code
                    </button>
                  </div>
                  {phoneLoginMode === "sms" ? (
                    <PhoneLogin
                      onBegin={() => setPhoneSignup(true)}
                      onDone={() => {
                        setPhoneSignup(false);
                        setPendingGo(true);
                      }}
                      onNeedAccount={() => {
                        setPhoneSignup(true);
                        switchMode("signup");
                      }}
                    />
                  ) : (
                    <form onSubmit={onSubmit} className="space-y-3.5">
                      <ValidField label="Mobile number" ok={phoneReady(signInPhone)}>
                        <PhoneField value={signInPhone} onChange={setSignInPhone} />
                      </ValidField>
                      <ValidField label="Password" ok={Boolean(password)}>
                        <div className="relative">
                          <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mute" />
                          <input
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            autoComplete="current-password"
                            enterKeyHint="go"
                            onFocus={nudgeIntoView}
                            className={cn(fieldInput, "pl-10 pr-10", KEYBOARD_SAFE_INPUT)}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword((prev) => !prev)}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-mute hover:text-ink cursor-pointer"
                            aria-label={showPassword ? "Hide password" : "Show password"}
                          >
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </ValidField>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => switchMode("reset")}
                          className="text-xs font-semibold text-accent hover:underline cursor-pointer"
                        >
                          Forgot password?
                        </button>
                      </div>
                      <Button
                        type="submit"
                        className="w-full min-h-[48px] text-sm font-bold shadow-xs cursor-pointer"
                        disabled={busy}
                        loading={busy}
                      >
                        {busy ? "Signing in…" : "Sign In"}
                      </Button>
                      <p className="text-center text-[11px] text-mute">
                        SMS code always works if phone + password isn&apos;t set up yet.
                      </p>
                    </form>
                  )}
                </div>
              )
            ) : mode === "signup" ? (
              /* ======================================================== */
              /* EMAIL SIGNUP FLOW WITH INSTANT @HANDLE CLAIM */
              /* ======================================================== */
              <form onSubmit={handleEmailSignup} className="mt-4 space-y-3.5">
                <ValidField
                  label="Full Name"
                  ok={signupName.trim().length >= 2}
                  error={signupName && signupName.trim().length < 2 ? "Please enter at least 2 characters" : null}
                >
                  <div className="relative">
                    <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mute" />
                    <input
                      type="text"
                      value={signupName}
                      onChange={(e) => handleNameChange(e.target.value)}
                      placeholder="Alex Rivera"
                      autoComplete="name"
                      onFocus={nudgeIntoView}
                      className={cn(fieldInput, "pl-10", KEYBOARD_SAFE_INPUT)}
                      required
                    />
                  </div>
                </ValidField>

                <ValidField
                  label="Email Address"
                  ok={emailOk}
                  error={email && !emailOk ? "Please enter a valid email address" : null}
                >
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mute" />
                    <input
                      type="email"
                      inputMode="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@domain.com"
                      autoComplete="email"
                      onFocus={nudgeIntoView}
                      className={cn(fieldInput, "pl-10", KEYBOARD_SAFE_INPUT)}
                      required
                    />
                  </div>
                </ValidField>

                {/* Live @handle claim */}
                <ValidField
                  label="AirPal Me @handle"
                  ok={handleOk}
                  error={
                    signupHandle && !handleStatus.checking && !handleOk
                      ? handleStatus.reason || "Handle unavailable"
                      : null
                  }
                  hint={
                    handleStatus.checking
                      ? "Checking availability…"
                      : handleOk
                        ? `🎉 @${signupHandle} is reserved for you!`
                        : "Claim your unique link: airpal.me/@" + (signupHandle || "yourname")
                  }
                >
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-mute">@</span>
                    <input
                      type="text"
                      value={signupHandle}
                      onChange={(e) => handleHandleChange(e.target.value)}
                      placeholder="alex"
                      autoComplete="username"
                      autoCapitalize="none"
                      onFocus={nudgeIntoView}
                      className={cn(fieldInput, "pl-8 pr-9", KEYBOARD_SAFE_INPUT)}
                      required
                    />
                    {handleOk && (
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-emerald-500">
                        <Check size={16} strokeWidth={2.5} />
                      </span>
                    )}
                  </div>
                </ValidField>

                <ValidField
                  label="Create Password"
                  ok={passOk}
                  error={password && !passOk ? "At least 8 chars with letters & numbers" : null}
                >
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mute" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      autoComplete="new-password"
                      onFocus={nudgeIntoView}
                      className={cn(fieldInput, "pl-10 pr-10", KEYBOARD_SAFE_INPUT)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-mute hover:text-ink cursor-pointer"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </ValidField>

                {/* Password Strength Meter */}
                {password.length > 0 && (
                  <div className="space-y-1.5 pt-0.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-mute font-medium">Password Strength</span>
                      <span
                        className={cn(
                          "font-bold",
                          passwordStrength.score >= 3
                            ? "text-emerald-600 dark:text-emerald-400"
                            : passwordStrength.score === 2
                              ? "text-amber-500"
                              : "text-red-500",
                        )}
                      >
                        {passwordStrength.label}
                      </span>
                    </div>
                    <div className="flex gap-1.5 h-1.5">
                      {[1, 2, 3, 4].map((bar) => (
                        <div
                          key={bar}
                          className={cn(
                            "flex-1 rounded-full transition-all duration-300",
                            bar <= passwordStrength.score ? passwordStrength.color : "bg-line/50",
                          )}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Age & Terms Confirmation */}
                <label className="flex items-start gap-2.5 pt-1 text-left cursor-pointer">
                  <input
                    type="checkbox"
                    checked={signupAdultConfirmed}
                    onChange={(e) => setSignupAdultConfirmed(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-line text-accent focus:ring-brand cursor-pointer"
                  />
                  <span className="text-xs text-mute leading-snug">
                    I confirm I am 18 years or older and agree to the{" "}
                    <Link href="/terms" className="font-semibold text-accent hover:underline">
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link href="/privacy" className="font-semibold text-accent hover:underline">
                      Privacy Policy
                    </Link>
                    .
                  </span>
                </label>

                <Button
                  type="submit"
                  className="w-full min-h-[48px] text-sm font-bold shadow-xs mt-2 cursor-pointer"
                  disabled={
                    busy || !emailOk || !passOk || !handleOk || signupName.trim().length < 2 || !signupAdultConfirmed
                  }
                  loading={busy}
                >
                  {busy ? "Creating account…" : "Create My AirPal Account"}
                </Button>

                <div className="mt-2.5 flex items-center justify-center gap-3 text-[11px] text-mute font-medium">
                  <span className="inline-flex items-center gap-1">
                    <Check size={12} className="text-emerald-500" /> Free universal account
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Check size={12} className="text-emerald-500" /> No credit card required
                  </span>
                </div>
              </form>
            ) : (
              /* ======================================================== */
              /* EMAIL SIGN IN FLOW */
              /* ======================================================== */
              <form onSubmit={onSubmit} className="mt-4 space-y-3.5">
                <ValidField label="Email Address" ok={emailOk} error={email && !emailOk ? "Enter a valid email" : null}>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mute" />
                    <input
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      autoCapitalize="none"
                      enterKeyHint="next"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onFocus={nudgeIntoView}
                      placeholder="you@domain.com"
                      className={cn(fieldInput, "pl-10", KEYBOARD_SAFE_INPUT)}
                      required
                    />
                  </div>
                </ValidField>

                <ValidField label="Password" ok={Boolean(password)} error={null}>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mute" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      enterKeyHint="go"
                      onFocus={nudgeIntoView}
                      className={cn(fieldInput, "pl-10 pr-10", KEYBOARD_SAFE_INPUT)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-mute hover:text-ink cursor-pointer"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </ValidField>

                <div className="flex items-center justify-between text-xs">
                  <label className="flex items-center gap-1.5 text-mute cursor-pointer">
                    <input
                      type="checkbox"
                      defaultChecked
                      className="h-3.5 w-3.5 rounded border-line text-accent focus:ring-brand cursor-pointer"
                    />
                    <span>Remember me</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => switchMode("reset")}
                    className="font-semibold text-accent hover:underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>

                <Button
                  type="submit"
                  className="w-full min-h-[48px] text-sm font-bold shadow-xs mt-2"
                  disabled={busy || !emailOk || !password}
                  loading={busy}
                >
                  {busy ? "Signing in…" : "Sign In"}
                </Button>
              </form>
            )}

            {/* Quick Switch Helper */}
            <div className="mt-5 border-t border-line/60 pt-4 text-center">
              {mode === "signin" ? (
                <p className="text-xs text-mute">
                  New to AirPal?{" "}
                  <button
                    type="button"
                    onClick={() => switchMode("signup")}
                    className="font-bold text-accent hover:underline cursor-pointer"
                  >
                    Create an account
                  </button>
                </p>
              ) : (
                <p className="text-xs text-mute">
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => switchMode("signin")}
                    className="font-bold text-accent hover:underline cursor-pointer"
                  >
                    Sign in
                  </button>
                </p>
              )}
            </div>

            {/* Trust & Security Badge */}
            <div className="mt-5 flex flex-col items-center justify-center gap-1 text-[11px] text-mute/80 pt-3 border-t border-line/50">
              <div className="flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-emerald-500 shrink-0" />
                <span className="font-bold text-ink">AirPal Trust &amp; Privacy Rail</span>
              </div>
              <span className="text-[10px]">256-bit Encrypted · Universal Single Account · Australian Privacy Act</span>
            </div>
          </div>
        )}
      </div>

      {/* Role Portal Quick Links Footer */}
      <div className="mt-6 text-center space-y-2">
        <p className="text-xs text-mute">
          Explore partner options:{" "}
          <Link href="/join" className="text-accent font-semibold hover:underline">
            Become a Host, Business or Organiser
          </Link>
        </p>
        <div className="flex items-center justify-center gap-3 text-[11px] text-mute">
          <Link href="/terms" className="hover:underline">
            Terms of Service
          </Link>
          <span>·</span>
          <Link href="/privacy" className="hover:underline">
            Privacy Policy
          </Link>
          <span>·</span>
          <Link href="/trust" className="hover:underline">
            Trust &amp; Facts
          </Link>
        </div>
      </div>
    </div>
  );
}
