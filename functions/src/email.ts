import { FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import {
  EMAIL_BRAND,
  ticketConfirmationEmail,
  eventRsvpConfirmationEmail,
  catchUpProposalEmail,
  welcomeAccountEmail,
  broadcastAnnouncementEmail,
} from "../../shared/email-templates";
import { isMarketingKind } from "../../shared/notifications";
import type { Booking } from "../../shared/booking";
import { CALLABLE, db, isPlatformAdmin, requireAccount } from "./admin";
import { enforceRateLimit, isAnonymousAuth, noteAppCheck } from "./abuse";
import { sendPushIfAllowed } from "./notifications";

export interface SendBrandEmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
  kind?: string;
  metadata?: Record<string, unknown>;
  uid?: string;
}

export interface SendBrandEmailResult {
  ok: boolean;
  status: "queued" | "sent" | "opted_out" | "invalid_address";
  mailId?: string;
  error?: string;
}

/**
 * Normalizes email address and validates RFC standard format.
 */
function normalizeEmail(raw: string): string {
  return String(raw || "")
    .trim()
    .toLowerCase();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

/**
 * Universal email delivery engine.
 *
 * 1. Checks user marketing opt-out preferences (never suppresses transactional receipts).
 * 2. Writes to Firestore `mail` collection (integrating seamlessly with Firebase Trigger Email extension).
 * 3. Supports direct REST delivery via RESEND_API_KEY or POSTMARK_SERVER_TOKEN if present.
 * 4. Logs delivery state for audit & analytics without blocking callers.
 */
export async function sendBrandEmail(opts: SendBrandEmailOptions): Promise<SendBrandEmailResult> {
  const to = normalizeEmail(opts.to);
  if (!isValidEmail(to)) {
    return { ok: false, status: "invalid_address", error: "Invalid recipient email address" };
  }

  // Check marketing preferences if kind is marketing-related
  if (opts.uid && opts.kind && isMarketingKind(opts.kind)) {
    try {
      const userSnap = await db.collection("users").doc(opts.uid).get();
      if (userSnap.exists) {
        const u = userSnap.data();
        if (
          u?.marketingOptOut === true ||
          u?.preferences?.marketingEmail === false ||
          u?.notifications?.marketingEmail === false
        ) {
          return { ok: false, status: "opted_out" };
        }
      }
    } catch {
      /* proceed on error */
    }
  }

  const payload = {
    to: [to],
    from: EMAIL_BRAND.from,
    message: {
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    },
    metadata: {
      kind: opts.kind || "general",
      uid: opts.uid || "",
      ...(opts.metadata || {}),
    },
    status: "queued",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  let mailRef;
  try {
    mailRef = await db.collection("mail").add(payload);
  } catch (err) {
    return {
      ok: false,
      status: "queued",
      error: err instanceof Error ? err.message : "Failed to queue mail",
    };
  }

  // Optional: direct delivery if API key configured (Resend / Postmark)
  const resendKey = process.env.RESEND_API_KEY;
  const postmarkToken = process.env.POSTMARK_SERVER_TOKEN;

  if (resendKey) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: EMAIL_BRAND.from,
          to: [to],
          subject: opts.subject,
          html: opts.html,
          text: opts.text,
        }),
      });

      if (res.ok) {
        await mailRef.update({
          status: "sent",
          deliveredVia: "resend",
          sentAt: new Date().toISOString(),
          updatedAt: FieldValue.serverTimestamp(),
        });
        return { ok: true, status: "sent", mailId: mailRef.id };
      }
    } catch {
      /* stays queued in firestore */
    }
  } else if (postmarkToken) {
    try {
      const res = await fetch("https://api.postmarkapp.com/email", {
        method: "POST",
        headers: {
          "X-Postmark-Server-Token": postmarkToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          From: EMAIL_BRAND.from,
          To: to,
          Subject: opts.subject,
          HtmlBody: opts.html,
          TextBody: opts.text,
        }),
      });

      if (res.ok) {
        await mailRef.update({
          status: "sent",
          deliveredVia: "postmark",
          sentAt: new Date().toISOString(),
          updatedAt: FieldValue.serverTimestamp(),
        });
        return { ok: true, status: "sent", mailId: mailRef.id };
      }
    } catch {
      /* stays queued in firestore */
    }
  }

  return { ok: true, status: "queued", mailId: mailRef.id };
}

