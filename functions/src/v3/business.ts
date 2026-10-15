import { FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import {
  cleanV3Text,
  isV3PlaceClaimState,
  isV3PublicationState,
  parseV3ContactEmail,
  parseV3GooglePlaceId,
  parseV3Id,
  parseV3IsoTime,
  parseV3ListLimit,
  parseV3OptionalIsoTime,
  parseV3PlaceId,
  parseV3RedemptionLimit,
  parseV3Uid,
  requiredV3Text,
  v3PlaceIdForGooglePlace,
  type V3ClaimDealRequest,
  type V3CreateCohortRequest,
  type V3Deal,
  type V3DealClaim,
  type V3JoinCohortRequest,
  type V3LeaveCohortRequest,
  type V3ListPlaceClaimsRequest,
  type V3Place,
  type V3PlaceClaim,
  type V3PublishDealRequest,
  type V3RedeemDealRequest,
  type V3RequestPlaceClaimRequest,
  type V3ReviewPlaceClaimRequest,
  type V3UpsertPlaceRequest,
  type V3WithdrawPlaceClaimRequest,
} from "../../../shared/v3-contract";
import type { AccessClaims } from "../../../shared/airpal-security";
import { CALLABLE, db, isPlatformAdmin, requireAccount, requireAuth } from "../admin";
import { enforceRateLimit, isAnonymousAuth, noteAppCheck } from "../abuse";
import { indexUserDoc, randomDocId, unindexUserDoc, v3Arg, v3ClaimCode, v3Clean, writeV3Audit } from "./common";

function claimsOf(request: { auth?: { token?: unknown } }) {
  return request.auth?.token as AccessClaims | undefined;
}

/** Create or update an owner-held place. Publishing is audited. */
export const v3UpsertPlace = onCall(CALLABLE, async (request) => {
  await noteAppCheck(request, "v3UpsertPlace");
  const uid = requireAccount(request, "Create an email account to manage a business.");
  await enforceRateLimit(uid, "v3Place", false);
  const data = (request.data || {}) as V3UpsertPlaceRequest;
  const input = v3Arg(() => ({
    placeId: data.placeId === undefined ? undefined : parseV3Id(data.placeId, "Place"),
    name: requiredV3Text(data.name, "Name", 140),
    description: cleanV3Text(data.description, 2000),
    city: requiredV3Text(data.city, "City", 80),
    category: requiredV3Text(data.category, "Category", 80),
    address: requiredV3Text(data.address, "Address", 200),
    status: data.status === undefined ? "draft" : data.status,
  }));
  if (!isV3PublicationState(input.status)) throw new HttpsError("invalid-argument", "Status is invalid.");
  const placeId = input.placeId || randomDocId("place");
  const ref = db.collection("places").doc(placeId);
  const snap = await ref.get();
  const existing = snap.data() as V3Place | undefined;
  if (snap.exists && existing?.ownerUid !== uid && !isPlatformAdmin(claimsOf(request))) {
    throw new HttpsError("permission-denied", "Only the owner can edit this place.");
  }
  await ref.set(
    {
      ownerUid: existing?.ownerUid || uid,
      status: input.status,
      name: input.name,
      description: input.description,
      city: input.city,
      category: input.category,
      address: input.address,
      updatedAt: FieldValue.serverTimestamp(),
      ...(snap.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
    },
    { merge: true },
  );
  if (input.status === "published" && existing?.status !== "published") {
    await writeV3Audit({ action: "place.publish", actorUid: uid, subjectType: "place", subjectId: placeId });
  }
  return { placeId, status: input.status };
});

/** Publish a deal for a place the caller owns. Publishing is audited. */
export const v3PublishDeal = onCall(CALLABLE, async (request) => {
  await noteAppCheck(request, "v3PublishDeal");
  const uid = requireAccount(request, "Create an email account to publish deals.");
  await enforceRateLimit(uid, "v3Deal", false);
  const data = (request.data || {}) as V3PublishDealRequest;
  const input = v3Arg(() => ({
    dealId: data.dealId === undefined ? undefined : parseV3Id(data.dealId, "Deal"),
    placeId: parseV3Id(data.placeId, "Place"),
    title: requiredV3Text(data.title, "Title", 140),
    detail: requiredV3Text(data.detail, "Detail", 2000),
    expiresAt: parseV3OptionalIsoTime(data.expiresAt, "Expiry"),
    redemptionsLimit: parseV3RedemptionLimit(data.redemptionsLimit),
    status: data.status === undefined ? "draft" : data.status,
  }));
  if (!isV3PublicationState(input.status)) throw new HttpsError("invalid-argument", "Status is invalid.");
  const placeSnap = await db.collection("places").doc(input.placeId).get();
  const place = placeSnap.data() as V3Place | undefined;
  if (!placeSnap.exists || !place) throw new HttpsError("not-found", "Place not found.");
  if (place.ownerUid !== uid && !isPlatformAdmin(claimsOf(request))) {
    throw new HttpsError("permission-denied", "Only the place owner can publish deals.");
  }
  const dealId = input.dealId || randomDocId("deal");
  const ref = db.collection("deals").doc(dealId);
  const snap = await ref.get();
  const existing = snap.data() as V3Deal | undefined;
  if (snap.exists && existing?.ownerUid !== uid && !isPlatformAdmin(claimsOf(request))) {
    throw new HttpsError("permission-denied", "Only the deal owner can edit it.");
  }
  await ref.set(
    v3Clean({
      placeId: input.placeId,
      ownerUid: existing?.ownerUid || uid,
      status: input.status,
      title: input.title,
      detail: input.detail,
      redemptionsLimit: input.redemptionsLimit,
      expiresAt: input.expiresAt,
      updatedAt: FieldValue.serverTimestamp(),
      ...(snap.exists ? {} : { redemptionCount: 0, createdAt: FieldValue.serverTimestamp() }),
    }),
    { merge: true },
  );
  if (input.status === "published" && existing?.status !== "published") {
    await writeV3Audit({ action: "deal.publish", actorUid: uid, subjectType: "deal", subjectId: dealId });
  }
  return { dealId, status: input.status };
});

/**
 * Claim a published deal once per claimant. The claim id is deterministic per
 * (deal, claimant) so retries return the same claim instead of double-claims.
 */
export const v3ClaimDeal = onCall(CALLABLE, async (request) => {
  await noteAppCheck(request, "v3ClaimDeal");
  const uid = requireAuth(request.auth?.uid);
  await enforceRateLimit(uid, "v3Deal", isAnonymousAuth(request));
  const data = (request.data || {}) as V3ClaimDealRequest;
  const dealId = v3Arg(() => parseV3Id(data.dealId, "Deal"));
  const dealRef = db.collection("deals").doc(dealId);
  const claimId = `c_${dealId}_${uid}`.replace(/[^A-Za-z0-9_.-]/g, "_").slice(0, 1200);
  const claimRef = db.collection("dealClaims").doc(claimId);
  const outcome = await db.runTransaction(async (tx) => {
    const [dealSnap, claimSnap] = await Promise.all([tx.get(dealRef), tx.get(claimRef)]);
    const deal = dealSnap.data() as V3Deal | undefined;
    if (!dealSnap.exists || !deal) throw new HttpsError("not-found", "Deal not found.");
    if (deal.status !== "published") throw new HttpsError("failed-precondition", "This deal is not active.");
    if (deal.expiresAt && Date.parse(deal.expiresAt) < Date.now()) {
      throw new HttpsError("failed-precondition", "This deal has expired.");
    }
    const existing = claimSnap.data() as V3DealClaim | undefined;
    if (claimSnap.exists && existing && (existing.state === "claimed" || existing.state === "redeemed")) {
      return { claimId, code: existing.code, created: false as const };
    }
    const limit = Number(deal.redemptionsLimit || 0);
    const count = Number(deal.redemptionCount || 0);
    if (limit > 0 && count >= limit) throw new HttpsError("failed-precondition", "This deal is fully claimed.");
    const code = v3ClaimCode();
    tx.set(claimRef, {
      dealId,
      placeId: deal.placeId,
      claimantUid: uid,
      issuerUid: deal.ownerUid,
      state: "claimed",
      code,
      claimedAt: FieldValue.serverTimestamp(),
    });
    tx.set(dealRef, { redemptionCount: count + 1, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return { claimId, code, created: true as const };
  });
  if (outcome.created) {
    await indexUserDoc(uid, "claimIds", claimId);
    await writeV3Audit({
      action: "deal.claim",
      actorUid: uid,
      subjectType: "dealClaim",
      subjectId: claimId,
      detail: dealId,
    });
  }
  return outcome;
});

/** Redeem a claim. Only the issuer (deal owner) or an admin can redeem. */
export const v3RedeemDealClaim = onCall(CALLABLE, async (request) => {
  await noteAppCheck(request, "v3RedeemDealClaim");
  const uid = requireAccount(request, "Sign in to redeem claims.");
  await enforceRateLimit(uid, "v3Deal", false);
  const data = (request.data || {}) as V3RedeemDealRequest;
  const claimId = v3Arg(() => parseV3Id(data.claimId, "Claim"));
  const ref = db.collection("dealClaims").doc(claimId);
  const outcome = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const claim = snap.data() as V3DealClaim | undefined;
    if (!snap.exists || !claim) throw new HttpsError("not-found", "Claim not found.");
    if (claim.issuerUid !== uid && !isPlatformAdmin(claimsOf(request))) {
      throw new HttpsError("permission-denied", "Only the issuer can redeem this claim.");
    }
    if (claim.state === "redeemed") return { claimId, already: true as const };
    if (claim.state !== "claimed") throw new HttpsError("failed-precondition", "This claim cannot be redeemed.");
    tx.set(ref, { state: "redeemed", redeemedAt: FieldValue.serverTimestamp() }, { merge: true });
    return { claimId, already: false as const };
  });
  if (!outcome.already) {
    await writeV3Audit({ action: "deal.redeem", actorUid: uid, subjectType: "dealClaim", subjectId: claimId });
  }
  return outcome;
});

/** Start an arrival cohort. The host is the first member. */
export const v3CreateCohort = onCall(CALLABLE, async (request) => {
  await noteAppCheck(request, "v3CreateCohort");
  const uid = requireAccount(request, "Create an email account to host a cohort.");
  await enforceRateLimit(uid, "v3Cohort", false);
  const data = (request.data || {}) as V3CreateCohortRequest;
  const input = v3Arg(() => ({
    title: requiredV3Text(data.title, "Title", 140),
    description: cleanV3Text(data.description, 2000),
    city: requiredV3Text(data.city, "City", 80),
    arrivesAt: data.arrivesAt === undefined ? undefined : parseV3IsoTime(data.arrivesAt, "Arrival"),
  }));
  const cohortId = randomDocId("cohort");
  await db
    .collection("cohorts")
    .doc(cohortId)
    .set(
      v3Clean({
        hostUid: uid,
        status: "open",
        title: input.title,
        description: input.description,
        city: input.city,
        arrivesAt: input.arrivesAt,
        memberUids: [uid],
        memberCount: 1,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      }),
    );
  await indexUserDoc(uid, "cohortIds", cohortId);
  await writeV3Audit({ action: "cohort.create", actorUid: uid, subjectType: "cohort", subjectId: cohortId });
  return { cohortId };
});

/** Join an open cohort. Idempotent for existing members. */
export const v3JoinCohort = onCall(CALLABLE, async (request) => {
  await noteAppCheck(request, "v3JoinCohort");
  const uid = requireAuth(request.auth?.uid);
  await enforceRateLimit(uid, "v3Cohort", isAnonymousAuth(request));
  const data = (request.data || {}) as V3JoinCohortRequest;
  const cohortId = v3Arg(() => parseV3Id(data.cohortId, "Cohort"));
  const ref = db.collection("cohorts").doc(cohortId);
  const outcome = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const cohort = snap.data() as { status?: string; memberUids?: string[] } | undefined;
    if (!snap.exists || !cohort) throw new HttpsError("not-found", "Cohort not found.");
    if (cohort.status !== "open") throw new HttpsError("failed-precondition", "This cohort is closed.");
    const members = Array.isArray(cohort.memberUids) ? cohort.memberUids : [];
    if (members.includes(uid)) return { cohortId, joined: false as const };
    const next = [...members, uid];
    tx.set(
      ref,
      { memberUids: next, memberCount: next.length, updatedAt: FieldValue.serverTimestamp() },
      { merge: true },
    );
    return { cohortId, joined: true as const };
  });
  if (outcome.joined) {
    await indexUserDoc(uid, "cohortIds", cohortId);
    await writeV3Audit({ action: "cohort.join", actorUid: uid, subjectType: "cohort", subjectId: cohortId });
  }
  return outcome;
});

