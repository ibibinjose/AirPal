import { HANDLE_RE, isSafeBioHref, normalizeHandle } from "./bio";

/**
 * The V3 data contract is deliberately small. These types describe documents
 * written by Cloud Functions; they are not browser write models.
 */
export const V3_PROFILE_VISIBILITIES = ["public", "private"] as const;
export type V3ProfileVisibility = (typeof V3_PROFILE_VISIBILITIES)[number];

export const V3_PUBLICATION_STATES = ["draft", "published", "archived"] as const;
export type V3PublicationState = (typeof V3_PUBLICATION_STATES)[number];

export const V3_PLAN_STATES = ["open", "completed", "cancelled"] as const;
export type V3PlanState = (typeof V3_PLAN_STATES)[number];

export const V3_RSVP_STATES = ["invited", "going", "maybe", "declined"] as const;
export type V3RsvpState = (typeof V3_RSVP_STATES)[number];

export const V3_ORDER_STATES = ["pending", "paid", "refunded", "cancelled", "failed"] as const;
export type V3OrderState = (typeof V3_ORDER_STATES)[number];

export const V3_COHORT_STATES = ["open", "closed"] as const;
export type V3CohortState = (typeof V3_COHORT_STATES)[number];

export const V3_CONVERSATION_KINDS = ["direct", "plan", "event"] as const;
export type V3ConversationKind = (typeof V3_CONVERSATION_KINDS)[number];

/** The 14 canonical V3 collections. Anything else is server-only. */
export const V3_CANONICAL_COLLECTIONS = [
  "users",
  "handles",
  "profiles",
  "places",
  "events",
  "plans",
  "tickets",
  "orders",
  "deals",
  "dealClaims",
  "cohorts",
  "conversations",
  "audits",
  "rateLimits",
] as const;
export type V3CanonicalCollection = (typeof V3_CANONICAL_COLLECTIONS)[number];

/** The only client-readable subcollection in V3. */
export const V3_PLAN_MEMBERS_SUBCOLLECTION = "members" as const;

export const V3_TICKET_STATES = ["valid", "admitted", "void"] as const;
export type V3TicketState = (typeof V3_TICKET_STATES)[number];

export type V3Link = {
  id: string;
  label: string;
  href: string;
};

export type V3User = {
  uid: string;
  displayName: string;
  handle?: string;
  createdAt: unknown;
  updatedAt: unknown;
  /** Private account preferences only. Roles stay in auth custom claims. */
  preferences: {
    marketingEmail: boolean;
  };
  /**
   * Private id indexes. V3 rules deny every `list`, so the frontend reads its
   * own user doc, then fetches each referenced doc by id with `get`.
   * Maintained only by Cloud Functions via arrayUnion/arrayRemove.
   */
  planIds: string[];
  cohortIds: string[];
  ticketIds: string[];
  orderIds: string[];
  claimIds: string[];
  conversationIds: string[];
  blockedUids: string[];
};

/**
 * A handle is an intentionally minimal public routing record. Do not add
 * email, phone, birth date, membership, or payment fields here.
 */
export type V3Handle = {
  handle: string;
  ownerUid: string;
  active: boolean;
  updatedAt: unknown;
};

/**
 * profiles/{uid}. Private profiles remain readable to their owner, but the
 * public shape contains no email, phone, permissions, or trust state.
 */
export type V3Profile = {
  ownerUid: string;
  handle: string;
  visibility: V3ProfileVisibility;
  displayName: string;
  headline: string;
  about: string;
  city: string;
  avatarUrl?: string;
  coverUrl?: string;
  links: V3Link[];
  updatedAt: unknown;
};

export type V3PlanStop = {
  id: string;
  name: string;
  time?: string;
  placeId?: string;
  addedByUid: string;
  votes: number;
  voterUids: string[];
};

export type V3Plan = {
  ownerUid: string;
  visibility: V3ProfileVisibility;
  state: V3PlanState;
  title: string;
  description: string;
  city: string;
  startsAt: string;
  placeId?: string;
  inviteCode: string;
  stops: V3PlanStop[];
  attendeeCount: number;
  createdAt: unknown;
  updatedAt: unknown;
};

export type V3PlanMember = {
  uid: string;
  role: "owner" | "member";
  rsvp: V3RsvpState;
  updatedAt: unknown;
};

