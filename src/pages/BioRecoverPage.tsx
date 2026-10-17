import { Link } from "wouter";
import { ArrowRight, AtSign, ShieldCheck } from "lucide-react";

/**
 * Handle recovery — reclaim a bio handle you lost access to.
 * Verification runs through the account that owns the handle; this page
 * explains the path and routes to support. No handle is released here.
 */
export function BioRecoverPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-6 sm:px-6">
      <p className="human-eyebrow">Bio · Recovery</p>
      <h1 className="human-title mt-2 text-2xl sm:text-3xl">Lost your @handle?</h1>
      <p className="human-lede mt-2 text-sm sm:text-base">
        Handles belong to the account that claimed them. Sign in with that account and your bio is waiting — if you
        can&apos;t get in, we&apos;ll help you prove it&apos;s yours.
      </p>

      <div className="human-card mt-6 p-5">
        <div className="flex items-center gap-3">
          <span
            className="grid h-11 w-11 place-items-center rounded-2xl bg-primary-container text-on-primary-container"
            aria-hidden="true"
          >
            <AtSign size={22} />
          </span>
          <h2 className="human-section-title text-base">Recover in two steps</h2>
        </div>
        <ol className="mt-4 space-y-3 text-sm">
          <li className="flex gap-3">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-paper text-xs font-bold ring-1 ring-line">
              1
            </span>
            <span>
              <strong>Sign in</strong> with the email, phone, or social account you used to claim the handle.{" "}
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
              Still locked out? <strong>Contact support</strong> from that same email address so we can verify
              ownership.{" "}
              <Link href="/contact" className="font-semibold text-accent hover:underline">
                Contact us
              </Link>
            </span>
          </li>
        </ol>
        <p className="mt-4 flex items-start gap-1.5 text-xs text-mute">
          <ShieldCheck size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>
            We never transfer a handle without verifying the original account — that proof protects your identity as
            much as anyone else&apos;s.
          </span>
        </p>
        <div className="mt-4">
          <Link
            href="/bio/setup"
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-brand px-5 text-sm font-semibold text-white transition hover:bg-brand-ink active:scale-95"
          >
            <span>Claim a new handle</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}
