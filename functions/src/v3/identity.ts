import { FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import {
  cleanV3Text,
  isV3Visibility,
  parseV3Handle,
  requiredV3Text,
  sanitizeV3Links,
  type V3BootstrapAccountRequest,
  type V3ClaimHandleRequest,
  type V3SetProfileVisibilityRequest,
  type V3UpdateProfileRequest,
} from "../../../shared/v3-contract";
import { CALLABLE, db, requireAuth, requireAccount } from "../admin";
import { enforceRateLimit, isAnonymousAuth, noteAppCheck } from "../abuse";
import { v3Arg, writeV3Audit } from "./common";

const USER_INDEX_DEFAULTS = {
  cohortIds: [],
  ticketIds: [],
  orderIds: [],
  claimIds: [],
  conversationIds: [],
  blockedUids: [],
};

/**
 * Create the private account shell for the signed-in user. Idempotent: an
 * existing account keeps its handle, preferences, and id indexes.
 */
export const v3BootstrapAccount = onCall(CALLABLE, async (request) => {
  await noteAppCheck(request, "v3BootstrapAccount");
  const uid = requireAuth(request.auth?.uid);
  await enforceRateLimit(uid, "v3Identity", isAnonymousAuth(request));
  const data = (request.data || {}) as V3BootstrapAccountRequest;
  const displayName = v3Arg(() =>
    data.displayName === undefined ? null : requiredV3Text(data.displayName, "Display name", 80),
  );
  const marketingEmail = data.marketingEmail === true;

  const ref = db.collection("users").doc(uid);
  const snap = await ref.get();
  if (!snap.exists) {
    const authName = cleanV3Text((request.auth?.token as { name?: unknown } | undefined)?.name, 80);
    await ref.set({
      uid,
      displayName: displayName || authName || "AirPal member",
      preferences: { marketingEmail },
      ...USER_INDEX_DEFAULTS,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    await writeV3Audit({ action: "account.bootstrap", actorUid: uid, subjectType: "user", subjectId: uid });
    return { uid, created: true as const };
  }
  const patch: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
  if (displayName) patch.displayName = displayName;
  if (data.marketingEmail !== undefined) patch.preferences = { marketingEmail };
  for (const [field, fallback] of Object.entries(USER_INDEX_DEFAULTS)) {
    if (!Array.isArray((snap.data() || {})[field])) patch[field] = fallback;
  }
  await ref.set(patch, { merge: true });
  return { uid, created: false as const };
});

/**
 * Claim or change the caller's public handle. Active handles are unique;
 * the previous handle is released so it can never point at two profiles.
 */
export const v3ClaimHandle = onCall(CALLABLE, async (request) => {
  await noteAppCheck(request, "v3ClaimHandle");
  const uid = requireAccount(request, "Create an email account to claim a handle.");
  await enforceRateLimit(uid, "v3Identity", false);
  const data = (request.data || {}) as V3ClaimHandleRequest;
  const handle = v3Arg(() => parseV3Handle(data.handle));

  const handleRef = db.collection("handles").doc(handle);
  const userRef = db.collection("users").doc(uid);
  const profileRef = db.collection("profiles").doc(uid);
  const outcome = await db.runTransaction(async (tx) => {
    const [handleSnap, userSnap, profileSnap] = await Promise.all([
      tx.get(handleRef),
      tx.get(userRef),
      tx.get(profileRef),
    ]);
    const existing = handleSnap.data() as { ownerUid?: string; active?: boolean } | undefined;
    if (handleSnap.exists && existing?.active === true && existing?.ownerUid !== uid) {
      throw new HttpsError("already-exists", "That handle is taken.");
    }
    if (handleSnap.exists && existing?.active === true && existing?.ownerUid === uid) {
      return { handle, changed: false as const };
    }
    const previous = cleanV3Text((userSnap.data() || {}).handle, 30);
    if (previous && previous !== handle) {
      tx.set(
        db.collection("handles").doc(previous),
        { handle: previous, ownerUid: uid, active: false, updatedAt: FieldValue.serverTimestamp() },
        { merge: true },
      );
    }
    tx.set(
      handleRef,
      { handle, ownerUid: uid, profileId: uid, active: true, updatedAt: FieldValue.serverTimestamp() },
      { merge: true },
    );
    const userPatch: Record<string, unknown> = {
      uid,
      handle,
      updatedAt: FieldValue.serverTimestamp(),
      ...(userSnap.exists
        ? {}
        : {
            displayName: handle,
            preferences: { marketingEmail: false },
            ...USER_INDEX_DEFAULTS,
            createdAt: FieldValue.serverTimestamp(),
          }),
    };
    tx.set(userRef, userPatch, { merge: true });
    tx.set(
      profileRef,
      {
        ownerUid: uid,
        handle,
        updatedAt: FieldValue.serverTimestamp(),
        ...(profileSnap.exists
          ? {}
          : {
              visibility: "private",
              displayName: handle,
              headline: "",
              about: "",
              city: "",
              links: [],
              createdAt: FieldValue.serverTimestamp(),
            }),
      },
      { merge: true },
    );
    return { handle, changed: true as const, previous: previous || null };
  });
  if (outcome.changed) {
    await writeV3Audit({
      action: "handle.claim",
      actorUid: uid,
      subjectType: "handle",
      subjectId: handle,
      detail: outcome.previous ? `released ${outcome.previous}` : "first claim",
    });
  }
  return outcome;
});

/** Update the caller's sanitised public bio. Links allow https/http/tel/mailto only. */
export const v3UpdateProfile = onCall(CALLABLE, async (request) => {
  await noteAppCheck(request, "v3UpdateProfile");
  const uid = requireAccount(request, "Create an email account to edit your bio.");
  await enforceRateLimit(uid, "v3Identity", false);
  const data = (request.data || {}) as V3UpdateProfileRequest;
  const patch = v3Arg(() => ({
    displayName: data.displayName === undefined ? undefined : requiredV3Text(data.displayName, "Display name", 80),
    headline: data.headline === undefined ? undefined : cleanV3Text(data.headline, 140),
    about: data.about === undefined ? undefined : cleanV3Text(data.about, 2000),
    city: data.city === undefined ? undefined : cleanV3Text(data.city, 80),
    avatarUrl: data.avatarUrl === undefined ? undefined : cleanV3Text(data.avatarUrl, 500),
    coverUrl: data.coverUrl === undefined ? undefined : cleanV3Text(data.coverUrl, 500),
    links: data.links === undefined ? undefined : sanitizeV3Links(data.links),
  }));

  const userSnap = await db.collection("users").doc(uid).get();
  const handle = cleanV3Text((userSnap.data() || {}).handle, 30);
  const ref = db.collection("profiles").doc(uid);
  const snap = await ref.get();
  const write: Record<string, unknown> = {
    ownerUid: uid,
    handle,
    updatedAt: FieldValue.serverTimestamp(),
  };
  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined) write[key] = value;
  }
  if (!snap.exists) {
    await ref.set({
      visibility: "private",
      displayName: (write.displayName as string) || handle || "AirPal member",
      headline: "",
      about: "",
      city: "",
      links: [],
      createdAt: FieldValue.serverTimestamp(),
      ...write,
    });
  } else {
    await ref.set(write, { merge: true });
  }
  await writeV3Audit({ action: "profile.update", actorUid: uid, subjectType: "profile", subjectId: uid });
  return { uid, updated: true as const };
});

/** Flip the caller's bio between public discovery and private. Recorded in audits. */
export const v3SetProfileVisibility = onCall(CALLABLE, async (request) => {
  await noteAppCheck(request, "v3SetProfileVisibility");
  const uid = requireAccount(request, "Create an email account to change visibility.");
  await enforceRateLimit(uid, "v3Identity", false);
  const data = (request.data || {}) as V3SetProfileVisibilityRequest;
  if (!isV3Visibility(data.visibility)) throw new HttpsError("invalid-argument", "Visibility is invalid.");
  await db
    .collection("profiles")
    .doc(uid)
    .set({ ownerUid: uid, visibility: data.visibility, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  await writeV3Audit({
    action: "profile.visibility",
    actorUid: uid,
    subjectType: "profile",
    subjectId: uid,
    detail: data.visibility,
  });
  return { uid, visibility: data.visibility };
});