/**
 * Creates an in-app notification in `promotion_notifications` and pushes FCM alert if allowed.
 */
export async function createInAppNotification(input: {
  uid: string;
  kind: string;
  title: string;
  body: string;
  href: string;
  promotionId?: string;
}): Promise<string> {
  if (!input.uid || !input.title || !input.body) return "";
  const ref = await db.collection("promotion_notifications").add({
    uid: input.uid,
    kind: input.kind,
    title: input.title,
    body: input.body,
    href: input.href,
    promotionId: input.promotionId || "",
    read: false,
    at: new Date().toISOString(),
    createdAt: FieldValue.serverTimestamp(),
  });

  await sendPushIfAllowed(input.uid, input.kind, input.title, input.body, input.promotionId || "");
  return ref.id;
}

/**
 * Triggers ticket confirmation email + in-app notification for a paid/confirmed booking.
 */
export async function sendTicketReceiptEmail(bookingId: string): Promise<boolean> {
  if (!bookingId) return false;
  try {
    const bookingSnap = await db.collection("bookings").doc(bookingId).get();
    if (!bookingSnap.exists) return false;
    const booking = bookingSnap.data() as Booking;

    if (booking.paymentStatus !== "paid" && Number(booking.priceCents || 0) > 0) {
      return false;
    }
    if (booking.status === "cancelled" || booking.status === "refunded") {
      return false;
    }

    const raw = (bookingSnap.data() || {}) as Record<string, unknown>;
    const customerUid = String(raw.customerUid || "");

    let customerName = String(raw.customerName || "");
    let email = normalizeEmail(String(raw.customerEmail || ""));

    if (customerUid && (!customerName || !email)) {
      try {
        const uSnap = await db.collection("users").doc(customerUid).get();
        if (uSnap.exists) {
          const uData = uSnap.data();
          if (!customerName) customerName = String(uData?.displayName || uData?.name || "");
          if (!email) email = normalizeEmail(String(uData?.email || ""));
        }
      } catch {
        /* proceed */
      }
    }

    const eventId = String(raw.eventId || "");
    const eventSnap = await db.collection("events").doc(eventId).get();
    const eventData = eventSnap.exists ? eventSnap.data() : null;

    const eventTitle = String(eventData?.name || eventData?.title || raw.title || "AirPal Event");
    const eventDate = String(eventData?.date || raw.date || "Upcoming");
    const eventTime = String(eventData?.time || eventData?.timeLabel || raw.time || "Doors open");
    const venue = String(eventData?.venue || raw.suburb || "Event Venue");
    const city = String(eventData?.city || "Sydney");

    // 1. Dispatch in-app notification
    if (customerUid) {
      await createInAppNotification({
        uid: customerUid,
        kind: "ticket_confirmed",
        title: `Ticket Confirmed: ${eventTitle}`,
        body: `Your ticket for ${eventTitle} is ready. View admission pass and add to Wallet.`,
        href: `/ticket/${bookingId}`,
        promotionId: eventId,
      });
    }

    // 2. Dispatch email confirmation if customer email is available
    if (email) {
      const spots = Math.max(1, Number(raw.spots) || 1);
      const priceCents = Number(raw.priceCents) || 0;
      const currency = String(raw.currency || "aud").toUpperCase();
      const totalFormatted = priceCents > 0 ? `$${(priceCents / 100).toFixed(2)} ${currency}` : "Free Admission";

      const rendered = ticketConfirmationEmail({
        name: customerName,
        email,
        eventTitle,
        eventDate,
        eventTime,
        venue,
        city,
        ticketTier: String(raw.ticketTier || raw.tierId || "General Admission"),
        spots,
        totalFormatted,
        bookingId,
      });

      await sendBrandEmail({
        to: email,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        kind: "ticket_confirmed",
        metadata: { bookingId, eventId },
        uid: customerUid,
      });
    }

    return true;
  } catch (err) {
    console.error("sendTicketReceiptEmail failed", err);
    return false;
  }
}

