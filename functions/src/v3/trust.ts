import { FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import {
  cleanV3Text,
  parseV3Id,
  parseV3ListLimit,
  parseV3Uid,
  requiredV3Text,
  type V3BlockUserRequest,
  type V3ListAuditsRequest,
  type V3ReportRequest,
  type V3UnblockUserRequest,
} from "../../../shared/v3-contract";
import type { AccessClaims } from "../../../shared/airpal-security";
import { CALLABLE, db, isPlatformAdmin, requireAccount, requireAuth } from "../admin";
import { enforceRateLimit, isAnonymousAuth, noteAppCheck } from "../abuse";
import { indexUserDoc, unindexUserDoc, v3Arg, writeV3Audit } from "./common";

const REPORT_SUBJECTS = ["profile", "plan", "event", "place", "message"] as const;

/** File a trust report. Stored in the admin-only audit trail. */
export const v3ReportContent = onCall(CALLABLE, async (request) => {
  await noteAppCheck(request, "v3ReportContent");
  const uid = requireAuth(request.auth?.uid);
  await enforceRateLimit(uid, "v3Trust", isAnonymousAuth(request));
  const data = (request.data || {}) as V3ReportRequest;
  const input = v3Arg(() => ({
    subjectType: requiredV3Text(data.subjectType, "Subject type", 40),
    subjectId: parseV3Id(data.subjectId, "Subject"),
    reason: requiredV3Text(data.reason, "Reason", 140),
    detail: cleanV3Text(data.detail, 2000),
  }));
  if (!(REPORT_SUBJECTS as readonly string[]).includes(input.subjectType)) {
    throw new HttpsError("invalid-argument", "Subject type is invalid.");
  }
  await writeV3Audit({
    action: "trust.report",
    actorUid: uid,
    subjectType: input.subjectType,
    subjectId: input.subjectId,
    detail: `${input.reason}${input.detail ? ` — ${input.detail}` : ""}`.slice(0, 2000),
  });
  return { reported: true as const };
});

/**
 * Block another user. The block lives in a server-only subcollection plus the
 * caller's private mirror; messaging checks both directions before delivery.
 */
export const v3BlockUser = onCall(CALLABLE, async (request) => {
  await noteAppCheck(request, "v3BlockUser");
  const uid = requireAccount(request, "Create an email account to block users.");
  await enforceRateLimit(uid, "v3Trust", false);
  const data = (request.data || {}) as V3BlockUserRequest;
  const target = v3Arg(() => parseV3Uid(data.uid, "User"));
  if (target === uid) throw new HttpsError("invalid-argument", "You cannot block yourself.");
  await db.collection("users").doc(uid).collection("blocks").doc(target).set({
    blockedUid: target,
    createdAt: FieldValue.serverTimestamp(),
  });
  await indexUserDoc(uid, "blockedUids", target);
  await writeV3Audit({ action: "trust.block", actorUid: uid, subjectType: "user", subjectId: target });
  return { uid: target, blocked: true as const };
});

export const v3UnblockUser = onCall(CALLABLE, async (request) => {
  await noteAppCheck(request, "v3UnblockUser");
  const uid = requireAccount(request, "Create an email account to manage blocks.");
  await enforceRateLimit(uid, "v3Trust", false);
  const data = (request.data || {}) as V3UnblockUserRequest;
  const target = v3Arg(() => parseV3Uid(data.uid, "User"));
  await db
    .collection("users")
    .doc(uid)
    .collection("blocks")
    .doc(target)
    .delete()
    .catch(() => undefined);
  await unindexUserDoc(uid, "blockedUids", target);
  await writeV3Audit({ action: "trust.unblock", actorUid: uid, subjectType: "user", subjectId: target });
  return { uid: target, blocked: false as const };
});

/** Admin-only audit search over the trust, abuse, and payment trail. */
export const v3ListAuditEntries = onCall(CALLABLE, async (request) => {
  await noteAppCheck(request, "v3ListAuditEntries");
  const uid = requireAccount(request, "Sign in to read audits.");
  if (!isPlatformAdmin(request.auth?.token as AccessClaims | undefined)) {
    throw new HttpsError("permission-denied", "Admins only.");
  }
  await enforceRateLimit(uid, "v3Trust", false);
  const data = (request.data || {}) as V3ListAuditsRequest;
  const limit = v3Arg(() => parseV3ListLimit(data.limit));
  const subjectType = cleanV3Text(data.subjectType, 40);
  const subjectId = data.subjectId === undefined ? "" : v3Arg(() => parseV3Id(data.subjectId as string, "Subject"));
  let query = db.collection("audits").orderBy("at", "desc");
  if (subjectType && subjectId) {
    query = db
      .collection("audits")
      .where("subjectType", "==", subjectType)
      .where("subjectId", "==", subjectId)
      .orderBy("at", "desc");
  } else if (subjectType) {
    query = db.collection("audits").where("subjectType", "==", subjectType).orderBy("at", "desc");
  }
  const snap = await query.limit(limit).get();
  return {
    entries: snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
  };
});
