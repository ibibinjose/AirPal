import { doc, getDoc, onSnapshot, type Firestore } from "firebase/firestore";
import type {
  V3Cohort,
  V3Deal,
  V3DealClaim,
  V3Event,
  V3Order,
  V3Place,
  V3Profile,
  V3Ticket,
  V3User,
} from "@shared/v3-contract";
import { requireV3Adapters } from "./gate";

/**
 * Read-only V3 Firestore adapters. These query/cache adapters replace direct
 * domain writes: they use getDoc/query/onSnapshot only. Security rules remain
 * the authority; parsers fail closed (null) on unexpected shapes so the UI
 * never renders half-validated records.
 */

type V3Doc<T> = T & { id: string };

function asRecord(data: unknown): Record<string, unknown> | null {
  return typeof data === "object" && data !== null ? (data as Record<string, unknown>) : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  if (!value.every((row) => typeof row === "string")) return null;
  return [...value];
}

export function parseV3User(id: string, data: unknown): V3Doc<V3User> | null {
  const row = asRecord(data);
  const displayName = row ? asString(row.displayName) : null;
  if (!row || !displayName || asString(row.uid) !== id) return null;
  const index = (key: string) => asStringArray(row[key]) || [];
  return {
    id,
    uid: id,
    displayName,
    handle: asString(row.handle) || undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    preferences: { marketingEmail: (asRecord(row.preferences)?.marketingEmail as boolean) === true },
    cohortIds: index("cohortIds"),
    ticketIds: index("ticketIds"),
    orderIds: index("orderIds"),
    claimIds: index("claimIds"),
    conversationIds: index("conversationIds"),
    blockedUids: index("blockedUids"),
  };
}