/**
 * Triggers RSVP confirmation email + in-app notification for free events.
 */
export async function sendEventRsvpEmail(eventId: string, uid: string): Promise<boolean> {
  if (!eventId || !uid) return false;
  try {
    const eventSnap = await db.collection("events").doc(eventId).get();
    if (!eventSnap.exists) return false;
    const eventData = eventSnap.data();

    const userSnap = await db.collection("users").doc(uid).get();
    const userData = userSnap.exists ? userSnap.data() : null;

    const eventTitle = String(eventData?.name || eventData?.title || "AirPal Event");
    const eventDate = String(eventData?.date || "Upcoming");
    const eventTime = String(eventData?.time || eventData?.timeLabel || "Doors open");
    const venue = String(eventData?.venue || "Event Venue");
    const city = String(eventData?.city || "Sydney");

    // 1. Dispatch in-app notification
    await createInAppNotification({
      uid,
      kind: "event_rsvp",
      title: `RSVP Confirmed: ${eventTitle}`,
      body: `You are on the door list for ${eventTitle} on ${eventDate}.`,
      href: `/e/${eventId}`,
      promotionId: eventId,
    });

    // 2. Dispatch email confirmation if user email is known
    const email = normalizeEmail(userData?.email || "");
    if (email) {
      const rendered = eventRsvpConfirmationEmail({
        name: userData?.displayName || userData?.name,
        email,
        eventTitle,
        eventDate,
        eventTime,
        venue,
        city,
        eventId,
      });

      await sendBrandEmail({
        to: email,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        kind: "event_rsvp",
        metadata: { eventId },
        uid,
      });
    }

    return true;
  } catch (err) {
    console.error("sendEventRsvpEmail failed", err);
    return false;
  }
}

/**
 * Triggers Catch-up invitation email to recipient.
 */
export async function sendCatchUpNoticeEmail(catchupId: string): Promise<boolean> {
  if (!catchupId) return false;
  try {
    const catchupSnap = await db.collection("catchups").doc(catchupId).get();
    if (!catchupSnap.exists) return false;
    const row = catchupSnap.data();

    const targetUid = String(row?.targetOwnerUid || "");
    if (!targetUid) return false;

    const targetUserSnap = await db.collection("users").doc(targetUid).get();
    const targetEmail = normalizeEmail(targetUserSnap.data()?.email || "");
    if (!targetEmail) return false;

    const requesterUid = String(row?.requesterUid || "");
    const requesterSnap = await db.collection("users").doc(requesterUid).get();
    const requesterData = requesterSnap.exists ? requesterSnap.data() : null;

    const requesterName = String(row?.requesterName || requesterData?.displayName || requesterData?.name || "A friend");
    const requesterHandle = String(requesterData?.handle || "");
    const typeLabel = String(row?.type || "catchup")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());

    const rendered = catchUpProposalEmail({
      recipientName: targetUserSnap.data()?.displayName,
      recipientEmail: targetEmail,
      requesterName,
      requesterHandle,
      typeLabel,
      date: String(row?.date || "Soon"),
      time: String(row?.time || "14:00"),
      venue: String(row?.venue || ""),
      catchupId,
    });

    await sendBrandEmail({
      to: targetEmail,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      kind: "catchup_proposed",
      metadata: { catchupId },
      uid: targetUid,
    });

    return true;
  } catch (err) {
    console.error("sendCatchUpNoticeEmail failed", err);
    return false;
  }
}

/**
 * Triggers Welcome Email when a new account is registered.
 */
