import { FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import {
  cleanV3Text,
  isV3Rsvp,
  isV3Visibility,
  parseV3Handle,
  parseV3Id,
  parseV3IsoTime,
  parseV3Uid,
  requiredV3Text,
  type V3AddPlanStopRequest,
  type V3CompletePlanRequest,
  type V3CreatePlanRequest,
  type V3InviteToPlanRequest,
  type V3Plan,
  type V3PlanMember,
  type V3PlanStop,
  type V3RespondToPlanRequest,
  type V3VotePlanStopRequest,
} from "../../../shared/v3-contract";
import type { AccessClaims } from "../../../shared/airpal-security";
import { CALLABLE, db, isPlatformAdmin, requireAuth } from "../admin";
import { enforceRateLimit, isAnonymousAuth, noteAppCheck } from "../abuse";
import { indexUserDoc, randomDocId, v3Arg, v3Clean, v3InviteCode, writeV3Audit } from "./common";

async function planOrThrow(planId: string) {
  const ref = db.collection("plans").doc(planId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "Plan not found.");
  return { ref, plan: { id: snap.id, ...(snap.data() as V3Plan) } };
}

async function memberOrNull(planId: string, uid: string) {
  const snap = await db.collection("plans").doc(planId).collection("members").doc(uid).get();
  if (!snap.exists) return null;
  return snap.data() as V3PlanMember;
}

function planClaims(request: { auth?: { token?: unknown } }) {
  return request.auth?.token as AccessClaims | undefined;
}

export const v3CreatePlan = onCall(CALLABLE, async (request) => {
  await noteAppCheck(request, "v3CreatePlan");
  const uid = requireAuth(request.auth?.uid);
  await enforceRateLimit(uid, "v3Plan", isAnonymousAuth(request));
  const data = (request.data || {}) as V3CreatePlanRequest;
  const input = v3Arg(() => ({
    title: requiredV3Text(data.title, "Title", 140),
    description: cleanV3Text(data.description, 2000),
    city: requiredV3Text(data.city, "City", 80),
    startsAt: parseV3IsoTime(data.startsAt, "Start"),
    placeId: data.placeId === undefined ? undefined : parseV3Id(data.placeId, "Place"),
    visibility: data.visibility === undefined ? "private" : data.visibility,
  }));
  if (!isV3Visibility(input.visibility)) throw new HttpsError("invalid-argument", "Visibility is invalid.");

  const planId = randomDocId("plan");
  const inviteCode = v3InviteCode();
  await db
    .collection("plans")
    .doc(planId)
    .set(
      v3Clean({
        ownerUid: uid,
        visibility: input.visibility,
        state: "open",
        title: input.title,
        description: input.description,
        city: input.city,
        startsAt: input.startsAt,
        placeId: input.placeId,
        inviteCode,
        stops: [],
        attendeeCount: 1,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      }),
    );
  await db.collection("plans").doc(planId).collection("members").doc(uid).set({
    uid,
    role: "owner",
    rsvp: "going",
    updatedAt: FieldValue.serverTimestamp(),
  });
  await indexUserDoc(uid, "planIds", planId);
  await writeV3Audit({ action: "plan.create", actorUid: uid, subjectType: "plan", subjectId: planId });
  return { planId, inviteCode };
});

export const v3InviteToPlan = onCall(CALLABLE, async (request) => {
  await noteAppCheck(request, "v3InviteToPlan");
  const uid = requireAuth(request.auth?.uid);
  await enforceRateLimit(uid, "v3Plan", isAnonymousAuth(request));
  const data = (request.data || {}) as V3InviteToPlanRequest;
  const planId = v3Arg(() => parseV3Id(data.planId, "Plan"));
  const { plan } = await planOrThrow(planId);
  const caller = await memberOrNull(planId, uid);
  if (!caller && !isPlatformAdmin(planClaims(request))) {
    throw new HttpsError("permission-denied", "Only plan members can invite.");
  }
  if (plan.state !== "open") throw new HttpsError("failed-precondition", "This plan is closed.");
  const inviteeRef = v3Arg(() => {
    if (data.uid) return { uid: parseV3Uid(data.uid, "Invitee") };
    if (data.handle) return { handle: parseV3Handle(data.handle) };
    throw new Error("Invite by user id or handle.");
  });
  let inviteeUid = "uid" in inviteeRef ? inviteeRef.uid : undefined;
  const inviteeHandle = "handle" in inviteeRef ? inviteeRef.handle : undefined;
  if (!inviteeUid && inviteeHandle) {
    const link = await db.collection("handles").doc(inviteeHandle).get();
    const ownerUid = (link.data() as { ownerUid?: string; active?: boolean } | undefined)?.ownerUid;
    if (!link.exists || (link.data() as { active?: boolean } | undefined)?.active !== true || !ownerUid) {
      throw new HttpsError("not-found", "That handle is not claimed.");
    }
    inviteeUid = ownerUid;
  }
  if (!inviteeUid) throw new HttpsError("invalid-argument", "Invite by user id or handle.");
  if (inviteeUid === uid) throw new HttpsError("invalid-argument", "You are already on this plan.");
  const existing = await memberOrNull(planId, inviteeUid);
  if (existing) return { planId, uid: inviteeUid, invited: false as const };
  await db.collection("plans").doc(planId).collection("members").doc(inviteeUid).set({
    uid: inviteeUid,
    role: "member",
    rsvp: "invited",
    updatedAt: FieldValue.serverTimestamp(),
  });
  await indexUserDoc(inviteeUid, "planIds", planId);
  await writeV3Audit({
    action: "plan.invite",
    actorUid: uid,
    subjectType: "plan",
    subjectId: planId,
    detail: inviteeUid,
  });
  return { planId, uid: inviteeUid, invited: true as const };
});

export const v3RsvpPlan = onCall(CALLABLE, async (request) => {
  await noteAppCheck(request, "v3RsvpPlan");
  const uid = requireAuth(request.auth?.uid);
  await enforceRateLimit(uid, "v3Plan", isAnonymousAuth(request));
  const data = (request.data || {}) as V3RespondToPlanRequest;
  const planId = v3Arg(() => parseV3Id(data.planId, "Plan"));
  if (!isV3Rsvp(data.rsvp) || data.rsvp === "invited") {
    throw new HttpsError("invalid-argument", "RSVP must be going, maybe, or declined.");
  }
  const { plan } = await planOrThrow(planId);
  if (plan.state !== "open") throw new HttpsError("failed-precondition", "This plan is closed.");
  const existing = await memberOrNull(planId, uid);
  if (!existing) {
    if (!(plan.visibility === "public" && plan.state === "open")) {
      throw new HttpsError("permission-denied", "This plan is private.");
    }
    await db.collection("plans").doc(planId).collection("members").doc(uid).set({
      uid,
      role: "member",
      rsvp: data.rsvp,
      updatedAt: FieldValue.serverTimestamp(),
    });
    await indexUserDoc(uid, "planIds", planId);
  } else {
    await db
      .collection("plans")
      .doc(planId)
      .collection("members")
      .doc(uid)
      .set({ rsvp: data.rsvp, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  }
  const members = await db.collection("plans").doc(planId).collection("members").where("rsvp", "==", "going").get();
  await db
    .collection("plans")
    .doc(planId)
    .set({ attendeeCount: members.size, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  await writeV3Audit({
    action: "plan.rsvp",
    actorUid: uid,
    subjectType: "plan",
    subjectId: planId,
    detail: data.rsvp,
  });
  return { planId, rsvp: data.rsvp };
});

export const v3AddPlanStop = onCall(CALLABLE, async (request) => {
  await noteAppCheck(request, "v3AddPlanStop");
  const uid = requireAuth(request.auth?.uid);
  await enforceRateLimit(uid, "v3Plan", isAnonymousAuth(request));
  const data = (request.data || {}) as V3AddPlanStopRequest;
  const input = v3Arg(() => ({
    planId: parseV3Id(data.planId, "Plan"),
    name: requiredV3Text(data.name, "Stop name", 140),
    time: cleanV3Text(data.time, 40),
    placeId: data.placeId === undefined ? undefined : parseV3Id(data.placeId, "Place"),
  }));
  const { plan } = await planOrThrow(input.planId);
  if (plan.state !== "open") throw new HttpsError("failed-precondition", "This plan is closed.");
  if (!(await memberOrNull(input.planId, uid))) {
    throw new HttpsError("permission-denied", "Only plan members can add stops.");
  }
  const stops = Array.isArray(plan.stops) ? (plan.stops as V3PlanStop[]) : [];
  if (stops.length >= 50) throw new HttpsError("failed-precondition", "This plan already has 50 stops.");
  const stop: V3PlanStop = v3Clean({
    id: randomDocId("stop"),
    name: input.name,
    time: input.time || undefined,
    placeId: input.placeId,
    addedByUid: uid,
    votes: 1,
    voterUids: [uid],
  });
  await db
    .collection("plans")
    .doc(input.planId)
    .set({ stops: [...stops, stop], updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  return { planId: input.planId, stop };
});

export const v3VotePlanStop = onCall(CALLABLE, async (request) => {
  await noteAppCheck(request, "v3VotePlanStop");
  const uid = requireAuth(request.auth?.uid);
  await enforceRateLimit(uid, "v3Plan", isAnonymousAuth(request));
  const data = (request.data || {}) as V3VotePlanStopRequest;
  const planId = v3Arg(() => parseV3Id(data.planId, "Plan"));
  const stopId = v3Arg(() => parseV3Id(data.stopId, "Stop"));
  const { plan } = await planOrThrow(planId);
  if (plan.state !== "open") throw new HttpsError("failed-precondition", "This plan is closed.");
  if (!(await memberOrNull(planId, uid))) {
    throw new HttpsError("permission-denied", "Only plan members can vote.");
  }
  const stops = Array.isArray(plan.stops) ? (plan.stops as V3PlanStop[]) : [];
  const stop = stops.find((row) => row.id === stopId);
  if (!stop) throw new HttpsError("not-found", "Stop not found.");
  const voters = new Set(stop.voterUids || []);
  if (voters.has(uid)) voters.delete(uid);
  else voters.add(uid);
  stop.voterUids = [...voters];
  stop.votes = stop.voterUids.length;
  await db.collection("plans").doc(planId).set({ stops, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  return { planId, stopId, votes: stop.votes, voted: voters.has(uid) };
});

export const v3CompletePlan = onCall(CALLABLE, async (request) => {
  await noteAppCheck(request, "v3CompletePlan");
  const uid = requireAuth(request.auth?.uid);
  await enforceRateLimit(uid, "v3Plan", isAnonymousAuth(request));
  const data = (request.data || {}) as V3CompletePlanRequest;
  const planId = v3Arg(() => parseV3Id(data.planId, "Plan"));
  const { plan } = await planOrThrow(planId);
  if (plan.ownerUid !== uid && !isPlatformAdmin(planClaims(request))) {
    throw new HttpsError("permission-denied", "Only the plan owner can complete it.");
  }
  if (plan.state !== "open") return { planId, state: plan.state };
  await db
    .collection("plans")
    .doc(planId)
    .set({ state: "completed", updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  await writeV3Audit({ action: "plan.complete", actorUid: uid, subjectType: "plan", subjectId: planId });
  return { planId, state: "completed" as const };
});
