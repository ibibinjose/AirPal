import { History } from "lucide-react";
import { rewardReasonLabel, type RewardTransaction } from "@/lib/rewards";

interface Props {
  rows: RewardTransaction[];
  loading: boolean;
  signedIn: boolean;
}

export function RewardsHistory({ rows, loading, signedIn }: Props) {
  if (!signedIn) return null;
  return (
    <section aria-label="Points history" className="neu-section p-5 sm:p-6 space-y-3">
      <h2 className="font-display text-lg font-bold text-ink">History</h2>
      {loading ? (
        <div className="space-y-2" aria-label="Loading history">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-11 animate-pulse rounded-xl bg-paper" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="neu-card flex items-center gap-3 p-4">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand/10 text-accent">
            <History size={17} aria-hidden="true" />
          </span>
          <p className="text-xs text-mute leading-relaxed">
            No points movement yet. Bring a mate or redeem an offer to get started.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li key={row.id} className="neu-card flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-ink">{rewardReasonLabel(row.reason)}</p>
                {row.at && (
                  <p className="text-[11px] text-mute">
                    {new Date(row.at).toLocaleDateString(undefined, {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                )}
              </div>
              <span
                className={
                  row.delta >= 0
                    ? "shrink-0 text-sm font-black text-emerald-600 dark:text-emerald-400 tabular-nums"
                    : "shrink-0 text-sm font-black text-ink tabular-nums"
                }
              >
                {row.delta >= 0 ? `+${row.delta}` : row.delta}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
