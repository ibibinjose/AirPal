import { FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall, onRequest } from "firebase-functions/v2/https";
import Stripe from "stripe";
import {
  cleanV3Text,
  parseV3Id,
  parseV3IdempotencyKey,
  type V3CreateCheckoutRequest,
  type V3Event,
  type V3Order,
  type V3ReconcileOrderRequest,
  type V3RefundOrderRequest,
} from "../../../shared/v3-contract";
import type { AccessClaims } from "../../../shared/airpal-security";
import { CALLABLE, db, isPlatformAdmin, requireAccount } from "../admin";
import { enforceRateLimit, noteAppCheck } from "../abuse";
import { indexUserDoc, v3Arg, v3Clean, v3IdemDocId, writeV3Audit } from "./common";

function stripeClient(): Stripe | null {
  const secret = String(process.env.STRIPE_SECRET_KEY || "").trim();
  if (!secret) return null;
  return new Stripe(secret);
}

function checkoutBaseUrl(): string {
  return String(process.env.V3_CHECKOUT_BASE_URL || "https://airpal.me").replace(/\/+$/, "");
}

/**
 * Mark an order paid and issue its ticket inside one transaction. Called only
 * from the verified webhook and the admin reconcile path — never from browser
 * input.
 */
async function settlePaidOrder(
  orderId: string,
  stripePaymentIntentId?: string,
): Promise<{ ticketId: string; created: boolean }> {
  const orderRef = db.collection("orders").doc(orderId);
  return db.runTransaction(async (tx) => {
    const orderSnap = await tx.get(orderRef);
    const order = orderSnap.data() as V3Order | undefined;
    if (!orderSnap.exists || !order) throw new HttpsError("not-found", "Order not found.");
    if (order.state === "paid") {
      const existing = await db.collection("tickets").where("orderId", "==", orderId).limit(1).get();
      const ticketId = existing.docs[0]?.id || `t_unsettled_${orderId}`;
      return { ticketId, created: false };
    }
    if (order.state !== "pending") throw new HttpsError("failed-precondition", "Only pending orders can settle.");
    const eventRef = db.collection("events").doc(order.eventId);
    const eventSnap = await tx.get(eventRef);
    const event = eventSnap.data() as V3Event | undefined;
    if (!eventSnap.exists || !event) throw new HttpsError("not-found", "Event not found.");
    const capacity = Number(event.capacity || 0);
    const issued = Number(event.issuedCount || 0);
    if (capacity > 0 && issued >= capacity) throw new HttpsError("failed-precondition", "This event is sold out.");
    tx.set(
      orderRef,
      v3Clean({
        state: "paid",
        stripePaymentIntentId: stripePaymentIntentId || order.stripePaymentIntentId,
        paidAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      }),
      { merge: true },
    );
    const ticketId = v3IdemDocId("t", order.purchaserUid, `order-${orderId}`);
    tx.set(db.collection("tickets").doc(ticketId), {
      eventId: order.eventId,
      holderUid: order.purchaserUid,
      issuerUid: order.sellerUid,
      orderId,
      state: "valid",
      kind: "paid",
      issuedAt: FieldValue.serverTimestamp(),
    });
    tx.set(eventRef, { issuedCount: issued + 1, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return { ticketId, created: true };
  });
}

/**
 * Create a checkout for a paid event. Idempotent per (purchaser, key): retries
 * return the same order and checkout URL instead of double-charging.
 */
export const v3CreateCheckout = onCall(CALLABLE, async (request) => {
  await noteAppCheck(request, "v3CreateCheckout");
  const uid = requireAccount(request, "Create an email account to check out.");
  await enforceRateLimit(uid, "v3Commerce", false);
  const data = (request.data || {}) as V3CreateCheckoutRequest;
  const input = v3Arg(() => ({
    eventId: parseV3Id(data.eventId, "Event"),
    idempotencyKey: parseV3IdempotencyKey(data.idempotencyKey),
  }));
  const eventSnap = await db.collection("events").doc(input.eventId).get();
  const event = eventSnap.data() as V3Event | undefined;
  if (!eventSnap.exists || !event) throw new HttpsError("not-found", "Event not found.");
  if (event.status !== "published") throw new HttpsError("failed-precondition", "This event is not on sale.");
  if (event.ticketing !== "paid") throw new HttpsError("failed-precondition", "This event has no paid tickets.");
  const amountCents = Number(event.priceCents || 0);
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    throw new HttpsError("failed-precondition", "This event has no price.");
  }

  const orderId = v3IdemDocId("o", uid, input.idempotencyKey);
  const orderRef = db.collection("orders").doc(orderId);
  const existing = await orderRef.get();
  if (existing.exists) {
    const order = existing.data() as V3Order;
    return {
      orderId,
      state: order.state,
      checkoutUrl: null as string | null,
      provider: order.provider,
      created: false as const,
    };
  }
  const stripe = stripeClient();
  let sessionId: string | undefined;
  let checkoutUrl: string | null = null;
  let provider: V3Order["provider"] = "stub";
  if (stripe) {
    try {
      const base = checkoutBaseUrl();
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [
          {
            price_data: {
              currency: String(event.currency || "AUD").toLowerCase(),
              unit_amount: amountCents,
              product_data: { name: String(event.title || "AirPal event") },
            },
            quantity: 1,
          },
        ],
        metadata: { orderId, eventId: input.eventId, purchaserUid: uid },
        success_url: `${base}/me/tickets?order=${orderId}`,
        cancel_url: `${base}/events/${input.eventId}?checkout=cancelled`,
      });
      sessionId = session.id;
      checkoutUrl = session.url;
      provider = "stripe";
    } catch (err) {
      console.error("v3CreateCheckout stripe error", err instanceof Error ? err.message : err);
      throw new HttpsError("internal", "Checkout failed. Try again shortly.");
    }
  }
  await orderRef.set(
    v3Clean({
      purchaserUid: uid,
      sellerUid: event.organiserUid,
      eventId: input.eventId,
      amountCents,
      currency: String(event.currency || "AUD"),
      state: "pending",
      idempotencyKey: input.idempotencyKey,
      provider,
      stripeSessionId: sessionId,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }),
  );
  await indexUserDoc(uid, "orderIds", orderId);
  await writeV3Audit({
    action: "order.checkout",
    actorUid: uid,
    subjectType: "order",
    subjectId: orderId,
    detail: `${provider} ${amountCents}`,
  });
  return { orderId, state: "pending" as const, checkoutUrl, provider, created: true as const };
});

