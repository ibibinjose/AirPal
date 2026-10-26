import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { ArrowRight, Compass, Mail } from "lucide-react";
import { BRAND_TAGLINE, ECOSYSTEM } from "@/lib/brand";
import { isPassApp } from "@/lib/app-flavor";
import { useAuth } from "@/contexts/AuthContext";
import { SocialAuthButtons } from "@/components/auth/SocialAuthButtons";
import { Button } from "@/components/ui/Button";
import { BrandLoader } from "@/components/ui/BrandLoader";
import { triggerHaptic } from "@/lib/native";

export interface NativeOpenScreenProps {
  defaultFlavor?: "pass" | "me";
  onExplore?: () => void;
}

/**
 * First screen a signed-out native user sees. Deliberately small: logo, one
 * promise, one primary action. The shell (AirPal vs AirPal Pass) decides the
 * copy; there is no in-screen switcher, carousel or demo data.
 */
export function NativeOpenScreen({ defaultFlavor, onExplore }: NativeOpenScreenProps = {}) {
  const { loginWithSocial, authReady } = useAuth();
  const [, nav] = useLocation();
  const [busy, setBusy] = useState(false);

  const isPass = (defaultFlavor || (isPassApp() ? "pass" : "me")) === "pass";
  const product = isPass ? ECOSYSTEM.pass : ECOSYSTEM.me;

  return (
    <div
      data-testid="native-open-screen"
      className="relative flex min-h-[100dvh] flex-col bg-paper px-6 pt-[env(safe-area-inset-top,0px)] pb-[max(1.25rem,env(safe-area-inset-bottom,0px))]"
    >
      <main className="flex flex-1 flex-col items-center justify-center text-center">
        <img
          src="/logo-mark.png"
          alt="AirPal"
          draggable={false}
          className="h-24 w-24 select-none rounded-[28px] bg-white object-contain shadow-clay ring-1 ring-line/60"
        />
        <h1 className="font-display mt-6 text-4xl font-extrabold tracking-tight text-ink">
          AirPal
          {isPass ? <span className="text-accent"> Pass</span> : <span className="text-accent">.me</span>}
        </h1>
        <p className="mt-2 text-xs font-semibold uppercase tracking-widest text-accent">{BRAND_TAGLINE}</p>
        <p className="mt-5 max-w-[19rem] text-center text-[15px] leading-relaxed text-mute">
          {"coreJobLines" in product ? (
            <>
              <span className="block">{product.coreJobLines[0]}</span>
              <span className="block">{product.coreJobLines[1]}</span>
            </>
          ) : (
            product.coreJob
          )}
        </p>
      </main>

      <footer className="mx-auto w-full max-w-sm space-y-2">
        {!authReady ? (
          <BrandLoader size="sm" label="Opening AirPal" className="py-6" />
        ) : (
          <>
            <Button
              variant="primary"
              size="lg"
              className="h-12 min-h-[48px] w-full text-[15px] font-bold shadow-clay active:scale-[0.98]"
              disabled={busy}
              onClick={() => {
                void triggerHaptic("medium");
                nav("/start?tab=signup");
              }}
            >
              <span>Create Free Account</span>
              <ArrowRight size={16} />
            </Button>

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

            <Button
              variant="ghost"
              className="h-11 min-h-[44px] w-full text-sm font-semibold active:scale-[0.98]"
              disabled={busy}
              onClick={() => {
                void triggerHaptic("light");
                nav("/start?tab=signin");
              }}
            >
              <Mail size={15} />
              <span>Sign In with Email</span>
            </Button>

            <div className="flex justify-center">
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  void triggerHaptic("light");
                  if (onExplore) onExplore();
                  else nav(isPass ? "/pass" : "/");
                }}
                className="inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 text-xs font-semibold text-mute transition hover:text-ink"
              >
                <Compass size={13} />
                <span>Explore as Guest</span>
              </button>
            </div>
          </>
        )}

        <p className="pt-1 text-center text-[10px] leading-relaxed text-mute">
          By continuing you agree to AirPal{" "}
          <button
            type="button"
            className="relative font-semibold text-ink underline after:absolute after:-inset-4 after:content-['']"
            onClick={() => nav("/terms")}
          >
            Terms
          </button>{" "}
          and{" "}
          <button
            type="button"
            className="relative font-semibold text-ink underline after:absolute after:-inset-4 after:content-['']"
            onClick={() => nav("/privacy")}
          >
            Privacy
          </button>
          . Accounts are for people 18+.
        </p>
      </footer>
    </div>
  );
}
