import { randomBytes } from "node:crypto";
import { defineSecret } from "firebase-functions/params";
import { HttpsError, onCall, onRequest } from "firebase-functions/v2/https";
import Stripe from "stripe";
import {
  DEFAULT_FEE_CONFIG,
  canProviderComplete,
  checkoutPaymentCollected,
  canReleasePayout,
  payoutStatusAfterGuestPaid,
  quoteFees,
  repriceSourcedBooking,
  type Booking,
  type FeeConfig,
  type PayoutStatus,
} from "../../shared/booking";
import { isStayDay, nightsBetween, quoteStayNights, stayDateList, stayRangesOverlap } from "../../shared/stay-booking";
import { CALLABLE, db, isPlatformAdmin, requireAuth } from "./admin";
import { enforceRateLimit, isAnonymousAuth, noteAppCheck } from "./abuse";
import type { AccessClaims } from "../../shared/airpal-security";

const APP_ORIGIN = "https://airpal.me";
const STRIPE_API_VERSION = "2026-07-29.dahlia" as Stripe.LatestApiVersion;
const stripeSecret = defineSecret("STRIPE_SECRET_KEY");
const stripeWebhookSecret = defineSecret("STRIPE_WEBHOOK_SECRET");
const STRIPE_CALLABLE = { ...CALLABLE, secrets: [stripeSecret] };

/** Sandbox (unpaid) bookings only with explicit opt-in or the local emulator. */
export function sandboxBookingsAllowed(): boolean {
  return process.env.ALLOW_SANDBOX_BOOKINGS === "true" || process.env.FUNCTIONS_EMULATOR === "true";
}

function readSecret(param: { value: () => string }, envName: string): string {
  try {
    const bound = param.value();
    if (bound && bound.trim()) return bound.trim();
  } catch {
    /* not bound in unit tests or emulator without Secret Manager */
  }
  return String(process.env[envName] || "").trim();
}

export function stripeSecretKey(): string {
  return readSecret(stripeSecret, "STRIPE_SECRET_KEY") || String(process.env.STRIPE_API_KEY || "").trim();
}

export function stripeWebhookSigningSecret(): string {
  return readSecret(stripeWebhookSecret, "STRIPE_WEBHOOK_SECRET");
}

export function stripeLiveConfigured(): boolean {
  const key = stripeSecretKey();
  return Boolean(key) && !key.startsWith("mock_");
}

export function makeStripe(secret = stripeSecretKey()): Stripe {
  return new Stripe(secret, { apiVersion: STRIPE_API_VERSION, typescript: true });
}

function integrationId(kind: string): string {
  return `airpal-${kind}-${randomBytes(4).toString("hex")}`;
}

export function headerOrigin(request: { rawRequest?: { headers?: Record<string, unknown> } }): string {
  const headers = request.rawRequest?.headers || {};
  const origin = String(headers.origin || "").trim();
  if (/^https:\/\//i.test(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) {
    return origin.replace(/\/$/, "");
  }
  const referer = String(headers.referer || "").trim();
  try {
    const url = new URL(referer);
    if (url.protocol === "https:" || url.hostname === "localhost" || url.hostname === "127.0.0.1") {
      return url.origin;
    }
  } catch {
    /* ignore */
  }
  return APP_ORIGIN;
}

async function loadFeeConfig(): Promise<FeeConfig> {
  const snap = await db.collection("platform_settings").doc("marketplace").get();
  if (!snap.exists) return DEFAULT_FEE_CONFIG;
  const row = snap.data() as Partial<FeeConfig>;
  return {
    platformFeeBps: Number(row.platformFeeBps) || DEFAULT_FEE_CONFIG.platformFeeBps,
    minimumPlatformFeeCents: Number(row.minimumPlatformFeeCents) || 0,
  };
}

type ConnectAccountRow = {
  uid: string;
  stripeAccountId: string;
  transfersActive: boolean;
  payoutsActive: boolean;
  updatedAt: string;
};

async function loadConnectAccount(uid: string): Promise<ConnectAccountRow | null> {
  const snap = await db.collection("connect_accounts").doc(uid).get();
  if (!snap.exists) return null;
  return snap.data() as ConnectAccountRow;
}

async function recipientTransfersActive(stripe: Stripe, accountId: string): Promise<boolean> {
  const account = (await stripe.v2.core.accounts.retrieve(accountId)) as {
    configuration?: {
      recipient?: {
        capabilities?: {
          stripe_balance?: { stripe_transfers?: { status?: string }; payouts?: { status?: string } };
        };
      };
    };
  };
  return account.configuration?.recipient?.capabilities?.stripe_balance?.stripe_transfers?.status === "active";
}

async function chargeIdFromSession(stripe: Stripe, session: Stripe.Checkout.Session): Promise<string> {
  const piRef = session.payment_intent;
  const piId = typeof piRef === "string" ? piRef : piRef?.id;
  if (!piId) return "";
  const intent = await stripe.paymentIntents.retrieve(piId);
  const charge = intent.latest_charge;
  return typeof charge === "string" ? charge : charge?.id || "";
}

export async function markBookingPaid(args: {
  bookingId: string;
  sessionId: string;
  paymentIntentId: string;
  chargeId: string;
}): Promise<boolean> {
  const ref = db.collection("bookings").doc(args.bookingId);
  let changed = false;
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return;
    const row = snap.data() as Booking;
    if (row.paymentStatus === "paid") return;
    changed = true;
    const now = new Date().toISOString();
    tx.update(ref, {
      paymentStatus: "paid",
      payoutStatus: payoutStatusAfterGuestPaid(Number(row.priceCents || 0)),
      status: row.status === "pending" ? "confirmed" : row.status,
      stripeCheckoutSessionId: args.sessionId,
      stripePaymentIntentId: args.paymentIntentId,
      stripeChargeId: args.chargeId,
      updatedAt: now,
    });
  });
  return changed;
}