/** Leave a cohort. The host cannot leave while hosting. */
export const v3LeaveCohort = onCall(CALLABLE, async (request) => {
  await noteAppCheck(request, "v3LeaveCohort");
  const uid = requireAuth(request.auth?.uid);
  await enforceRateLimit(uid, "v3Cohort", isAnonymousAuth(request));
  const data = (request.data || {}) as V3LeaveCohortRequest;
  const cohortId = v3Arg(() => parseV3Id(data.cohortId, "Cohort"));
  const ref = db.collection("cohorts").doc(cohortId);
  const outcome = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const cohort = snap.data() as { hostUid?: string; memberUids?: string[] } | undefined;
    if (!snap.exists || !cohort) throw new HttpsError("not-found", "Cohort not found.");
    if (cohort.hostUid === uid) throw new HttpsError("failed-precondition", "The host cannot leave a cohort.");
    const members = Array.isArray(cohort.memberUids) ? cohort.memberUids : [];
    if (!members.includes(uid)) return { cohortId, left: false as const };
    const next = members.filter((member) => member !== uid);
    tx.set(
      ref,
      { memberUids: next, memberCount: next.length, updatedAt: FieldValue.serverTimestamp() },
      { merge: true },
    );
    return { cohortId, left: true as const };
  });
  if (outcome.left) {
    await unindexUserDoc(uid, "cohortIds", cohortId);
    await writeV3Audit({ action: "cohort.leave", actorUid: uid, subjectType: "cohort", subjectId: cohortId });
  }
  return outcome;
});

