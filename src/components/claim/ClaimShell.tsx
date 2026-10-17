import type { ReactNode } from "react";
import { Link } from "wouter";
import { ArrowLeft, Check } from "lucide-react";
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
        <div className="mx-auto w-full max-w-2xl px-5 pb-7 pt-6 sm:pt-8">
          {backTo ? (
            <Link
              href={backTo}
              className="inline-flex min-h-[44px] items-center gap-1.5 text-sm text-white/70 transition hover:text-white"
            >
              <ArrowLeft size={16} aria-hidden />
              {backLabel || "Back"}
            </Link>
          ) : null}
          <div className="mt-2 flex items-center gap-2">
            <BrandMark compact invert />
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/60">{eyebrow}</span>
          </div>
          <h1 className="font-display mt-2 text-balance text-3xl font-bold leading-tight">{title}</h1>
          <p className="mt-2 max-w-md text-pretty text-[15px] leading-relaxed text-white/70">{lede}</p>
          {steps && steps.length > 1 ? (
            <ol className="mt-5 flex items-center gap-2" aria-label="Progress">
              {steps.map((step, index) => {
                const done = activeStep !== undefined && index < activeStep;
                const current = activeStep === index;
                return (
                  <li key={step} className="flex flex-1 items-center gap-2 last:flex-none">
                    <span
                      className={cn(
                        "grid h-7 w-7 shrink-0 place-items-center rounded-full text-[13px] font-bold",
                        done && "bg-leaf text-white",
                        current && "bg-white text-neutral-950",
                        !done && !current && "bg-white/15 text-white/70",
                      )}
                      aria-current={current ? "step" : undefined}
                    >
                      {done ? <Check size={14} strokeWidth={3} aria-hidden /> : index + 1}
                    </span>
                    <span
                      className={cn(
                        "hidden text-[13px] font-semibold sm:inline",
                        current ? "text-white" : "text-white/55",
                      )}
                    >
                      {step}
                    </span>
                    {index < steps.length - 1 ? <span className="mx-1 h-px flex-1 bg-white/15" aria-hidden /> : null}
                  </li>
                );
              })}
            </ol>
          ) : null}
        </div>
        <div className="h-1 bg-brand" aria-hidden />
      </header>
      <main className="mx-auto w-full max-w-2xl px-5 py-6 sm:py-8">{children}</main>
    </div>
  );
}
