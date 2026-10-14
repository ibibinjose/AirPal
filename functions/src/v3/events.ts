import { FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import {
  cleanV3Text,
  isV3PublicationState,
  parseV3Capacity,
  parseV3Currency,
  parseV3Id,
  parseV3IdempotencyKey,
  parseV3IsoTime,
  parseV3MoneyCents,
  parseV3OptionalIsoTime,
  parseV3Uid,
  requiredV3Text,
  type V3Event,
  type V3IssueTicketRequest,
  type V3Ticket,
  type V3TicketActionRequest,
  type V3UpsertEventRequest,
} from "../../../shared/v3-contract";
import type { AccessClaims } from "../../../shared/airpal-security";
import { CALLABLE, db, isPlatformAdmin, requireAccount } from "../admin";
import { enforceRateLimit, noteAppCheck } from "../abuse";
import { indexUserDoc, randomDocId, v3Arg, v3Clean, v3IdemDocId, writeV3Audit } from "./common";

type V3EventTicketing = V3Event["ticketing"];

function ticketingFrom(data: V3UpsertEventRequest): V3EventTicketing {
  const ticketing = data.ticketing || "none";
  if (ticketing !== "none" && ticketing !== "complimentary" && ticketing !== "paid") {
    throw new HttpsError("invalid-argument", "Ticketing is invalid.");
  }
  return ticketing;
}

/** Create or update an organiser-owned event. Publishing is audited. */
export const v3UpsertEvent = onCall(CALLABLE, async (request) => {
  await noteAppCheck(request, "v3UpsertEvent");
  const uid = requireAccount(request, "Create an email account to host events.");
  await enforceRateLimit(uid, "v3Event", false);
  const data = (request.data || {}) as V3UpsertEventRequest;
  const ticketing = ticketingFrom(data);
  const input = v3Arg(() => ({
    eventId: data.eventId === undefined ? undefined : parseV3Id(data.eventId, "Event"),
    title: requiredV3Text(data.title, "Title", 140),
    description: cleanV3Text(data.description, 2000),
    city: requiredV3Text(data.city, "City", 80),
    venueName: requiredV3Text(data.venueName, "Venue", 140),
    startsAt: parseV3IsoTime(data.startsAt, "Start"),
    endsAt: parseV3OptionalIsoTime(data.endsAt, "End"),
    capacity: parseV3Capacity(data.capacity),
    priceCents: ticketing === "paid" ? parseV3MoneyCents(data.priceCents, "Price") : 0,
    currency: parseV3Currency(data.currency),
    status: data.status === undefined ? "draft" : data.status,
  }));
  if (!isV3PublicationState(input.status)) throw new HttpsError("invalid-argument", "Status is invalid.");

  const eventId = input.eventId || randomDocId("event");
  const ref = db.collection("events").doc(eventId);
  const snap = await ref.get();
  const existing = snap.data() as V3Event | undefined;
  if (
    snap.exists &&
    existing?.organiserUid !== uid &&
    !isPlatformAdmin(request.auth?.token as AccessClaims | undefined)
  ) {
    throw new HttpsError("permission-denied", "Only the organiser can edit this event.");
  }
  const write: Record<string, unknown> = {
    organiserUid: existing?.organiserUid || uid,
    status: input.status,
    title: input.title,
    description: input.description,
    city: input.city,
    venueName: input.venueName,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    capacity: input.capacity,
    ticketing,
    priceCents: input.priceCents,
    currency: input.currency,
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (!snap.exists) {
    write.issuedCount = 0;
    write.createdAt = FieldValue.serverTimestamp();
  }
  await ref.set(v3Clean(write), { merge: true });
  if (input.status === "published" && existing?.status !== "published") {
    await writeV3Audit({ action: "event.publish", actorUid: uid, subjectType: "event", subjectId: eventId });
  }
  return { eventId, status: input.status };
});

/**
 * Issue a ticket. Complimentary tickets come from the organiser; paid tickets
 * are issued only against a paid order for the same event and holder. Capacity
 * and idempotency are decided inside one transaction.
 */
export const v3IssueTicket = onCall(CALLABLE, async (request) => {
  await noteAppCheck(request, "v3IssueTicket");
  const uid = requireAccount(request, "Sign in to issue tickets.");
  await enforceRateLimit(uid, "v3Event", false);
  const data = (request.data || {}) as V3IssueTicketRequest;
  const input = v3Arg(() => ({
    eventId: parseV3Id(data.eventId, "Event"),
    holderUid: parseV3Uid(data.holderUid, "Holder"),
    kind: data.kind || "complimentary",
    orderId: data.orderId === undefined ? undefined : parseV3Id(data.orderId, "Order"),
  }));
  if (input.kind !== "complimentary" && input.kind !== "paid") {
    throw new HttpsError("invalid-argument", "Ticket kind is invalid.");
  }
  const admin = isPlatformAdmin(request.auth?.token as AccessClaims | undefined);
  const eventRef = db.collection("events").doc(input.eventId);
  const eventSnap = await eventRef.get();
  const event = eventSnap.data() as V3Event | undefined;
  if (!eventSnap.exists || !event) throw new HttpsError("not-found", "Event not found.");
  if (event.organiserUid !== uid && !admin) {
    throw new HttpsError("permission-denied", "Only the organiser can issue tickets.");
  }
  if (input.kind === "paid") {
    if (!input.orderId) throw new HttpsError("invalid-argument", "Paid tickets need an order.");
    const orderSnap = await db.collection("orders").doc(input.orderId).get();
    const order = orderSnap.data() as { state?: string; purchaserUid?: string; eventId?: string } | undefined;
    if (!orderSnap.exists || !order) throw new HttpsError("not-found", "Order not found.");
    if (order.state !== "paid" || order.purchaserUid !== input.holderUid || order.eventId !== input.eventId) {
      throw new HttpsError("failed-precondition", "That order is not paid for this event and holder.");
    }
  } else if (event.ticketing === "paid" && !admin) {
    throw new HttpsError("failed-precondition", "This is a paid event. Issue through a paid order.");
  }

  const ticketId = data.idempotencyKey
    ? v3IdemDocId(
        "t",
        input.holderUid,
        v3Arg(() => parseV3IdempotencyKey(data.idempotencyKey)),
      )
    : input.kind === "paid" && input.orderId
      ? v3IdemDocId("t", input.holderUid, `order-${input.orderId}`)
      : randomDocId("t");
  const ticketRef = db.collection("tickets").doc(ticketId);
  const outcome = await db.runTransaction(async (tx) => {
    const [ticketSnap, liveEventSnap] = await Promise.all([tx.get(ticketRef), tx.get(eventRef)]);
    if (ticketSnap.exists) {
      return { ticketId, created: false as const };
    }
    const live = liveEventSnap.data() as V3Event | undefined;
    const capacity = Number(live?.capacity || 0);
    const issued = Number(live?.issuedCount || 0);
    if (capacity > 0 && issued >= capacity) throw new HttpsError("failed-precondition", "This event is sold out.");
    tx.set(
      ticketRef,
      v3Clean({
        eventId: input.eventId,
        holderUid: input.holderUid,
        issuerUid: uid,
        orderId: input.orderId,
        state: "valid",
        kind: input.kind,
        issuedAt: FieldValue.serverTimestamp(),
      }),
    );
    tx.set(eventRef, { issuedCount: issued + 1, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return { ticketId, created: true as const };
  });
  if (outcome.created) {
    await indexUserDoc(input.holderUid, "ticketIds", ticketId);
    await writeV3Audit({
      action: "ticket.issue",
      actorUid: uid,
      subjectType: "ticket",
      subjectId: ticketId,
      detail: `${input.kind} for ${input.eventId}`,
    });
  }
  return outcome;
});

async function loadEntitledTicket(ticketId: string, uid: string, claims: AccessClaims | undefined) {
  const ref = db.collection("tickets").doc(ticketId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "Ticket not found.");
  const ticket = { id: snap.id, ...(snap.data() as V3Ticket) };
  let eventTitle = "";
  let organiserUid = "";
  if (ticket.eventId) {
    const eventSnap = await db.collection("events").doc(ticket.eventId).get();
    eventTitle = String(eventSnap.data()?.title || "");
    organiserUid = String(eventSnap.data()?.organiserUid || "");
  }
  const entitled = isPlatformAdmin(claims) || ticket.issuerUid === uid || (organiserUid !== "" && organiserUid === uid);
  if (!entitled) throw new HttpsError("permission-denied", "Only the host team can verify tickets.");
  return { ref, ticket, eventTitle };
}

function gateCard(ticket: V3Ticket & { id: string }, eventTitle: string) {
  const valid = ticket.state === "valid";
  return {
    ticketId: ticket.id,
    eventId: ticket.eventId,
    eventTitle,
    kind: ticket.kind,
    state: ticket.state,
    valid,
    reason: valid ? null : ticket.state === "admitted" ? "already_admitted" : "void",
  };
}

/** Read-only ticket check for the door team. Holders never self-verify. */
export const v3VerifyTicket = onCall(CALLABLE, async (request) => {
  await noteAppCheck(request, "v3VerifyTicket");
  const uid = requireAccount(request, "Sign in to verify tickets.");
  await enforceRateLimit(uid, "v3Event", false);
  const data = (request.data || {}) as V3TicketActionRequest;
  const ticketId = v3Arg(() => parseV3Id(data.ticketId, "Ticket"));
  const { ticket, eventTitle } = await loadEntitledTicket(
    ticketId,
    uid,
    request.auth?.token as AccessClaims | undefined,
  );
  return gateCard(ticket, eventTitle);
});

/** Admit a ticket once. Double scans return the first stamp without rewriting. */
export const v3AdmitTicket = onCall(CALLABLE, async (request) => {
  await noteAppCheck(request, "v3AdmitTicket");
  const uid = requireAccount(request, "Sign in to admit tickets.");
  await enforceRateLimit(uid, "v3Event", false);
  const data = (request.data || {}) as V3TicketActionRequest;
  const ticketId = v3Arg(() => parseV3Id(data.ticketId, "Ticket"));
  const { ref } = await loadEntitledTicket(ticketId, uid, request.auth?.token as AccessClaims | undefined);
  const outcome = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const ticket = snap.data() as V3Ticket | undefined;
    if (!snap.exists || !ticket) throw new HttpsError("not-found", "Ticket not found.");
    if (ticket.state === "admitted") {
      return { ticketId, already: true as const, admittedAt: ticket.admittedAt };
    }
    if (ticket.state !== "valid") throw new HttpsError("failed-precondition", "This ticket cannot be admitted.");
    tx.set(ref, { state: "admitted", admittedByUid: uid, admittedAt: FieldValue.serverTimestamp() }, { merge: true });
    return { ticketId, already: false as const };
  });
  if (!outcome.already) {
    await writeV3Audit({ action: "ticket.admit", actorUid: uid, subjectType: "ticket", subjectId: ticketId });
  }
  return outcome;
});
