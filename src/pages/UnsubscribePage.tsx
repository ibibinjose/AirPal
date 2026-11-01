import { useState } from "react";
import { Link, useSearch } from "wouter";
import { ArrowLeft, CheckCircle2, MailX } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { ensureAnonymousSession } from "@/lib/firebase";
import { unsubscribeGuestlistRemote } from "@/lib/functions";

function emailFromSearch(search: string): string {
  try {
    return new URLSearchParams(search.startsWith("?") ? search.slice(1) : search).get("email") || "";
  } catch {
    return "";
  }
}

/**
 * One-click unsubscribe for the AirPal Guestlist. No account needed:
 * an anonymous session carries the rate-limited callable, which answers
 * OK even for unknown addresses so the endpoint never oracles membership.
 */
export function UnsubscribePage() {
  const search = useSearch();
  const [email, setEmail] = useState(() => emailFromSearch(search));
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || done) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      toast.error("Add a valid email address.");
      return;
    }
    setBusy(true);
    try {
      await ensureAnonymousSession();
      await unsubscribeGuestlistRemote({ email: email.trim() });
      setDone(true);
    } catch {
      toast.error("Couldn't unsubscribe right now. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10 pb-24">
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/settings"
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-card px-4 text-xs font-bold text-ink ring-1 ring-line transition hover:bg-paper active:scale-95"
        >
          <ArrowLeft size={15} />
          <span>Settings</span>
        </Link>
      </div>

      <div className="rounded-3xl bg-card p-6 sm:p-8 text-center ring-1 ring-line shadow-clay">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand/10 text-accent">
          {done ? <CheckCircle2 size={28} aria-hidden /> : <MailX size={28} aria-hidden />}
        </div>
        <h1 className="human-title mt-4 text-2xl sm:text-3xl text-balance">Unsubscribe</h1>
        {done ? (
          <>
            <p className="mt-2 text-sm sm:text-[15px] leading-relaxed text-ink/80">
              You&apos;re off the AirPal Guestlist — no more event invites to <strong>{email.trim()}</strong>. Changed
              your mind? Rejoin from any bio anytime.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
              <Link
                href="/"
                className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-brand px-6 text-sm font-bold text-white transition hover:bg-brand-ink active:scale-95"
              >
                Back to AirPal.Me
              </Link>
              <Link
                href="/settings"
                className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-paper px-5 text-sm font-semibold text-ink ring-1 ring-line transition hover:bg-card active:scale-95"
              >
                Settings
              </Link>
            </div>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm leading-6 text-mute">
              Leave the AirPal Guestlist and we&apos;ll stop emailing event invites to this address.
            </p>
            <form onSubmit={onSubmit} className="mt-6 space-y-3.5 text-left">
              <div>
                <label
                  htmlFor="unsub-email"
                  className="block text-xs font-bold uppercase tracking-wider text-mute mb-1"
                >
                  Email address
                </label>
                <input
                  id="unsub-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="h-11 min-h-[44px] w-full rounded-2xl bg-paper px-3.5 text-[16px] sm:text-sm font-medium text-ink ring-1 ring-line outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
              <Button type="submit" size="lg" disabled={busy} className="min-h-[48px] w-full rounded-full font-bold">
                {busy ? "Working…" : "Unsubscribe me"}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
