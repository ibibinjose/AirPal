/**
 * Partnership inquiries (AirPal.me/partner). Distinct from support (/contact)
 * and from applications (/business/onboard): this is the first handshake —
 * who they are, what they run, and how to reach them. Admin triages from
 * the Studio tab; the relationship itself starts in onboarding.
 *
 * Pass partners (below) are the public directory side: approved Partner
 * profiles plus the application pipeline that creates them. Category,
 * deal, and offer-target shapes are reused from business/promotion types —
 * there is deliberately no parallel business system here.
 */

import { isBusinessCategory, type BusinessCategoryId } from "./business";
import type { PlaceDeal } from "./nearby";
import { isOfferTargetType, offerTargetValid, targetHref, type OfferTargetType } from "./promotions";

export const PARTNER_SEGMENTS = [
  { id: "stay", label: "Stay", hint: "Hotels, motels, serviced apartments, hostels" },
  { id: "experience", label: "Experience", hint: "Tours, classes, culture, adventure" },
  { id: "event", label: "Event & festival", hint: "Public events and festival weeks" },
  { id: "fashion", label: "Fashion", hint: "Brands, rentals, campaigns" },
  { id: "other", label: "Something else", hint: "Tell us in your message" },
] as const;
export type PartnerSegment = (typeof PARTNER_SEGMENTS)[number]["id"];

export const PARTNER_SOURCES = [
  { id: "google", label: "Google" },
  { id: "ai", label: "AI" },
  { id: "word", label: "Word of mouth" },
  { id: "other", label: "Other" },
] as const;
export type PartnerSource = (typeof PARTNER_SOURCES)[number]["id"];

export type PartnerLeadStatus = "new" | "contacted" | "archived";

export interface PartnerLead {
  id: string;
  segment: PartnerSegment;
  source: PartnerSource;
  company: string;
  name: string;
  email: string;
  phone?: string;
  message: string;
  status: PartnerLeadStatus;
  createdAt: string;
  updatedAt: string;
}

export function isPartnerSegment(value: string): value is PartnerSegment {
  return PARTNER_SEGMENTS.some((s) => s.id === value);
}

export function isPartnerSource(value: string): value is PartnerSource {
  return PARTNER_SOURCES.some((s) => s.id === value);
}

export function isPartnerEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

/** Validation errors for the partner form. Empty means valid. */
export function validatePartnerLead(input: {
  segment: string;
  source: string;
  company: string;
  name: string;
  email: string;
  phone: string;
  message: string;
}): string[] {
  const errors: string[] = [];
  if (!isPartnerSegment(input.segment)) errors.push("Choose what kind of partner you are.");
  if (!isPartnerSource(input.source)) errors.push("Tell us how you found us.");
  if (!input.company.trim()) errors.push("Company name is required.");
  else if (input.company.trim().length > 120) errors.push("Company name is too long.");
  if (!input.name.trim()) errors.push("Your name is required.");
  else if (input.name.trim().length > 80) errors.push("Name is too long.");
  if (!isPartnerEmail(input.email)) errors.push("Enter a valid email.");
  if (input.phone.trim() && input.phone.trim().length > 40) errors.push("Phone number is too long.");
  if (input.message.trim().length < 10) errors.push("Tell us a little more (10+ characters).");
  else if (input.message.trim().length > 2000) errors.push("Message is too long (2000 max).");
  return errors;
}

/* ------------------------------------------------------------------ */
/* Pass partners directory                                             */
/* ------------------------------------------------------------------ */

/**
 * Partner category reuses the merchant taxonomy — no parallel category
 * system. A partner shelves under the same category as its listing.
 */
export type PartnerCategory = BusinessCategoryId;

export function isPartnerCategory(id: string): id is PartnerCategory {
  return isBusinessCategory(id);
}

export const PARTNER_STATUSES = ["pending", "approved", "rejected", "suspended"] as const;
export type PartnerStatus = (typeof PARTNER_STATUSES)[number];

export function isPartnerStatus(value: string): value is PartnerStatus {
  return (PARTNER_STATUSES as readonly string[]).includes(value);
}

export const PARTNER_APPLICATION_STATUSES = ["submitted", "under_review", "approved", "rejected", "withdrawn"] as const;
export type PartnerApplicationStatus = (typeof PARTNER_APPLICATION_STATUSES)[number];

export function isPartnerApplicationStatus(value: string): value is PartnerApplicationStatus {
  return (PARTNER_APPLICATION_STATUSES as readonly string[]).includes(value);
}

