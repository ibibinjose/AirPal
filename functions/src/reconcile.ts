import { HttpsError, onCall } from "firebase-functions/v2/https";
import type Stripe from "stripe";
import { canRetryPayout, type Booking } from "../../shared/booking";
import type { AccessClaims } from "../../shared/airpal-security";
import { db, isPlatformAdmin, requireAccount } from "./admin";
import { enforceRateLimit, noteAppCheck, writeAudit } from "./abuse";
import {
  STRIPE_CALLABLE,
  makeStripe,
  reverseTransferForDispute,
  stripeLiveConfigured,
  transferProviderShare,
} from "./stripe";

const RECONCILE_BOOKING_LIMIT = 500;
const RECONCILE_PAYMENT_LIMIT = 2000;

export type ReconcileFindingKind =
  | "stuck_held"
  | "held_waiting"
  | "missing_ledger"
  | "status_drift"
  | "ledger_orphan"
  | "stripe_refunded"
  | "refunded_after_transfer"
  | "partial_refund"
  | "stripe_disputed"
  | "stripe_missing"
  | "amount_mismatch"
  | "no_charge_id"
  | "check_failed";

export interface ReconcileFinding {
  kind: ReconcileFindingKind;
  bookingId: string;
  detail?: string;
  corrected?: boolean;
}

export interface ReconcileTotals {
  gmvCents: number;
  paymentsCount: number;
  paidBookings: number;
  paidCents: number;
  heldCents: number;
  heldCount: number;
  transferredCents: number;
  transferredCount: number;
  providerPaidCents: number;
  feesCents: number;
  refundedCount: number;
  disputedCount: number;
}

export interface ReconcileReport {
  checkedAt: string;
  stripeLive: boolean;
  truncated: boolean;
  totals: ReconcileTotals;
  findings: ReconcileFinding[];
}

/** Minimal structural views so tests never need the Stripe SDK. */
export interface StripeChargeView {
  id: string;
  amount: number;
  refunded: boolean;
  amount_refunded: number;
  disputed: boolean;
  dispute: unknown;
}

export interface StripeTransferView {
  id: string;
  amount: number;
  currency: string;
}

export type MoneyBooking = Pick<
  Booking,
  | "id"
  | "status"
  | "paymentStatus"
  | "payoutStatus"
  | "priceCents"
  | "providerUid"
  | "eventId"
  | "stripeChargeId"
  | "stripePaymentIntentId"
  | "stripeTransferId"
  | "stripeAccountId"
>;

/**
 * Firestore-side classification. Pure: no Stripe calls, no writes.
 * `ledgerExists` = a payouts doc exists for this booking's transfer id.
 */
export function firestoreFindings(b: MoneyBooking, ledgerExists: boolean): ReconcileFindingKind[] {
  const out: ReconcileFindingKind[] = [];
  if (b.paymentStatus !== "paid" || b.priceCents <= 0) return out;
  if (!b.stripeChargeId) out.push("no_charge_id");
  // A held booking that already carries a transfer id goes down the
  // verify-first drift path, never a blind re-release.
  if (canRetryPayout(b) && !b.stripeTransferId) out.push("stuck_held");
  if (b.payoutStatus === "transferred" && b.stripeTransferId && !ledgerExists) out.push("missing_ledger");
  if (ledgerExists && b.payoutStatus !== "transferred" && b.payoutStatus !== "reversed") out.push("status_drift");
  return out;
}

/**
 * Stripe-side classification against retrieved charge truth.
 * Pure: `charge` is null when Stripe has no such charge.
 */
export function stripeFindings(b: MoneyBooking, charge: StripeChargeView | null): ReconcileFindingKind[] {
  const out: ReconcileFindingKind[] = [];
  if (b.paymentStatus !== "paid" || b.priceCents <= 0 || !b.stripeChargeId) return out;
  if (!charge) {
    out.push("stripe_missing");
    return out;
  }
  if (charge.amount !== b.priceCents) out.push("amount_mismatch");
  if (charge.refunded) {
    out.push(b.stripeTransferId ? "refunded_after_transfer" : "stripe_refunded");
  } else if (charge.amount_refunded > 0) {
    out.push("partial_refund");
  }
  if ((charge.disputed || charge.dispute != null) && b.status !== "disputed") out.push("stripe_disputed");
  return out;
}

function isStripeMissing(err: unknown): boolean {
  const code = (err as { code?: string; statusCode?: number } | null)?.code;
  return code === "resource_missing";
}

async function bookingLedgerExists(transferId: string): Promise<boolean> {
  if (!transferId) return false;
  const snap = await db.collection("payouts").doc(transferId).get();
  return snap.exists;
}

async function auditCorrection(uid: string, collection: string, docId: string, kind: string): Promise<void> {
  await writeAudit({ collection, docId, action: "update", actorUid: uid, note: `reconcile:${kind}` });
}

