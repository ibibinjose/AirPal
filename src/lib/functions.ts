import { httpsCallable } from "firebase/functions";
import {
  CALLABLES,
  type ConfirmAdultSignupRequest,
  type CompleteAccountSignupRequest,
  type LoginWithPhonePasswordRequest,
  type LoginWithPhonePasswordResponse,
  type UpsertEventRequest,
} from "@shared/airpal-security";
import { getFirebaseFunctions, isFirebaseConfigured } from "./firebase";

export function liveBackendEnabled() {
  return isFirebaseConfigured;
}

async function callFunction<Req, Res>(name: string, data: Req): Promise<Res> {
  const functions = getFirebaseFunctions();
  if (!functions) throw new Error("Firebase is not configured.");
  const callable = httpsCallable<Req, Res>(functions, name, { timeout: 15_000 });
  const result = await callable(data);
  return result.data;
}

export function completeAccountSignupRemote(data: CompleteAccountSignupRequest) {
  return callFunction<CompleteAccountSignupRequest, { ok: true; phone: string; birthdayMonth: number }>(
    CALLABLES.completeAccountSignup,
    data,
  );
}

export function confirmAdultSignupRemote(data: ConfirmAdultSignupRequest) {
  return callFunction<ConfirmAdultSignupRequest, { ok: true; birthdayMonth: number }>(
    CALLABLES.confirmAdultSignup,
    data,
  );
}

export function loginWithPhonePasswordRemote(data: LoginWithPhonePasswordRequest) {
  return callFunction<LoginWithPhonePasswordRequest, LoginWithPhonePasswordResponse>(
    CALLABLES.loginWithPhonePassword,
    data,
  );
}

export function ensureUserProfileRemote() {
  return callFunction<Record<string, never>, { ok: true; created: boolean }>(CALLABLES.ensureUserProfile, {});
}

export function upsertBusinessListingRemote(data: {
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
  mapsPlaceId?: string;
  website?: string;
  plan?: string;
  abnOrTaxId?: string;
  demo?: boolean;
}) {
  return callFunction<typeof data, { listingId: string; placeId: string }>(CALLABLES.upsertBusinessListing, data);
}

export function deleteBusinessListingRemote(data: { listingId: string }) {
  return callFunction<typeof data, { listingId: string; placeId: string }>(CALLABLES.deleteBusinessListing, data);
}

export function upsertBusinessDealRemote(data: {
  listingId: string;
  badge: string;
  detail: string;
  expiry?: string;
  active?: boolean;
}) {
  return callFunction<typeof data, { ok: true; deal: { badge: string; detail: string } | null }>(
    CALLABLES.upsertBusinessDeal,
    data,
  );
}

export function upsertEventRemote(data: UpsertEventRequest) {
  return callFunction<typeof data, { eventId: string }>(CALLABLES.upsertEvent, data);
}

export function upsertEventStallRemote(data: {
  id?: string;
  eventId: string;
  name: string;
  category: string;
  booth?: string;
  location?: string;
  shortWhy?: string;
  offer?: string;
  handle?: string;
}) {
  return callFunction<typeof data, { stallId: string }>(CALLABLES.upsertEventStall, data);
}

export function saveAttendeeStallRemote(data: { eventId: string; stallId: string }) {
  return callFunction<typeof data, { ok: true }>(CALLABLES.saveAttendeeStall, data);
}

export function checkHandleAvailableRemote(data: { handle: string }) {
  return callFunction<typeof data, { ok: boolean; reason?: string }>(CALLABLES.checkHandleAvailable, data);
}

export function createBusinessProfileRemote(data: {
  handle: string;
  name: string;
  city?: string;
  category: string;
  shortWhy: string;
  placeId?: string;
  listingId?: string;
  kind?: "person" | "business";
}) {
  return callFunction<typeof data, { profileId: string; handle: string }>(CALLABLES.createBusinessProfile, data);
}

export function updateBusinessProfileRemote(data: {
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
  kind?: "person" | "business";
  aboutText?: string;
  pronouns?: string;
  languages?: string;
  categoryTag?: string;
  primaryCta?: string;
  availabilityStatus?: string;
  customStatus?: string;
  customStatusEmoji?: string;
  visibility?: "public" | "private";
  geo?: { lat: number; lng: number };
  zooHunt?: boolean;
}) {
  return callFunction<typeof data, { ok: true }>(CALLABLES.updateBusinessProfile, data);
}

export function setBioOfferRemote(data: { handle: string; badge: string; detail: string; active?: boolean }) {
  return callFunction<typeof data, { ok: true }>(CALLABLES.setBioOffer, data);
}

export function recordBioTapRemote(data: { handle: string; kind?: string; linkId?: string }) {
  return callFunction<typeof data, { ok: true }>(CALLABLES.recordBioTap, data);
}

