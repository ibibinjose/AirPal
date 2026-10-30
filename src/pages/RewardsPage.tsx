import { useEffect, useState } from "react";
import { Link } from "wouter";
import { collection, getDocs, query, where } from "firebase/firestore";
import { ArrowLeft, Sparkles, Ticket } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebaseDb } from "@/lib/firebase";
import { fetchRewardHistory, subscribeRewardBalance } from "@/lib/rewards";
import type { Promotion } from "@shared/promotions";
import { RewardsBalance } from "@/components/rewards/RewardsBalance";
import { RewardsEarnList } from "@/components/rewards/RewardsEarnList";
import { RewardsCatalog } from "@/components/rewards/RewardsCatalog";
import { RewardsHistory } from "@/components/rewards/RewardsHistory";
import { RewardsBusinessCta } from "@/components/rewards/RewardsBusinessCta";
import { PageLoading } from "@/components/ui/PageLoading";

async function loadPointsPromotions(): Promise<Promotion[]> {
  const db = getFirebaseDb();
  if (!db) return [];
  try {
    const snap = await getDocs(query(collection(db, "promotions"), where("status", "in", ["live", "approved"])));
    return snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as Omit<Promotion, "id">) }))
      .filter((d) => d.kind === "promotion" && Math.floor(Number(d.pointsCost) || 0) > 0)
      .sort((a, b) => (Number(a.pointsCost) || 0) - (Number(b.pointsCost) || 0));
  } catch {
    return [];
  }
}

export function RewardsPage() {
  const { user, authReady } = useAuth();
  const [points, setPoints] = useState(0);
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [history, setHistory] = useState<Awaited<ReturnType<typeof fetchRewardHistory>>>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [catalog, setCatalog] = useState<Promotion[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);

  useEffect(() => {
    if (!authReady) return;
    setBalanceLoading(true);
    const unsub = subscribeRewardBalance((b) => {
      setPoints(b.points);
      setBalanceLoading(false);
    });
    return unsub;
  }, [authReady, user?.uid]);

  useEffect(() => {
    if (!authReady) return;
    let alive = true;
    setHistoryLoading(true);
    void fetchRewardHistory(20)
      .then((rows) => {
        if (alive) setHistory(rows);
      })
      .finally(() => {
        if (alive) setHistoryLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [authReady, user?.uid]);

  useEffect(() => {
    let alive = true;
    setCatalogLoading(true);
    void loadPointsPromotions()
      .then((rows) => {
        if (alive) setCatalog(rows);
      })
      .finally(() => {
        if (alive) setCatalogLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (!authReady) {
    return <PageLoading message="Loading rewards…" />;
  }

  const redeemedCount = history.filter((r) => r.delta < 0).length;
  const referralCount = history.filter((r) => r.reason === "referral_bonus").length;

  return (
    <div data-theme="light" className="relative isolate overflow-hidden min-h-[85vh] bg-paper">
      <div className="relative mx-auto max-w-4xl px-4 py-6 md:py-8 pb-32">
        <div className="flex flex-wrap items-center gap-2 mb-5">
          <Link
            href="/pass"
            className="neu-btn inline-flex min-h-[44px] items-center gap-1.5 px-3.5 text-xs font-semibold text-mute hover:text-ink transition whitespace-nowrap"
          >
            <ArrowLeft size={13} className="shrink-0" />
            <span>AirPal Pass</span>
          </Link>
          <Link
            href="/deals"
            className="neu-btn inline-flex min-h-[44px] items-center gap-1.5 px-3.5 text-xs font-semibold text-mute hover:text-ink transition whitespace-nowrap"
          >
            <Ticket size={13} className="shrink-0 text-amber-500" />
            <span>Member Deals</span>
          </Link>
        </div>

        <div className="mb-5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-accent">
            <Sparkles size={12} aria-hidden="true" />
            <span>AirPal Rewards</span>
          </span>
          <h1 className="human-title mt-2 text-3xl md:text-4xl text-balance">Points, perks, payoffs</h1>
          <p className="human-lede mt-2 text-sm sm:text-base max-w-xl">
            Earn points for bringing mates, getting scanned in, and redeeming in-store. Spend them on member offers.
          </p>
        </div>

        <div className="space-y-4">
          <RewardsBalance
            points={points}
            redeemedCount={redeemedCount}
            referralCount={referralCount}
            loading={balanceLoading || historyLoading}
            signedIn={Boolean(user)}
          />
          <RewardsEarnList />
          <RewardsCatalog items={catalog} balance={points} loading={catalogLoading} signedIn={Boolean(user)} />
          <RewardsHistory rows={history} loading={historyLoading} signedIn={Boolean(user)} />
          <RewardsBusinessCta />
        </div>
      </div>
    </div>
  );
}
