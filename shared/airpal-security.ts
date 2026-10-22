import type { UserRole } from "./airpal-data";
import type { TicketAdmitReason } from "./booking";

export type PropertyMemberRole = "host_admin" | "staff";

export type AccessClaims = {
  platform_admin?: boolean;
  role?: UserRole;
  properties?: Record<string, PropertyMemberRole>;
};

export const FUNCTIONS_REGION = "us-central1";

export const CALLABLES = {
  ensurePlatformAdmin: "ensurePlatformAdmin",
  setPropertyMember: "setPropertyMember",
  claimDeal: "claimDeal",
  redeemVoucher: "redeemVoucher",
  providePartnerDeal: "providePartnerDeal",
  submitPartnerClaim: "submitPartnerClaim",
  reviewPartnerClaim: "reviewPartnerClaim",
  backfillOwnerClaims: "backfillOwnerClaims",
  claimFreeVenuePresence: "claimFreeVenuePresence",
  upsertBusinessListing: "upsertBusinessListing",
  upsertBusinessDeal: "upsertBusinessDeal",
  deleteBusinessListing: "deleteBusinessListing",
  upsertEvent: "upsertEvent",
  upsertEventStall: "upsertEventStall",
  saveAttendeeStall: "saveAttendeeStall",
  submitVenueRating: "submitVenueRating",
  checkHandleAvailable: "checkHandleAvailable",
  createBusinessProfile: "createBusinessProfile",
  updateBusinessProfile: "updateBusinessProfile",
  setBioOffer: "setBioOffer",
  recordBioTap: "recordBioTap",
  getBioLinkStats: "getBioLinkStats",
  claimBioOffer: "claimBioOffer",
  transferHandle: "transferHandle",
  listBioDirectory: "listBioDirectory",
  recordAnalyticsBatch: "recordAnalyticsBatch",
  runAnalyticsAggregation: "runAnalyticsAggregation",
  createEventBooking: "createEventBooking",
  createBookingCheckoutSession: "createBookingCheckoutSession",
  createConnectAccountLink: "createConnectAccountLink",
  refreshConnectAccount: "refreshConnectAccount",
  createConnectLoginLink: "createConnectLoginLink",
  releaseHeldPayouts: "releaseHeldPayouts",
  completePaidBooking: "completePaidBooking",
  refundPaidBooking: "refundPaidBooking",
  createSubscriptionCheckout: "createSubscriptionCheckout",
  createSubscriptionPortal: "createSubscriptionPortal",
  upsertEventCoupon: "upsertEventCoupon",
  validateEventCoupon: "validateEventCoupon",
  listEventCoupons: "listEventCoupons",
  announceEventToGuests: "announceEventToGuests",
  createManagedProduct: "createManagedProduct",
  createManagedCheckoutSession: "createManagedCheckoutSession",
  scheduleCatchUp: "scheduleCatchUp",
  completeAccountSignup: "completeAccountSignup",
  confirmAdultSignup: "confirmAdultSignup",
  ensureUserProfile: "ensureUserProfile",
  loginWithPhonePassword: "loginWithPhonePassword",
  shareHere: "shareHere",
  stopHere: "stopHere",
  startWave: "startWave",
  waveAt: "waveAt",
  stopWave: "stopWave",
  getPulseByToken: "getPulseByToken",
  getBioPulse: "getBioPulse",
  submitPulseResponse: "submitPulseResponse",
  createPulse: "createPulse",
  publishPulse: "publishPulse",
  acknowledgePulseIssue: "acknowledgePulseIssue",
  resolvePulseIssue: "resolvePulseIssue",
  setPulseStatus: "setPulseStatus",
  recordPulseFollowup: "recordPulseFollowup",
  setBirthdayAlertPrefs: "setBirthdayAlertPrefs",
  verifyTicket: "verifyTicket",
  admitTicket: "admitTicket",
  verifyPromotionRedemption: "verifyPromotionRedemption",
  consumePromotionRedemption: "consumePromotionRedemption",
  checkInGuest: "checkInGuest",
  closeGuestlist: "closeGuestlist",
  listDoorTeam: "listDoorTeam",
  joinGuestlistSignup: "joinGuestlistSignup",
  listGuestlistSignups: "listGuestlistSignups",
  listBioSubscribers: "listBioSubscribers",
  unsubscribeGuestlist: "unsubscribeGuestlist",
} as const;

/** Gate scan: read-only ticket check. Organiser, provider, or admin only. */
export type VerifyTicketRequest = { ticketId: string };

export type VerifyTicketResponse = {
  ticketId: string;
  eventId: string;
  eventName: string;
  title: string;
  date: string;
  time: string;
  spots: number;
  paymentStatus: string;
  displayPaid: boolean;
  status: string;
  valid: boolean;
  reason: TicketAdmitReason | null;
  admittedAt: string | null;
};

