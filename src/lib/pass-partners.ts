import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { BUSINESS_CATEGORIES } from "@shared/business";
import type { Partner } from "@shared/partner";
import type { Promotion } from "@shared/promotions";
import { getFirebaseDb, getFirebaseFunctions } from "./firebase";

/**
 * Pass-partners directory data layer.
 *
 * Reads are public (firestore.rules: approved partners are world-readable);
 * writes go through the `submitPartnerApplication` callable only — clients
 * never write partner docs directly.
 */

export type PartnerFilter = {
  search: string;
  category: string; // "All" or a BusinessCategoryId
};

export function partnerCategoryLabel(category: string): string {
  const hit = BUSINESS_CATEGORIES.find((c) => c.id === category);
  return hit ? hit.label : "Partner";
}

/** Pure directory filter: category first, then multi-field search. */
export function filterPassPartners(partners: Partner[], filter: PartnerFilter): Partner[] {
  const q = filter.search.trim().toLowerCase();
  return partners.filter((p) => {
    if (filter.category !== "All" && p.category !== filter.category) return false;
    if (!q) return true;
    return [p.name, p.tagline, p.description, partnerCategoryLabel(p.category)].join(" ").toLowerCase().includes(q);
  });
}

/**
 * A live promotion belongs to a partner page when the sponsor names the
 * partner. The perk itself stays a Promotion — no second deal system.
 */
export function promotionMatchesPartner(promo: Promotion, partnerName: string): boolean {
  const sponsor = (promo.sponsorName || "").trim().toLowerCase();
  const name = partnerName.trim().toLowerCase();
  return sponsor.length > 0 && sponsor === name;
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
    status: "approved",
    featured: Boolean(data.featured),
    createdAt: String(data.createdAt || ""),
    updatedAt: String(data.updatedAt || ""),
  };
}

/** Public directory: approved partners, featured first, then A–Z. */
export async function fetchApprovedPartners(): Promise<Partner[]> {
  const db = getFirebaseDb();
  if (!db) return [];
  const snap = await getDocs(query(collection(db, "partners"), where("status", "==", "approved")));
  const list = snap.docs.map((d) => asPartner(d.id, d.data() as Record<string, unknown>));
  list.sort((a, b) => Number(b.featured ?? false) - Number(a.featured ?? false) || a.name.localeCompare(b.name));
  return list;
}

/** Single public profile by directory slug. Null when unknown/unapproved. */
export async function fetchPartnerBySlug(slug: string): Promise<Partner | null> {
  const db = getFirebaseDb();
  if (!db || !slug.trim()) return null;
  const snap = await getDocs(
    query(collection(db, "partners"), where("slug", "==", slug.trim()), where("status", "==", "approved"), limit(1)),
  );
  const doc = snap.docs[0];
  return doc ? asPartner(doc.id, doc.data() as Record<string, unknown>) : null;
}

/** Live offers for a partner page: live promotions sponsored by the partner. */
export async function fetchLivePartnerOffers(partnerName: string): Promise<Promotion[]> {
  const db = getFirebaseDb();
  if (!db || !partnerName.trim()) return [];
  const snap = await getDocs(query(collection(db, "promotions"), where("status", "==", "live")));
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<Promotion, "id">) }))
    .filter((p) => promotionMatchesPartner(p, partnerName));
}

export type SubmitPartnerApplicationInput = {
  businessName: string;
  category: string;
  contactName: string;
  contactEmail: string;
  website: string;
  pitch: string;
  listingId: string;
};

/** Files the application via callable; resolves with the reference id. */
export async function submitPartnerApplicationRemote(
  input: SubmitPartnerApplicationInput,
): Promise<{ applicationId: string }> {
  const functions = getFirebaseFunctions();
  if (!functions) throw new Error("Firebase is not configured.");
  const call = httpsCallable<SubmitPartnerApplicationInput, { applicationId: string }>(
    functions,
    "submitPartnerApplication",
  );
  const res = await call(input);
  return res.data;
}