async function applyCorrection(
  uid: string,
  stripe: Stripe | null,
  bookingRef: { update: (data: Record<string, unknown>) => Promise<unknown> },
  b: MoneyBooking,
  kind: ReconcileFindingKind,
): Promise<boolean> {
  const now = new Date().toISOString();
  if (kind === "stuck_held") {
    const full = { ...(b as Booking), id: b.id };
    const result = await transferProviderShare(full);
    if (result.payoutStatus !== "transferred") return false;
    await bookingRef.update({
      payoutStatus: "transferred",
      stripeTransferId: result.transferId,
      stripeAccountId: result.stripeAccountId,
      updatedAt: now,
    });
    await auditCorrection(uid, "bookings", b.id, kind);
    return true;
  }
  if (kind === "missing_ledger" && stripe && b.stripeTransferId) {
    let transfer: Stripe.Transfer;
    try {
      transfer = await stripe.transfers.retrieve(b.stripeTransferId);
    } catch (err) {
      if (isStripeMissing(err)) return false;
      throw err;
    }
    await db
      .collection("payouts")
      .doc(transfer.id)
      .set({
        id: transfer.id,
        bookingId: b.id,
        providerUid: b.providerUid,
        amountCents: transfer.amount,
        feeCents: Math.max(0, b.priceCents - transfer.amount),
        currency: String(transfer.currency || "aud").toLowerCase(),
        stripeAccountId: b.stripeAccountId || "",
        stripeChargeId: b.stripeChargeId || "",
        reconciledAt: now,
        createdAt: now,
      });
    await auditCorrection(uid, "payouts", transfer.id, kind);
    return true;
  }
  if (kind === "status_drift" && stripe && b.stripeTransferId) {
    try {
      await stripe.transfers.retrieve(b.stripeTransferId);
    } catch (err) {
      if (isStripeMissing(err)) return false;
      throw err;
    }
    await bookingRef.update({ payoutStatus: "transferred", updatedAt: now });
    await auditCorrection(uid, "bookings", b.id, kind);
    return true;
  }
  if (kind === "stripe_refunded") {
    // Stripe already refunded: sync Firestore state only, never issue a second refund.
    await bookingRef.update({
      paymentStatus: "refunded",
      payoutStatus: "reversed",
      status: "refunded",
      cancelReason: "Refunded (reconciled from Stripe)",
      updatedAt: now,
    });
    await auditCorrection(uid, "bookings", b.id, kind);
    return true;
  }
  if (kind === "stripe_disputed" && b.stripeChargeId) {
    await reverseTransferForDispute(b.stripeChargeId);
    await auditCorrection(uid, "bookings", b.id, kind);
    return true;
  }
  return false;
}

const AUTO_CORRECTABLE: ReadonlySet<ReconcileFindingKind> = new Set([
  "stuck_held",
  "missing_ledger",
  "status_drift",
  "stripe_refunded",
  "stripe_disputed",
]);