/**
 * Verified Stripe webhook. Fails closed: without a signing secret, or with a
 * bad signature, nothing is marked paid. Only checkout completion settles an
 * order; refunds reconcile through refund events.
 */
export const v3StripeWebhook = onRequest(async (request, response) => {
  const stripe = stripeClient();
  const signingSecret = String(process.env.STRIPE_WEBHOOK_SECRET || "").trim();
  if (!stripe || !signingSecret) {
    response.status(500).send("webhook not configured");
    return;
  }
  const signature = String(request.headers["stripe-signature"] || "");
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(request.rawBody as Buffer, signature, signingSecret);
  } catch {
    response.status(400).send("bad signature");
    return;
  }
  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = String(session.metadata?.orderId || "");
      if (orderId && session.payment_status === "paid") {
        const paymentIntent = typeof session.payment_intent === "string" ? session.payment_intent : undefined;
        const { ticketId } = await settlePaidOrder(orderId, paymentIntent);
        const orderSnap = await db.collection("orders").doc(orderId).get();
        const purchaserUid = String(orderSnap.data()?.purchaserUid || "");
        if (purchaserUid) await indexUserDoc(purchaserUid, "ticketIds", ticketId);
        await writeV3Audit({
          action: "order.paid",
          actorUid: "stripe-webhook",
          subjectType: "order",
          subjectId: orderId,
        });
      }
    } else if (event.type === "charge.refunded" || event.type === "refund.created") {
      const object = event.data.object as { payment_intent?: string | Stripe.PaymentIntent | null };
      const paymentIntentId =
        typeof object.payment_intent === "string" ? object.payment_intent : object.payment_intent?.id;
      if (paymentIntentId) {
        const matches = await db
          .collection("orders")
          .where("stripePaymentIntentId", "==", paymentIntentId)
          .limit(5)
          .get();
        for (const doc of matches.docs) {
          const order = doc.data() as V3Order;
          if (order.state !== "paid") continue;
          await doc.ref.set({ state: "refunded", updatedAt: FieldValue.serverTimestamp() }, { merge: true });
          const tickets = await db.collection("tickets").where("orderId", "==", doc.id).get();
          for (const ticket of tickets.docs) {
            await ticket.ref.set({ state: "void", updatedAt: FieldValue.serverTimestamp() }, { merge: true });
          }
          await writeV3Audit({
            action: "order.refunded",
            actorUid: "stripe-webhook",
            subjectType: "order",
            subjectId: doc.id,
          });
        }
      }
    }
  } catch (err) {
    response.status(500).send(err instanceof Error ? err.message : "webhook failed");
    return;
  }
  response.status(200).send("ok");
});