/** Gate scan: admit a verified ticket. Idempotent — double scans return the first admission. */
export type AdmitTicketRequest = { ticketId: string };

export type AdmitTicketResponse = {
  ticketId: string;
  admittedAt: string;
  already: boolean;
};

/**
 * Merchant scan: read-only promotion redemption check. The promotion owner
 * or a platform admin only — guests can't validate each other's codes.
 */
export type VerifyPromotionRedemptionRequest = { promotionId: string; code: string };

export type VerifyPromotionRedemptionResponse = {
  promotionId: string;
  code: string;
  title: string;
  status: string;
  pointsSpent: number;
  redeemedAt: string | null;
  valid: boolean;
  reason: "already_redeemed" | "expired" | "not_found" | null;
};

/** Merchant scan: consume a verified redemption. Fails when already spent. */
export type ConsumePromotionRedemptionRequest = { promotionId: string; code: string };

export type ConsumePromotionRedemptionResponse = {
  promotionId: string;
  code: string;
  redeemedAt: string;
};

/** Door check-in for one guestlist row. Door team or admin only. */
export type CheckInGuestRequest = { scope: "event"; id: string; entryId: string };

export type CheckInGuestResponse = {
  scope: "event";
  id: string;
  entryId: string;
  checkedInAt: string;
  already: boolean;
};

/** Close the list after doors: still-going rows become no-shows. */
export type CloseGuestlistRequest = { scope: "event"; id: string };

export type CloseGuestlistResponse = { scope: "event"; id: string; closed: number };

/** Door-team roster with display names. Door team or admin only. */
export type ListDoorTeamRequest = { scope: "event"; id: string };

export type ListDoorTeamResponse = {
  scope: "event";
  id: string;
  members: Array<{ uid: string; name: string; handle?: string; owner: boolean }>;
};

/** AirPal Guestlist marketing signup. Anonymous auth OK, rate-limited. */
export type JoinGuestlistSignupRequest = {
  name: string;
  city: string;
  email: string;
  interests: string[];
  source?: string;
};

export type JoinGuestlistSignupResponse = { ok: boolean; email: string };

/** Admin-only audience list with city/interest filters. */
export type ListGuestlistSignupsRequest = {
  city?: string;
  interest?: string;
  limit?: number;
  startAfter?: string;
};

export type GuestlistSignupRow = {
  email: string;
  name: string;
  city: string;
  interests: string[];
  source: string;
  consentAt: string;
  createdAt: string;
  unsubscribedAt: string | null;
};

export type ListGuestlistSignupsResponse = {
  rows: GuestlistSignupRow[];
  hasMore: boolean;
  total: number;
};

/** Owner-scoped subscriber list for one bio (source === handle). */
export type ListBioSubscribersRequest = { handle: string };

export type BioSubscriberRow = {
  email: string;
  name: string;
  city: string;
  consentAt: string;
  createdAt: string;
};

export type ListBioSubscribersResponse = {
  rows: BioSubscriberRow[];
  total: number;
};

/** One-click unsubscribe. Always OK, even for unknown addresses. */
export type UnsubscribeGuestlistRequest = { email: string };

export type UnsubscribeGuestlistResponse = { ok: boolean };

export type CompleteAccountSignupRequest = {
  handle: string;
  name: string;
  email: string;
  /** YYYY-MM-DD birth date. Server verifies 18+; stores birthdayMonth only (not full DOB). */
  birthDate: string;
  /** Explicit Adult 18+ checkbox consent. Required. */
  adultConsent: boolean;
};

export type ConfirmAdultSignupRequest = {
  /** YYYY-MM-DD birth date. Server verifies 18+; stores birthdayMonth only. */
  birthDate: string;
  /** Explicit Adult 18+ consent. Required. */
  adultConsent: boolean;
};

export type LoginWithPhonePasswordRequest = {
  phone: string;
  password: string;
  /** Public web API key (same as the client app). Optional if Functions has FIREBASE_WEB_API_KEY. */
  apiKey?: string;
};

export type LoginWithPhonePasswordResponse = {
  token: string;
};

/** Canonical platform Super Admin. Extra addresses can be added via PLATFORM_ADMIN_EMAILS. */
export const CANONICAL_PLATFORM_ADMIN_EMAILS = ["bibin.inc@gmail.com"];

export type StayContextPayload = {
  type: "hotel" | "hostel" | "campus" | "event" | "tour";
  title: string;
  identifier: string;
  guestName: string;
  destination: string;
  badgeLabel: string;
};

export type ClaimDealRequest = {
  dealId: string;
  stayContext: StayContextPayload;
};

