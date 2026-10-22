import { HttpsError, onCall } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";
import { normalizeHandle } from "../../shared/bio";
import { resolveFirebaseWebApiKey, toE164 } from "../../shared/phone-auth";
import { isAdultBirthDate, sydneyToday } from "../../shared/validate";
import { monthFromBirthDate } from "../../shared/birthday-freebies";
import { CALLABLE, auth, db, requireAccount } from "./admin";
import { enforceRateLimit, isAnonymousAuth, noteAppCheck } from "./abuse";

function phoneLoginId(raw: string): string {
  const e164 = toE164(raw);
  if (!e164 || e164.length < 8) throw new HttpsError("invalid-argument", "Need a real mobile number.");
  return e164;
}

function adultSignupData(requestData: unknown): number {
  const payload = (requestData || {}) as { birthDate?: string; adultConsent?: boolean };
  const birthDate = String(payload.birthDate || "").trim();
  if (payload.adultConsent !== true) {
    throw new HttpsError("failed-precondition", "Confirm you are 18 years of age or older.");
  }
  if (!isAdultBirthDate(birthDate, sydneyToday())) {
    throw new HttpsError("failed-precondition", "AirPal accounts are for people 18 or older.");
  }
  const birthdayMonth = monthFromBirthDate(birthDate);
  if (!birthdayMonth) {
    throw new HttpsError("invalid-argument", "Enter a valid date of birth.");
  }
  return birthdayMonth;
}

function adultSignupPatch(birthdayMonth: number) {
  return {
    adultConfirmed: true,
    adultConfirmedAt: FieldValue.serverTimestamp(),
    adultConsent: true,
    adultConsentAt: new Date().toISOString(),
    birthdayMonth,
    birthdayAlertsEnabled: true,
    birthdayAlertsRegion: "au",
    updatedAt: FieldValue.serverTimestamp(),
  };
}

/** Server-verifies an adult signup for email and social accounts. Full DOB is never stored. */
export const confirmAdultSignup = onCall(CALLABLE, async (request) => {
  await noteAppCheck(request, "confirmAdultSignup");
  const uid = requireAccount(request, "Create an account first.");
  await enforceRateLimit(uid, "enter", false);
  const birthdayMonth = adultSignupData(request.data);
  await db.collection("users").doc(uid).set(adultSignupPatch(birthdayMonth), { merge: true });
  return { ok: true as const, birthdayMonth };
});

