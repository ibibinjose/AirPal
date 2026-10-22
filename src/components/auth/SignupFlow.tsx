import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import {
  AlertCircle,
  ArrowRight,
  AtSign,
  Cake,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  Phone,
  User,
} from "lucide-react";
import { authErrorMessage } from "@shared/auth-email";
import { handleFromName, normalizeHandle } from "@shared/bio";
import { isOtp, normalizeOtp, phoneReady } from "@shared/phone-auth";
import { PASSWORD_RULES, isAdultBirthDate, isEmail, passwordIssues, passwordOk, sydneyToday } from "@shared/validate";
import { Button } from "@/components/ui/Button";
import { PhoneField } from "@/components/forms/PhoneField";
import { ValidField, fieldInput } from "@/components/forms/ValidField";
import { useAuth } from "@/contexts/AuthContext";
import { useBio } from "@/contexts/BioContext";
import { useHandleStatus } from "@/hooks/useHandleStatus";
import { resetPhoneLogin } from "@/lib/phone-auth";
import { ensureElementInView } from "@/lib/keyboard";
import { triggerHaptic, triggerHapticSelection } from "@/lib/native";
import { cn } from "@/lib/cn";

type SignupMethod = "email" | "phone";
type PhoneStep = "handle" | "code" | "account";

const KEYBOARD_SAFE_INPUT = "text-[16px] sm:text-sm";

function nudgeIntoView(e: React.FocusEvent<HTMLElement>) {
  ensureElementInView(e.currentTarget, {
    block: "center",
    topClearance: 70,
    bottomClearance: 24,
    behavior: "smooth",
  });
}

