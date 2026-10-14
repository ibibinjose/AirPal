import { randomBytes } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";
import { db } from "../admin";

/** Private per-user id indexes kept on users/{uid} (see shared/v3-contract). */
export const V3_USER_INDEX_FIELDS = [
  "planIds",
  "cohortIds",
  "ticketIds",
  "orderIds",
  "claimIds",
  "conversationIds",
  "blockedUids",
] as const;
export type V3UserIndexField = (typeof V3_USER_INDEX_FIELDS)[number];

export function nowIso(): string {
  return new Date().toISOString();
}

export function randomDocId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${randomBytes(6).toString("hex")}`;
}

/**
 * Map shared-parser errors to invalid-argument so callable clients see a
 * stable validation shape instead of an internal error.
 */
export function v3Arg<T>(run: () => T): T {
  try {
    return run();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid request.";
    throw new HttpsError("invalid-argument", message);
  }
}

/** Deterministic doc id for idempotent creates (orders, tickets, claims). */
export function v3IdemDocId(prefix: string, uid: string, key: string): string {
  const safe = `${uid}_${key}`.replace(/[^A-Za-z0-9_.-]/g, "_").slice(0, 1200);
  return `${prefix}_${safe}`;
}

export async function writeV3Audit(input: {
  action: string;
  actorUid: string;
  subjectType: string;
  subjectId: string;
  detail?: string;
}): Promise<void> {
  await db.collection("audits").add(v3Clean({ ...input, at: nowIso(), createdAt: FieldValue.serverTimestamp() }));
}

export async function indexUserDoc(uid: string, field: V3UserIndexField, id: string): Promise<void> {
  await db
    .collection("users")
    .doc(uid)
    .set({ [field]: FieldValue.arrayUnion(id), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
}

export async function unindexUserDoc(uid: string, field: V3UserIndexField, id: string): Promise<void> {
  await db
    .collection("users")
    .doc(uid)
    .set({ [field]: FieldValue.arrayRemove(id), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
}

/**
 * Drop undefined fields from a write payload. Real Firestore rejects
 * undefined values, so optional request fields must be stripped — never
 * written through.
 */
export function v3Clean<T extends Record<string, unknown>>(row: T): T {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (value !== undefined) out[key] = value;
  }
  return out as T;
}

export function v3InviteCode(length = 6): string {
  return randomBytes(8)
    .toString("base64url")
    .replace(/[^A-Za-z0-9]/g, "")
    .slice(0, length)
    .toUpperCase();
}

export function v3ClaimCode(length = 6): string {
  return randomBytes(8)
    .toString("base64url")
    .replace(/[^A-Za-z0-9]/g, "")
    .slice(0, length)
    .toUpperCase();
}