export function safeReturnPath(raw: unknown): string {
  const s = String(raw || "").trim();
  if (!s.startsWith("/") || s.startsWith("//") || s.includes("://")) return "/me";
  return s.slice(0, 240);
}

async function transferProviderShare(booking: Booking): Promise<{
  payoutStatus: PayoutStatus;
  transferId: string;
  stripeAccountId: string;
  reason?: string;
}> {
  if (booking.priceCents <= 0) {
    return { payoutStatus: "transferred", transferId: "", stripeAccountId: booking.stripeAccountId || "" };
  }
  if (booking.paymentStatus !== "paid") {
    return {
      payoutStatus: (booking.payoutStatus as PayoutStatus) || "unpaid",
      transferId: booking.stripeTransferId || "",
      stripeAccountId: booking.stripeAccountId || "",
      reason: "unpaid",
    };
  }
  if (booking.payoutStatus === "transferred" && booking.stripeTransferId) {
    return {
      payoutStatus: "transferred",
      transferId: booking.stripeTransferId,
      stripeAccountId: booking.stripeAccountId || "",
    };
  }
  const connect = await loadConnectAccount(booking.providerUid);
  const accountId = connect?.stripeAccountId || booking.stripeAccountId || "";
  if (!accountId) {
    return { payoutStatus: "held", transferId: "", stripeAccountId: "", reason: "no_account" };
  }
  if (!booking.stripeChargeId || !stripeLiveConfigured()) {
    return { payoutStatus: "held", transferId: "", stripeAccountId: accountId, reason: "not_ready" };
  }
  const stripe = makeStripe();
  const transfersActive = await recipientTransfersActive(stripe, accountId);
  if (
    !canReleasePayout({
      paymentStatus: booking.paymentStatus,
      payoutStatus: "held",
      stripeChargeId: booking.stripeChargeId,
      stripeAccountId: accountId,
      transfersActive,
    })
  ) {
    return { payoutStatus: "held", transferId: "", stripeAccountId: accountId, reason: "onboarding" };
  }
  const fees = quoteFees(booking.priceCents, await loadFeeConfig());
  // Same key on every attempt for this booking: concurrent releases and
  // crash-then-retry both collapse onto one transfer instead of double-paying.
  const transfer = await stripe.transfers.create(
    {
      amount: fees.providerCents,
      currency: "aud",
      destination: accountId,
      source_transaction: booking.stripeChargeId,
      metadata: { bookingId: booking.id, providerUid: booking.providerUid },
    },
    { idempotencyKey: payoutIdempotencyKey(booking.id) },
  );
  const now = new Date().toISOString();
  await db.collection("payouts").doc(transfer.id).set({
    id: transfer.id,
    bookingId: booking.id,
    providerUid: booking.providerUid,
    amountCents: fees.providerCents,
    feeCents: fees.feeCents,
    currency: "aud",
    stripeAccountId: accountId,
    stripeChargeId: booking.stripeChargeId,
    createdAt: now,
  });
  return { payoutStatus: "transferred", transferId: transfer.id, stripeAccountId: accountId };
}

/**
 * Checkout returns land on the ticket passbook: every booking — stay,
 * event, dining — is readable there without extra routing.
 */
export function stayCheckoutReturnUrls(origin: string, bookingId: string): { success: string; cancel: string } {
  return {
    success: `${origin}/me/tickets?booked=${bookingId}`,
    cancel: `${origin}/me/tickets?canceled=true`,
  };
}

function checkoutReturnUrls(origin: string, _booking: Booking, bookingId: string): { success: string; cancel: string } {
  return {
    success: `${origin}/me/tickets?booked=${bookingId}`,
    cancel: `${origin}/me/tickets?canceled=true`,
  };
}

/** Checkout totals must be finite positive dollars before a Stripe session exists. */
/** Stable per booking: retries replay the original transfer instead of double-paying. */
export function payoutIdempotencyKey(bookingId: string): string {
  return `payout-${bookingId}`;
}

/** Stable per booking: retries replay the original refund instead of double-refunding. */
export function refundIdempotencyKey(bookingId: string): string {
  return `refund-${bookingId}`;
}

/** A dispute retry must not reverse an already-reversed transfer (webhook 500 loop). */
export function needsTransferReversal(b: Pick<Booking, "status" | "payoutStatus" | "stripeTransferId">): boolean {
  if (!b.stripeTransferId) return false;
  if (b.status === "disputed" && b.payoutStatus === "reversed") return false;
  return true;
}

export function assertChargeableAmount(totalAmount: number): void {
  if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
    throw new HttpsError("failed-precondition", "This experience has no chargeable amount.");
  }
}