export function getBioLinkStatsRemote(data: import("@shared/airpal-security").GetBioLinkStatsRequest) {
  return callFunction<typeof data, import("@shared/airpal-security").GetBioLinkStatsResponse>(
    CALLABLES.getBioLinkStats,
    data,
  );
}

export function claimBioOfferRemote(data: { handle: string; dealId: string }) {
  return callFunction<typeof data, { code: string; badge: string; detail: string; expiresAt: string }>(
    CALLABLES.claimBioOffer,
    data,
  );
}

export function transferHandleRemote(data: { from: string; to: string }) {
  return callFunction<typeof data, { handle: string; profileId: string }>(CALLABLES.transferHandle, data);
}

export function listBioDirectoryRemote() {
  return callFunction<
    Record<string, never>,
    { rows: Array<{ handle: string; name: string; ownerUid?: string; taps: number }> }
  >(CALLABLES.listBioDirectory, {});
}

export function recordAnalyticsBatchRemote(data: { events: unknown[] }) {
  return callFunction<typeof data, { accepted: number; rejected: number; duplicates: number; acceptedIds: string[] }>(
    CALLABLES.recordAnalyticsBatch,
    data,
  );
}

export function runAnalyticsAggregationRemote() {
  return callFunction<Record<string, never>, { input: number; output: number }>(CALLABLES.runAnalyticsAggregation, {});
}

export function upsertEventCouponRemote(data: {
  eventId: string;
  code: string;
  percentOff: number;
  active?: boolean;
  maxRedemptions?: number | null;
}) {
  return callFunction<typeof data, { ok: boolean; code: string }>(CALLABLES.upsertEventCoupon, data);
}

export function listEventCouponsRemote(data: { eventId: string }) {
  return callFunction<
    typeof data,
    {
      ok: boolean;
      coupons: {
        code: string;
        percentOff: number;
        active: boolean;
        maxRedemptions: number | null;
        redemptions: number;
      }[];
    }
  >(CALLABLES.listEventCoupons, data);
}

export function announceEventToGuestsRemote(data: { eventId: string; title: string; body: string }) {
  return callFunction<typeof data, { ok: boolean; broadcastId: string; status: string; sent: number }>(
    CALLABLES.announceEventToGuests,
    data,
  );
}

export function validateEventCouponRemote(data: { eventId: string; code: string }) {
  return callFunction<typeof data, { ok: boolean; code: string; percentOff: number }>(
    CALLABLES.validateEventCoupon,
    data,
  );
}

export function createBookingCheckoutSessionRemote(data: { bookingId: string }) {
  return callFunction<
    typeof data,
    {
      ok: boolean;
      mode?: string;
      bookingId?: string;
      sessionId?: string;
      checkoutUrl?: string | null;
    }
  >(CALLABLES.createBookingCheckoutSession, data);
}

export function createEventBookingRemote(data: {
  eventId: string;
  spots?: number;
  tierId?: string;
  couponCode?: string;
}) {
  return callFunction<typeof data, { bookingId: string }>(CALLABLES.createEventBooking, data);
}

export function scheduleCatchUpRemote(data: { catchupId: string; action: "open" | "accept"; slotId?: string }) {
  return callFunction<
    typeof data,
    {
      ok: boolean;
      status: string;
      proposals: { id: string; date: string; time: string; label: string }[];
    }
  >(CALLABLES.scheduleCatchUp, data);
}

export function createConnectAccountLinkRemote(data: { returnPath?: string } = {}) {
  return callFunction<
    typeof data,
    {
      ok: boolean;
      url: string;
      stripeAccountId: string;
      transfersActive: boolean;
    }
  >(CALLABLES.createConnectAccountLink, data);
}

export function refreshConnectAccountRemote() {
  return callFunction<
    Record<string, never>,
    {
      ok: boolean;
      transfersActive: boolean;
      stripeAccountId: string;
    }
  >(CALLABLES.refreshConnectAccount, {});
}

export function createConnectLoginLinkRemote() {
  return callFunction<Record<string, never>, { ok: boolean; url: string }>(CALLABLES.createConnectLoginLink, {});
}

export function verifyTicketRemote(data: { ticketId: string }) {
  return callFunction<
    typeof data,
    {
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
      reason: string | null;
      admittedAt: string | null;
    }
  >(CALLABLES.verifyTicket, data);
}

export function admitTicketRemote(data: { ticketId: string }) {
  return callFunction<typeof data, { ticketId: string; admittedAt: string; already: boolean }>(
    CALLABLES.admitTicket,
    data,
  );
}

