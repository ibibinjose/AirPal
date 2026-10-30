import { Link } from "wouter";
import { Gift } from "lucide-react";
import type { Promotion } from "@shared/promotions";
import { Photo } from "@/components/ui/Photo";

interface Props {
  items: Promotion[];
  balance: number;
  loading: boolean;
  signedIn: boolean;
}

export function RewardsCatalog({ items, balance, loading, signedIn }: Props) {
  return (
    <section aria-label="Spend points" className="neu-section p-5 sm:p-6 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-lg font-bold text-ink">Spend points</h2>
        <Link
          href="/deals"
          className="text-xs font-bold text-accent hover:underline min-h-[44px] inline-flex items-center"
        >
          All deals
        </Link>
      </div>
      {loading ? (
        <div className="space-y-2" aria-label="Loading rewards">
          {[0, 1].map((i) => (
            <div key={i} className="neu-card p-4 flex items-center gap-3">
              <div className="h-12 w-12 shrink-0 animate-pulse rounded-xl bg-paper" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-2/3 animate-pulse rounded bg-paper" />
                <div className="h-3 w-1/3 animate-pulse rounded bg-paper" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="neu-card p-5 text-center">
          <span className="mx-auto grid h-11 w-11 place-items-center rounded-2xl bg-brand/10 text-accent">
            <Gift size={20} aria-hidden="true" />
          </span>
          <p className="mt-2 text-sm font-bold text-ink">No points-priced offers right now</p>
          <p className="mt-0.5 text-xs text-mute">Merchants add them all the time — check back soon.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((promo) => {
            const cost = Math.max(0, Math.floor(Number(promo.pointsCost) || 0));
            const affordable = signedIn && balance >= cost;
            return (
              <li key={promo.id}>
                <Link
                  href={`/deals/${promo.id}`}
                  className="neu-card flex items-center gap-3 p-3.5 transition hover:bg-card active:scale-[0.99]"
                >
                  {promo.heroImage ? (
                    <Photo src={promo.heroImage} className="h-12 w-12 shrink-0 rounded-xl object-cover" />
                  ) : (
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand/10 text-accent">
                      <Gift size={20} aria-hidden="true" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-ink">{promo.title}</p>
                    <p className="truncate text-xs text-mute">{promo.sponsorName || promo.locationText}</p>
                  </div>
                  <span
                    className={
                      affordable
                        ? "shrink-0 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300"
                        : "shrink-0 rounded-full bg-paper px-2.5 py-1 text-[11px] font-bold text-mute"
                    }
                  >
                    {cost.toLocaleString()} pts
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