export const createBookingCheckoutSession = onCall(STRIPE_CALLABLE, async (request) => {
  await noteAppCheck(request, "createBookingCheckoutSession");
  const uid = requireAuth(request.auth?.uid);
  await enforceRateLimit(uid, "pay", isAnonymousAuth(request));
  const bookingId = String((request.data as { bookingId?: string } | undefined)?.bookingId || "").trim();
  if (!bookingId) throw new HttpsError("invalid-argument", "bookingId is required.");

  const ref = db.collection("bookings").doc(bookingId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "Booking not found.");
  const booking = { id: snap.id, ...(snap.data() as Omit<Booking, "id">) };
  if (booking.customerUid !== uid) {
    throw new HttpsError("permission-denied", "Only the guest who booked can pay.");
  }
  if (booking.paymentStatus === "paid") {
    return { ok: true, mode: "already_paid", bookingId };
  }
  if (booking.priceCents <= 0) {
    await ref.update({ paymentStatus: "paid", payoutStatus: "transferred", updatedAt: new Date().toISOString() });
    return { ok: true, mode: "free", bookingId };
  }

  // C1 — the server is the fee authority: restamp from live admin config so a
  // stale or tampered client fee can never reach the ledger or the payout.
  // C2 — the server is the price authority for sourced bookings: re-price
  // from the event/campaign row so a forged client priceCents can never
  // reach Stripe. Fail closed when the source is gone.
  if (booking.eventId) {
    const eventSnap = await db.collection("events").doc(booking.eventId).get();
    const repriced = repriceSourcedBooking(
      eventSnap.exists
        ? { exists: true, priceCents: (eventSnap.data() as { ticketPriceCents?: unknown }).ticketPriceCents }
        : null,
    );
    if ("error" in repriced) throw new HttpsError("failed-precondition", "This event is no longer on sale.");
    if (booking.priceCents !== repriced.priceCents) {
      await ref.update({ priceCents: repriced.priceCents, updatedAt: new Date().toISOString() });
      booking.priceCents = repriced.priceCents;
    }
  } else if (booking.campaignId) {
    const campaignSnap = await db.collection("campaigns").doc(booking.campaignId).get();
    const repriced = repriceSourcedBooking(
      campaignSnap.exists
        ? { exists: true, priceCents: (campaignSnap.data() as { priceCents?: unknown }).priceCents }
        : null,
    );
    if ("error" in repriced) throw new HttpsError("failed-precondition", "This experience is no longer on sale.");
    if (booking.priceCents !== repriced.priceCents) {
      await ref.update({ priceCents: repriced.priceCents, updatedAt: new Date().toISOString() });
      booking.priceCents = repriced.priceCents;
    }
  }
  const liveFees = quoteFees(booking.priceCents, await loadFeeConfig());
  if (booking.feeCents !== liveFees.feeCents) {
    await ref.update({ feeCents: liveFees.feeCents, updatedAt: new Date().toISOString() });
    booking.feeCents = liveFees.feeCents;
  }

  if (!stripeLiveConfigured()) {
    throw new HttpsError(
      "failed-precondition",
      "Card payments are not configured yet. Ask AirPal to finish Stripe setup.",
    );
  }

  const stripe = makeStripe();
  if (booking.stripeCheckoutSessionId) {
    const existing = await stripe.checkout.sessions.retrieve(booking.stripeCheckoutSessionId);
    if (existing.status === "open" && existing.url) {
      return { ok: true, mode: "live_stripe", bookingId, sessionId: existing.id, checkoutUrl: existing.url };
    }
  }

  const origin = headerOrigin(request);
  const returns = checkoutReturnUrls(origin, booking, bookingId);
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    // Marketplace Connect is unsupported by Stripe Managed Payments.
    managed_payments: { enabled: false },
    client_reference_id: uid,
    customer_email: request.auth?.token?.email || undefined,
    submit_type: "book",
    integration_identifier: integrationId("booking"),
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "aud",
          unit_amount: booking.priceCents,
          product_data: { name: `Ticket · ${booking.title}` },
        },
      },
    ],
    success_url: returns.success,
    cancel_url: returns.cancel,
    metadata: {
      bookingId,
      providerUid: booking.providerUid,
      providerKind: booking.providerKind,
      spots: String(booking.spots || 1),
      campaignId: booking.campaignId || "",
    },
    payment_intent_data: {
      metadata: {
        bookingId,
        providerUid: booking.providerUid,
      },
    },
  });

  await ref.update({
    stripeCheckoutSessionId: session.id,
    updatedAt: new Date().toISOString(),
  });

  return { ok: true, mode: "live_stripe", bookingId, sessionId: session.id, checkoutUrl: session.url };
});

export interface CreateStayCheckoutRequest {
  propertyId?: string;
  roomTypeId?: string;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
}

/**
 * D3 — book reservable room-nights on the one bookings engine. Commercial
 * properties only (residential kinds are rejected). Every number recomputes
 * server-side from the property doc + block ledger + live fee config.
 */