export function parseV3PublishedPlace(id: string, data: unknown): V3Doc<V3Place> | null {
  const row = asRecord(data);
  if (!row || row.status !== "published") return null;
  const name = asString(row.name);
  const city = asString(row.city);
  const category = asString(row.category);
  const address = asString(row.address);
  const ownerUid = asString(row.ownerUid);
  if (!name || !city || !category || !address || !ownerUid) return null;
  return {
    id,
    ownerUid,
    status: "published",
    name,
    description: asString(row.description) || "",
    city,
    category,
    address,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function parseV3PublishedEvent(id: string, data: unknown): V3Doc<V3Event> | null {
  const row = asRecord(data);
  if (!row || row.status !== "published") return null;
  const title = asString(row.title);
  const city = asString(row.city);
  const venueName = asString(row.venueName);
  const startsAt = asString(row.startsAt);
  const organiserUid = asString(row.organiserUid);
  const ticketing = asString(row.ticketing);
  if (!title || !city || !venueName || !startsAt || !organiserUid) return null;
  if (ticketing !== "none" && ticketing !== "complimentary" && ticketing !== "paid") return null;
  return {
    id,
    organiserUid,
    status: "published",
    title,
    description: asString(row.description) || "",
    city,
    venueName,
    startsAt,
    endsAt: asString(row.endsAt) || undefined,
    capacity: typeof row.capacity === "number" ? row.capacity : 0,
    issuedCount: typeof row.issuedCount === "number" ? row.issuedCount : 0,
    ticketing,
    priceCents: typeof row.priceCents === "number" ? row.priceCents : 0,
    currency: asString(row.currency) || "AUD",
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function parseV3PublishedDeal(id: string, data: unknown): V3Doc<V3Deal> | null {
  const row = asRecord(data);
  if (!row || row.status !== "published") return null;
  const placeId = asString(row.placeId);
  const ownerUid = asString(row.ownerUid);
  const title = asString(row.title);
  const detail = asString(row.detail);
  if (!placeId || !ownerUid || !title || !detail) return null;
  return {
    id,
    placeId,
    ownerUid,
    status: "published",
    title,
    detail,
    redemptionsLimit: typeof row.redemptionsLimit === "number" ? row.redemptionsLimit : undefined,
    redemptionCount: typeof row.redemptionCount === "number" ? row.redemptionCount : 0,
    expiresAt: asString(row.expiresAt) || undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function parseV3Profile(id: string, viewerUid: string | null, data: unknown): V3Doc<V3Profile> | null {
  const row = asRecord(data);
  if (!row || asString(row.ownerUid) !== id) return null;
  const visibility = asString(row.visibility);
  if (visibility !== "public" && visibility !== "private") return null;
  if (visibility === "private" && viewerUid !== id) return null;
  const links = Array.isArray(row.links) ? row.links : [];
  if (!links.every((link) => asRecord(link) && asString((link as Record<string, unknown>).href))) return null;
  return {
    id,
    ownerUid: id,
    handle: asString(row.handle) || "",
    visibility,
    displayName: asString(row.displayName) || "",
    headline: asString(row.headline) || "",
    about: asString(row.about) || "",
    city: asString(row.city) || "",
    avatarUrl: asString(row.avatarUrl) || undefined,
    coverUrl: asString(row.coverUrl) || undefined,
    links: links as V3Profile["links"],
    updatedAt: row.updatedAt,
  };
}

export function parseV3Ticket(id: string, data: unknown): V3Doc<V3Ticket> | null {
  const row = asRecord(data);
  const eventId = row ? asString(row.eventId) : null;
  const holderUid = row ? asString(row.holderUid) : null;
  const issuerUid = row ? asString(row.issuerUid) : null;
  const state = row ? asString(row.state) : null;
  const kind = row ? asString(row.kind) : null;
  if (!row || !eventId || !holderUid || !issuerUid) return null;
  if (state !== "valid" && state !== "admitted" && state !== "void") return null;
  if (kind !== "complimentary" && kind !== "paid") return null;
  return {
    id,
    eventId,
    holderUid,
    issuerUid,
    orderId: asString(row.orderId) || undefined,
    state,
    kind,
    issuedAt: row.issuedAt,
    admittedAt: row.admittedAt,
    admittedByUid: asString(row.admittedByUid) || undefined,
  };
}

export function parseV3Order(id: string, data: unknown): V3Doc<V3Order> | null {
  const row = asRecord(data);
  const purchaserUid = row ? asString(row.purchaserUid) : null;
  const sellerUid = row ? asString(row.sellerUid) : null;
  const eventId = row ? asString(row.eventId) : null;
  const state = row ? asString(row.state) : null;
  if (!row || !purchaserUid || !sellerUid || !eventId) return null;
  if (state !== "pending" && state !== "paid" && state !== "refunded" && state !== "cancelled" && state !== "failed") {
    return null;
  }
  return {
    id,
    purchaserUid,
    sellerUid,
    eventId,
    amountCents: typeof row.amountCents === "number" ? row.amountCents : 0,
    currency: asString(row.currency) || "AUD",
    state,
    idempotencyKey: asString(row.idempotencyKey) || "",
    provider: row.provider === "stripe" ? "stripe" : "stub",
    stripeSessionId: asString(row.stripeSessionId) || undefined,
    stripePaymentIntentId: asString(row.stripePaymentIntentId) || undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    paidAt: row.paidAt,
    reconciledAt: row.reconciledAt,
  };
}

export function parseV3DealClaim(id: string, data: unknown): V3Doc<V3DealClaim> | null {
  const row = asRecord(data);
  const dealId = row ? asString(row.dealId) : null;
  const claimantUid = row ? asString(row.claimantUid) : null;
  const issuerUid = row ? asString(row.issuerUid) : null;
  const state = row ? asString(row.state) : null;
  const code = row ? asString(row.code) : null;
  if (!row || !dealId || !claimantUid || !issuerUid || !code) return null;
  if (state !== "claimed" && state !== "redeemed" && state !== "cancelled") return null;
  return {
    id,
    dealId,
    placeId: asString(row.placeId) || "",
    claimantUid,
    issuerUid,
    state,
    code,
    claimedAt: row.claimedAt,
    redeemedAt: row.redeemedAt,
  };
}

export function parseV3Cohort(id: string, data: unknown): V3Doc<V3Cohort> | null {
  const row = asRecord(data);
  const hostUid = row ? asString(row.hostUid) : null;
  const status = row ? asString(row.status) : null;
  const title = row ? asString(row.title) : null;
  const members = row ? asStringArray(row.memberUids) : null;
  if (!row || !hostUid || !title || !members) return null;
  if (status !== "open" && status !== "closed") return null;
  return {
    id,
    hostUid,
    status,
    title,
    description: asString(row.description) || "",
    city: asString(row.city) || "",
    arrivesAt: asString(row.arrivesAt) || undefined,
    memberUids: members,
    memberCount: typeof row.memberCount === "number" ? row.memberCount : members.length,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function reader<T>(collectionName: string, parse: (id: string, data: unknown) => T | null) {
  return {
    async get(db: Firestore, id: string): Promise<T | null> {
      requireV3Adapters();
      const snap = await getDoc(doc(db, collectionName, id));
      if (!snap.exists()) return null;
      return parse(snap.id, snap.data());
    },
    subscribe(db: Firestore, id: string, next: (value: T | null) => void): () => void {
      requireV3Adapters();
      return onSnapshot(doc(db, collectionName, id), (snap) => {
        next(snap.exists() ? parse(snap.id, snap.data()) : null);
      });
    },
  };
}

export const v3Users = reader("users", parseV3User);
export const v3Places = reader("places", parseV3PublishedPlace);
export const v3Events = reader("events", parseV3PublishedEvent);
export const v3Deals = reader("deals", parseV3PublishedDeal);
export const v3Tickets = reader("tickets", parseV3Ticket);
export const v3Orders = reader("orders", parseV3Order);
export const v3DealClaims = reader("dealClaims", parseV3DealClaim);
export const v3Cohorts = reader("cohorts", parseV3Cohort);