export type ClaimDealResponse = {
  voucher: {
    id: string;
    dealId: string;
    venueId: string;
    venueName: string;
    venueAddress: string;
    category: string;
    dealTitle: string;
    guestPerk: string;
    userContext: StayContextPayload;
    claimedAt: string;
    expiresAt: string;
    status: "active" | "redeemed" | "expired";
    discountSummary: string;
  };
};

export type RedeemVoucherRequest = {
  voucherId: string;
  staffPin: string;
};

export type RedeemVoucherResponse = {
  ok: true;
  success: true;
  message: string;
  redeemedAt: string;
};

export type ProvidePartnerDealRequest = {
  venueId: string;
  venueName: string;
  venueAddress: string;
  category: string;
  categoryLabel: string;
  title: string;
  description: string;
  guestPerk: string;
  dealType: "table_booking" | "service_booking" | "walk_in_voucher" | "all";
  discountBadge?: string;
  targetAudiences: StayContextPayload["type"][];
  terms: string;
  staffPin: string;
  claimLimit?: number;
  expiresAt?: string;
  priceLevel?: string;
};

export type SubmitPartnerClaimRequest = {
  venueId: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  customPerk?: string;
  abnOrTaxId?: string;
  plan?: string;
};

export type ReviewPartnerClaimRequest = {
  claimId: string;
  decision: "approved" | "rejected";
};

export type ClaimFreeVenuePresenceRequest = {
  venueName: string;
  address: string;
  category: string;
  shortWhy: string;
  hours?: string;
  phone?: string;
  precinctId?: string;
  lat?: number;
  lng?: number;
  guestPerk?: string;
  mapsPlaceId?: string;
  website?: string;
  heroImage?: string;
  plan?: string;
  abnOrTaxId?: string;
  /** Demo-business build. Honored for platform admins only (server-enforced). */
  demo?: boolean;
};

export type ClaimFreeVenuePresenceResponse = {
  venueId: string;
  markerId: string;
  placeId: string;
  markerPath: string;
};

export type UpsertBusinessListingRequest = {
  listingId?: string;
  name: string;
  category: string;
  address: string;
  hours?: string;
  shortWhy: string;
  description?: string;
  phone?: string;
  lat?: number;
  lng?: number;
  precinctId?: string;
  heroImage?: string;
  handle?: string;
  hoursVerifiedAt?: string;
  mapsPlaceId?: string;
  website?: string;
  plan?: string;
  abnOrTaxId?: string;
  /** Demo-business build. Honored for platform admins only (server-enforced). */
  demo?: boolean;
};

export type UpsertBusinessDealRequest = {
  listingId: string;
  badge: string;
  detail: string;
  expiry?: string;
  active?: boolean;
};

/** Owner-or-admin listing removal. Server deletes the listing, parks the
 *  place as inactive, and writes the audit + ledger entries the direct
 *  client delete used to skip. */
export type DeleteBusinessListingRequest = { listingId: string };

export type DeleteBusinessListingResponse = { listingId: string; placeId: string };

export type UpsertEventRequest = {
  eventId?: string;
  name: string;
  flavour: string;
  city?: string;
  venue?: string;
  room?: string;
  address?: string;
  description?: string;
  shortWhy?: string;
  coverImage?: string;
  heroImage?: string;
  mapsPlaceId?: string;
  geo?: { lat: number; lng: number };
  hostType?: "business" | "individual";
  hostName?: string;
  hostHandle?: string;
  businessName?: string;
  businessHandle?: string;
  collaboratorHandles?: string[];
  sponsorHandles?: string[];
  startsAt?: string;
  endsAt?: string;
  status?: string;
  categoryChips?: string[];
  scheduleVerifiedAt?: string;
  ticketPriceCents?: number;
  ticketTiers?: { id: string; name: string; priceCents: number; capacity?: number }[];
  seriesId?: string;
  recurrenceIndex?: number;
  recurrenceCount?: number;
  capacity?: number;
  requireApproval?: boolean;
  locationType?: "in_person" | "virtual" | "secret";
  virtualUrl?: string;
  themeColor?: string;
  agenda?: { time: string; title: string }[];
  refundPolicy?: string;
  directions?: string;
  registrationClosed?: boolean;
  /** Festival program slug (festivals/{slug}) this session belongs to. */
  festivalSlug?: string;
  track?: string;
  registrationUrl?: string;
  registrationNote?: string;
  speakers?: { name: string; role?: string; handle?: string }[];
  /** Demo-business build. Honored for platform admins only (server-enforced). */
  demo?: boolean;
};

export type UpsertEventStallRequest = {
  id?: string;
  eventId: string;
  name: string;
  category: string;
  booth?: string;
  location?: string;
  shortWhy?: string;
  offer?: string;
  handle?: string;
};

export type SaveAttendeeStallRequest = {
  eventId: string;
  stallId: string;
};

