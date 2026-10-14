import { httpsCallable } from "firebase/functions";
import { getFirebaseFunctions } from "../firebase";
import { requireV3Adapters } from "./gate";
import type {
  V3AddPlanStopRequest,
  V3BlockUserRequest,
  V3BootstrapAccountRequest,
  V3ClaimDealRequest,
  V3ClaimHandleRequest,
  V3CompletePlanRequest,
  V3CreateCheckoutRequest,
  V3CreateCohortRequest,
  V3CreatePlanRequest,
  V3FetchHandleRequest,
  V3IssueTicketRequest,
  V3JoinCohortRequest,
  V3LeaveCohortRequest,
  V3ListAuditsRequest,
  V3ListPublicQuery,
  V3PlanStop,
  V3PublishDealRequest,
  V3RedeemDealRequest,
  V3ReconcileOrderRequest,
  V3RefundOrderRequest,
  V3ReportRequest,
  V3RespondToPlanRequest,
  V3RsvpState,
  V3SendMessageRequest,
  V3SetProfileVisibilityRequest,
  V3StartConversationRequest,
  V3TicketActionRequest,
  V3UnblockUserRequest,
  V3UpdateProfileRequest,
  V3UpsertEventRequest,
  V3UpsertPlaceRequest,
  V3VotePlanStopRequest,
  V3InviteToPlanRequest,
} from "@shared/v3-contract";

/**
 * Typed V3 callable invokers. Mutations go through Cloud Functions only; this
 * module performs no Firestore writes. Every call requires the local-only
 * gate, so production traffic keeps using the V1 API until cutover.
 */

export type V3PlaceResult = { placeId: string; status: string };
export type V3EventResult = { eventId: string; status: string };
export type V3PlanResult = { planId: string; inviteCode: string };
export type V3DealResult = { dealId: string; status: string };
export type V3CohortResult = { cohortId: string };
export type V3ClaimResult = { claimId: string; code: string; created: boolean };
export type V3TicketIssueResult = { ticketId: string; created: boolean };
export type V3TicketGateResult = {
  ticketId: string;
  eventId: string;
  eventTitle: string;
  kind: string;
  state: string;
  valid: boolean;
  reason: string | null;
};
export type V3CheckoutResult = {
  orderId: string;
  state: string;
  checkoutUrl: string | null;
  provider: string;
  created: boolean;
};
export type V3OrderResult = { orderId: string; state: string };
export type V3StopResult = { planId: string; stop: V3PlanStop };
export type V3VoteResult = { planId: string; stopId: string; votes: number; voted: boolean };
export type V3RsvpResult = { planId: string; rsvp: V3RsvpState };
export type V3HandleResult = { handle: string; changed: boolean; previous?: string | null };

async function callV3<Request, Response>(name: string, request: Request): Promise<Response> {
  requireV3Adapters();
  const functions = getFirebaseFunctions();
  if (!functions) throw new Error("Firebase is not configured.");
  const callable = httpsCallable<Request, Response>(functions, name);
  const res = await callable(request);
  return res.data;
}

// Identity
export const v3BootstrapAccount = (request: V3BootstrapAccountRequest) =>
  callV3<V3BootstrapAccountRequest, { uid: string; created: boolean }>("v3BootstrapAccount", request);
export const v3ClaimHandle = (request: V3ClaimHandleRequest) =>
  callV3<V3ClaimHandleRequest, V3HandleResult>("v3ClaimHandle", request);
export const v3UpdateProfile = (request: V3UpdateProfileRequest) =>
  callV3<V3UpdateProfileRequest, { uid: string; updated: boolean }>("v3UpdateProfile", request);
export const v3SetProfileVisibility = (request: V3SetProfileVisibilityRequest) =>
  callV3<V3SetProfileVisibilityRequest, { uid: string; visibility: string }>("v3SetProfileVisibility", request);

// Discovery
export const v3ListPlaces = (request: V3ListPublicQuery) =>
  callV3<V3ListPublicQuery, { places: Record<string, unknown>[]; nextCursor: string | null }>("v3ListPlaces", request);
export const v3ListEvents = (request: V3ListPublicQuery) =>
  callV3<V3ListPublicQuery, { events: Record<string, unknown>[]; nextCursor: string | null }>("v3ListEvents", request);
export const v3ListDeals = (request: V3ListPublicQuery) =>
  callV3<V3ListPublicQuery, { deals: Record<string, unknown>[]; nextCursor: string | null }>("v3ListDeals", request);
export const v3FetchHandle = (request: V3FetchHandleRequest) =>
  callV3<
    V3FetchHandleRequest,
    { handle: string; found: boolean; ownerUid?: string; profile: Record<string, unknown> | null }
  >("v3FetchHandle", request);