export const createStayCheckoutSession = onCall(STRIPE_CALLABLE, async (request) => {
  await noteAppCheck(request, "createStayCheckoutSession");
  const uid = requireAuth(request.auth?.uid);
  await enforceRateLimit(uid, "pay", isAnonymousAuth(request));
  const data = (request.data || {}) as CreateStayCheckoutRequest;
  const propertyId = String(data.propertyId || "").trim();
  const roomTypeId = String(data.roomTypeId || "").trim();
  const checkIn = String(data.checkIn || "").trim();
  const checkOut = String(data.checkOut || "").trim();
  if (!propertyId || !roomTypeId) throw new HttpsError("invalid-argument", "Property and room type are required.");
  if (nightsBetween(checkIn, checkOut) <= 0) {
    throw new HttpsError("invalid-argument", "Check-out must be after check-in.");
  }

  const propSnap = await db.collection("properties").doc(propertyId).get();
  if (!propSnap.exists) throw new HttpsError("not-found", "Stay not found.");
  const prop = propSnap.data() as {
    name?: string;
    city?: string;
    destination?: string;
    ownerId?: string;
    kind?: string;
    roomTypes?: Array<{ id?: string; name?: string; capacity?: number; startingPrice?: number }>;
  };
  if (prop.kind === "campus" || prop.kind === "venue") {
    throw new HttpsError("failed-precondition", "This place does not take overnight bookings.");
  }
  const room = (prop.roomTypes || []).find((r) => r.id === roomTypeId);
  if (!room) throw new HttpsError("not-found", "Room type not found.");
  const quote = quoteStayNights({
    checkIn,
    checkOut,
    nightlyDollars: Number(room.startingPrice || 0),
    guests: Number(data.guests || 1),
    capacity: Number(room.capacity || 1),
  });
  if (typeof quote === "string") throw new HttpsError("invalid-argument", quote);

  const dates = stayDateList(checkIn, checkOut);
  // Host-blocked nights (chunked: Firestore `in` takes 10).
  for (let i = 0; i < dates.length; i += 10) {
    const chunk = dates.slice(i, i + 10);
    const blocked = await db
      .collection("stay_blocks")
      .where("propertyId", "==", propertyId)
      .where("date", "in", chunk)
      .limit(1)
      .get();
    if (!blocked.empty) {
      throw new HttpsError("failed-precondition", "Those nights are no longer available.");
    }
  }
  // Overlapping holds on the same engine.
  const held = await db
    .collection("bookings")
    .where("propertyId", "==", propertyId)
    .where("status", "in", ["pending", "confirmed", "in_progress", "completed", "disputed"])
    .get();
  const clash = held.docs.some((d) => {
    const b = d.data() as Booking;
    return (
      b.paymentStatus !== "refunded" &&
      isStayDay(String(b.stayCheckIn || "")) &&
      isStayDay(String(b.stayCheckOut || "")) &&
      stayRangesOverlap(checkIn, checkOut, String(b.stayCheckIn), String(b.stayCheckOut))
    );
  });
  if (clash) throw new HttpsError("failed-precondition", "Those nights just booked. Pick other dates.");

  if (!stripeLiveConfigured()) {
    throw new HttpsError("failed-precondition", "Card payments are not configured for this stay yet.");
  }

  const fees = quoteFees(quote.totalCents, await loadFeeConfig());
  const now = new Date().toISOString();
  const origin = headerOrigin(request);
  const bookingId = `bk-${Date.now().toString(36)}-${randomBytes(4).toString("hex")}`;
  const returns = stayCheckoutReturnUrls(origin, bookingId);
  const stripe = makeStripe();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    // Marketplace Connect is unsupported by Stripe Managed Payments.
    managed_payments: { enabled: false },
    client_reference_id: uid,
    customer_email: request.auth?.token?.email || undefined,
    submit_type: "book",
    integration_identifier: integrationId("stay"),
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "aud",
          unit_amount: quote.totalCents,
          product_data: {
            name: `${prop.name || "Stay"} · ${room.name || "Room"} · ${quote.nights}n`,
          },
        },
      },
    ],
    success_url: returns.success,
    cancel_url: returns.cancel,
    metadata: {
      bookingId,
      propertyId,
      providerUid: String(prop.ownerId || ""),
      providerKind: "host",
      stayCheckIn: checkIn,
      stayCheckOut: checkOut,
    },
    payment_intent_data: {
      metadata: { bookingId, propertyId, providerUid: String(prop.ownerId || "") },
    },
  });

  await db
    .collection("bookings")
    .doc(bookingId)
    .set({
      id: bookingId,
      requestId: "",
      customerUid: uid,
      providerUid: String(prop.ownerId || ""),
      providerKind: "host",
      providerName: String(prop.name || "Host"),
      title: `${prop.name || "Stay"} · ${quote.nights} night${quote.nights === 1 ? "" : "s"}`,
      suburb: String(prop.city || prop.destination || "Sydney"),
      date: checkIn,
      time: "",
      priceCents: fees.priceCents,
      feeCents: fees.feeCents,
      paymentStatus: "unpaid",
      payoutStatus: "unpaid",
      status: "pending",
      cancelReason: "",
      propertyId,
      stayCheckIn: checkIn,
      stayCheckOut: checkOut,
      stayGuests: quote.guests,
      stayRoomTypeId: roomTypeId,
      stripeCheckoutSessionId: session.id,
      createdAt: now,
      updatedAt: now,
    });

  return { ok: true, mode: "live_stripe", bookingId, sessionId: session.id, checkoutUrl: session.url };
});

export interface BillingConfig {
  businessPriceId: string;
  businessPriceLabel: string;
}

export const DEFAULT_BILLING_CONFIG: BillingConfig = { businessPriceId: "", businessPriceLabel: "" };

/** Admin-set Partner price from `platform_settings/marketplace`. Empty until configured. */
export async function loadBillingConfig(): Promise<BillingConfig> {
  try {
    const snap = await db.collection("platform_settings").doc("marketplace").get();
    if (!snap.exists) return DEFAULT_BILLING_CONFIG;
    const row = snap.data() as Partial<BillingConfig>;
    return {
      businessPriceId: String(row.businessPriceId || "").trim(),
      businessPriceLabel: String(row.businessPriceLabel || "").trim(),
    };
  } catch {
    return DEFAULT_BILLING_CONFIG;
  }
}

/** C4 — Partner sits behind a live place: same login must own a listing. */
export async function hasLivePlace(uid: string): Promise<boolean> {
  try {
    const snap = await db.collection("listings").where("ownerUid", "==", uid).limit(1).get();
    return !snap.empty;
  } catch {
    return false;
  }
}

