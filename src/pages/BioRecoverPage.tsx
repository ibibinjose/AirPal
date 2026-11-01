import { Link } from "wouter";
import { ArrowLeft, ArrowRight, AtSign, Mail, ShieldCheck } from "lucide-react";

/**
 * Handle recovery — reclaim a bio handle you lost access to.
 * Verification runs through the account that owns the handle; this page
 * explains the path and routes to support. No handle is released here.
 */
export function BioRecoverPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-6 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <Link
          href="/settings"
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-card px-4 text-xs font-bold text-ink ring-1 ring-line transition hover:bg-paper active:scale-95"
        >
          <ArrowLeft size={15} />
          <span>Settings</span>
        </Link>
        <Link
          href="/contact"
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-card px-4 text-xs font-semibold text-ink ring-1 ring-line transition hover:bg-paper"
        >
          <Mail size={14} className="text-accent" />
          <span>Contact Support</span>
        </Link>
      </div>

      <p className="human-eyebrow">Bio · Recovery</p>
      <h1 className="human-title mt-2 text-2xl sm:text-3xl">Lost your @handle?</h1>
      <p className="human-lede mt-2 text-sm sm:text-base">
        Handles belong to the account that claimed them. Sign in with that account and your bio is waiting — if you
        can&apos;t get in, we&apos;ll help you prove it&apos;s yours.
      </p>

      <div className="rounded-3xl bg-card mt-6 p-5 sm:p-6 ring-1 ring-line shadow-clay">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand/10 text-accent" aria-hidden="true">
            <AtSign size={22} />
          </span>
          <h2 className="font-display font-bold text-base sm:text-lg text-ink">Recover in two steps</h2>
        </div>
        <ol className="mt-4 space-y-3.5 text-sm">
          <li className="flex gap-3">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-paper text-xs font-bold ring-1 ring-line">
              1
            </span>
            <span>
              <strong>Sign in</strong> with the email or social account you used to claim the handle.{" "}
              <Link href="/start" className="font-semibold text-accent hover:underline">
                Go to sign-in
              </Link>
            </span>
          </li>
          <li className="flex gap-3">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-paper text-xs font-bold ring-1 ring-line">
              2
            </span>
            <span>
              Still locked out, or claiming a registered business / trade mark handle? <strong>Contact support</strong>{" "}
              from your official domain or registered email address so we can verify ownership.{" "}
              <Link href="/contact" className="font-semibold text-accent hover:underline">
                Contact us
              </Link>
            </span>
          </li>
        </ol>
        <p className="mt-5 flex items-start gap-2 rounded-2xl bg-paper p-3.5 text-xs text-mute ring-1 ring-line">
          <ShieldCheck size={15} className="mt-0.5 shrink-0 text-accent" aria-hidden="true" />
          <span>
            We never transfer a handle without verifying the original account or official business/trade mark
            registration — that proof protects your identity as much as anyone else&apos;s.
          </span>
        </p>
        <div className="mt-5 flex flex-wrap gap-2.5">
          <Link
            href="/bio/setup"
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-brand px-5 text-xs font-bold text-white transition hover:bg-brand-ink active:scale-95"
          >
            <span>Claim a new handle</span>
            <ArrowRight size={14} />
          </Link>
          <Link
            href="/contact"
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-paper px-5 text-xs font-bold text-ink ring-1 ring-line transition hover:bg-card active:scale-95"
          >
            <span>Submit recovery request</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
