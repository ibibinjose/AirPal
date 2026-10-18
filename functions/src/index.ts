// Barrel: every callable keeps its deployed name. Domain logic lives in sibling modules.
export { recordAnalyticsBatch, aggregateAnalyticsHourly, runAnalyticsAggregation } from "./analytics";
export { ensurePlatformAdmin, setPropertyMember, backfillOwnerClaims } from "./registration";
export { completeAccountSignup, loginWithPhonePassword, ensureUserProfile } from "./account";
export {
  claimDeal,
  redeemVoucher,
  providePartnerDeal,
  submitPartnerClaim,
  claimFreeVenuePresence,
  reviewPartnerClaim,
} from "./deals";
export { upsertBusinessListing, upsertBusinessDeal } from "./listings";
export { upsertEvent, upsertEventStall, saveAttendeeStall, submitVenueRating } from "./events";
export {
  checkHandleAvailable,
  createBusinessProfile,
  updateBusinessProfile,
  setBioOffer,
  recordBioTap,
  getBioLinkStats,
  claimBioOffer,
  transferHandle,
  listBioDirectory,
} from "./bio";
export { createManagedProduct, createManagedCheckoutSession } from "./managed-payments";
export {
  createBookingCheckoutSession,
  createConnectAccountLink,
  refreshConnectAccount,
  createConnectLoginLink,
  releaseHeldPayouts,
  completePaidBooking,
  refundPaidBooking,
  createSubscriptionCheckout,
  createSubscriptionPortal,
  stripeWebhook,
} from "./stripe";
export { upsertEventCoupon, validateEventCoupon, listEventCoupons } from "./coupons";
export { onPingCreated, onPingUpdated } from "./pings";
export {
  createPromotion,
  updatePromotion,
  submitPromotion,
  reviewPromotion,
  enterPromotion,
  closeAndDraw,
  setWinnerStatus,
  recordPromotionView,
  recordPromotionClick,
  setWeeklyCampaign,
  redeemPoints,
  promotionEndingSoon,
} from "./promotions";
export { announceEventToGuests, createBroadcast, onEventPublishedToFollowers, reviewBroadcast } from "./notifications";
export { testSendBrandEmail } from "./email";
export { verifyTicket, admitTicket } from "./gate";
export { checkInGuest, closeGuestlist, listDoorTeam, onGuestBookingWritten, onGuestRsvpWritten } from "./guestlist";
export {
  joinGuestlistSignup,
  listBioSubscribers,
  listGuestlistSignups,
  unsubscribeGuestlist,
} from "./guestlist-signups";
export { shareMeta } from "./share-meta";
export { walletPass } from "./wallet";
export { googleWalletPass } from "./google-wallet";
export { scheduleCatchUp } from "./catchup-agent";
export { payoutReconciliationReport, reconcilePayouts } from "./reconcile";
export { shareHere, stopHere } from "./here";
export { startWave, waveAt, stopWave } from "./wave";
export {
  getPulseByToken,
  getBioPulse,
  submitPulseResponse,
  createPulse,
  publishPulse,
  acknowledgePulseIssue,
  resolvePulseIssue,
  setPulseStatus,
  recordPulseFollowup,
  onPulseIssueCreated,
} from "./pulse";
export { setBirthdayAlertPrefs, sendBirthdayMonthAlerts } from "./birthday-freebies";
// V3 clean-slate API (local cutover candidate; v3-prefixed names).
export {
  v3BootstrapAccount,
  v3ClaimHandle,
  v3UpdateProfile,
  v3SetProfileVisibility,
  v3ListPlaces,
  v3ListEvents,
  v3ListDeals,
  v3FetchHandle,
  v3LookupGooglePlace,
  v3UpsertEvent,
  v3IssueTicket,
  v3VerifyTicket,
  v3AdmitTicket,
  v3UpsertPlace,
  v3PublishDeal,
  v3ClaimDeal,
  v3RedeemDealClaim,
  v3CreateCohort,
  v3JoinCohort,
  v3LeaveCohort,
  v3RequestPlaceClaim,
  v3ReviewPlaceClaim,
  v3WithdrawPlaceClaim,
  v3ListPlaceClaims,
  v3CreateCheckout,
  v3StripeWebhook,
  v3RefundOrder,
  v3ReconcileOrder,
  v3ReportContent,
  v3BlockUser,
  v3UnblockUser,
  v3ListAuditEntries,
} from "./v3/index";
