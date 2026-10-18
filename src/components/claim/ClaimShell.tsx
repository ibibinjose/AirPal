import type { ReactNode } from "react";
import { Link } from "wouter";
import { ArrowLeft, Building2, Check, Compass, ShieldCheck, Sparkles } from "lucide-react";
import { BrandMark } from "@/components/brand/BrandMark";
import { cn } from "@/lib/cn";

/**
 * Evolved-brand shell for the venue claim flow: a solid ink masthead with the
 * brand mark, a plain-language title, and an honest step indicator — then a
 * quiet paper body. No gradients, no glass stacks, no decoration that does
 * not orient the claimant.
 */
export function ClaimShell({
  eyebrow,
  title,
  lede,
  steps,
  activeStep,
  backTo,
  backLabel,
  children,
}: {
  eyebrow: string;
  title: string;
  lede: string;
  steps?: string[];
  activeStep?: number;
  backTo?: string;
  backLabel?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-[100dvh] bg-paper">
      <header className="bg-ink text-white">
        <div className="mx-auto w-full max-w-2xl px-4 pb-6 pt-[max(1.25rem,env(safe-area-inset-top,0px))] sm:px-5 sm:pb-7">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {backTo ? (
              <Link
                href={backTo}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-white/10 px-3.5 text-sm font-semibold text-white/90 transition hover:bg-white/15 hover:text-white"
              >
                <ArrowLeft size={15} aria-hidden />
                <span>{backLabel || "Back"}</span>
              </Link>
            ) : null}
            <nav aria-label="Claim shortcuts" className="flex flex-wrap items-center gap-1.5">
              <Link
                href="/business/onboard"
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-white/10 px-3 text-sm font-semibold text-white/85 transition hover:bg-white/15 hover:text-white"
              >
                <Sparkles size={14} aria-hidden />
                <span>Onboarding</span>
              </Link>
              <Link
                href="/business"
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-white/10 px-3 text-sm font-semibold text-white/85 transition hover:bg-white/15 hover:text-white"
              >
                <Building2 size={14} aria-hidden />
                <span>Business Hub</span>
              </Link>
              <Link
                href="/places"
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-white/10 px-3 text-sm font-semibold text-white/85 transition hover:bg-white/15 hover:text-white"
              >
                <Compass size={14} aria-hidden />
                <span>Places</span>
              </Link>
            </nav>
          </div>

          <div className="mt-5 flex items-center gap-2.5">
            <BrandMark compact invert />
            <span className="text-xs font-semibold text-white/70">{eyebrow}</span>
          </div>
          <h1 className="font-display mt-2 text-balance text-3xl font-bold leading-tight sm:text-4xl">{title}</h1>
          <p className="mt-2 max-w-lg text-pretty text-base leading-relaxed text-white/75">{lede}</p>
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/85 ring-1 ring-white/15">
            <ShieldCheck size={13} aria-hidden /> Takes about 2 minutes · Nothing goes public until you publish
          </p>
          {steps && steps.length > 1 ? (
            <ol className="mt-5 grid grid-cols-3 gap-1.5 sm:gap-2" aria-label="Progress">
              {steps.map((step, index) => {
                const done = activeStep !== undefined && index < activeStep;
                const current = activeStep === index;
                return (
                  <li
                    key={step}
                    className={cn(
                      "flex items-center gap-2 rounded-2xl px-3 py-2.5 ring-1 transition",
                      done && "bg-leaf/20 ring-leaf/40",
                      current && "bg-white/15 ring-white/30",
                      !done && !current && "bg-white/5 ring-white/10",
                    )}
                  >
                    <span
                      className={cn(
                        "grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold",
                        done && "bg-leaf text-white",
                        current && "bg-white text-neutral-950",
                        !done && !current && "bg-white/15 text-white/70",
                      )}
                      aria-current={current ? "step" : undefined}
                    >
                      {done ? <Check size={13} strokeWidth={3} aria-hidden /> : index + 1}
                    </span>
                    <span
                      className={cn(
                        "min-w-0 text-xs font-semibold leading-tight sm:text-sm",
                        current || done ? "text-white" : "text-white/60",
                      )}
                    >
                      {step}
                    </span>
                  </li>
                );
              })}
            </ol>
          ) : null}
        </div>
        <div className="h-1 bg-brand" aria-hidden />
      </header>
      <main className="mx-auto w-full max-w-2xl px-4 py-5 pb-[max(5rem,calc(env(safe-area-inset-bottom,0px)+4rem))] sm:px-5 sm:py-7">
        {children}
        <p className="mt-6 text-center text-sm text-mute">
          Stuck?{" "}
          <Link href="/help" className="font-semibold text-accent underline-offset-2 hover:underline">
            Visit the Help Centre
          </Link>{" "}
          ·{" "}
          <Link href="/contact" className="font-semibold text-accent underline-offset-2 hover:underline">
            Contact partner support
          </Link>
        </p>
      </main>
    </div>
  );
}