async function scanMoney(apply: boolean, adminUid: string): Promise<ReconcileReport> {
  const stripeLive = stripeLiveConfigured();
  const stripe = stripeLive ? makeStripe() : null;
  const findings: ReconcileFinding[] = [];
  const totals: ReconcileTotals = {
    gmvCents: 0,
    paymentsCount: 0,
    paidBookings: 0,
    paidCents: 0,
    heldCents: 0,
    heldCount: 0,
    transferredCents: 0,
    transferredCount: 0,
    providerPaidCents: 0,
    feesCents: 0,
    refundedCount: 0,
    disputedCount: 0,
  };

  // GMV from Stripe-confirmed payment sessions only (id = session id, no double count).
  const paymentsSnap = await db.collection("payments").limit(RECONCILE_PAYMENT_LIMIT).get();
  let truncated = paymentsSnap.docs.length >= RECONCILE_PAYMENT_LIMIT;
  for (const docSnap of paymentsSnap.docs) {
    const row = docSnap.data() as { amountTotal?: unknown; currency?: unknown };
    if (String(row.currency || "aud").toLowerCase() !== "aud") continue;
    const amount = Number(row.amountTotal || 0);
    if (!Number.isFinite(amount) || amount <= 0) continue;
    totals.gmvCents += Math.round(amount);
    totals.paymentsCount += 1;
  }

  // Real provider payouts from the transfer ledger.
  const payoutsSnap = await db.collection("payouts").limit(RECONCILE_PAYMENT_LIMIT).get();
  if (payoutsSnap.docs.length >= RECONCILE_PAYMENT_LIMIT) truncated = true;
  const ledgerTransferIds = new Set<string>();
  for (const docSnap of payoutsSnap.docs) {
    const row = docSnap.data() as { amountCents?: unknown; feeCents?: unknown };
    ledgerTransferIds.add(docSnap.id);
    const amount = Number(row.amountCents || 0);
    const fee = Number(row.feeCents || 0);
    if (Number.isFinite(amount) && amount > 0) totals.providerPaidCents += Math.round(amount);
    if (Number.isFinite(fee) && fee > 0) totals.feesCents += Math.round(fee);
  }

  const bookingsSnap = await db
    .collection("bookings")
    .where("paymentStatus", "==", "paid")
    .limit(RECONCILE_BOOKING_LIMIT)
    .get();
  if (bookingsSnap.docs.length >= RECONCILE_BOOKING_LIMIT) truncated = true;

  for (const docSnap of bookingsSnap.docs) {
    const data = docSnap.data() as Omit<Booking, "id">;
    const b: MoneyBooking = {
      id: docSnap.id,
      status: data.status,
      paymentStatus: data.paymentStatus,
      payoutStatus: data.payoutStatus,
      priceCents: Number(data.priceCents || 0),
      providerUid: String(data.providerUid || ""),
      eventId: data.eventId,
      stripeChargeId: data.stripeChargeId,
      stripePaymentIntentId: data.stripePaymentIntentId,
      stripeTransferId: data.stripeTransferId,
      stripeAccountId: data.stripeAccountId,
    };
    if (b.priceCents > 0) {
      totals.paidBookings += 1;
      totals.paidCents += b.priceCents;
    }
    if (b.status === "refunded") totals.refundedCount += 1;
    if (b.status === "disputed") totals.disputedCount += 1;
    if (b.payoutStatus === "held" && b.priceCents > 0) {
      totals.heldCents += b.priceCents;
      totals.heldCount += 1;
    }
    if (b.payoutStatus === "transferred" && b.priceCents > 0) {
      totals.transferredCents += b.priceCents;
      totals.transferredCount += 1;
    }

    const ledgerExists = Boolean(b.stripeTransferId) && ledgerTransferIds.has(String(b.stripeTransferId));
    // Confirm against live ledger when the id is unknown locally (bounded scan may miss it).
    const confirmedLedger =
      ledgerExists || !b.stripeTransferId ? ledgerExists : await bookingLedgerExists(b.stripeTransferId);
    const kinds = new Set<ReconcileFindingKind>(firestoreFindings(b, confirmedLedger));

    if (stripe && b.stripeChargeId) {
      try {
        const charge = (await stripe.charges.retrieve(b.stripeChargeId)) as unknown as StripeChargeView;
        for (const kind of stripeFindings(b, charge)) kinds.add(kind);
      } catch (err) {
        if (isStripeMissing(err)) {
          kinds.add("stripe_missing");
        } else {
          findings.push({
            kind: "check_failed",
            bookingId: b.id,
            detail: err instanceof Error ? err.message.slice(0, 200) : "stripe_error",
          });
          continue;
        }
      }
    }

    // A transferred booking whose transfer id exists nowhere (not in the
    // ledger and not on Stripe) is suspect data, never an auto-fix.
    if (kinds.has("missing_ledger") && stripe && b.stripeTransferId) {
      try {
        await stripe.transfers.retrieve(b.stripeTransferId);
      } catch (err) {
        if (isStripeMissing(err)) {
          kinds.delete("missing_ledger");
          kinds.add("ledger_orphan");
        } else {
          throw err;
        }
      }
    }

    for (const kind of kinds) {
      let corrected = false;
      if (apply && AUTO_CORRECTABLE.has(kind)) {
        try {
          corrected = await applyCorrection(adminUid, stripe, docSnap.ref, b, kind);
        } catch (err) {
          findings.push({
            kind: "check_failed",
            bookingId: b.id,
            detail: `correct:${kind}:${err instanceof Error ? err.message.slice(0, 160) : "error"}`,
          });
          continue;
        }
        if (kind === "stuck_held" && !corrected) {
          findings.push({ kind: "held_waiting", bookingId: b.id });
          continue;
        }
      }
      findings.push({ kind, bookingId: b.id, corrected: corrected || undefined });
    }
  }

  return { checkedAt: new Date().toISOString(), stripeLive, truncated, totals, findings };
}

async function requireAdminUid(
  request: Parameters<typeof requireAccount>[0] & { auth?: { token?: unknown } },
): Promise<string> {
  const adminUid = requireAccount(request, "Sign in to reconcile payouts.");
  if (!isPlatformAdmin(request.auth?.token as AccessClaims | undefined)) {
    throw new HttpsError("permission-denied", "Admins only.");
  }
  await enforceRateLimit(adminUid, "pay", false);
  return adminUid;
}

/** Admin-only, read-only: payout health + GMV totals. Never writes. */
export const payoutReconciliationReport = onCall(STRIPE_CALLABLE, async (request) => {
  await noteAppCheck(request, "payoutReconciliationReport");
  await requireAdminUid(request);
  return scanMoney(false, "");
});

/** Admin-only: report plus safe auto-corrections (idempotent, audited). */
export const reconcilePayouts = onCall(STRIPE_CALLABLE, async (request) => {
  await noteAppCheck(request, "reconcilePayouts");
  const adminUid = await requireAdminUid(request);
  return scanMoney(true, adminUid);
});
