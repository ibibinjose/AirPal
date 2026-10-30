import { collection, doc, getDocs, limit, onSnapshot, query, where, type Unsubscribe } from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDb } from "./firebase";

export interface RewardBalance {
  points: number;
  updatedAt?: string;
}

export interface RewardTransaction {
  id: string;
  delta: number;
  reason: string;
  refId?: string;
  at?: string;
}

function toBalance(data: Record<string, unknown>): RewardBalance {
  const points = Math.max(0, Math.floor(Number(data.points || 0)));
  return {
    points,
    updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : undefined,
  };
}

function toTransaction(id: string, data: Record<string, unknown>): RewardTransaction {
  return {
    id,
    delta: Math.trunc(Number(data.delta || 0)),
    reason: typeof data.reason === "string" ? data.reason : "reward",
    refId: typeof data.refId === "string" ? data.refId : undefined,
    at: typeof data.at === "string" ? data.at : undefined,
  };
}

/** Newest-first by ISO timestamp. Rows without a timestamp sort last. */
export function sortTransactionsNewestFirst(rows: RewardTransaction[]): RewardTransaction[] {
  return rows.slice().sort((a, b) => (b.at || "").localeCompare(a.at || ""));
}

/** Human label for a ledger reason code. Unknown codes fall through unchanged. */
export function rewardReasonLabel(reason: string): string {
  const labels: Record<string, string> = {
    referral_bonus: "Mate joined with your link",
    points_redeemed: "Reward redeemed",
    member_offer_redeem: "Member offer redeemed",
    event_check_in: "Checked in at the door",
    deal_redeemed: "Deal redeemed in-store",
    giveaway_entry: "Giveaway entry",
    review_bonus: "Review bonus",
    event_bonus: "Event attendance bonus",
  };
  return labels[reason] || reason;
}

/** Live points balance for the signed-in member. No-op when signed out. */
export function subscribeRewardBalance(onValue: (balance: RewardBalance) => void): Unsubscribe {
  const auth = getFirebaseAuth();
  const db = getFirebaseDb();
  const uid = auth?.currentUser?.uid;
  if (!db || !uid) {
    onValue({ points: 0 });
    return () => undefined;
  }
  return onSnapshot(
    doc(db, "rewards", uid),
    (snap) => {
      if (!snap.exists()) {
        onValue({ points: 0 });
        return;
      }
      onValue(toBalance((snap.data() || {}) as Record<string, unknown>));
    },
    () => onValue({ points: 0 }),
  );
}

/**
 * Recent ledger rows for the signed-in member, newest first. Sorted
 * client-side so no composite index is needed.
 */
export async function fetchRewardHistory(maxRows = 20): Promise<RewardTransaction[]> {
  const auth = getFirebaseAuth();
  const db = getFirebaseDb();
  const uid = auth?.currentUser?.uid;
  if (!db || !uid) return [];
  const snap = await getDocs(
    query(collection(db, "reward_transactions"), where("uid", "==", uid), limit(Math.max(1, maxRows * 2))),
  );
  const rows = snap.docs.map((d) => toTransaction(d.id, (d.data() || {}) as Record<string, unknown>));
  return sortTransactionsNewestFirst(rows).slice(0, maxRows);
}