/** Upsert from a Stripe subscription object. Idempotent — keyed by subscription id. */
export async function recordSubscriptionEvent(sub: {
  id?: string;
  status?: string;
  customer?: string | { id?: string } | null;
  metadata?: Record<string, string | undefined> | null;
  current_period_end?: unknown;
  currentPeriodEnd?: unknown;
  items?: { data?: Array<{ price?: { id?: string } }> };
}): Promise<boolean> {
  const subscriptionId = String(sub.id || "").trim();
  if (!subscriptionId) return false;
  const customerId = typeof sub.customer === "string" ? sub.customer : String(sub.customer?.id || "").trim();
  let uid = String(sub.metadata?.subscriptionUid || "").trim();
  if (!uid && customerId) {
    const prior = await db
      .collection("business_subscriptions")
      .where("stripeCustomerId", "==", customerId)
      .limit(1)
      .get();
    if (!prior.empty) uid = prior.docs[0]!.id;
  }
  if (!uid) return false;
  const priceId = String(sub.items?.data?.[0]?.price?.id || "").trim();
  const periodRaw = sub.current_period_end ?? sub.currentPeriodEnd;
  const periodEnd = Number(periodRaw);
  const now = new Date().toISOString();
  await db
    .collection("business_subscriptions")
    .doc(uid)
    .set(
      {
        uid,
        status: String(sub.status || "unknown"),
        priceId,
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        ...(Number.isFinite(periodEnd) ? { currentPeriodEnd: Math.floor(periodEnd) } : {}),
        updatedAt: now,
      },
      { merge: true },
    );
  return true;
}

/**
 * C4 — start a Partner subscription. Same login, live place required, base
 * tools stay free. Price comes from admin settings, never the client.
 */
export const createSubscriptionCheckout = onCall(STRIPE_CALLABLE, async (request) => {
  await noteAppCheck(request, "createSubscriptionCheckout");
  const uid = requireAuth(request.auth?.uid);
  await enforceRateLimit(uid, "pay", isAnonymousAuth(request));

  if (!(await hasLivePlace(uid))) {
    throw new HttpsError("failed-precondition", "Open a partner place on this login first.");
  }
  const billing = await loadBillingConfig();
  if (!billing.businessPriceId) {
    throw new HttpsError("failed-precondition", "Partner billing is not configured yet.");
  }
  if (!stripeLiveConfigured()) {
    throw new HttpsError("failed-precondition", "Card payments are not configured yet.");
  }

  const existing = await db.collection("business_subscriptions").doc(uid).get();
  const customerId = existing.exists ? String(existing.data()?.stripeCustomerId || "") : "";
  const origin = headerOrigin(request);
  const stripe = makeStripe();
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    // Marketplace Connect is unsupported by Stripe Managed Payments.
    managed_payments: { enabled: false },
    client_reference_id: uid,
    ...(customerId ? { customer: customerId } : { customer_email: request.auth?.token?.email || undefined }),
    line_items: [{ price: billing.businessPriceId, quantity: 1 }],
    success_url: `${origin}/business?subscribed=1`,
    cancel_url: `${origin}/business?canceled=1`,
    metadata: { subscriptionUid: uid },
    subscription_data: { metadata: { subscriptionUid: uid } },
  });
  return { ok: true, sessionId: session.id, checkoutUrl: session.url };
});

/** C4 — manage/cancel an existing Partner subscription via the Stripe portal. */
export const createSubscriptionPortal = onCall(STRIPE_CALLABLE, async (request) => {
  await noteAppCheck(request, "createSubscriptionPortal");
  const uid = requireAuth(request.auth?.uid);
  await enforceRateLimit(uid, "pay", isAnonymousAuth(request));

  const snap = await db.collection("business_subscriptions").doc(uid).get();
  const customerId = snap.exists ? String(snap.data()?.stripeCustomerId || "") : "";
  if (!customerId || !stripeLiveConfigured()) {
    throw new HttpsError("failed-precondition", "No Partner subscription on this account yet.");
  }
  const origin = headerOrigin(request);
  const portal = await makeStripe().billingPortal.sessions.create({
    customer: customerId,
    return_url: `${origin}/business`,
  });
  return { ok: true, portalUrl: portal.url };
});