export type V3Event = {
  organiserUid: string;
  status: V3PublicationState;
  title: string;
  description: string;
  city: string;
  venueName: string;
  startsAt: string;
  endsAt?: string;
  capacity: number;
  issuedCount: number;
  ticketing: "none" | "complimentary" | "paid";
  priceCents: number;
  currency: string;
  createdAt: unknown;
  updatedAt: unknown;
};

export type V3Place = {
  ownerUid: string;
  status: V3PublicationState;
  name: string;
  description: string;
  city: string;
  category: string;
  address: string;
  createdAt: unknown;
  updatedAt: unknown;
};

export type V3Deal = {
  placeId: string;
  ownerUid: string;
  status: V3PublicationState;
  title: string;
  detail: string;
  redemptionsLimit?: number;
  redemptionCount: number;
  expiresAt?: string;
  createdAt: unknown;
  updatedAt: unknown;
};

export type V3Ticket = {
  eventId: string;
  holderUid: string;
  issuerUid: string;
  orderId?: string;
  state: V3TicketState;
  kind: "complimentary" | "paid";
  issuedAt: unknown;
  admittedAt?: unknown;
  admittedByUid?: string;
};

export type V3DealClaim = {
  dealId: string;
  placeId: string;
  claimantUid: string;
  issuerUid: string;
  state: "claimed" | "redeemed" | "cancelled";
  code: string;
  claimedAt: unknown;
  redeemedAt?: unknown;
};

export type V3Order = {
  purchaserUid: string;
  sellerUid: string;
  eventId: string;
  amountCents: number;
  currency: string;
  state: V3OrderState;
  idempotencyKey: string;
  provider: "stripe" | "stub";
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  createdAt: unknown;
  updatedAt: unknown;
  paidAt?: unknown;
  reconciledAt?: unknown;
};

export type V3Cohort = {
  hostUid: string;
  status: V3CohortState;
  title: string;
  description: string;
  city: string;
  arrivesAt?: string;
  memberUids: string[];
  memberCount: number;
  createdAt: unknown;
  updatedAt: unknown;
};

export type V3Conversation = {
  kind: V3ConversationKind;
  participantUids: string[];
  planId?: string;
  eventId?: string;
  lastMessageAt: unknown;
  lastMessagePreview: string;
  createdAt: unknown;
  updatedAt: unknown;
};

/** Server-only message shape; the messages subcollection denies client access. */
export type V3ConversationMessage = {
  senderUid: string;
  text: string;
  sentAt: unknown;
};

export type V3Audit = {
  action: string;
  actorUid: string;
  subjectType: string;
  subjectId: string;
  detail?: string;
  at: unknown;
};

export type V3BootstrapAccountRequest = {
  displayName?: string;
  marketingEmail?: boolean;
};

export type V3ClaimHandleRequest = {
  handle: string;
};

export type V3UpdateProfileRequest = {
  displayName?: string;
  headline?: string;
  about?: string;
  city?: string;
  avatarUrl?: string;
  coverUrl?: string;
  links?: V3Link[];
};

export type V3SetProfileVisibilityRequest = {
  visibility: V3ProfileVisibility;
};

export type V3CreatePlanRequest = {
  title: string;
  description?: string;
  city: string;
  startsAt: string;
  placeId?: string;
  visibility?: V3ProfileVisibility;
};

export type V3RespondToPlanRequest = {
  planId: string;
  rsvp: V3RsvpState;
};

export type V3CompletePlanRequest = {
  planId: string;
};

export type V3UpsertEventRequest = {
  eventId?: string;
  title: string;
  description?: string;
  city: string;
  venueName: string;
  startsAt: string;
  endsAt?: string;
  capacity?: number;
  ticketing?: V3Event["ticketing"];
  priceCents?: number;
  currency?: string;
  status?: Extract<V3PublicationState, "draft" | "published">;
};

export type V3IssueCompTicketRequest = {
  eventId: string;
  holderUid: string;
};

export type V3TicketActionRequest = {
  ticketId: string;
};

export type V3UpsertPlaceRequest = {
  placeId?: string;
  name: string;
  description?: string;
  city: string;
  category: string;
  address: string;
  status?: Extract<V3PublicationState, "draft" | "published">;
};