export function SignupFlow({
  onDone,
  onPhoneConfirm,
  initialPhone = "",
  initialEmail = "",
  initialHandle = "",
  onSwitchToSignIn,
}: {
  onDone: () => void;
  onPhoneConfirm?: () => void;
  initialPhone?: string;
  initialEmail?: string;
  initialHandle?: string;
  onSwitchToSignIn?: (email?: string) => void;
}) {
  const {
    register,
    sendPhoneCode,
    confirmPhoneCode,
    linkEmailPassword,
    completeAccount,
    sendVerificationEmail,
    biometricsSupported,
    enrollUserBiometrics,
  } = useAuth();
  const { createProfile, updateProfile, mine } = useBio();

  const [method, setMethod] = useState<SignupMethod>("email");
  const [phoneStep, setPhoneStep] = useState<PhoneStep>("handle");

  // Shared Form Fields
  const [name, setName] = useState(mine?.name || "");
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [handle, setHandle] = useState(initialHandle || mine?.handle || "");
  const [handleCustomized, setHandleCustomized] = useState(Boolean(initialHandle));
  const [adultConsent, setAdultConsent] = useState(true);
  const [birthDate, setBirthDate] = useState("");
  const enableBiometrics = true;

  // Phone SMS Specific Fields
  const [phone, setPhone] = useState(initialPhone);
  const [code, setCode] = useState("");
  const [wait, setWait] = useState(0);

  // UI state
  const [busy, setBusy] = useState(false);
  const [inlineError, setInlineError] = useState<{ message: string; code?: string } | null>(null);

  const handleStatus = useHandleStatus(handle, mine?.id);

  // Auto-suggest handle from name if not customized
  useEffect(() => {
    if (!handleCustomized && name.trim().length >= 2) {
      const suggested = handleFromName(name);
      if (suggested && suggested.length >= 3) {
        setHandle(suggested);
      }
    }
  }, [name, handleCustomized]);

  const nameOk = name.trim().length >= 2;
  const emailOk = isEmail(email.trim());
  const passOk = passwordOk(password);
  const handleOk = handleStatus.ok;
  const consentOk = adultConsent === true;

  // Phone validations
  const phoneOk = phoneReady(phone);
  const codeOk = isOtp(code);
  const adultOk = isAdultBirthDate(birthDate.trim());

  useEffect(() => () => resetPhoneLogin(), []);

  useEffect(() => {
    if (wait <= 0) return;
    const t = window.setTimeout(() => setWait((n) => n - 1), 1000);
    return () => window.clearTimeout(t);
  }, [wait]);

  function switchMethod(nextMethod: SignupMethod) {
    void triggerHapticSelection();
    setMethod(nextMethod);
    setInlineError(null);
  }

  // ========================================================
  // 1. FAST EMAIL + PASSWORD REGISTRATION (Primary flow)
  // ========================================================
  async function handleEmailSignup(e: FormEvent) {
    e.preventDefault();
    setInlineError(null);

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();
    const cleanHandle = normalizeHandle(handle);

    if (!cleanName || cleanName.length < 2) {
      setInlineError({ message: "Please enter your full name (at least 2 characters)." });
      return;
    }
    if (!isEmail(cleanEmail)) {
      setInlineError({ message: "Please enter a valid email address." });
      return;
    }
    if (!passOk) {
      setInlineError({ message: "Password must be at least 8 characters with letters and numbers." });
      return;
    }
    if (cleanHandle && !handleOk) {
      setInlineError({ message: handleStatus.reason || "That @handle is already taken. Try another." });
      return;
    }
    if (!consentOk) {
      setInlineError({ message: "You must confirm you are 18 years of age or older to use AirPal." });
      return;
    }

    setBusy(true);
    try {
      try {
        localStorage.setItem("airpal.last_signin_email", cleanEmail);
      } catch {
        /* storage may be restricted */
      }

      await register(cleanEmail, cleanName, {
        password,
        city: "Sydney",
      });

      // Claim chosen handle profile if specified
      if (cleanHandle && handleOk) {
        try {
          await createProfile({
            handle: cleanHandle,
            name: cleanName,
            city: "Sydney",
            shortWhy: "On AirPal",
            kind: "person",
          });
        } catch {
          /* Can be finalized during onboarding */
        }
      }

      void triggerHaptic("success");
      toast.success("Account created successfully!");
      onDone();
    } catch (err: unknown) {
      const errObj = err as { code?: string; message?: string };
      const code = errObj?.code || "";
      const msg = authErrorMessage(err, "Could not create account. Please try again.");
      setInlineError({ message: msg, code });
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  // ========================================================
  // 2. MOBILE NUMBER (SMS) SIGNUP (Alternative flow)
  // ========================================================
  async function sendCode() {
    if (!handleOk) {
      toast.error(handleStatus.reason || "Pick a free @handle");
      return;
    }
    if (!phoneOk) {
      toast.error("Need a real mobile number with country code");
      return;
    }
    setBusy(true);
    setInlineError(null);
    try {
      await sendPhoneCode(phone);
      setPhoneStep("code");
      setWait(30);
      void triggerHaptic("light");
      toast.success("SMS verification code sent");
    } catch (err) {
      const msg = authErrorMessage(err, "Could not send the verification code.");
      setInlineError({ message: msg });
      toast.error(msg);
      resetPhoneLogin();
    } finally {
      setBusy(false);
    }
  }

  async function confirmCode() {
    if (!codeOk) {
      toast.error("Enter the 6-digit code");
      return;
    }
    onPhoneConfirm?.();
    setBusy(true);
    setInlineError(null);
    try {
      await confirmPhoneCode(normalizeOtp(code));
      resetPhoneLogin();
      try {
        await createProfile({
          handle: normalizeHandle(handle),
          name: name.trim() || normalizeHandle(handle),
          city: "Sydney",
          shortWhy: "On AirPal",
          kind: "person",
          phone,
        });
      } catch {
        /* handle may already exist */
      }
      setPhoneStep("account");
      void triggerHaptic("medium");
      toast.success("Mobile number confirmed");
    } catch (err) {
      const msg = authErrorMessage(err, "Invalid code. Please try again.");
      setInlineError({ message: msg });
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  async function finishPhoneAccount() {
    if (!adultOk) {
      toast.error("AirPal accounts are for people 18 or older");
      return;
    }
    if (!consentOk) {
      toast.error("Confirm you are 18 years of age or older");
      return;
    }
    if (!nameOk || !emailOk || !passOk) {
      toast.error("Add your name, a valid email address, and a strong password");
      return;
    }
    setBusy(true);
    setInlineError(null);
    try {
      const cleanEmail = email.trim().toLowerCase();
      try {
        localStorage.setItem("airpal.last_signin_email", cleanEmail);
      } catch {
        /* ignore */
      }
      await linkEmailPassword(cleanEmail, password);
      const h = normalizeHandle(handle);
      if (mine?.handle) {
        await updateProfile({ handle: mine.handle, name: name.trim(), phone });
      } else {
        await createProfile({
          handle: h,
          name: name.trim(),
          city: "Sydney",
          shortWhy: "On AirPal",
          kind: "person",
          phone,
        });
      }
      try {
        await completeAccount({
          handle: h,
          name: name.trim(),
          email: cleanEmail,
          birthDate: birthDate.trim(),
          adultConsent: true,
        });
      } catch {
        /* profile already saved */
      }
      if (enableBiometrics && biometricsSupported) {
        try {
          await enrollUserBiometrics();
        } catch {
          /* can be enrolled later */
        }
      }
      try {
        await sendVerificationEmail();
      } catch {
        /* non-blocking */
      }
      void triggerHaptic("success");
      toast.success("Account created successfully!");
      onDone();
    } catch (err) {
      const msg = authErrorMessage(err, "Could not finish your account");
      setInlineError({ message: msg });
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  const phoneSteps: Array<{ id: PhoneStep; label: string; icon: typeof Phone }> = [
    { id: "handle", label: "Mobile & Handle", icon: AtSign },
    { id: "code", label: "SMS Verify", icon: KeyRound },
    { id: "account", label: "Password", icon: User },
  ];

  return (
    <div className="space-y-4">
      {/* Method Switcher: Email (Instant) vs Phone (SMS) */}
      <div className="flex rounded-full bg-paper p-1 ring-1 ring-line shadow-2xs">
        <button
          type="button"
          onClick={() => switchMethod("email")}
          aria-pressed={method === "email"}
          className={cn(
            "flex-1 rounded-full min-h-[38px] text-center text-xs font-bold transition active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5",
            method === "email"
              ? "bg-brand text-white shadow-xs"
              : "text-mute hover:text-ink hover:bg-black/5 dark:hover:bg-white/5",
          )}
        >
          <Mail size={13} />
          <span>Email &amp; Password</span>
        </button>
        <button
          type="button"
          onClick={() => switchMethod("phone")}
          aria-pressed={method === "phone"}
          className={cn(
            "flex-1 rounded-full min-h-[38px] text-center text-xs font-bold transition active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5",
            method === "phone"
              ? "bg-brand text-white shadow-xs"
              : "text-mute hover:text-ink hover:bg-black/5 dark:hover:bg-white/5",
          )}
        >
          <Phone size={13} />
          <span>Mobile Number (SMS)</span>
        </button>
      </div>

      {/* Inline Error Alert */}
      {inlineError && (
        <div className="rounded-2xl bg-red-500/10 p-3.5 text-xs text-red-600 dark:text-red-400 ring-1 ring-red-500/25">
          <div className="flex items-start gap-2.5">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium">{inlineError.message}</p>
              {inlineError.code === "auth/email-already-in-use" && onSwitchToSignIn && (
                <button
                  type="button"
                  onClick={() => onSwitchToSignIn(email)}
                  className="mt-1.5 font-bold text-accent underline inline-flex items-center gap-1 cursor-pointer min-h-[36px]"
                >
                  <span>Sign in with this email instead</span>
                  <ArrowRight size={13} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* EMAIL SIGN-UP FORM (Default, Zero-Friction) */}
      {/* ======================================================== */}
      {method === "email" && (
        <form onSubmit={handleEmailSignup} className="space-y-3.5">
          {/* Full Name */}
          <ValidField label="Full Name" ok={nameOk} error={name && !nameOk ? "At least 2 characters" : null}>
            <div className="relative">
              <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mute" />
              <input
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onFocus={nudgeIntoView}
                placeholder="Alex Rivera"
                className={cn(fieldInput, "pl-10", KEYBOARD_SAFE_INPUT)}
                required
              />
            </div>
          </ValidField>

          {/* Email Address */}
          <ValidField
            label="Email Address"
            ok={emailOk}
            error={email && !emailOk ? "Enter a valid email address" : null}
            hint="Kept secure for ticket receipts, pass updates & account recovery"
          >
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mute" />
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={nudgeIntoView}
                placeholder="alex@domain.com"
                className={cn(fieldInput, "pl-10", KEYBOARD_SAFE_INPUT)}
                required
              />
            </div>
          </ValidField>

          {/* Password with Strength Indicators */}
          <ValidField label="Create Password" ok={passOk}>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mute" />
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={nudgeIntoView}
                placeholder="••••••••"
                className={cn(fieldInput, "pl-10 pr-10", KEYBOARD_SAFE_INPUT)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 grid h-10 w-10 place-items-center rounded-full text-mute hover:text-ink cursor-pointer"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </ValidField>

          {/* Live Password Rules / Strength Meter */}
          {password && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4].map((barIndex) => {
                  const issuesCount = passwordIssues(password).length;
                  const score = Math.max(1, 4 - issuesCount);
                  const isActive = barIndex <= score;
                  let colorClass = "bg-line";
                  if (isActive) {
                    if (score === 1) colorClass = "bg-red-500";
                    else if (score === 2) colorClass = "bg-amber-500";
                    else if (score === 3) colorClass = "bg-emerald-500";
                    else colorClass = "bg-emerald-600";
                  }
                  return (
                    <div
                      key={barIndex}
                      className={cn("h-1 flex-1 rounded-full transition-all duration-300", colorClass)}
                    />
                  );
                })}
              </div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-mute">
                {PASSWORD_RULES.map((rule) => {
                  const met = !passwordIssues(password).includes(rule.id);
                  return (
                    <span
                      key={rule.id}
                      className={cn(
                        "inline-flex items-center gap-1",
                        met ? "font-medium text-emerald-600 dark:text-emerald-400" : "text-mute",
                      )}
                    >
                      <Check size={12} /> {rule.label}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Desired Personal @handle Preview */}
          <ValidField
            label="Pick your AirPal Me @handle"
            ok={Boolean(handle && handleOk)}
            error={handle && !handleStatus.checking && !handleOk ? handleStatus.reason || "Taken" : null}
            hint={
              handleStatus.checking
                ? "Checking availability…"
                : handle && handleOk
                  ? `✓ airpal.me/@${normalizeHandle(handle)} is yours!`
                  : "Your universal identity across Bio, Friends, and Passes"
            }
          >
            <div className="relative">
              <AtSign size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mute" />
              <input
                type="text"
                autoCapitalize="none"
                autoComplete="username"
                value={handle}
                onChange={(e) => {
                  setHandleCustomized(true);
                  setHandle(e.target.value);
                }}
                onFocus={nudgeIntoView}
                placeholder="maya"
                className={cn(fieldInput, "pl-10", KEYBOARD_SAFE_INPUT)}
              />
            </div>
          </ValidField>

          {/* Age Gate & Legal Confirmation */}
          <label className="flex items-start gap-2.5 rounded-2xl bg-paper p-3 ring-1 ring-line cursor-pointer">
            <input
              type="checkbox"
              checked={adultConsent}
              onChange={(e) => setAdultConsent(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded text-accent focus:ring-brand accent-[#1805db]"
              required
            />
            <span className="text-xs leading-relaxed text-ink">
              <span className="font-bold">I confirm I am 18 years of age or older</span>
              <span className="block text-[11px] text-mute mt-0.5">
                Required · AirPal facilitates real-world experiences, pass bookings and in-person catch-ups.
              </span>
            </span>
          </label>

          {/* Submit Action */}
          <Button
            type="submit"
            className="w-full min-h-[48px] text-sm font-bold shadow-xs cursor-pointer"
            disabled={busy || !nameOk || !emailOk || !passOk || !consentOk}
            loading={busy}
          >
            {busy ? "Creating your account…" : "Create Free Account"}
          </Button>
        </form>
      )}

      {/* ======================================================== */}
      {/* PHONE (SMS) SIGN-UP FLOW */}
      {/* ======================================================== */}
      {method === "phone" && (
        <div className="space-y-4">
          {/* Stepper Progress */}
          <div className="flex items-center justify-between px-1">
            {phoneSteps.map((s, idx) => {
              const order = phoneSteps.findIndex((x) => x.id === phoneStep);
              const isDone = idx < order;
              const isCurrent = s.id === phoneStep;
              const Icon = s.icon;
              return (
                <div key={s.id} className="flex items-center gap-2">
                  <div
                    className={cn(
                      "grid h-6 w-6 place-items-center rounded-full text-[11px] font-semibold",
                      isDone
                        ? "bg-emerald-600 text-white"
                        : isCurrent
                          ? "bg-brand text-white"
                          : "bg-paper text-mute ring-1 ring-line",
                    )}
                  >
                    {isDone ? <Check size={12} strokeWidth={2.5} /> : <Icon size={12} />}
                  </div>
                  <span
                    className={cn(
                      "text-[11px] sm:text-xs font-medium",
                      isCurrent ? "text-ink font-semibold" : "text-mute",
                    )}
                  >
                    {s.label}
                  </span>
                  {idx < 2 && <div className="h-0.5 w-4 bg-line sm:w-10" />}
                </div>
              );
            })}
          </div>

          {phoneStep === "handle" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void sendCode();
              }}
              className="space-y-3.5"
            >
              <PhoneField value={phone} onChange={setPhone} onFocus={nudgeIntoView} stacked label="Mobile Number" />
              <ValidField
                label="Choose your AirPal Me @handle"
                ok={handleOk}
                error={handle && !handleStatus.checking ? handleStatus.reason || null : null}
                hint={handleStatus.checking ? "Checking…" : "Your unique identity on AirPal"}
              >
                <input
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  onFocus={nudgeIntoView}
                  placeholder="maya"
                  autoComplete="username"
                  className={cn(fieldInput, KEYBOARD_SAFE_INPUT)}
                  autoFocus={!phone}
                />
              </ValidField>
              <Button
                type="submit"
                className="w-full min-h-[48px] text-sm font-bold shadow-xs cursor-pointer"
                disabled={busy || !handleOk || !phoneOk}
                loading={busy}
              >
                {busy ? "Sending…" : "Send SMS code"}
              </Button>
            </form>
          )}

          {phoneStep === "code" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void confirmCode();
              }}
              className="space-y-3.5"
            >
              <p className="text-xs leading-relaxed text-mute">Enter the 6-digit code we sent to {phone}.</p>
              <ValidField label="SMS code" ok={codeOk}>
                <input
                  value={code}
                  onChange={(e) => setCode(normalizeOtp(e.target.value))}
                  onFocus={nudgeIntoView}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="000000"
                  className={cn(
                    fieldInput,
                    "font-mono tracking-[0.35em] text-center text-lg font-semibold",
                    KEYBOARD_SAFE_INPUT,
                  )}
                  autoFocus
                />
              </ValidField>
              <Button
                type="submit"
                className="w-full min-h-[48px] text-sm font-bold shadow-xs cursor-pointer"
                disabled={busy || !codeOk}
                loading={busy}
              >
                {busy ? "Checking…" : "Confirm mobile"}
              </Button>
              <button
                type="button"
                className="w-full text-center text-xs font-medium text-accent disabled:text-mute cursor-pointer"
                disabled={wait > 0 || busy}
                onClick={() => void sendCode()}
              >
                {wait > 0 ? `Resend in ${wait}s` : "Resend code"}
              </button>
            </form>
          )}

          {phoneStep === "account" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void finishPhoneAccount();
              }}
              className="space-y-3.5"
            >
              <ValidField label="Your name" ok={nameOk} error={name && !nameOk ? "At least 2 characters" : null}>
                <div className="relative">
                  <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mute" />
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onFocus={nudgeIntoView}
                    placeholder="e.g. Alex Rivera"
                    autoComplete="name"
                    className={cn(fieldInput, "pl-10", KEYBOARD_SAFE_INPUT)}
                    autoFocus
                  />
                </div>
              </ValidField>
              <ValidField
                label="Email Address"
                ok={emailOk}
                error={email && !emailOk ? "Enter a valid email" : null}
                hint="Required · Kept for account security, recovery & pass receipts"
              >
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mute" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={nudgeIntoView}
                    placeholder="you@domain.com"
                    autoComplete="email"
                    className={cn(fieldInput, "pl-10", KEYBOARD_SAFE_INPUT)}
                    required
                  />
                </div>
              </ValidField>
              <ValidField label="Password" ok={passOk}>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mute" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={nudgeIntoView}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className={cn(fieldInput, "pl-10 pr-10", KEYBOARD_SAFE_INPUT)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-mute hover:text-ink cursor-pointer"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </ValidField>
              <ValidField
                label="Date of birth"
                ok={adultOk}
                error={birthDate && !adultOk ? "You must be 18 or older" : null}
                hint="AirPal involves meeting people in person — accounts are 18+"
              >
                <div className="relative">
                  <Cake size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mute" />
                  <input
                    type="date"
                    value={birthDate}
                    max={sydneyToday()}
                    onChange={(e) => setBirthDate(e.target.value)}
                    onFocus={nudgeIntoView}
                    aria-label="Date of birth"
                    className={cn(fieldInput, "pl-10", KEYBOARD_SAFE_INPUT)}
                  />
                </div>
              </ValidField>
              <label className="flex items-start gap-2.5 rounded-2xl bg-paper p-3 ring-1 ring-line cursor-pointer">
                <input
                  type="checkbox"
                  checked={adultConsent}
                  onChange={(e) => setAdultConsent(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded text-accent focus:ring-brand accent-[#1805db]"
                  aria-required
                />
                <span className="text-xs leading-relaxed text-ink">
                  <span className="font-bold">I confirm I am 18 years of age or older</span>
                  <span className="block text-[11px] text-mute mt-0.5">
                    Required · AirPal is for adults. Meeting people in person needs an Adult 18+ confirmation.
                  </span>
                </span>
              </label>
              <Button
                type="submit"
                className="w-full min-h-[48px] text-sm font-bold shadow-xs cursor-pointer"
                disabled={busy || !nameOk || !emailOk || !passOk || !adultOk || !consentOk}
                loading={busy}
              >
                {busy ? "Creating account…" : "Create account"}
              </Button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
