import { FieldValue, type Transaction } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import {
  couponPrice,
  normalizeCouponCode,
  validateCouponDraft,
  type UpsertEventCouponRequest,
  type ValidateEventCouponRequest,
  type ValidateEventCouponResponse,
} from "../../shared/event";
import { isListManager, type GuestScope } from "../../shared/guestlist";
import { scopeHostUids } from "./guestlist";
import { enforceRateLimit, isAnonymousAuth, noteAppCheck, writeAudit } from "./abuse";
import { CALLABLE, db, isPlatformAdmin, requireAccount } from "./admin";

/**
 * Per-event coupons, Luma-style — but server-validated, never client math.
 * Codes live at `events/{eventId}/coupons/{CODE}` (rules deny direct reads;
 * guests validate through the callable). Redemptions increment inside the
 * checkout transaction so caps can't be double-spent.
 */

function couponRef(eventId: string, code: string) {
  return db.collection("events").doc(eventId).collection("coupons").doc(code);
}

async function requireEventHost(eventId: string, uid: string, claims: unknown): Promise<void> {
  const hosts = await scopeHostUids("event" as GuestScope, eventId);
  if (!hosts) throw new HttpsError("not-found", "Event not found.");
  const admin = isPlatformAdmin(claims as Parameters<typeof isPlatformAdmin>[0]);
  if (!isListManager(hosts, uid) && !admin) {
    throw new HttpsError("permission-denied", "Only the event organiser can manage coupons.");
  }
}

export const upsertEventCoupon = onCall(CALLABLE, async (request) => {
  await noteAppCheck(request, "upsertEventCoupon");
  const uid = requireAccount(request);
  await enforceRateLimit(uid, "eventWrite", false);
  const data = (request.data || {}) as UpsertEventCouponRequest;
  const eventId = String(data.eventId || "").trim();
  if (!eventId) throw new HttpsError("invalid-argument", "eventId is required.");
  await requireEventHost(eventId, uid, request.auth?.token);

  const errors = validateCouponDraft({
    code: data.code,
    percentOff: data.percentOff,
    maxRedemptions: data.maxRedemptions ?? undefined,
  });
  if (errors.length) throw new HttpsError("invalid-argument", errors.join(" "));
  const code = normalizeCouponCode(data.code);
  const pct = Number(data.percentOff);
  const capRaw = data.maxRedemptions === null || data.maxRedemptions === undefined ? null : Number(data.maxRedemptions);
  const now = new Date().toISOString();
  const ref = couponRef(eventId, code);
  const existing = await ref.get();
  await ref.set(
    {
      code,
      percentOff: pct,
      active: data.active !== false,
      ...(capRaw ? { maxRedemptions: Math.floor(capRaw) } : { maxRedemptions: FieldValue.delete() }),
      redemptions: existing.exists ? Number(existing.data()?.redemptions || 0) : 0,
      createdAt: existing.exists ? existing.data()?.createdAt || now : now,
      updatedAt: now,
      updatedBy: uid,
    },
    { merge: true },
  );
  await writeAudit({ collection: `events/${eventId}/coupons`, docId: code, action: "update", actorUid: uid });
  return { ok: true as const, code };
});

export const listEventCoupons = onCall(CALLABLE, async (request) => {
  await noteAppCheck(request, "listEventCoupons");
  const uid = requireAccount(request);
  const data = (request.data || {}) as { eventId?: string };
  const eventId = String(data.eventId || "").trim();
  if (!eventId) throw new HttpsError("invalid-argument", "eventId is required.");
  await requireEventHost(eventId, uid, request.auth?.token);
  const snap = await db.collection("events").doc(eventId).collection("coupons").get();
  return {
    ok: true as const,
    coupons: snap.docs.map((d) => {
      const c = d.data() as Record<string, unknown>;
      return {
        code: String(c.code || d.id),
        percentOff: Number(c.percentOff || 0),
        active: c.active !== false,
        maxRedemptions: typeof c.maxRedemptions === "number" ? c.maxRedemptions : null,
        redemptions: Number(c.redemptions || 0),
      };
    }),
  };
});

export const validateEventCoupon = onCall(CALLABLE, async (request) => {
  await noteAppCheck(request, "validateEventCoupon");
  const uid = request.auth?.uid || "anonymous";
  await enforceRateLimit(uid, "ticket", isAnonymousAuth(request));
  const data = (request.data || {}) as ValidateEventCouponRequest;
  const eventId = String(data.eventId || "").trim();
  const code = normalizeCouponCode(data.code);
  if (!eventId || !code) throw new HttpsError("invalid-argument", "Enter a valid coupon code.");
  const snap = await couponRef(eventId, code).get();
  if (!snap.exists) throw new HttpsError("not-found", "Invalid or expired coupon code.");
  const coupon = snap.data() as {
    percentOff?: unknown;
    active?: unknown;
    maxRedemptions?: unknown;
    redemptions?: unknown;
  };
  if (coupon.active === false) throw new HttpsError("failed-precondition", "This coupon is no longer active.");
  const cap = Number(coupon.maxRedemptions || 0);
  if (cap > 0 && Number(coupon.redemptions || 0) >= cap) {
    throw new HttpsError("failed-precondition", "This coupon has reached its redemption limit.");
  }
  const pct = Number(coupon.percentOff || 0);
  if (!Number.isInteger(pct) || pct < 1 || pct > 90) {
    throw new HttpsError("failed-precondition", "Invalid or expired coupon code.");
  }
  const res: ValidateEventCouponResponse = { ok: true, code, percentOff: pct };
  return res;
});

/**
 * Server-side coupon application for checkout. Validates inside the caller's
 * transaction and increments redemptions atomically; throws on any failure
 * so checkout fails closed. Returns the discounted total.
 */
export async function applyEventCouponInTx(
  tx: Transaction,
  eventId: string,
  code: string,
  baseCents: number,
): Promise<{ code: string; percentOff: number; totalCents: number }> {
  const normalized = normalizeCouponCode(code);
  if (!normalized) throw new HttpsError("invalid-argument", "Enter a valid coupon code.");
  const ref = couponRef(eventId, normalized);
  const snap = await tx.get(ref);
  if (!snap.exists) throw new HttpsError("not-found", "Invalid or expired coupon code.");
  const coupon = snap.data() as {
    percentOff?: unknown;
    active?: unknown;
    maxRedemptions?: unknown;
    redemptions?: unknown;
  };
  if (coupon.active === false) throw new HttpsError("failed-precondition", "This coupon is no longer active.");
  const cap = Number(coupon.maxRedemptions || 0);
  const used = Number(coupon.redemptions || 0);
  if (cap > 0 && used >= cap) throw new HttpsError("failed-precondition", "This coupon has reached its limit.");
  const pct = Number(coupon.percentOff || 0);
  if (!Number.isInteger(pct) || pct < 1 || pct > 90) {
    throw new HttpsError("failed-precondition", "Invalid or expired coupon code.");
  }
  tx.update(ref, { redemptions: used + 1, updatedAt: new Date().toISOString() });
  return { code: normalized, percentOff: pct, totalCents: couponPrice(baseCents, pct) };
}