export type CheckHandleAvailableRequest = { handle: string };
export type CreateBusinessProfileRequest = {
  handle: string;
  name: string;
  city?: string;
  category: string;
  shortWhy: string;
  placeId?: string;
  listingId?: string;
  kind?: "person" | "business";
};
export type UpdateBusinessProfileRequest = {
  handle: string;
  name?: string;
  shortWhy?: string;
  city?: string;
  category?: string;
  hours?: string;
  openNow?: boolean;
  phone?: string;
  avatar?: string;
  cover?: string;
  mapsPlaceId?: string;
  listingId?: string;
  placeId?: string;
  kind?: "person" | "business";
  aboutText?: string;
  pronouns?: string;
  languages?: string;
  categoryTag?: string;
  primaryCta?: string;
  availabilityStatus?: string;
  customStatus?: string;
  customStatusEmoji?: string;
  /** Personal @handle visibility. Business storefronts are always public. */
  visibility?: "public" | "private";
  /** Public page theme preset id. Null resets to the default theme. */
  theme?: string | null;
  geo?: { lat: number; lng: number };
  zooHunt?: boolean;
  links?: Array<{ id: string; type: string; label: string; href: string }>;
  products?: Array<{
    id: string;
    kind?: string;
    title: string;
    detail?: string;
    price?: string;
    badge?: string;
    href?: string;
  }>;
  services?: Array<{
    id: string;
    kind?: string;
    title: string;
    detail?: string;
    price?: string;
    badge?: string;
    href?: string;
  }>;
  deals?: Array<{
    id: string;
    kind?: string;
    title: string;
    detail?: string;
    price?: string;
    badge?: string;
    href?: string;
  }>;
};
export type ClaimBioOfferRequest = { handle: string; dealId: string };
export type ClaimBioOfferResponse = { code: string; badge: string; detail: string; expiresAt: string };
export type TransferHandleRequest = { from: string; to: string };
export type ListBioDirectoryRow = { handle: string; name: string; ownerUid?: string; taps: number };
export type SetBioOfferRequest = {
  handle: string;
  badge: string;
  detail: string;
  active?: boolean;
};
export type RecordBioTapRequest = { handle: string; kind?: string; linkId?: string };
export type GetBioLinkStatsRequest = { handle?: string; profileId?: string; days?: number };
export type BioLinkStatRow = { linkId: string; taps: number };
export type BioLinkStatsDay = { day: string; taps: number };
export type GetBioLinkStatsResponse = {
  total: number;
  days: number;
  byDay: BioLinkStatsDay[];
  byLink: BioLinkStatRow[];
};

export type SubmitVenueRatingRequest = {
  mood: string;
  emoji: string;
  note?: string;
  target: "stall" | "event" | "stay";
  eventId?: string;
  stallId?: string;
  stallName?: string;
  propertyId?: string;
};

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function parsePlatformAdminEmails(raw: string | undefined): string[] {
  const extra = String(raw || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  return Array.from(new Set([...CANONICAL_PLATFORM_ADMIN_EMAILS, ...extra]));
}

/** Client-requested roles never include staff or super_admin. Allowlist is server-only. */
export function resolveRegistrationRole(email: string, requested: string, platformAdminEmails: string[]): UserRole {
  const normalized = normalizeEmail(email);
  const allow = new Set([...CANONICAL_PLATFORM_ADMIN_EMAILS, ...platformAdminEmails.map(normalizeEmail)]);
  if (allow.has(normalized)) return "super_admin";
  if (requested === "host_admin") return "host_admin";
  return "guest";
}

export function roleFromAccessToken(
  claims: AccessClaims | Record<string, unknown> | undefined,
  profileRole?: UserRole,
): UserRole {
  if (!claims) return profileRole || "guest";
  if (claims.platform_admin === true) return "super_admin";
  const tokenRole = claims.role;
  if (tokenRole === "super_admin" || tokenRole === "host_admin" || tokenRole === "staff" || tokenRole === "guest") {
    return tokenRole;
  }
  return profileRole || "guest";
}

export function pinIsWellFormed(pin: string): boolean {
  return /^\d{4,8}$/.test(pin.trim());
}

export function canClaimDeal(input: {
  active: boolean;
  claimLimit?: number;
  claimsCount: number;
  existingActiveForUser: boolean;
}): { ok: true } | { ok: false; reason: string } {
  if (!input.active) return { ok: false, reason: "This deal is no longer active." };
  if (input.existingActiveForUser) {
    return { ok: false, reason: "You already have an active pass for this deal." };
  }
  if (typeof input.claimLimit === "number" && input.claimsCount >= input.claimLimit) {
    return { ok: false, reason: "This deal has reached its claim limit." };
  }
  return { ok: true };
}