/**
 * Request ownership of a Google-sourced venue. One pending claim per claimant
 * per venue (doc id is the claimant uid); a rejected or withdrawn claim may
 * be re-requested with better proof. Venues already on AirPal are refused:
 * those transfer ownership out of band, never through a fresh claim.
 */
export const v3RequestPlaceClaim = onCall(CALLABLE, async (request) => {
  await noteAppCheck(request, "v3RequestPlaceClaim");
  const uid = requireAccount(request, "Create an email account to claim a venue.");
  await enforceRateLimit(uid, "v3Place", false);
  const data = (request.data || {}) as V3RequestPlaceClaimRequest;
  const input = v3Arg(() => ({
    googlePlaceId: parseV3GooglePlaceId(data.googlePlaceId),
    businessName: requiredV3Text(data.businessName, "Business name", 140),
    city: requiredV3Text(data.city, "City", 80),
    category: requiredV3Text(data.category, "Category", 80),
    address: cleanV3Text(data.address, 200),
    proofNote: requiredV3Text(data.proofNote, "Proof of association", 2000),
    contactEmail: parseV3ContactEmail(data.contactEmail),
  }));
  const placeId = v3PlaceIdForGooglePlace(input.googlePlaceId);
  const placeSnap = await db.collection("places").doc(placeId).get();
  if (placeSnap.exists) throw new HttpsError("already-exists", "This venue is already on AirPal.");
  const ref = db.collection("places").doc(placeId).collection("claims").doc(uid);
  const existing = await ref.get();
  const prior = existing.data() as V3PlaceClaim | undefined;
  if (existing.exists && prior?.state === "pending") {
    return { placeId, state: "pending" as const, created: false as const };
  }
  await ref.set(
    v3Clean({
      placeId,
      googlePlaceId: input.googlePlaceId,
      claimantUid: uid,
      state: "pending",
      businessName: input.businessName,
      city: input.city,
      category: input.category,
      address: input.address,
      proofNote: input.proofNote,
      contactEmail: input.contactEmail,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }),
  );
  await writeV3Audit({
    action: "place.claim.request",
    actorUid: uid,
    subjectType: "placeClaim",
    subjectId: `${placeId}/${uid}`,
    detail: input.googlePlaceId,
  });
  return { placeId, state: "pending" as const, created: true as const };
});