export type V3PublishDealRequest = {
  dealId?: string;
  placeId: string;
  title: string;
  detail: string;
  expiresAt?: string;
  redemptionsLimit?: number;
  status?: Extract<V3PublicationState, "draft" | "published">;
};

export type V3ClaimDealRequest = {
  dealId: string;
};

export type V3RedeemDealRequest = {
  claimId: string;
};

export type V3ReportRequest = {
  subjectType: "profile" | "plan" | "event" | "place" | "message";
  subjectId: string;
  reason: string;
  detail?: string;
};

export type V3InviteToPlanRequest = {
  planId: string;
  uid?: string;
  handle?: string;
};

export type V3AddPlanStopRequest = {
  planId: string;
  name: string;
  time?: string;
  placeId?: string;
};

export type V3VotePlanStopRequest = {
  planId: string;
  stopId: string;
};

export type V3IssueTicketRequest = {
  eventId: string;
  holderUid: string;
  kind?: "complimentary" | "paid";
  orderId?: string;
  idempotencyKey?: string;
};

export type V3CreateCheckoutRequest = {
  eventId: string;
  idempotencyKey: string;
};

export type V3RefundOrderRequest = {
  orderId: string;
  reason?: string;
};

export type V3ReconcileOrderRequest = {
  orderId: string;
};

export type V3CreateCohortRequest = {
  title: string;
  description?: string;
  city: string;
  arrivesAt?: string;
};

export type V3JoinCohortRequest = {
  cohortId: string;
};

export type V3LeaveCohortRequest = {
  cohortId: string;
};

export type V3BlockUserRequest = {
  uid: string;
};

export type V3UnblockUserRequest = {
  uid: string;
};

export type V3ListPublicQuery = {
  city?: string;
  limit?: number;
  cursor?: string;
};

export type V3FetchHandleRequest = {
  handle: string;
};

export type V3StartConversationRequest = {
  kind: V3ConversationKind;
  participantUids?: string[];
  planId?: string;
  eventId?: string;
};

export type V3SendMessageRequest = {
  conversationId: string;
  text: string;
};

export type V3ListAuditsRequest = {
  subjectType?: string;
  subjectId?: string;
  limit?: number;
};

const TEXT_MAX = 2_000;
const ID_RE = /^[A-Za-z0-9_-]{3,120}$/;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/;

export function isV3Visibility(value: unknown): value is V3ProfileVisibility {
  return value === "public" || value === "private";
}

export function isV3Rsvp(value: unknown): value is V3RsvpState {
  return value === "invited" || value === "going" || value === "maybe" || value === "declined";
}

export function isV3OrderState(value: unknown): value is V3OrderState {
  return value === "pending" || value === "paid" || value === "refunded" || value === "cancelled" || value === "failed";
}

export function isV3ConversationKind(value: unknown): value is V3ConversationKind {
  return value === "direct" || value === "plan" || value === "event";
}

export function isV3PublicationState(value: unknown): value is Extract<V3PublicationState, "draft" | "published"> {
  return value === "draft" || value === "published";
}

export function cleanV3Text(value: unknown, max = TEXT_MAX): string {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, max) : "";
}

export function requiredV3Text(value: unknown, field: string, max = TEXT_MAX): string {
  const text = cleanV3Text(value, max);
  if (!text) throw new Error(field + " is required.");
  return text;
}

export function parseV3Id(value: unknown, field = "ID"): string {
  const id = cleanV3Text(value, 120);
  if (!ID_RE.test(id)) throw new Error(field + " is invalid.");
  return id;
}

export function parseV3Handle(value: unknown): string {
  const raw = cleanV3Text(value, 30);
  const stripped = raw.replace(/^@+/, "");
  const handle = normalizeHandle(raw);
  if (stripped.toLowerCase() !== handle || !HANDLE_RE.test(handle)) {
    throw new Error("Handle is invalid.");
  }
  return handle;
}

export function parseV3IsoTime(value: unknown, field: string): string {
  const iso = cleanV3Text(value, 40);
  if (!ISO_DATE_RE.test(iso) || Number.isNaN(Date.parse(iso))) throw new Error(field + " must be an ISO date-time.");
  return iso;
}

export function parseV3OptionalIsoTime(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return parseV3IsoTime(value, field);
}