export const createConnectAccountLink = onCall(STRIPE_CALLABLE, async (request) => {
  await noteAppCheck(request, "createConnectAccountLink");
  const uid = requireAuth(request.auth?.uid);
  if (isAnonymousAuth(request)) {
    throw new HttpsError("failed-precondition", "Create an account to receive payouts.");
  }
  await enforceRateLimit(uid, "pay", false);
  if (!stripeLiveConfigured()) {
    throw new HttpsError("failed-precondition", "Payouts are not configured yet.");
  }

  const stripe = makeStripe();
  const existing = await loadConnectAccount(uid);
  let accountId = existing?.stripeAccountId || "";
  const email = String(request.auth?.token?.email || "").trim();
  const name = String(request.auth?.token?.name || "AirPal provider").trim() || "AirPal provider";

  if (!accountId) {
    const created = await stripe.v2.core.accounts.create({
      contact_email: email || undefined,
      display_name: name,
      dashboard: "express",
      identity: { country: "AU" },
      defaults: {
        responsibilities: {
          fees_collector: "application",
          losses_collector: "application",
        },
      },
      configuration: {
        recipient: {
          capabilities: {
            stripe_balance: {
              stripe_transfers: { requested: true },
            },
          },
        },
      },
    });
    accountId = created.id;
  }

  const origin = headerOrigin(request);
  const back = safeReturnPath((request.data as { returnPath?: string } | undefined)?.returnPath);
  const sep = back.includes("?") ? "&" : "?";
  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${origin}${back}${sep}payouts=refresh`,
    return_url: `${origin}${back}${sep}payouts=return`,
    type: "account_onboarding",
  });

  const transfersActive = await recipientTransfersActive(stripe, accountId).catch(() => false);
  const now = new Date().toISOString();
  await db.collection("connect_accounts").doc(uid).set(
    {
      uid,
      stripeAccountId: accountId,
      transfersActive,
      payoutsActive: transfersActive,
      updatedAt: now,
    },
    { merge: true },
  );

  return { ok: true, url: link.url, stripeAccountId: accountId, transfersActive };
});

export const refreshConnectAccount = onCall(STRIPE_CALLABLE, async (request) => {
  await noteAppCheck(request, "refreshConnectAccount");
  const uid = requireAuth(request.auth?.uid);
  if (isAnonymousAuth(request)) {
    throw new HttpsError("failed-precondition", "Create an account to receive payouts.");
  }
  if (!stripeLiveConfigured()) {
    throw new HttpsError("failed-precondition", "Payouts are not configured yet.");
  }
  const existing = await loadConnectAccount(uid);
  if (!existing?.stripeAccountId) {
    return { ok: true, transfersActive: false, stripeAccountId: "" };
  }
  const transfersActive = await recipientTransfersActive(makeStripe(), existing.stripeAccountId).catch(() => false);
  await db.collection("connect_accounts").doc(uid).set(
    {
      transfersActive,
      payoutsActive: transfersActive,
      updatedAt: new Date().toISOString(),
    },
    { merge: true },
  );
  return { ok: true, transfersActive, stripeAccountId: existing.stripeAccountId };
});

export const createConnectLoginLink = onCall(STRIPE_CALLABLE, async (request) => {
  await noteAppCheck(request, "createConnectLoginLink");
  const uid = requireAuth(request.auth?.uid);
  if (isAnonymousAuth(request)) {
    throw new HttpsError("failed-precondition", "Create an account to receive payouts.");
  }
  const existing = await loadConnectAccount(uid);
  if (!existing?.stripeAccountId) {
    throw new HttpsError("failed-precondition", "Set up payouts first.");
  }
  const link = await makeStripe().accounts.createLoginLink(existing.stripeAccountId);
  return { ok: true, url: link.url };
});

export const releaseHeldPayouts = onCall(STRIPE_CALLABLE, async (request) => {
  await noteAppCheck(request, "releaseHeldPayouts");
  const uid = requireAuth(request.auth?.uid);
  await enforceRateLimit(uid, "pay", isAnonymousAuth(request));
  const snap = await db.collection("bookings").where("providerUid", "==", uid).get();
  let released = 0;
  let held = 0;
  let cents = 0;
  for (const docSnap of snap.docs) {
    const booking = { id: docSnap.id, ...(docSnap.data() as Omit<Booking, "id">) };
    if (booking.paymentStatus !== "paid" || booking.payoutStatus === "transferred") continue;
    if (booking.status !== "completed") continue;
    if (booking.priceCents <= 0) continue;
    const result = await transferProviderShare(booking);
    if (result.payoutStatus === "transferred") {
      released += 1;
      cents += quoteFees(booking.priceCents, await loadFeeConfig()).providerCents;
      await docSnap.ref.update({
        payoutStatus: "transferred",
        stripeTransferId: result.transferId,
        stripeAccountId: result.stripeAccountId,
        updatedAt: new Date().toISOString(),
      });
    } else {
      held += 1;
    }
  }
  return { ok: true, released, held, amountCents: cents };
});

export const completePaidBooking = onCall(STRIPE_CALLABLE, async (request) => {
  await noteAppCheck(request, "completePaidBooking");
  const uid = requireAuth(request.auth?.uid);
  await enforceRateLimit(uid, "pay", isAnonymousAuth(request));
  const bookingId = String((request.data as { bookingId?: string } | undefined)?.bookingId || "").trim();
  if (!bookingId) throw new HttpsError("invalid-argument", "bookingId is required.");

  const ref = db.collection("bookings").doc(bookingId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "Booking not found.");
  const booking = { id: snap.id, ...(snap.data() as Omit<Booking, "id">) };
  const claims = request.auth?.token as AccessClaims | undefined;
  const admin = isPlatformAdmin(claims);
  if (booking.providerUid !== uid && !admin) {
    throw new HttpsError("permission-denied", "Only the provider can mark this delivered.");
  }
  if (!canProviderComplete(booking.status) && booking.status !== "completed") {
    throw new HttpsError("failed-precondition", "This booking cannot be completed yet.");
  }
  if (booking.priceCents > 0 && booking.paymentStatus !== "paid") {
    throw new HttpsError("failed-precondition", "The guest has not paid yet.");
  }

  const now = new Date().toISOString();
  const paidOut = await transferProviderShare({ ...booking, status: "completed" });

  await ref.update({
    status: "completed",
    completedBy: uid,
    payoutStatus: paidOut.payoutStatus,
    stripeTransferId: paidOut.transferId || booking.stripeTransferId || "",
    stripeAccountId: paidOut.stripeAccountId || booking.stripeAccountId || "",
    updatedAt: now,
  });

  if (booking.providerKind === "mate" && booking.requestId) {
    await db
      .collection("mate_requests")
      .doc(booking.requestId)
      .set({ status: "completed", completedAt: now, updatedAt: now }, { merge: true });
  }

  return {
    ok: true,
    status: "completed",
    payoutStatus: paidOut.payoutStatus,
    transferId: paidOut.transferId || null,
    payoutReason: paidOut.reason || null,
  };
});

/**
 * C3 — refund a paid booking that has NOT been paid out yet. Provider or
 * admin only (guests cancel unpaid bookings client-side). Transferred
 * payouts are refused — unwinding those needs human review, never an
 * automatic reversal of someone else's money.
 */
export const refundPaidBooking = onCall(STRIPE_CALLABLE, async (request) => {
  await noteAppCheck(request, "refundPaidBooking");
  const uid = requireAuth(request.auth?.uid);
  await enforceRateLimit(uid, "pay", isAnonymousAuth(request));
  const bookingId = String((request.data as { bookingId?: string } | undefined)?.bookingId || "").trim();
  if (!bookingId) throw new HttpsError("invalid-argument", "bookingId is required.");

  const ref = db.collection("bookings").doc(bookingId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "Booking not found.");
  const booking = { id: snap.id, ...(snap.data() as Omit<Booking, "id">) };
  const claims = request.auth?.token as AccessClaims | undefined;
  const admin = isPlatformAdmin(claims);
  if (booking.providerUid !== uid && !admin) {
    throw new HttpsError("permission-denied", "Only the provider can refund this booking.");
  }
  if (booking.paymentStatus !== "paid") {
    throw new HttpsError("failed-precondition", "There is no completed payment to refund — cancel instead.");
  }
  if (booking.payoutStatus === "transferred") {
    throw new HttpsError(
      "failed-precondition",
      "This share was already paid out. Contact support for a manual review.",
    );
  }
  if (booking.status === "refunded") return { ok: true, status: "refunded", bookingId };

  const now = new Date().toISOString();
  if (stripeLiveConfigured() && (booking.stripeChargeId || booking.stripePaymentIntentId)) {
    const stripe = makeStripe();
    await stripe.refunds.create(
      {
        ...(booking.stripeChargeId
          ? { charge: booking.stripeChargeId }
          : { payment_intent: booking.stripePaymentIntentId as string }),
        metadata: { bookingId, providerUid: booking.providerUid },
      },
      { idempotencyKey: refundIdempotencyKey(bookingId) },
    );
  }
  await ref.update({
    paymentStatus: "refunded",
    payoutStatus: "reversed",
    status: "refunded",
    cancelReason: "Refunded by provider",
    refundedBy: uid,
    updatedAt: now,
  });
  return { ok: true, status: "refunded", bookingId };
});

async function reverseTransferForDispute(chargeId: string): Promise<void> {
  const bookings = await db.collection("bookings").where("stripeChargeId", "==", chargeId).limit(1).get();
  if (bookings.empty) return;
  const docSnap = bookings.docs[0]!;
  const booking = docSnap.data() as Booking;
  const transferId = booking.stripeTransferId;
  if (!transferId || !needsTransferReversal(booking)) {
    await docSnap.ref.update({
      status: "disputed",
      updatedAt: new Date().toISOString(),
    });
    return;
  }
  if (!stripeLiveConfigured()) {
    await docSnap.ref.update({
      status: "disputed",
      updatedAt: new Date().toISOString(),
    });
    return;
  }
  const stripe = makeStripe();
  await stripe.transfers.createReversal(transferId);
  await docSnap.ref.update({
    status: "disputed",
    payoutStatus: "reversed",
    updatedAt: new Date().toISOString(),
  });
}

type StoreDoc = {
  get: () => Promise<{ exists: boolean; data: () => unknown }>;
  set: (data: Record<string, unknown>, opts?: Record<string, unknown>) => Promise<unknown>;
  collection: (name: string) => { doc: (id: string) => StoreDoc };
};

type ManagedPaymentStore = {
  collection: (name: string) => { doc: (id: string) => StoreDoc };
};

/**
 * Handles the blueprint's checkout.session.completed event for Managed
 * Payments. Marks the `managed_payments` ledger doc paid, writes the
 * `payments` record, and persists the Stripe customer id for reuse.
 * Idempotent — Stripe may redeliver the event.
 */
export async function recordManagedCheckoutCompleted(
  session: Stripe.Checkout.Session,
  store: ManagedPaymentStore = db,
): Promise<boolean> {
  const paymentId = String(session.metadata?.managedPaymentId || "").trim();
  if (!paymentId) return false;
  if (!checkoutPaymentCollected(session.payment_status)) return false;
  const ref = store.collection("managed_payments").doc(paymentId);
  const snap = await ref.get();
  if (!snap.exists) return false;
  const row = snap.data() as { status?: string; buyerUid?: string; productId?: string };
  if (row.status === "paid") return false;
  const customerId =
    typeof session.customer === "string" ? session.customer : (session.customer?.id as string | undefined) || "";
  const paymentIntentId =
    typeof session.payment_intent === "string" ? session.payment_intent : (session.payment_intent?.id as string) || "";
  const now = new Date().toISOString();
  await ref.set(
    {
      status: "paid",
      stripeSessionId: session.id,
      stripeCustomerId: customerId,
      stripePaymentIntentId: paymentIntentId,
      amountTotal: session.amount_total || 0,
      paidAt: now,
      updatedAt: now,
    },
    { merge: true },
  );
  if (customerId && row.buyerUid) {
    await store
      .collection("users")
      .doc(row.buyerUid)
      .set({ stripeCustomerId: customerId, updatedAt: now }, { merge: true });
  }
  await store
    .collection("payments")
    .doc(session.id)
    .set(
      {
        id: session.id,
        managedPaymentId: paymentId,
        productId: String(row.productId || ""),
        buyerUid: String(row.buyerUid || ""),
        amountTotal: session.amount_total || 0,
        currency: session.currency || "aud",
        paymentIntentId,
        customerId,
        createdAt: now,
      },
      { merge: true },
    );
  return true;
}

/**
 * Marks a dining order paid after its Managed Payments checkout completes.
 * Idempotent — skips orders already past pending.
 */
export async function recordDiningOrderPaid(args: {
  propertyId: string;
  orderId: string;
  session: Stripe.Checkout.Session;
  paymentIntentId: string;
  store?: ManagedPaymentStore;
}): Promise<boolean> {
  const store = args.store || db;
  const ref = store.collection("properties").doc(args.propertyId).collection("dining_orders").doc(args.orderId);
  const snap = await ref.get();
  if (!snap.exists) return false;
  const row = snap.data() as { status?: string };
  if (row.status !== "pending") return false;
  const customerId =
    typeof args.session.customer === "string"
      ? args.session.customer
      : (args.session.customer?.id as string | undefined) || "";
  const now = new Date().toISOString();
  await ref.set(
    {
      status: "paid",
      stripeCheckoutSessionId: args.session.id,
      stripePaymentIntentId: args.paymentIntentId,
      stripeCustomerId: customerId,
      paidAt: now,
      updatedAt: now,
    },
    { merge: true },
  );
  return true;
}

export const stripeWebhook = onRequest(
  { cors: false, invoker: "public", secrets: [stripeSecret, stripeWebhookSecret] },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).send("Method not allowed");
      return;
    }
    const secret = stripeWebhookSigningSecret();
    if (!secret || !stripeLiveConfigured()) {
      res.status(503).send("Webhook is not configured");
      return;
    }
    const signature = String(req.headers["stripe-signature"] || "");
    const raw = req.rawBody;
    if (!raw || !signature) {
      res.status(400).send("Missing payload");
      return;
    }

    let event: Stripe.Event;
    try {
      event = makeStripe().webhooks.constructEvent(raw, signature, secret);
    } catch {
      res.status(400).send("Invalid signature");
      return;
    }

    try {
      if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
        const session = event.data.object as Stripe.Checkout.Session;
        if (String(session.metadata?.managedPaymentId || "").trim()) {
          await recordManagedCheckoutCompleted(session);
          res.json({ received: true, managed: true });
          return;
        }
        if (String(session.metadata?.diningOrderId || "").trim()) {
          const piRef = session.payment_intent;
          await recordDiningOrderPaid({
            propertyId: String(session.metadata?.propertyId || ""),
            orderId: String(session.metadata?.diningOrderId || ""),
            session,
            paymentIntentId: typeof piRef === "string" ? piRef : piRef?.id || "",
            store: db,
          });
          res.json({ received: true, dining: true });
          return;
        }
        // C4 — Partner subscription checkout carries no booking.
        const subUid = String(session.metadata?.subscriptionUid || "").trim();
        const sessionSubId =
          typeof session.subscription === "string"
            ? session.subscription
            : String(session.subscription?.id || "").trim();
        if (subUid && sessionSubId && !String(session.metadata?.bookingId || "").trim()) {
          if (stripeLiveConfigured()) {
            try {
              const sub = await makeStripe().subscriptions.retrieve(sessionSubId);
              await recordSubscriptionEvent({
                ...(sub as unknown as Record<string, unknown>),
                metadata: { ...(sub.metadata || {}), subscriptionUid: subUid },
              });
            } catch {
              /* subscription.* events still deliver the state */
            }
          }
          res.json({ received: true, subscription: true });
          return;
        }
        if (!checkoutPaymentCollected(session.payment_status)) {
          res.json({ received: true, skipped: "unpaid" });
          return;
        }
        const bookingId = String(session.metadata?.bookingId || "").trim();
        if (bookingId) {
          const stripe = makeStripe();
          const paymentIntentId =
            typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id || "";
          const chargeId = await chargeIdFromSession(stripe, session);
          await markBookingPaid({
            bookingId,
            sessionId: session.id,
            paymentIntentId,
            chargeId,
          });
          // Stripe may redeliver: record the session once for idempotency.
          const payRef = db.collection("payments").doc(session.id);
          await payRef.set({
            id: session.id,
            bookingId,
            amountTotal: session.amount_total || 0,
            currency: session.currency || "aud",
            paymentIntentId,
            chargeId,
            createdAt: new Date().toISOString(),
          });
        }
      } else if (event.type === "checkout.session.async_payment_failed") {
        const session = event.data.object as Stripe.Checkout.Session;
        const bookingId = String(session.metadata?.bookingId || "").trim();
        if (bookingId) {
          await db
            .collection("bookings")
            .doc(bookingId)
            .set(
              { paymentStatus: "unpaid", payoutStatus: "unpaid", updatedAt: new Date().toISOString() },
              { merge: true },
            );
        }
      } else if (
        event.type === "customer.subscription.created" ||
        event.type === "customer.subscription.updated" ||
        event.type === "customer.subscription.deleted"
      ) {
        await recordSubscriptionEvent(event.data.object as unknown as Parameters<typeof recordSubscriptionEvent>[0]);
        res.json({ received: true, subscription: true });
        return;
      } else if (event.type === "charge.dispute.created") {
        const dispute = event.data.object as Stripe.Dispute;
        const chargeId = typeof dispute.charge === "string" ? dispute.charge : dispute.charge?.id || "";
        if (chargeId) await reverseTransferForDispute(chargeId);
      } else if (event.type === "account.updated" || String(event.type) === "v2.core.account.updated") {
        const account = event.data.object as { id?: string };
        const accountId = String(account.id || "");
        if (accountId && stripeLiveConfigured()) {
          const active = await recipientTransfersActive(makeStripe(), accountId);
          const rows = await db.collection("connect_accounts").where("stripeAccountId", "==", accountId).limit(1).get();
          if (!rows.empty) {
            await rows.docs[0]!.ref.set(
              { transfersActive: active, payoutsActive: active, updatedAt: new Date().toISOString() },
              { merge: true },
            );
          }
        }
      }
    } catch (err) {
      console.error("stripeWebhook handler failed", err);
      res.status(500).send("Handler failed");
      return;
    }

    res.json({ received: true });
  },
);
