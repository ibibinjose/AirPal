import { Link } from "wouter";
import { Trophy } from "lucide-react";

interface Props {
  points: number;
  redeemedCount: number;
  referralCount: number;
  loading: boolean;
  signedIn: boolean;
}

export function RewardsBalance({ points, redeemedCount, referralCount, loading, signedIn }: Props) {
  return (
    <div className="neu-section p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
            <Trophy size={22} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-mute">AirPal Rewards balance</p>
            {loading ? (
              <div className="mt-1 h-8 w-24 animate-pulse rounded-lg bg-paper" aria-label="Loading balance" />
            ) : (
              <p className="font-display text-3xl font-black text-ink tabular-nums" aria-live="polite">
                {signedIn ? points.toLocaleString() : "–"}
              </p>
            )}
            <p className="text-xs text-mute font-medium">points</p>
          </div>
        </div>
        {!signedIn && (
          <Link
            href="/start"
            className="inline-flex min-h-[44px] items-center rounded-full bg-brand px-5 text-xs font-bold text-white shadow-xs transition hover:bg-brand-ink active:scale-95"
          >
            Sign in to earn
          </Link>
        )}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <div className="neu-card p-3.5 text-center">
          <p className="font-display text-xl font-black text-ink tabular-nums">
            {loading ? "…" : redeemedCount.toLocaleString()}
          </p>
          <p className="text-[11px] text-mute font-semibold">rewards redeemed</p>
        </div>
        <div className="neu-card p-3.5 text-center">
          <p className="font-display text-xl font-black text-ink tabular-nums">
            {loading ? "…" : referralCount.toLocaleString()}
          </p>
          <p className="text-[11px] text-mute font-semibold">mates joined</p>
        </div>
      </div>
    </div>
  );
}
