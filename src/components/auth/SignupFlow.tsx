import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { AlertCircle, ArrowRight, AtSign, Cake, Check, Eye, EyeOff, Lock, Mail, User } from "lucide-react";
import { authErrorMessage } from "@shared/auth-email";
import { handleError, handleFromName, normalizeHandle } from "@shared/bio";
import { PASSWORD_RULES, isAdultBirthDate, isEmail, passwordIssues, passwordOk, sydneyToday } from "@shared/validate";
import { Button } from "@/components/ui/Button";
import { ValidField, fieldInput } from "@/components/forms/ValidField";
import { useAuth } from "@/contexts/AuthContext";
import { useBio } from "@/contexts/BioContext";
import { useHandleStatus } from "@/hooks/useHandleStatus";
import { ensureElementInView } from "@/lib/keyboard";
import { triggerHaptic } from "@/lib/native";
import { cn } from "@/lib/cn";

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
  onProgress,
  initialEmail = "",
  initialHandle = "",
  onSwitchToSignIn,
}: {
  onDone: () => void;
  onProgress?: (inProgress: boolean) => void;
  initialEmail?: string;
  initialHandle?: string;
  onSwitchToSignIn?: (email?: string) => void;
}) {
  const { register, confirmAdultAccount } = useAuth();
  const { createProfile, mine } = useBio();

  // Shared Form Fields
  const [name, setName] = useState(mine?.name || "");
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [handle, setHandle] = useState(initialHandle || mine?.handle || "");
  const [handleCustomized, setHandleCustomized] = useState(Boolean(initialHandle));
  const [adultConsent, setAdultConsent] = useState(false);
  const [birthDate, setBirthDate] = useState("");
  const [emailAccountCreated, setEmailAccountCreated] = useState(false);

  // UI state
  const [busy, setBusy] = useState(false);
  const [inlineError, setInlineError] = useState<{ message: string; code?: string } | null>(null);

  const handleStatus = useHandleStatus(handle, mine?.id);

  // Auto-suggest handle from email (if it has digits like airpalqa2) or name if not customized
  useEffect(() => {
    if (!handleCustomized) {
      const emailPrefix = email ? normalizeHandle(email.split("@")[0] || "") : "";
      if (emailPrefix && emailPrefix.match(/\d+$/) && !handleError(emailPrefix)) {
        setHandle(emailPrefix);
      } else if (name.trim().length >= 2) {
        const suggested = handleFromName(name);
        if (suggested && suggested.length >= 3) {
          setHandle(suggested);
        }
      }
    }
  }, [name, email, handleCustomized]);

  const nameOk = name.trim().length >= 2;
  const emailOk = isEmail(email.trim());
  const passOk = passwordOk(password);
  const handleOk = handleStatus.ok;
  const consentOk = adultConsent === true;

  const adultOk = isAdultBirthDate(birthDate.trim());

  // ========================================================
  // FAST EMAIL + PASSWORD REGISTRATION
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
    if (!adultOk) {
      setInlineError({ message: "Enter a valid date of birth showing you are at least 18." });
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

    onProgress?.(true);
    setBusy(true);
    let accountCreated = emailAccountCreated;
    try {
      try {
        localStorage.setItem("airpal.last_signin_email", cleanEmail);
      } catch {
        /* storage may be restricted */
      }

      if (!emailAccountCreated) {
        await register(cleanEmail, cleanName, {
          password,
          city: "Sydney",
        });
        accountCreated = true;
        setEmailAccountCreated(true);
      }

      // Run post-registration setup tasks in parallel with safety timeouts
      // so slow network/cold-starts never trap the user on "Creating your account…".
      const withTimeout = <T,>(p: Promise<T>, ms: number) =>
        Promise.race([p, new Promise<T>((_, reject) => setTimeout(() => reject(new Error("Timeout")), ms))]);

      const postTasks: Promise<unknown>[] = [];

      postTasks.push(
        withTimeout(confirmAdultAccount({ birthDate: birthDate.trim(), adultConsent }), 5000).catch((err) => {
          console.warn("confirmAdultAccount non-blocking warning:", err);
        }),
      );

      if (cleanHandle && handleOk) {
        postTasks.push(
          withTimeout(
            createProfile({
              handle: cleanHandle,
              name: cleanName,
              city: "Sydney",
              shortWhy: "On AirPal",
              kind: "person",
            }),
            5000,
          ).catch((err) => {
            console.warn("createProfile non-blocking warning:", err);
          }),
        );
      }

      await Promise.allSettled(postTasks);

      void triggerHaptic("success");
      toast.success("Account created successfully!");
      onDone();
    } catch (err: unknown) {
      const errObj = err as { code?: string; message?: string };
      const code = errObj?.code || "";
      const message = authErrorMessage(err, "Could not create account. Please try again.");
      const msg = accountCreated
        ? `Your account was created, but setup could not be verified. ${message} Try again to finish safely.`
        : message;
      setInlineError({ message: msg, code });
      toast.error(msg);
    } finally {
      setBusy(false);
      onProgress?.(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Inline Error Alert */}
      {inlineError && (
        <div
          role="alert"
          aria-live="polite"
          className="rounded-2xl bg-red-500/10 p-3.5 text-xs text-red-600 dark:text-red-400 ring-1 ring-red-500/25"
        >
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
      {/* EMAIL SIGN-UP FORM */}
      {/* ======================================================== */}
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
              disabled={emailAccountCreated}
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
              disabled={emailAccountCreated}
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
              disabled={emailAccountCreated}
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

        <ValidField
          label="Date of birth"
          ok={adultOk}
          error={birthDate && !adultOk ? "You must be 18 or older" : null}
          hint="AirPal accounts are for adults 18 and over. Your full date is not stored."
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
              required
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
          disabled={
            busy ||
            !nameOk ||
            !emailOk ||
            !passOk ||
            !adultOk ||
            !consentOk ||
            Boolean(handle && (!handleOk || handleStatus.checking))
          }
          loading={busy}
        >
          {busy ? "Creating your account…" : emailAccountCreated ? "Finish account setup" : "Create Free Account"}
        </Button>
      </form>
    </div>
  );
}