/**
 * Admin review of a venue claim. Approving mints the owned V3 place as a
 * draft (the owner publishes via v3UpsertPlace); rejecting records a reason.
 * Review-time details override the claimant's where provided.
 */
export const v3ReviewPlaceClaim = onCall(CALLABLE, async (request) => {
  await noteAppCheck(request, "v3ReviewPlaceClaim");
  const uid = requireAccount(request, "Sign in to review claims.");
  if (!isPlatformAdmin(claimsOf(request))) throw new HttpsError("permission-denied", "Admins only.");
  await enforceRateLimit(uid, "v3Trust", false);
  const data = (request.data || {}) as V3ReviewPlaceClaimRequest;
  const input = v3Arg(() => ({
    placeId: parseV3PlaceId(data.placeId, "Place"),
    claimantUid: parseV3Uid(data.claimantUid, "Claimant"),
    reason: cleanV3Text(data.reason, 500),
    businessName: cleanV3Text(data.businessName, 140),
    city: cleanV3Text(data.city, 80),
    category: cleanV3Text(data.category, 80),
    address: cleanV3Text(data.address, 200),
  }));
  if (data.decision !== "approved" && data.decision !== "rejected") {
    throw new HttpsError("invalid-argument", "Decision must be approved or rejected.");
  }
  const claimRef = db.collection("places").doc(input.placeId).collection("claims").doc(input.claimantUid);
  const placeRef = db.collection("places").doc(input.placeId);
  await db.runTransaction(async (tx) => {
    const claimSnap = await tx.get(claimRef);
    const claim = claimSnap.data() as V3PlaceClaim | undefined;
    if (!claimSnap.exists || !claim) throw new HttpsError("not-found", "Claim not found.");
    if (claim.state !== "pending") throw new HttpsError("failed-precondition", "This claim is already decided.");
    if (data.decision === "rejected") {
      tx.set(
        claimRef,
        v3Clean({
          state: "rejected",
          reason: input.reason,
          decidedByUid: uid,
          decidedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        }),
        { merge: true },
      );
      return;
    }
    const businessName = input.businessName || claim.businessName;
    const city = input.city || claim.city;
    const category = input.category || claim.category;
    const address = input.address || claim.address;
    if (!businessName || !city || !category || !address) {
      throw new HttpsError("invalid-argument", "Name, city, category, and address are required to approve.");
    }
    const placeSnap = await tx.get(placeRef);
    if (placeSnap.exists) throw new HttpsError("already-exists", "This venue is already on AirPal.");
    tx.set(
      claimRef,
      v3Clean({
        state: "approved",
        reason: input.reason,
        decidedByUid: uid,
        decidedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      }),
      { merge: true },
    );
    tx.set(placeRef, {
      ownerUid: claim.claimantUid,
      status: "draft",
      name: businessName,
      description: "",
      city,
      category,
      address,
      googlePlaceId: claim.googlePlaceId,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
  await writeV3Audit({
    action: data.decision === "approved" ? "place.claim.approve" : "place.claim.reject",
    actorUid: uid,
    subjectType: "placeClaim",
    subjectId: `${input.placeId}/${input.claimantUid}`,
    detail: input.reason || undefined,
  });
  return { placeId: input.placeId, claimantUid: input.claimantUid, state: data.decision };
});

/** Withdraw the caller's own pending claim. */
export const v3WithdrawPlaceClaim = onCall(CALLABLE, async (request) => {
  await noteAppCheck(request, "v3WithdrawPlaceClaim");
  const uid = requireAccount(request, "Sign in to manage your claims.");
  await enforceRateLimit(uid, "v3Place", false);
  const data = (request.data || {}) as V3WithdrawPlaceClaimRequest;
  const placeId = v3Arg(() => parseV3PlaceId(data.placeId, "Place"));
  const ref = db.collection("places").doc(placeId).collection("claims").doc(uid);
  const snap = await ref.get();
  const claim = snap.data() as V3PlaceClaim | undefined;
  if (!snap.exists || !claim) throw new HttpsError("not-found", "Claim not found.");
  if (claim.claimantUid !== uid) throw new HttpsError("permission-denied", "Only the claimant can withdraw.");
  if (claim.state !== "pending") throw new HttpsError("failed-precondition", "Only pending claims can be withdrawn.");
  await ref.set({ state: "withdrawn", updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  await writeV3Audit({
    action: "place.claim.withdraw",
    actorUid: uid,
    subjectType: "placeClaim",
    subjectId: `${placeId}/${uid}`,
  });
  return { placeId, state: "withdrawn" as const };
});

/** Admin-only review queue across every venue's claims. */
export const v3ListPlaceClaims = onCall(CALLABLE, async (request) => {
  await noteAppCheck(request, "v3ListPlaceClaims");
  const uid = requireAccount(request, "Sign in to read claims.");
  if (!isPlatformAdmin(claimsOf(request))) throw new HttpsError("permission-denied", "Admins only.");
  await enforceRateLimit(uid, "v3Trust", false);
  const data = (request.data || {}) as V3ListPlaceClaimsRequest;
  const state = data.state === undefined ? "pending" : data.state;
  if (!isV3PlaceClaimState(state)) throw new HttpsError("invalid-argument", "Claim state is invalid.");
  const limit = v3Arg(() => parseV3ListLimit(data.limit));
  const snap = await db
    .collectionGroup("claims")
    .where("state", "==", state)
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();
  return {
    claims: snap.docs.map((doc) => ({ id: doc.id, placeId: doc.ref.parent.parent?.id || "", ...doc.data() })),
  };
});
