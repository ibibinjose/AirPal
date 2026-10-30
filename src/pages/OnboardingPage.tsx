import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { toast } from "sonner";
import { ArrowRight, AtSign, Cake, Check, Fingerprint, MapPin, User } from "lucide-react";
import { handleError, handleFromName, normalizeHandle } from "@shared/bio";
import { isAdultBirthDate, sydneyToday } from "@shared/validate";
import { Button } from "@/components/ui/Button";
import { ValidField, fieldInput } from "@/components/forms/ValidField";
import { useAuth } from "@/contexts/AuthContext";
import { useBio } from "@/contexts/BioContext";
import { useHandleStatus } from "@/hooks/useHandleStatus";
import { isPassApp } from "@/lib/app-flavor";
import { triggerHaptic, triggerHapticSelection } from "@/lib/native";
import { friendlyFunctionError } from "@/lib/functions";
import { cn } from "@/lib/cn";
import { PageLoading } from "@/components/ui/PageLoading";

type OnboardingStep = 1 | 2;

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

/**
 * Two steps, one job: claim who you are, then go. Step 1 collects name,
 * @handle, city (and the 18+ confirmation when the account still needs it);
 * step 2 confirms and sends you into the app.
 */
export function OnboardingPage() {
  const [, nav] = useLocation();
  const search = useSearch();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const next = params.get("next") || "";
  const initialHandleParam = params.get("handle") || "";

  const {
    user,
    authReady,
    biometricsSupported,
    biometricLabel,
    hasEnrolledBiometrics,
    enrollUserBiometrics,
    confirmAdultAccount,
  } = useAuth();
  const { mine, createProfile } = useBio();

  const [step, setStep] = useState<OnboardingStep>(1);
  const [name, setName] = useState(() => mine?.name || user?.displayName || "");
  const [handle, setHandle] = useState(() => initialHandleParam || mine?.handle || "");
  const [city, setCity] = useState(() => mine?.city || "Sydney");
  const [birthDate, setBirthDate] = useState("");
  const [adultConsent, setAdultConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [enrollingBiometrics, setEnrollingBiometrics] = useState(false);

  const handleStatus = useHandleStatus(handle, mine?.id);

  // Suggest a handle from the name or email while the field is empty.
  useEffect(() => {
    if (handle) return;
    const emailPrefix = user?.email ? normalizeHandle(user.email.split("@")[0] || "") : "";
    if (initialHandleParam) {
      setHandle(normalizeHandle(initialHandleParam));
    } else if (emailPrefix && emailPrefix.match(/\d+$/) && !handleError(emailPrefix)) {
      setHandle(emailPrefix);
    } else if (name) {
      const h = handleFromName(name);
      if (h) setHandle(h);
    } else if (emailPrefix && !handleError(emailPrefix)) {
      setHandle(emailPrefix);
    }
  }, [handle, initialHandleParam, name, user?.email]);

  useEffect(() => {
    if (!name && user?.displayName) setName(user.displayName);
  }, [name, user?.displayName]);

  const handleOk = handleStatus.ok;
  const nameOk = name.trim().length >= 2;
  const needsAdultConfirmation = !user?.adultConfirmed;
  const adultOk = !needsAdultConfirmation || isAdultBirthDate(birthDate.trim());
  const consentOk = !needsAdultConfirmation || adultConsent;
  const canSubmit = nameOk && handleOk && adultOk && consentOk;

  async function handleCreate() {
    if (!canSubmit) {
      toast.error(handleStatus.reason || "Check your name, @handle and 18+ confirmation to continue.");
      return;
    }
    setBusy(true);
    try {
      if (needsAdultConfirmation) {
        await confirmAdultAccount({ birthDate: birthDate.trim(), adultConsent });
      }
      await createProfile({
        handle: normalizeHandle(handle),
        name: name.trim(),
        city: city.trim() || "Sydney",
        shortWhy: "On AirPal",
        kind: "person",
      });
      void triggerHaptic("success");
      setStep(2);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      const errCode = (err as { code?: string })?.code || "";
      const errMsg = err instanceof Error ? err.message : String(err || "");
      const isUnauth =
        errCode === "functions/unauthenticated" || errCode === "unauthenticated" || /unauthenticated/i.test(errMsg);
      if (isUnauth) {
        toast.error("Your session has expired. Please sign in to complete your setup.");
        nav(`/start?tab=signin&next=${encodeURIComponent("/onboarding")}`);
        return;
      }
      toast.error(friendlyFunctionError(err) || (err instanceof Error ? err.message : "Could not finish setup."));
    } finally {
      setBusy(false);
    }
  }

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

  function finishAndGo() {
    void triggerHaptic("medium");
    if (next && next.startsWith("/") && !next.startsWith("/start") && !next.startsWith("/onboard")) {
      nav(next);
      return;
    }
    nav(isPassApp() ? "/pass" : "/");
  }

  if (!authReady) return <PageLoading />;

  if (!user) {
    return (
      <div className="mx-auto flex min-h-[70dvh] max-w-md flex-col items-center justify-center px-6 text-center">
        <img
          src="/logo-mark.png"
          alt="AirPal"
          className="h-20 w-20 rounded-3xl bg-white object-contain ring-1 ring-line/60"
        />
        <h1 className="font-display mt-5 text-2xl font-bold text-ink">Welcome to AirPal</h1>
        <p className="mt-2 text-sm leading-relaxed text-mute">Create your account to claim your @handle.</p>
        <div className="mt-6 w-full space-y-2">
          <Button
            className="min-h-[48px] w-full font-bold"
            onClick={() => nav(`/start?tab=signup&next=${encodeURIComponent("/onboarding")}`)}
          >
            <span>Create Free Account</span>
            <ArrowRight size={16} />
          </Button>
          <Button
            variant="ghost"
            className="min-h-[44px] w-full"
            onClick={() => nav(`/start?tab=signin&next=${encodeURIComponent("/onboarding")}`)}
          >
            <span>Already have an account? Sign In</span>
          </Button>
        </div>
      </div>
    );
  }

  const cleanHandle = normalizeHandle(handle);

  return (
    <div className="mx-auto max-w-md px-5 py-8 pb-[calc(env(safe-area-inset-bottom,0px)+6.5rem)]">
      <header className="text-center">
        <img
          src="/logo-mark.png"
          alt="AirPal"
          className="mx-auto h-14 w-14 rounded-2xl bg-white object-contain ring-1 ring-line/60"
        />
        <h1 className="font-display mt-4 text-2xl font-extrabold tracking-tight text-ink">
          {step === 1 ? "Who are you?" : "You're in"}
        </h1>
        <p className="mt-1 text-sm text-mute">
          {step === 1 ? "Pick a name and @handle. That's all." : `Welcome, ${name.trim() || "friend"}.`}
        </p>
        <div className="mt-4 flex justify-center gap-1.5" aria-label={`Step ${step} of 2`} role="img">
          {[1, 2].map((s) => (
            <span
              key={s}
              className={cn(
                "h-1.5 w-8 rounded-full transition-colors duration-300",
                s <= step ? "bg-brand" : "bg-line",
              )}
            />
          ))}
        </div>
      </header>

      {step === 1 && (
        <form
          className="mt-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void handleCreate();
          }}
        >
          <ValidField label="Your name" ok={nameOk} error={name && !nameOk ? "At least 2 characters" : null}>
            <div className="relative">
              <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mute" />
              <input
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alex Rivera"
                className={cn(fieldInput, "pl-10 text-[16px]")}
                required
              />
            </div>
          </ValidField>

          <ValidField
            label="Your @handle"
            ok={handleOk}
            error={handle && !handleStatus.checking && !handleOk ? handleStatus.reason || "Taken" : null}
            hint={
              handleStatus.checking
                ? "Checking availability…"
                : handle && handleOk
                  ? `airpal.me/@${cleanHandle} is yours`
                  : "Your link-in-bio and how friends find you."
            }
          >
            <div className="relative">
              <AtSign size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mute" />
              <input
                type="text"
                autoCapitalize="none"
                autoCorrect="off"
                autoComplete="username"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder="alex"
                className={cn(fieldInput, "pl-10 text-[16px]")}
                required
              />
            </div>
          </ValidField>

          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-ink">City</span>
            <div className="flex flex-wrap gap-1.5">
              {CITIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-pressed={city === c}
                  onClick={() => {
                    void triggerHapticSelection();
                    setCity(c);
                  }}
                  className={cn(
                    "relative min-h-[44px] cursor-pointer rounded-full px-3.5 text-xs font-semibold transition active:scale-95",
                    city === c ? "bg-brand text-white" : "bg-paper text-mute ring-1 ring-line hover:text-ink",
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {needsAdultConfirmation && (
            <div className="space-y-3">
              <ValidField
                label="Date of birth"
                ok={isAdultBirthDate(birthDate.trim())}
                error={birthDate && !isAdultBirthDate(birthDate.trim()) ? "You must be 18 or older" : null}
                hint="AirPal is for adults 18+. Your full date is not stored."
              >
                <div className="relative">
                  <Cake size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mute" />
                  <input
                    type="date"
                    value={birthDate}
                    max={sydneyToday()}
                    onChange={(e) => setBirthDate(e.target.value)}
                    aria-label="Date of birth"
                    className={cn(fieldInput, "pl-10 text-[16px]")}
                    required
                  />
                </div>
              </ValidField>
              <label className="flex min-h-[44px] cursor-pointer items-center gap-2.5 rounded-2xl bg-paper p-3 ring-1 ring-line">
                <input
                  type="checkbox"
                  checked={adultConsent}
                  onChange={(e) => setAdultConsent(e.target.checked)}
                  className="h-4 w-4 rounded accent-[#004eff]"
                  required
                />
                <span className="text-xs font-semibold text-ink">I confirm I am 18 or older</span>
              </label>
            </div>
          )}

          <Button
            type="submit"
            className="mt-2 min-h-[48px] w-full cursor-pointer text-sm font-bold"
            disabled={busy || !canSubmit}
            loading={busy}
          >
            <span>{busy ? "Setting up…" : "Continue"}</span>
            {!busy && <ArrowRight size={16} />}
          </Button>
        </form>
      )}

      {step === 2 && (
        <div className="mt-6 space-y-4 text-center">
          <div className="rounded-3xl bg-card p-6 ring-1 ring-line shadow-clay">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-500/15 text-emerald-500">
              <Check size={28} strokeWidth={3} />
            </div>
            <p className="font-display mt-4 text-xl font-bold text-ink">@{cleanHandle}</p>
            <p className="mt-1 inline-flex items-center gap-1 text-xs text-mute">
              <MapPin size={12} />
              {city}
            </p>
            <Link href={`/@${cleanHandle}`} className="mt-3 block text-xs font-semibold text-accent hover:underline">
              airpal.me/@{cleanHandle}
            </Link>
          </div>

          {biometricsSupported && !hasEnrolledBiometrics && (
            <div className="flex items-center justify-between gap-3 rounded-3xl bg-card p-4 text-left ring-1 ring-line">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand/10 text-accent">
                  <Fingerprint size={22} />
                </div>
                <div>
                  <h2 className="text-xs font-bold text-ink">Sign in with {biometricLabel}?</h2>
                  <p className="text-[11px] text-mute">No password next time.</p>
                </div>
              </div>
              <Button
                size="sm"
                variant="tonal"
                disabled={enrollingBiometrics}
                loading={enrollingBiometrics}
                onClick={handleEnrollBio}
                className="min-h-[44px] shrink-0 cursor-pointer text-xs font-semibold"
              >
                Enable
              </Button>
            </div>
          )}

          <Button className="min-h-[50px] w-full cursor-pointer text-base font-bold" onClick={finishAndGo}>
            <span>Start Exploring</span>
            <ArrowRight size={18} />
          </Button>
        </div>
      )}
    </div>
  );
}