/** After SMS + email/password link: store the phone so they can sign in with mobile + password. */
export const completeAccountSignup = onCall(CALLABLE, async (request) => {
  await noteAppCheck(request, "completeAccountSignup");
  const uid = requireAccount(request, "Confirm your mobile number first.");
  await enforceRateLimit(uid, "enter", false);
  const handle = normalizeHandle(String((request.data as { handle?: string })?.handle || ""));
  const name = String((request.data as { name?: string })?.name || "").trim();
  const email = String((request.data as { email?: string })?.email || "")
    .trim()
    .toLowerCase();
  const record = await auth.getUser(uid);
  const phone = record.phoneNumber || "";
  if (!phone) throw new HttpsError("failed-precondition", "Confirm your mobile number first.");
  if (!handle || name.length < 2 || !email.includes("@")) {
    throw new HttpsError("invalid-argument", "Handle, name, and email are required.");
  }
  const birthdayMonth = adultSignupData(request.data);
  const handles = db.collection("handles");
  const handleRef = handles.doc(handle);
  const profiles = db.collection("profiles");
  await db.runTransaction(async (transaction) => {
    const existingHandle = await transaction.get(handleRef);
    if (existingHandle.exists && String(existingHandle.data()?.ownerUid) !== uid) {
      throw new HttpsError("already-exists", "That @handle is already taken. Choose another.");
    }
    const owned = await transaction.get(profiles.where("ownerUid", "==", uid));
    const person = owned.docs.find((row) => String(row.data()?.kind || "person") === "person");
    const existingProfileId = String(existingHandle.data()?.profileId || "");
    const profileId = existingProfileId || person?.id || `bio-${uid.slice(0, 8)}`;
    transaction.set(
      db.collection("users").doc(uid),
      {
        uid,
        email: record.email || email,
        displayName: record.displayName || name,
        phone,
        handle,
        role: "guest",
        emailVerified: Boolean(record.emailVerified),
        phoneVerified: true,
        ...adultSignupPatch(birthdayMonth),
      },
      { merge: true },
    );
    transaction.set(db.collection("phone_logins").doc(phone), {
      uid,
      updatedAt: FieldValue.serverTimestamp(),
    });
    transaction.set(handleRef, { handle, profileId, ownerUid: uid }, { merge: true });
    transaction.set(
      profiles.doc(profileId),
      {
        id: profileId,
        handle,
        kind: "person",
        ownerUid: uid,
        name,
        shortWhy: "On AirPal",
        city: "Sydney",
        category: "services",
        hours: "",
        openNow: true,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  });
  return { ok: true as const, phone, birthdayMonth };
});

/** First Google / Apple sign-in: create the users doc (clients cannot create it). */
export const ensureUserProfile = onCall(CALLABLE, async (request) => {
  await noteAppCheck(request, "ensureUserProfile");
  const uid = requireAccount(request, "Sign in first.");
  const record = await auth.getUser(uid);
  const email = record.email || "";
  const displayName = record.displayName || email.split("@")[0] || "AirPal";
  const existing = await db.collection("users").doc(uid).get();
  const payload: Record<string, unknown> = {
    uid,
    email,
    displayName,
    emailVerified: Boolean(record.emailVerified),
    photoURL: record.photoURL || "",
    phone: record.phoneNumber || "",
    phoneVerified: Boolean(record.phoneNumber),
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (!existing.exists) {
    payload.role = "guest";
    payload.createdAt = FieldValue.serverTimestamp();
  }
  await db.collection("users").doc(uid).set(payload, { merge: true });
  return { ok: true as const, created: !existing.exists };
});

/**
 * Sign in with mobile + password without returning the email to the client.
 * Verifies the password through Identity Toolkit, then issues a custom token.
 */
export const loginWithPhonePassword = onCall(CALLABLE, async (request) => {
  await noteAppCheck(request, "loginWithPhonePassword");
  const data = (request.data || {}) as { phone?: string; password?: string; apiKey?: string };
  const phone = phoneLoginId(String(data.phone || ""));
  const password = String(data.password || "");
  if (password.length < 8) throw new HttpsError("invalid-argument", "Mobile number or password is wrong.");
  const anonKey = `phone-${phone.replace(/\D/g, "").slice(-10)}`;
  await enforceRateLimit(request.auth?.uid || anonKey, "authLogin", isAnonymousAuth(request) || !request.auth?.uid);

  const snap = await db.collection("phone_logins").doc(phone).get();
  if (!snap.exists) throw new HttpsError("not-found", "Mobile number or password is wrong.");
  const uid = String(snap.data()?.uid || "");
  if (!uid) throw new HttpsError("not-found", "Mobile number or password is wrong.");

  const record = await auth.getUser(uid);
  const email = record.email;
  if (!email) {
    throw new HttpsError(
      "failed-precondition",
      "This account signs in with SMS. Create a password from Sign up, or use the SMS code.",
    );
  }

  const apiKey = resolveFirebaseWebApiKey(
    process.env.FIREBASE_WEB_API_KEY || process.env.VITE_FIREBASE_API_KEY,
    data.apiKey,
  );
  if (!apiKey) {
    throw new HttpsError("failed-precondition", "Phone and password sign-in is not configured yet. Use the SMS code.");
  }

  const verify = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    },
  );
  if (!verify.ok) {
    throw new HttpsError("unauthenticated", "Mobile number or password is wrong.");
  }

  const token = await auth.createCustomToken(uid);
  return { token };
});