export async function sendWelcomeEmail(uid: string): Promise<boolean> {
  if (!uid) return false;
  try {
    const userSnap = await db.collection("users").doc(uid).get();
    if (!userSnap.exists) return false;
    const u = userSnap.data();
    const email = normalizeEmail(u?.email || "");
    if (!email) return false;

    // In-app welcome notice
    await createInAppNotification({
      uid,
      kind: "welcome",
      title: "Welcome to AirPal — Life Made Easy ✨",
      body: "Discover live concerts, passbook tickets, and set up your personal @handle.",
      href: "/welcome",
    });

    const rendered = welcomeAccountEmail({
      name: u?.displayName || u?.name,
      email,
      handle: u?.handle,
    });

    await sendBrandEmail({
      to: email,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      kind: "welcome",
      uid,
    });

    return true;
  } catch (err) {
    console.error("sendWelcomeEmail failed", err);
    return false;
  }
}

/**
 * Callable endpoint: Send a preview test email (admin only).
 */
export const testSendBrandEmail = onCall(CALLABLE, async (request) => {
  await noteAppCheck(request, "testSendBrandEmail");
  const uid = requireAccount(request, "Sign in as admin to test emails.");
  await enforceRateLimit(uid, "broadcast", isAnonymousAuth(request));

  if (!isPlatformAdmin(request.auth?.token as Parameters<typeof isPlatformAdmin>[0])) {
    throw new HttpsError("permission-denied", "Only platform admins can trigger test emails.");
  }

  const data = (request.data || {}) as { to?: string; template?: string };
  const to = normalizeEmail(data.to || request.auth?.token?.email || "");
  if (!isValidEmail(to)) {
    throw new HttpsError("invalid-argument", "Provide a valid destination email.");
  }

  const template = String(data.template || "welcome");
  let rendered;

  if (template === "ticket") {
    rendered = ticketConfirmationEmail({
      name: "AirPal Admin",
      email: to,
      eventTitle: "Sydney Symphony Under The Stars",
      eventDate: "Saturday, 28 November 2026",
      eventTime: "7:30 PM",
      venue: "The Domain, Royal Botanic Garden",
      city: "Sydney",
      ticketTier: "VIP Reserved",
      spots: 2,
      totalFormatted: "$95.00 AUD",
      bookingId: "test_demo_booking",
    });
  } else if (template === "rsvp") {
    rendered = eventRsvpConfirmationEmail({
      name: "AirPal Admin",
      email: to,
      eventTitle: "Indian Street Food & Music Fest",
      eventDate: "Sunday, 29 November 2026",
      eventTime: "12:00 PM",
      venue: "Parramatta Park",
      city: "Sydney",
      eventId: "demo_event",
    });
  } else if (template === "catchup") {
    rendered = catchUpProposalEmail({
      recipientName: "AirPal Admin",
      recipientEmail: to,
      requesterName: "Ava Mitchell",
      requesterHandle: "avamitchell",
      typeLabel: "Coffee Catch-up",
      date: "Friday, 30 October 2026",
      time: "10:00 AM",
      venue: "Paramount Coffee Project, Surry Hills",
      catchupId: "demo_catchup",
    });
  } else if (template === "broadcast") {
    rendered = broadcastAnnouncementEmail({
      title: "Weekend Pop-up Announced!",
      body: "We are taking over Crown St this Saturday with authentic street food stalls and live music.",
      authorName: "Surry Hills Foodies",
      authorHandle: "surryhillsfood",
      href: "https://airpal.me/@surryhillsfood",
      recipientEmail: to,
    });
  } else {
    rendered = welcomeAccountEmail({
      name: "AirPal Member",
      email: to,
      handle: "founder",
    });
  }

  const result = await sendBrandEmail({
    to,
    subject: `[TEST] ${rendered.subject}`,
    html: rendered.html,
    text: rendered.text,
    kind: "admin_test",
    metadata: { triggeredBy: uid, template },
    uid,
  });

  return { ok: true, result };
});
