import { collection, doc, getDocs, limit, orderBy, query, updateDoc, where } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import type { Partner, PartnerApplication, PartnerApplicationStatus } from "@shared/partner";
import { getFirebaseDb, getFirebaseFunctions } from "./firebase";
import { fetchLivePartnerOffers } from "./pass-partners";

/**
 * Partner + admin dashboard data layer.
 *
 * Reads are scoped to the signed-in applicant (own applications, own
 * partner profiles) or to platform admins (review queue). Status changes
 * go through rules-guarded updates (applicant withdraw) or the
 * `reviewPartnerApplication` callable (admin approve/reject) — clients
 * can never promote their own status.
 */

export type ApplicationStepKey = "submitted" | "under_review" | "needs_info" | "approved" | "rejected" | "withdrawn";

export const APPLICATION_STEPS: Array<{ key: ApplicationStepKey; label: string }> = [
  { key: "submitted", label: "Submitted" },
  { key: "under_review", label: "Under review" },
  { key: "needs_info", label: "Needs info" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
];

/**
 * Display step for an application. There is no separate "needs info"
 * status in the pipeline — an under-review application carrying an admin
 * note is waiting on the applicant, so the tracker surfaces that state.
 */
export function applicationStepFor(status: PartnerApplicationStatus, adminNote?: string): ApplicationStepKey {
  if (status === "under_review" && (adminNote || "").trim()) return "needs_info";
  if (status === "withdrawn") return "withdrawn";
  return status;
}

export function applicationStepLabel(status: PartnerApplicationStatus, adminNote?: string): string {
  const key = applicationStepFor(status, adminNote);
  return APPLICATION_STEPS.find((s) => s.key === key)?.label ?? status;
}

function asApplication(id: string, data: Record<string, unknown>): PartnerApplication {
  return {
    id,
    applicantUid: String(data.applicantUid || ""),
    businessName: String(data.businessName || ""),
    category: String(data.category || "services") as PartnerApplication["category"],
    contactName: String(data.contactName || ""),
    contactEmail: String(data.contactEmail || ""),
    website: data.website ? String(data.website) : undefined,
    listingId: data.listingId ? String(data.listingId) : undefined,
    pitch: String(data.pitch || ""),
    status: String(data.status || "submitted") as PartnerApplicationStatus,
    adminNote: data.adminNote ? String(data.adminNote) : undefined,
    createdAt: String(data.createdAtIso || data.createdAt || ""),
    updatedAt: String(data.updatedAt || ""),
  };
}

function asPartner(id: string, data: Record<string, unknown>): Partner {
  return {
    id,
    slug: String(data.slug || id),
    name: String(data.name || "Partner"),
    category: String(data.category || "services") as Partner["category"],
    tagline: String(data.tagline || ""),
    description: String(data.description || ""),
    logoUrl: data.logoUrl ? String(data.logoUrl) : undefined,
    heroImage: data.heroImage ? String(data.heroImage) : undefined,
    website: data.website ? String(data.website) : undefined,
    listingId: data.listingId ? String(data.listingId) : undefined,
    placeId: data.placeId ? String(data.placeId) : undefined,
    ownerUid: String(data.ownerUid || ""),
    status: String(data.status || "approved") as Partner["status"],
    featured: Boolean(data.featured),
    createdAt: String(data.createdAtIso || data.createdAt || ""),
    updatedAt: String(data.updatedAt || ""),
  };
}

/** Applications filed by one applicant, newest first. */
export async function fetchMyPartnerApplications(uid: string): Promise<PartnerApplication[]> {
  const db = getFirebaseDb();
  if (!db || !uid) return [];
  const snap = await getDocs(
    query(collection(db, "partner_applications"), where("applicantUid", "==", uid), orderBy("createdAt", "desc")),
  );
  return snap.docs.map((d) => asApplication(d.id, d.data() as Record<string, unknown>));
}

/** Approved partner profiles owned by one user (usually zero or one). */
export async function fetchMyPartners(uid: string): Promise<Partner[]> {
  const db = getFirebaseDb();
  if (!db || !uid) return [];
  const snap = await getDocs(query(collection(db, "partners"), where("ownerUid", "==", uid)));
  return snap.docs.map((d) => asPartner(d.id, d.data() as Record<string, unknown>));
}

/** Admin review queue: applications in one status, newest first. */
export async function fetchPartnerApplicationsByStatus(status: string): Promise<PartnerApplication[]> {
  const db = getFirebaseDb();
  if (!db || !status) return [];
  const snap = await getDocs(
    query(
      collection(db, "partner_applications"),
      where("status", "==", status),
      orderBy("createdAt", "desc"),
      limit(100),
    ),
  );
  return snap.docs.map((d) => asApplication(d.id, d.data() as Record<string, unknown>));
}

/** Applicant withdraws their own pending application (rules-guarded). */
export async function withdrawPartnerApplication(applicationId: string): Promise<void> {
  const db = getFirebaseDb();
  if (!db || !applicationId.trim()) throw new Error("Application reference is missing.");
  await updateDoc(doc(db, "partner_applications", applicationId.trim()), {
    status: "withdrawn",
    updatedAt: new Date().toISOString(),
  });
}

/** Owner edits their own profile copy; status/ownership never change here. */
export async function updateMyPartnerProfile(
  partnerId: string,
  input: { name: string; category: string; tagline: string; description: string; website: string },
): Promise<void> {
  const db = getFirebaseDb();
  if (!db || !partnerId.trim()) throw new Error("Partner reference is missing.");
  await updateDoc(doc(db, "partners", partnerId.trim()), {
    name: input.name.trim(),
    category: input.category.trim(),
    tagline: input.tagline.trim().slice(0, 140),
    description: input.description.trim().slice(0, 2000),
    website: input.website.trim().slice(0, 200),
    updatedAt: new Date().toISOString(),
  });
}

export type ReviewDecision = "approve" | "reject";

/** Admin approve/reject via the privileged callable (audited server-side). */
export async function reviewPartnerApplicationRemote(input: {
  applicationId: string;
  decision: ReviewDecision;
  reason: string;
}): Promise<{ status: string; partnerId: string | null }> {
  const functions = getFirebaseFunctions();
  if (!functions) throw new Error("Firebase is not configured.");
  const call = httpsCallable<typeof input, { status: string; partnerId: string | null }>(
    functions,
    "reviewPartnerApplication",
  );
  const res = await call(input);
  return res.data;
}

export { fetchLivePartnerOffers };
