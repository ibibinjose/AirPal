import { FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import {
  applicationAdminCanTransition,
  normalizePartnerApplication,
  partnerSlugFor,
  validatePartnerApplication,
  type PartnerApplicationStatus,
} from "../../shared/partner";
import type { AccessClaims } from "../../shared/airpal-security";
import { enforceRateLimit, isAnonymousAuth, noteAppCheck } from "./abuse";
import { CALLABLE, db, isPlatformAdmin, requireAccount } from "./admin";

/**
 * Pass partners backend: applicants file their own application, admins
 * review (approve/reject). All writes go through the admin SDK — clients
 * can never promote their own status. Approving mints the public Partner
 * profile; venue facts stay on the linked BusinessListing.
 */

export type SubmitPartnerApplicationRequest = {
  businessName?: string;
  category?: string;
  contactName?: string;
  contactEmail?: string;
  website?: string;
  pitch?: string;
  listingId?: string;
};

export type ReviewPartnerApplicationRequest = {
  applicationId?: string;
  decision?: "approve" | "reject";
  reason?: string;
};

export const submitPartnerApplication = onCall(CALLABLE, async (request) => {
  await noteAppCheck(request, "submitPartnerApplication");
  const uid = requireAccount(request, "Sign in to apply as a partner.");
  await enforceRateLimit(uid, "claim", isAnonymousAuth(request));

  const data = (request.data || {}) as SubmitPartnerApplicationRequest;
  const raw = {
    businessName: String(data.businessName || ""),
    category: String(data.category || ""),
    contactName: String(data.contactName || ""),
    contactEmail: String(data.contactEmail || ""),
    website: String(data.website || ""),
    pitch: String(data.pitch || ""),
    listingId: String(data.listingId || ""),
  };
  const problems = validatePartnerApplication(raw);
  if (problems.length > 0) {
    throw new HttpsError("invalid-argument", problems[0] || "Invalid application.");
  }
  const clean = normalizePartnerApplication(raw);
  const now = new Date().toISOString();
  const ref = db.collection("partner_applications").doc();
  await ref.set({
    id: ref.id,
    applicantUid: uid,
    ...clean,
    status: "submitted" satisfies PartnerApplicationStatus,
    adminNote: "",
    createdAt: FieldValue.serverTimestamp(),
    createdAtIso: now,
    updatedAt: now,
  });
  return { applicationId: ref.id, status: "submitted" as const };
});

export const reviewPartnerApplication = onCall(CALLABLE, async (request) => {
  const uid = requireAccount(request);
  const caller = (request.auth?.token || {}) as AccessClaims;
  if (!isPlatformAdmin(caller)) {
    throw new HttpsError("permission-denied", "Only a platform admin can review partner applications.");
  }

  const data = (request.data || {}) as ReviewPartnerApplicationRequest;
  const applicationId = String(data.applicationId || "");
  if (!applicationId || (data.decision !== "approve" && data.decision !== "reject")) {
    throw new HttpsError("invalid-argument", "applicationId and decision are required.");
  }
  const to: PartnerApplicationStatus = data.decision === "approve" ? "approved" : "rejected";

  const ref = db.collection("partner_applications").doc(applicationId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "Application not found.");
  const app = (snap.data() || {}) as Record<string, unknown>;
  const from = String(app.status || "") as PartnerApplicationStatus;
  if (!applicationAdminCanTransition(from, to)) {
    throw new HttpsError("failed-precondition", `Cannot move from ${from} to ${to}.`);
  }

  const now = new Date().toISOString();
  const reason = String(data.reason || "").slice(0, 500);
  await ref.update({
    status: to,
    adminNote: reason,
    reviewedBy: uid,
    reviewedAt: FieldValue.serverTimestamp(),
    updatedAt: now,
  });
  await db.collection("admin_audits").add({
    actorUid: uid,
    action: `partner_application.${to}`,
    collection: "partner_applications",
    docId: applicationId,
    from,
    to,
    note: reason,
    createdAt: now,
  });

  if (to === "approved") {
    const partnerRef = db.collection("partners").doc();
    const businessName = String(app.businessName || "Partner");
    await partnerRef.set({
      id: partnerRef.id,
      slug: partnerSlugFor(businessName, partnerRef.id.slice(0, 6)),
      name: businessName,
      category: String(app.category || "services"),
      tagline: "",
      description: String(app.pitch || ""),
      website: String(app.website || ""),
      listingId: String(app.listingId || ""),
      ownerUid: String(app.applicantUid || ""),
      status: "approved",
      featured: false,
      applicationId,
      createdAt: FieldValue.serverTimestamp(),
      createdAtIso: now,
      updatedAt: now,
    });
    return { ok: true as const, status: to, partnerId: partnerRef.id };
  }

  return { ok: true as const, status: to, partnerId: null as string | null };
});
