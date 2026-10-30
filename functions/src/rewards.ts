import { FieldValue } from "firebase-admin/firestore";
import { db } from "./admin";

function cleanPart(value: string): string {
  return (
    value
      .trim()
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .substring(0, 120) || "x"
  );
}

/**
 * Ledger grant. Points are earned, never bought; deltas may be negative for
 * redemptions (spend flows manage their own transactions and don't use this).
 *
 * Idempotent per (uid, reason, refId): a `reward_grants` guard row is written
 * in the same transaction as the balance update, so retried or double-tapped
 * earns replay instead of double-minting. The human-readable
 * `reward_transactions` log is appended after the transaction commits.
 */
export async function grantPoints(
  uid: string,
  delta: number,
  reason: string,
  refId: string,
): Promise<{ duplicate: boolean }> {
  if (!uid || !delta) return { duplicate: false };
  const key = `${cleanPart(uid)}__${cleanPart(reason)}__${cleanPart(refId)}`;
  const rewardRef = db.collection("rewards").doc(uid);
  const guardRef = db.collection("reward_grants").doc(key);
  const fresh = await db.runTransaction(async (tx) => {
    const [snap, guard] = await Promise.all([tx.get(rewardRef), tx.get(guardRef)]);
    if (guard.exists) return false;
    const current = snap.exists ? Number(snap.data()?.points || 0) : 0;
    tx.set(rewardRef, { uid, points: current + delta, updatedAt: new Date().toISOString() }, { merge: true });
    tx.set(guardRef, { uid, reason, refId, at: new Date().toISOString() });
    return true;
  });
  if (!fresh) return { duplicate: true };
  await db.collection("reward_transactions").add({
    uid,
    delta,
    reason,
    refId,
    at: new Date().toISOString(),
    createdAt: FieldValue.serverTimestamp(),
  });
  return { duplicate: false };
}