/** Refund a paid order. Seller or platform admin only. Voids paid tickets. */
export const v3RefundOrder = onCall(CALLABLE, async (request) => {
  await noteAppCheck(request, "v3RefundOrder");
  const uid = requireAccount(request, "Sign in to refund orders.");
  await enforceRateLimit(uid, "v3Commerce", false);
  const data = (request.data || {}) as V3RefundOrderRequest;
  const orderId = v3Arg(() => parseV3Id(data.orderId, "Order"));
  const reason = cleanV3Text(data.reason, 500);
  const ref = db.collection("orders").doc(orderId);
  const snap = await ref.get();
  const order = snap.data() as V3Order | undefined;
  if (!snap.exists || !order) throw new HttpsError("not-found", "Order not found.");
  if (order.sellerUid !== uid && !isPlatformAdmin(request.auth?.token as AccessClaims | undefined)) {
    throw new HttpsError("permission-denied", "Only the seller can refund this order.");
  }
  if (order.state === "refunded") return { orderId, state: "refunded" as const, already: true as const };
  if (order.state !== "paid") throw new HttpsError("failed-precondition", "Only paid orders can be refunded.");
  const stripe = stripeClient();
  if (stripe && order.stripePaymentIntentId) {
    try {
      await stripe.refunds.create({ payment_intent: order.stripePaymentIntentId, reason: "requested_by_customer" });
    } catch (err) {
      console.error("v3RefundOrder stripe error", err instanceof Error ? err.message : err);
      throw new HttpsError("internal", "Refund failed. Try again shortly.");
    }
  }
  await ref.set({ state: "refunded", updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  const tickets = await db.collection("tickets").where("orderId", "==", orderId).get();
  for (const ticket of tickets.docs) {
    await ticket.ref.set({ state: "void", updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  }
  await writeV3Audit({
    action: "order.refund",
    actorUid: uid,
    subjectType: "order",
    subjectId: orderId,
    detail: reason || undefined,
  });
  return { orderId, state: "refunded" as const, already: false as const };
});

/**
 * Admin-only reconciliation: re-read the Stripe session truth for a pending
 * order and settle or fail it. Without Stripe configured it reports state.
 */
export const v3ReconcileOrder = onCall(CALLABLE, async (request) => {
  await noteAppCheck(request, "v3ReconcileOrder");
  const uid = requireAccount(request, "Sign in to reconcile orders.");
  if (!isPlatformAdmin(request.auth?.token as AccessClaims | undefined)) {
    throw new HttpsError("permission-denied", "Admins only.");
  }
  await enforceRateLimit(uid, "v3Commerce", false);
  const data = (request.data || {}) as V3ReconcileOrderRequest;
  const orderId = v3Arg(() => parseV3Id(data.orderId, "Order"));
  const ref = db.collection("orders").doc(orderId);
  const snap = await ref.get();
  const order = snap.data() as V3Order | undefined;
  if (!snap.exists || !order) throw new HttpsError("not-found", "Order not found.");
  const stripe = stripeClient();
  if (stripe && order.stripeSessionId && order.state === "pending") {
    const session = await stripe.checkout.sessions.retrieve(order.stripeSessionId);
    if (session.payment_status === "paid") {
      const paymentIntent = typeof session.payment_intent === "string" ? session.payment_intent : undefined;
      const { ticketId } = await settlePaidOrder(orderId, paymentIntent);
      await indexUserDoc(order.purchaserUid, "ticketIds", ticketId);
    } else if (session.status === "expired") {
      await ref.set({ state: "failed", updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    }
  }
  await ref.set({ reconciledAt: FieldValue.serverTimestamp() }, { merge: true });
  const settled = await ref.get();
  await writeV3Audit({
    action: "order.reconcile",
    actorUid: uid,
    subjectType: "order",
    subjectId: orderId,
    detail: String((settled.data() as V3Order).state),
  });
  return { orderId, state: (settled.data() as V3Order).state };
});