// Planning
export const v3CreatePlan = (request: V3CreatePlanRequest) =>
  callV3<V3CreatePlanRequest, V3PlanResult>("v3CreatePlan", request);
export const v3InviteToPlan = (request: V3InviteToPlanRequest) =>
  callV3<V3InviteToPlanRequest, { planId: string; uid: string; invited: boolean }>("v3InviteToPlan", request);
export const v3RsvpPlan = (request: V3RespondToPlanRequest) =>
  callV3<V3RespondToPlanRequest, V3RsvpResult>("v3RsvpPlan", request);
export const v3AddPlanStop = (request: V3AddPlanStopRequest) =>
  callV3<V3AddPlanStopRequest, V3StopResult>("v3AddPlanStop", request);
export const v3VotePlanStop = (request: V3VotePlanStopRequest) =>
  callV3<V3VotePlanStopRequest, V3VoteResult>("v3VotePlanStop", request);
export const v3CompletePlan = (request: V3CompletePlanRequest) =>
  callV3<V3CompletePlanRequest, { planId: string; state: string }>("v3CompletePlan", request);

// Events and access
export const v3UpsertEvent = (request: V3UpsertEventRequest) =>
  callV3<V3UpsertEventRequest, V3EventResult>("v3UpsertEvent", request);
export const v3IssueTicket = (request: V3IssueTicketRequest) =>
  callV3<V3IssueTicketRequest, V3TicketIssueResult>("v3IssueTicket", request);
export const v3VerifyTicket = (request: V3TicketActionRequest) =>
  callV3<V3TicketActionRequest, V3TicketGateResult>("v3VerifyTicket", request);
export const v3AdmitTicket = (request: V3TicketActionRequest) =>
  callV3<V3TicketActionRequest, { ticketId: string; already: boolean; admittedAt?: unknown }>("v3AdmitTicket", request);

// Business and arrival
export const v3UpsertPlace = (request: V3UpsertPlaceRequest) =>
  callV3<V3UpsertPlaceRequest, V3PlaceResult>("v3UpsertPlace", request);
export const v3PublishDeal = (request: V3PublishDealRequest) =>
  callV3<V3PublishDealRequest, V3DealResult>("v3PublishDeal", request);
export const v3ClaimDeal = (request: V3ClaimDealRequest) =>
  callV3<V3ClaimDealRequest, V3ClaimResult>("v3ClaimDeal", request);
export const v3RedeemDealClaim = (request: V3RedeemDealRequest) =>
  callV3<V3RedeemDealRequest, { claimId: string; already: boolean }>("v3RedeemDealClaim", request);
export const v3CreateCohort = (request: V3CreateCohortRequest) =>
  callV3<V3CreateCohortRequest, V3CohortResult>("v3CreateCohort", request);
export const v3JoinCohort = (request: V3JoinCohortRequest) =>
  callV3<V3JoinCohortRequest, { cohortId: string; joined: boolean }>("v3JoinCohort", request);
export const v3LeaveCohort = (request: V3LeaveCohortRequest) =>
  callV3<V3LeaveCohortRequest, { cohortId: string; left: boolean }>("v3LeaveCohort", request);

// Commerce
export const v3CreateCheckout = (request: V3CreateCheckoutRequest) =>
  callV3<V3CreateCheckoutRequest, V3CheckoutResult>("v3CreateCheckout", request);
export const v3RefundOrder = (request: V3RefundOrderRequest) =>
  callV3<V3RefundOrderRequest, V3OrderResult & { already: boolean }>("v3RefundOrder", request);
export const v3ReconcileOrder = (request: V3ReconcileOrderRequest) =>
  callV3<V3ReconcileOrderRequest, V3OrderResult>("v3ReconcileOrder", request);

// Trust
export const v3ReportContent = (request: V3ReportRequest) =>
  callV3<V3ReportRequest, { reported: boolean }>("v3ReportContent", request);
export const v3BlockUser = (request: V3BlockUserRequest) =>
  callV3<V3BlockUserRequest, { uid: string; blocked: boolean }>("v3BlockUser", request);
export const v3UnblockUser = (request: V3UnblockUserRequest) =>
  callV3<V3UnblockUserRequest, { uid: string; blocked: boolean }>("v3UnblockUser", request);
export const v3ListAuditEntries = (request: V3ListAuditsRequest) =>
  callV3<V3ListAuditsRequest, { entries: Record<string, unknown>[] }>("v3ListAuditEntries", request);

// Messaging (universal conversations)
export const v3StartConversation = (request: V3StartConversationRequest) =>
  callV3<V3StartConversationRequest, { conversationId: string }>("v3StartConversation", request);
export const v3SendMessage = (request: V3SendMessageRequest) =>
  callV3<V3SendMessageRequest, { conversationId: string; sent: boolean }>("v3SendMessage", request);