export function parseV3Capacity(value: unknown, fallback = 0): number {
  if (value === undefined || value === null || value === "") return fallback;
  const capacity = Number(value);
  if (!Number.isInteger(capacity) || capacity < 0 || capacity > 100_000) {
    throw new Error("Capacity must be a whole number from 0 to 100000.");
  }
  return capacity;
}

export function parseV3RedemptionLimit(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const limit = Number(value);
  if (!Number.isInteger(limit) || limit < 1 || limit > 1_000_000) {
    throw new Error("Redemption limit must be a whole number from 1 to 1000000.");
  }
  return limit;
}

export function sanitizeV3Links(value: unknown): V3Link[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new Error("Links must be a list.");
  if (value.length > 12) throw new Error("A profile can have at most 12 links.");
  const seen = new Set<string>();
  return value.map((raw, index) => {
    if (!raw || typeof raw !== "object") throw new Error("Link " + (index + 1) + " is invalid.");
    const row = raw as Record<string, unknown>;
    const id = cleanV3Text(row.id, 64) || "link-" + (index + 1);
    const label = requiredV3Text(row.label, "Link " + (index + 1) + " label", 80);
    const href = cleanV3Text(row.href, 500);
    if (!isSafeBioHref(href)) throw new Error("Link " + (index + 1) + " URL is invalid.");
    if (seen.has(id)) throw new Error("Link IDs must be unique.");
    seen.add(id);
    return { id, label, href };
  });
}

export function readableV3Profile(profile: V3Profile) {
  return {
    handle: profile.handle,
    visibility: profile.visibility,
    displayName: profile.displayName,
    headline: profile.headline,
    about: profile.about,
    city: profile.city,
    avatarUrl: profile.avatarUrl,
    coverUrl: profile.coverUrl,
    links: profile.links,
    updatedAt: profile.updatedAt,
  };
}

const IDEMPOTENCY_RE = /^[A-Za-z0-9_.:-]{8,120}$/;
const CURRENCY_RE = /^[A-Z]{3}$/;

export function parseV3IdempotencyKey(value: unknown, field = "Idempotency key"): string {
  const key = cleanV3Text(value, 120);
  if (!IDEMPOTENCY_RE.test(key)) throw new Error(field + " must be 8-120 safe characters.");
  return key;
}

export function parseV3MoneyCents(value: unknown, field: string, max = 99_999_999): number {
  if (value === undefined || value === null || value === "") throw new Error(field + " is required.");
  const cents = Number(value);
  if (!Number.isInteger(cents) || cents < 0 || cents > max) {
    throw new Error(field + " must be a whole cent amount from 0 to " + max + ".");
  }
  return cents;
}

export function parseV3Currency(value: unknown, fallback = "AUD"): string {
  if (value === undefined || value === null || value === "") return fallback;
  const code = cleanV3Text(value, 3).toUpperCase();
  if (!CURRENCY_RE.test(code)) throw new Error("Currency must be a 3-letter code.");
  return code;
}

export function parseV3ListLimit(value: unknown, fallback = 20, max = 50): number {
  if (value === undefined || value === null || value === "") return fallback;
  const limit = Number(value);
  if (!Number.isInteger(limit) || limit < 1 || limit > max) {
    throw new Error("Limit must be a whole number from 1 to " + max + ".");
  }
  return limit;
}

export function parseV3Uid(value: unknown, field = "User"): string {
  const uid = cleanV3Text(value, 128);
  if (uid.length < 3 || uid.length > 128) throw new Error(field + " is invalid.");
  return uid;
}

/** Public discovery projections. Never include owner contact, trust, or money state. */
export function publicV3Place(place: V3Place & { id: string }) {
  return {
    id: place.id,
    name: place.name,
    description: place.description,
    city: place.city,
    category: place.category,
    address: place.address,
    status: place.status,
    updatedAt: place.updatedAt,
  };
}

export function publicV3Event(event: V3Event & { id: string }) {
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    city: event.city,
    venueName: event.venueName,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    capacity: event.capacity,
    ticketing: event.ticketing,
    priceCents: event.priceCents,
    currency: event.currency,
    status: event.status,
    updatedAt: event.updatedAt,
  };
}

export function publicV3Deal(deal: V3Deal & { id: string }) {
  return {
    id: deal.id,
    placeId: deal.placeId,
    title: deal.title,
    detail: deal.detail,
    expiresAt: deal.expiresAt,
    status: deal.status,
    updatedAt: deal.updatedAt,
  };
}