export function verifyPromotionRedemptionRemote(data: { promotionId: string; code: string }) {
  return callFunction<
    typeof data,
    {
      promotionId: string;
      code: string;
      title: string;
      status: string;
      pointsSpent: number;
      redeemedAt: string | null;
      valid: boolean;
      reason: "already_redeemed" | "expired" | "not_found" | null;
    }
  >(CALLABLES.verifyPromotionRedemption, data);
}

export function consumePromotionRedemptionRemote(data: { promotionId: string; code: string }) {
  return callFunction<typeof data, { promotionId: string; code: string; redeemedAt: string }>(
    CALLABLES.consumePromotionRedemption,
    data,
  );
}

export function checkInGuestRemote(data: { scope: "event"; id: string; entryId: string }) {
  return callFunction<
    typeof data,
    { scope: "event"; id: string; entryId: string; checkedInAt: string; already: boolean }
  >(CALLABLES.checkInGuest, data);
}

export function closeGuestlistRemote(data: { scope: "event"; id: string }) {
  return callFunction<typeof data, { scope: "event"; id: string; closed: number }>(CALLABLES.closeGuestlist, data);
}

export function joinGuestlistSignupRemote(data: {
  name: string;
  city: string;
  email: string;
  interests: string[];
  source?: string;
}) {
  return callFunction<typeof data, { ok: boolean; email: string }>(CALLABLES.joinGuestlistSignup, data);
}

export function listGuestlistSignupsRemote(data: {
  city?: string;
  interest?: string;
  limit?: number;
  startAfter?: string;
}) {
  return callFunction<
    typeof data,
    {
      rows: Array<{
        email: string;
        name: string;
        city: string;
        interests: string[];
        source: string;
        consentAt: string;
        createdAt: string;
        unsubscribedAt: string | null;
      }>;
      hasMore: boolean;
      total: number;
    }
  >(CALLABLES.listGuestlistSignups, data);
}

export function unsubscribeGuestlistRemote(data: { email: string }) {
  return callFunction<typeof data, { ok: boolean }>(CALLABLES.unsubscribeGuestlist, data);
}

export function listBioSubscribersRemote(data: import("@shared/airpal-security").ListBioSubscribersRequest) {
  return callFunction<typeof data, import("@shared/airpal-security").ListBioSubscribersResponse>(
    CALLABLES.listBioSubscribers,
    data,
  );
}

export function listDoorTeamRemote(data: { scope: "event"; id: string }) {
  return callFunction<
    typeof data,
    {
      scope: "event";
      id: string;
      members: Array<{ uid: string; name: string; handle?: string; owner: boolean }>;
    }
  >(CALLABLES.listDoorTeam, data);
}

export function releaseHeldPayoutsRemote() {
  return callFunction<
    Record<string, never>,
    {
      ok: boolean;
      released: number;
      held: number;
      amountCents: number;
    }
  >(CALLABLES.releaseHeldPayouts, {});
}

export function createSubscriptionCheckoutRemote() {
  return callFunction<Record<string, never>, { ok: boolean; sessionId?: string; checkoutUrl?: string | null }>(
    CALLABLES.createSubscriptionCheckout,
    {},
  );
}

export function createSubscriptionPortalRemote() {
  return callFunction<Record<string, never>, { ok: boolean; portalUrl?: string | null }>(
    CALLABLES.createSubscriptionPortal,
    {},
  );
}

export function completePaidBookingRemote(data: { bookingId: string }) {
  return callFunction<
    typeof data,
    {
      ok: boolean;
      status: string;
      payoutStatus: string;
      transferId: string | null;
      payoutReason?: string | null;
    }
  >(CALLABLES.completePaidBooking, data);
}

export function getBioPulseRemote(data: { propertyId: string }) {
  return callFunction<typeof data, import("@shared/pulse").BioPulseResult>(CALLABLES.getBioPulse, data);
}

/**
 * One friendly-message map for every callable. Both the `functions/…` and
 * bare error codes are accepted; per-surface wording stays with the caller
 * via opts so shared cases can never drift apart again.
 */
export function friendlyFunctionError(
  err: unknown,
  opts?: { preconditionMessage?: string; invalidArgumentMessage?: string },
): string {
  const code = (err as { code?: string } | null)?.code || "";
  const message = err instanceof Error ? err.message : "";
  if (code === "functions/failed-precondition" || code === "failed-precondition") {
    return message || opts?.preconditionMessage || "This action is not available right now.";
  }
  if (code === "functions/permission-denied" || code === "permission-denied") {
    return "You do not have permission for that action.";
  }
  if (code === "functions/unauthenticated" || code === "unauthenticated") {
    return "Sign in to continue.";
  }
  if (code === "functions/invalid-argument" || code === "invalid-argument") {
    return message || opts?.invalidArgumentMessage || "Check the details and try again.";
  }
  return message || "Something went wrong. Please try again.";
}
