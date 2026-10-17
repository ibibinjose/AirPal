import { FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { type AccessClaims, type PropertyMemberRole } from "../../shared/airpal-security";

import { CALLABLE, auth, db, isPlatformAdmin, platformAdminEmails, requireAccount, writeAccessClaims } from "./admin";

export const ensurePlatformAdmin = onCall(CALLABLE, async (request) => {
  const uid = requireAccount(request);
  const authUser = await auth.getUser(uid);
  const email = (authUser.email || "").toLowerCase();
  if (!platformAdminEmails().includes(email)) {
    throw new HttpsError("permission-denied", "This account is not on the platform admin allowlist.");
  }

  await writeAccessClaims(uid, { platformAdmin: true });
  const existing = await db.collection("users").doc(uid).get();
  const propertyIds = Array.isArray(existing.data()?.propertyIds) ? existing.data()?.propertyIds : [];
  await db
    .collection("users")
    .doc(uid)
    .set(
      {
        uid,
        email,
        displayName: existing.data()?.displayName || "Bibin Jose",
        role: "super_admin",
        propertyIds,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  return { uid, role: "super_admin" as const, propertyIds };
});

export const setPropertyMember = onCall(CALLABLE, async (request) => {
  const uid = requireAccount(request);
  const propertyId = String(request.data?.propertyId || "");
  const memberUid = String(request.data?.memberUid || "");
  const memberRole = request.data?.role as PropertyMemberRole;
  if (!propertyId || !memberUid || (memberRole !== "host_admin" && memberRole !== "staff")) {
    throw new HttpsError("invalid-argument", "propertyId, memberUid, and role are required.");
  }

  const caller = (request.auth?.token || {}) as AccessClaims;
  const propertySnap = await db.collection("properties").doc(propertyId).get();
  if (!propertySnap.exists) throw new HttpsError("not-found", "Property not found.");
  const property = propertySnap.data() || {};
  const callerManages = isPlatformAdmin(caller) || property.ownerId === uid || property.members?.[uid] === "host_admin";
  if (!callerManages) throw new HttpsError("permission-denied", "Only a host or platform admin can add staff.");

  const members = { ...(property.members || {}), [memberUid]: memberRole };
  await propertySnap.ref.update({ members, updatedAt: FieldValue.serverTimestamp() });

  const memberProfile = db.collection("users").doc(memberUid);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(memberProfile);
    const ids: string[] = snap.exists ? [...(snap.data()?.propertyIds || [])] : [];
    if (!ids.includes(propertyId)) ids.push(propertyId);
    tx.set(
      memberProfile,
      {
        uid: memberUid,
        propertyIds: ids,
        role: memberRole === "host_admin" ? "host_admin" : snap.data()?.role === "host_admin" ? "host_admin" : "staff",
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  });

  const claims = await writeAccessClaims(memberUid, { propertyId, memberRole });
  return { ok: true, role: claims.role, propertyId, memberUid };
});

export const backfillOwnerClaims = onCall(CALLABLE, async (request) => {
  requireAccount(request);
  const caller = (request.auth?.token || {}) as AccessClaims;
  if (!isPlatformAdmin(caller)) {
    throw new HttpsError("permission-denied", "Only a platform admin can backfill ownership claims.");
  }

  const snapshot = await db.collection("properties").get();
  let updated = 0;
  for (const propertyDoc of snapshot.docs) {
    const data = propertyDoc.data() || {};
    const ownerId = String(data.ownerId || "");
    if (!ownerId) continue;
    const members = { ...(data.members || {}), [ownerId]: "host_admin" as const };
    await propertyDoc.ref.set({ members }, { merge: true });
    await writeAccessClaims(ownerId, { propertyId: propertyDoc.id, memberRole: "host_admin" });
    const userRef = db.collection("users").doc(ownerId);
    const userSnap = await userRef.get();
    const ids: string[] = userSnap.exists ? [...(userSnap.data()?.propertyIds || [])] : [];
    if (!ids.includes(propertyDoc.id)) ids.push(propertyDoc.id);
    await userRef.set(
      {
        uid: ownerId,
        propertyIds: ids,
        role: userSnap.data()?.role === "super_admin" ? "super_admin" : "host_admin",
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    updated += 1;
  }
  return { updated };
});