/** Public directory profile. Venue facts stay on the linked BusinessListing. */
export interface Partner {
  id: string;
  slug: string;
  name: string;
  category: PartnerCategory;
  tagline: string;
  description: string;
  logoUrl?: string;
  heroImage?: string;
  website?: string;
  /** Linked BusinessListing id (source of truth for venue facts). */
  listingId?: string;
  placeId?: string;
  ownerUid: string;
  status: PartnerStatus;
  featured?: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Applicant-owned filing; admins triage to approved/rejected. */
export interface PartnerApplication {
  id: string;
  applicantUid: string;
  businessName: string;
  category: PartnerCategory;
  contactName: string;
  contactEmail: string;
  website?: string;
  listingId?: string;
  pitch: string;
  status: PartnerApplicationStatus;
  /** Private reviewer note — never served to non-admins. */
  adminNote?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Partner offer link. The perk itself reuses PlaceDeal and the landing
 * target reuses the promotion offer-target taxonomy — never an ad link
 * and never a second deal system.
 */
export interface PartnerOfferLink {
  partnerId: string;
  deal: PlaceDeal;
  targetType: OfferTargetType;
  targetId: string;
}

/** Deep link for a partner offer's marketplace target. Empty when unmapped. */
export function partnerOfferHref(link: Pick<PartnerOfferLink, "targetType" | "targetId">): string {
  return targetHref(link.targetType, link.targetId);
}

export function validatePartnerOfferLink(input: {
  partnerId: string;
  badge: string;
  detail: string;
  targetType: string;
  targetId: string;
}): string[] {
  const errors: string[] = [];
  if (!input.partnerId.trim()) errors.push("Partner is required.");
  if (!input.badge.trim()) errors.push("Offer badge is required.");
  else if (input.badge.trim().length > 60) errors.push("Offer badge is too long.");
  if (!input.detail.trim()) errors.push("Offer detail is required.");
  else if (input.detail.trim().length > 280) errors.push("Offer detail is too long.");
  if (!isOfferTargetType(input.targetType.trim())) errors.push("Offer target type is invalid.");
  else if (!offerTargetValid(input.targetType, input.targetId)) {
    errors.push("Offer target is invalid for its type.");
  }
  return errors;
}

/* Slugs + normalization (pure). */

export function slugifyPartnerName(name: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .substring(0, 48);
  return base || "partner";
}

/** Directory slug: slugified name plus a short unique hint (doc id prefix). */
export function partnerSlugFor(name: string, uniqueHint?: string): string {
  const base = slugifyPartnerName(name);
  const hint = (uniqueHint || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .substring(0, 12);
  return hint ? `${base}-${hint}` : base;
}

export function isPartnerSlug(value: string): boolean {
  return value.length >= 1 && value.length <= 61 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

export function isPartnerWebsite(value: string): boolean {
  const t = value.trim();
  if (!t) return true; // optional field
  if (/\s/.test(t) || t.length > 200) return false;
  const host = t.replace(/^https?:\/\//i, "").split("/")[0] || "";
  return host.length >= 3 && host.includes(".") && /^[a-z0-9.-]+$/i.test(host);
}

export function normalizePartnerWebsite(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  const withProto = /^https?:\/\//i.test(t) ? t : `https://${t}`;
  return withProto.slice(0, 200);
}

/* Validation + normalization (pure). */

export function validatePartnerApplication(input: {
  businessName: string;
  category: string;
  contactName: string;
  contactEmail: string;
  website: string;
  pitch: string;
  listingId?: string;
}): string[] {
  const errors: string[] = [];
  if (!input.businessName.trim()) errors.push("Business name is required.");
  else if (input.businessName.trim().length > 120) errors.push("Business name is too long.");
  if (!isPartnerCategory(input.category.trim())) errors.push("Choose a valid business category.");
  if (!input.contactName.trim()) errors.push("Contact name is required.");
  else if (input.contactName.trim().length > 80) errors.push("Contact name is too long.");
  if (!isPartnerEmail(input.contactEmail)) errors.push("Enter a valid contact email.");
  if (!isPartnerWebsite(input.website)) errors.push("Website looks invalid.");
  if (input.pitch.trim().length < 10) errors.push("Tell us a little more (10+ characters).");
  else if (input.pitch.trim().length > 2000) errors.push("Pitch is too long (2000 max).");
  if (input.listingId !== undefined && input.listingId.trim().length > 120) {
    errors.push("Listing reference is too long.");
  }
  return errors;
}

export function normalizePartnerApplication(input: {
  businessName: string;
  category: string;
  contactName: string;
  contactEmail: string;
  website: string;
  pitch: string;
  listingId?: string;
}): {
  businessName: string;
  category: PartnerCategory;
  contactName: string;
  contactEmail: string;
  website: string;
  pitch: string;
  listingId: string;
} {
  const category = input.category.trim();
  return {
    businessName: input.businessName.trim().slice(0, 120),
    category: (isPartnerCategory(category) ? category : "services") as PartnerCategory,
    contactName: input.contactName.trim().slice(0, 80),
    contactEmail: input.contactEmail.trim().toLowerCase().slice(0, 160),
    website: normalizePartnerWebsite(input.website),
    pitch: input.pitch.trim().slice(0, 2000),
    listingId: (input.listingId || "").trim().slice(0, 120),
  };
}

export function validatePartnerProfile(input: Record<string, unknown>): string[] {
  const errors: string[] = [];
  if (!String(input.name || "").trim()) errors.push("Partner name is required.");
  else if (String(input.name || "").trim().length > 120) errors.push("Partner name is too long.");
  if (!isPartnerSlug(String(input.slug || "").trim())) errors.push("Partner slug is invalid.");
  if (!isPartnerCategory(String(input.category || "").trim())) {
    errors.push("Choose a valid business category.");
  }
  if (String(input.tagline || "").trim().length > 140) errors.push("Tagline is too long (140 max).");
  if (String(input.description || "").trim().length > 2000) {
    errors.push("Description is too long (2000 max).");
  }
  if (!isPartnerWebsite(String(input.website || ""))) errors.push("Website looks invalid.");
  if (!String(input.ownerUid || "").trim()) errors.push("Owner is required.");
  if (!isPartnerStatus(String(input.status || ""))) errors.push("Partner status is invalid.");
  return errors;
}

/* Status transitions (pure — mirrors firestore.rules + callables). */

const APPLICANT_TRANSITIONS: Record<PartnerApplicationStatus, PartnerApplicationStatus[]> = {
  submitted: ["withdrawn"],
  under_review: ["withdrawn"],
  approved: [],
  rejected: [],
  withdrawn: [],
};

const ADMIN_TRANSITIONS: Record<PartnerApplicationStatus, PartnerApplicationStatus[]> = {
  submitted: ["under_review", "approved", "rejected"],
  under_review: ["approved", "rejected", "submitted"],
  approved: [],
  rejected: ["under_review"],
  withdrawn: [],
};

export function applicationApplicantCanTransition(
  from: PartnerApplicationStatus,
  to: PartnerApplicationStatus,
): boolean {
  return (APPLICANT_TRANSITIONS[from] || []).includes(to);
}

export function applicationAdminCanTransition(from: PartnerApplicationStatus, to: PartnerApplicationStatus): boolean {
  return (ADMIN_TRANSITIONS[from] || []).includes(to);
}

export function applicationCanTransition(
  from: PartnerApplicationStatus,
  to: PartnerApplicationStatus,
  actor: "applicant" | "admin",
): boolean {
  return actor === "admin" ? applicationAdminCanTransition(from, to) : applicationApplicantCanTransition(from, to);
}

/* Demo data (UI dev only — never seed into production paths). */

/**
 * Obviously-fake demo partners for UI development. Never write these to
 * production; no real brands may appear here.
 */
export const DEMO_PASS_PARTNERS: Partner[] = [
  {
    id: "demo-partner-coffee",
    slug: "demo-coffee-house",
    name: "Demo Coffee House",
    category: "coffee",
    tagline: "An obviously-fake demo café",
    description: "Placeholder demo partner used for UI development only.",
    ownerUid: "demo",
    status: "approved",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "demo-partner-bikes",
    slug: "demo-bike-repair-co",
    name: "Demo Bike Repair Co",
    category: "services",
    tagline: "An obviously-fake demo repair shop",
    description: "Placeholder demo partner used for UI development only.",
    ownerUid: "demo",
    status: "approved",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "demo-partner-books",
    slug: "demo-book-nook",
    name: "Demo Book Nook",
    category: "shops",
    tagline: "An obviously-fake demo bookshop",
    description: "Placeholder demo partner used for UI development only.",
    ownerUid: "demo",
    status: "approved",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "demo-partner-plants",
    slug: "demo-plant-studio",
    name: "Demo Plant Studio",
    category: "shops",
    tagline: "An obviously-fake demo plant studio",
    description: "Placeholder demo partner used for UI development only.",
    ownerUid: "demo",
    status: "approved",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];
