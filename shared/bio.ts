import type { BusinessCategoryId } from "./business";
import type { Geo } from "./nearby";
import type { FacilityItem } from "./airpal-data";

export const HANDLE_MIN = 3;
export const HANDLE_MAX = 30;
export const HANDLE_RE = /^[a-z0-9][a-z0-9._]{2,29}$/;

export const RESERVED_HANDLES = new Set([
  "airpal",
  "about",
  "admin",
  "auth",
  "contact",
  "cookies",
  "bio",
  "business",
  "c",
  "campus",
  "club",
  "companion",
  "concierge",
  "discover",
  "e",
  "event",
  "g",
  "guide",
  "host",
  "join",
  "legal",
  "me",
  "os",
  "p",
  "partners",
  "privacy",
  "q",
  "scan",
  "signin",
  "solutions",
  "start",
  "stay",
  "terms",
  "tour",
  "vite",
  "fs",
  "id",
]);

export const BIO_LINK_TYPES = [
  { id: "book", label: "Book" },
  { id: "order", label: "Order" },
  { id: "menu", label: "Menu" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "call", label: "Call" },
  { id: "maps", label: "Maps" },
  { id: "website", label: "Website" },
  { id: "instagram", label: "Instagram" },
  { id: "facebook", label: "Facebook" },
  { id: "tiktok", label: "TikTok" },
  { id: "x", label: "X" },
  { id: "youtube", label: "YouTube" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "threads", label: "Threads" },
  { id: "snapchat", label: "Snapchat" },
  { id: "pinterest", label: "Pinterest" },
] as const;

export const SOCIAL_LINK_TYPE_IDS = [
  "instagram",
  "facebook",
  "tiktok",
  "x",
  "youtube",
  "linkedin",
  "threads",
  "snapchat",
  "pinterest",
] as const;

const SOCIAL_SET = new Set<string>(SOCIAL_LINK_TYPE_IDS);

export type BioLinkType = (typeof BIO_LINK_TYPES)[number]["id"];

export type BioLink = {
  id: string;
  type: BioLinkType;
  label: string;
  href: string;
  /** Pinned to the top of the public page. */
  featured?: boolean;
  /** Hidden everywhere until restored. */
  archived?: boolean;
  /** ISO date (YYYY-MM-DD) the link goes live. Empty = immediately. */
  startsAt?: string;
  /** ISO date (YYYY-MM-DD) the link expires. Empty = never. */
  endsAt?: string;
};

export type BioOffer = {
  badge: string;
  detail: string;
};

export const BIO_CATALOG_KINDS = [
  { id: "deal", label: "Deals" },
  { id: "product", label: "Products" },
  { id: "service", label: "Services" },
] as const;

export type BioCatalogKind = (typeof BIO_CATALOG_KINDS)[number]["id"];
export const BIO_CATALOG_MAX = 8;

export type BioCatalogItem = {
  id: string;
  kind: BioCatalogKind;
  title: string;
  detail: string;
  price?: string;
  badge?: string;
  href?: string;
};

export const BIO_KINDS = ["person", "business"] as const;
export type BioKind = (typeof BIO_KINDS)[number];

export const BIO_VISIBILITIES = ["public", "friends", "private"] as const;

/** Who can see a person profile. Business storefronts stay public. */
export type BioVisibility = (typeof BIO_VISIBILITIES)[number];

/** Account-type identifier shown on profiles: every profile is either an Individual or a Business. */
export function isBusinessKind(kind?: BioKind | null): boolean {
  return kind === "business";
}

export function bioKindLabel(kind?: BioKind | null): "Individual" | "Business" {
  return isBusinessKind(kind) ? "Business" : "Individual";
}

export type AvailabilityStatus = "available" | "busy" | "dnd" | "brb" | "away" | "offline";

export interface AvailabilityStatusInfo {
  id: AvailabilityStatus;
  label: string;
  dotColor: string;
  ringClass: string;
  badgeBg: string;
  textColor: string;
  emoji: string;
  description: string;
}

export const AVAILABILITY_STATUSES: Record<AvailabilityStatus, AvailabilityStatusInfo> = {
  available: {
    id: "available",
    label: "Available",
    dotColor: "bg-emerald-500",
    ringClass: "ring-emerald-500 shadow-[0_0_16px_rgba(16,185,129,0.55)]",
    badgeBg: "bg-emerald-500/15 border-emerald-500/30",
    textColor: "text-emerald-700",
    emoji: "🟢",
    description: "Available & ready to connect, catch up or meet",
  },
  busy: {
    id: "busy",
    label: "Busy",
    dotColor: "bg-rose-500",
    ringClass: "ring-rose-500 shadow-[0_0_16px_rgba(244,63,94,0.45)]",
    badgeBg: "bg-rose-500/15 border-rose-500/30",
    textColor: "text-rose-700",
    emoji: "🔴",
    description: "In a meeting, session or busy right now",
  },
  dnd: {
    id: "dnd",
    label: "Do not disturb",
    dotColor: "bg-red-600",
    ringClass: "ring-red-600 shadow-[0_0_16px_rgba(220,38,38,0.45)]",
    badgeBg: "bg-red-500/15 border-red-500/30",
    textColor: "text-red-700",
    emoji: "⛔",
    description: "Focused mode — notifications muted",
  },
  brb: {
    id: "brb",
    label: "Be right back",
    dotColor: "bg-amber-400",
    ringClass: "ring-amber-400 shadow-[0_0_16px_rgba(251,191,36,0.45)]",
    badgeBg: "bg-amber-500/15 border-amber-500/30",
    textColor: "text-amber-700",
    emoji: "🟡",
    description: "Stepped away briefly — back shortly",
  },
  away: {
    id: "away",
    label: "Away",
    dotColor: "bg-orange-500",
    ringClass: "ring-orange-500 shadow-[0_0_16px_rgba(249,115,22,0.45)]",
    badgeBg: "bg-orange-500/15 border-orange-500/30",
    textColor: "text-orange-700",
    emoji: "🟠",
    description: "Away from desk, exploring or travelling",
  },
  offline: {
    id: "offline",
    label: "Appear offline",
    dotColor: "bg-slate-400",
    ringClass: "ring-slate-300 dark:ring-slate-700 shadow-none",
    badgeBg: "bg-slate-500/15 border-slate-500/30",
    textColor: "text-slate-600",
    emoji: "⚪",
    description: "Offline or closed for today",
  },
};

export type StatusPicks = {
  status: AvailabilityStatus;
  customText: string;
  emoji: string;
};

/**
 * Resolve the status editor's picks from saved profile values.
 * Used for initial state and to resync when the modal reopens,
 * so a cancelled edit never leaks into the next open.
 */
export function resolveStatusPicks(input: {
  status?: AvailabilityStatus;
  customStatus?: string;
  emoji?: string;
}): StatusPicks {
  return {
    status: input.status || "available",
    customText: input.customStatus || "",
    emoji: input.emoji || "☕",
  };
}

export type BioProfile = {
  id: string;
  handle: string;
  kind?: BioKind;
  ownerUid?: string;
  ownerEmail?: string;
  name: string;
  shortWhy: string;
  city: string;
  category: BusinessCategoryId;
  hours: string;
  openNow: boolean;
  availabilityStatus?: AvailabilityStatus;
  customStatus?: string;
  customStatusEmoji?: string;
  phone?: string;
  avatar?: string;
  cover?: string;
  geo?: Geo;
  offer?: BioOffer;
  products: BioCatalogItem[];
  services: BioCatalogItem[];
  deals: BioCatalogItem[];
  links: BioLink[];
  placeId?: string;
  listingId?: string;
  propertyId?: string;
  stallId?: string;
  eventId?: string;
  mapsPlaceId?: string;
  tapsToday?: number;
  registeredName?: string;
  registrationNumber?: string;
  domain?: string;
  trademark?: string;
  /** Optional multi-line bio story */
  aboutText?: string;
  /** Pronouns for personal profiles (e.g. She/Her) */
  pronouns?: string;
  /** Languages spoken (e.g. English, Spanish) */
  languages?: string;
  /** Vibe or category tag badge */
  categoryTag?: string;
  /**
   * Earned Stars tier name (e.g. "Rising Mate"). Coarse status signal only —
   * never a balance. Server-written when Stars vest; clients must not set it.
   */
  starTier?: string;
  /** Person-profile visibility. Absent = friends-only. */
  visibility?: BioVisibility;
  /** Customized primary CTA label */
  primaryCta?: string;
  /** Opt in to Air Zoo hunts and a collectible sticker on the shop QR. */
  zooHunt?: boolean;
  /** Stay check-in time (e.g. 2:00 PM) */
  checkIn?: string;
  /** Stay check-out time (e.g. 10:00 AM) */
  checkOut?: string;
  /** Stay & hotel facilities / amenities list */
  facilities?: FacilityItem[];
  /** Default Google Meet or FaceTime link for 1-on-1 catch-ups and meetings */
  meetingUrl?: string;
  /** Preferred meeting platform */
  preferredMeetingPlatform?: "in_person" | "google_meet" | "facetime" | "zoom";
  /** Public page theme preset id. Absent = default AirPal theme. */
  theme?: string;
};

export type BioTheme = {
  id: string;
  name: string;
  pageBg: string;
  ink: string;
  muted: string;
  accent: string;
  buttonBg: string;
  buttonText: string;
  buttonRadius: number;
};

export const BIO_THEMES: BioTheme[] = [
  {
    id: "airpal",
    name: "AirPal",
    pageBg: "#faf7f2",
    ink: "#1c1917",
    muted: "#78716c",
    accent: "#c2410c",
    buttonBg: "#1c1917",
    buttonText: "#ffffff",
    buttonRadius: 999,
  },
  {
    id: "midnight",
    name: "Midnight",
    pageBg: "#0c0a09",
    ink: "#fafaf9",
    muted: "#a8a29e",
    accent: "#fb923c",
    buttonBg: "#fafaf9",
    buttonText: "#0c0a09",
    buttonRadius: 999,
  },
  {
    id: "forest",
    name: "Forest",
    pageBg: "#f0fdf4",
    ink: "#052e16",
    muted: "#4d7c5f",
    accent: "#15803d",
    buttonBg: "#14532d",
    buttonText: "#ffffff",
    buttonRadius: 16,
  },
  {
    id: "ocean",
    name: "Ocean",
    pageBg: "#eff6ff",
    ink: "#172554",
    muted: "#4b6584",
    accent: "#0369a1",
    buttonBg: "#0c4a6e",
    buttonText: "#ffffff",
    buttonRadius: 16,
  },
  {
    id: "sunset",
    name: "Sunset",
    pageBg: "#fff7ed",
    ink: "#431407",
    muted: "#9a6a4f",
    accent: "#ea580c",
    buttonBg: "#ea580c",
    buttonText: "#ffffff",
    buttonRadius: 999,
  },
  {
    id: "mono",
    name: "Mono",
    pageBg: "#ffffff",
    ink: "#09090b",
    muted: "#71717a",
    accent: "#09090b",
    buttonBg: "#09090b",
    buttonText: "#ffffff",
    buttonRadius: 0,
  },
];

export function normalizeBioTheme(raw: unknown): string | undefined {
  const id = String(raw || "")
    .trim()
    .toLowerCase()
    .slice(0, 24);
  if (!id || id === "airpal") return undefined;
  return BIO_THEMES.some((theme) => theme.id === id) ? id : undefined;
}

export function resolveBioTheme(raw: unknown): BioTheme {
  const id = String(raw || "")
    .trim()
    .toLowerCase();
  return BIO_THEMES.find((theme) => theme.id === id) || BIO_THEMES[0];
}

export function normalizeHandle(raw: string) {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^@+/, "")
    .replace(/[^a-z0-9._]/g, "");
}

export function handleError(raw: string): string | null {
  const h = normalizeHandle(raw);
  if (h.length < HANDLE_MIN) return "At least 3 characters";
  if (h.length > HANDLE_MAX) return "Max 30 characters";
  if (!HANDLE_RE.test(h)) return "Letters, numbers, . and _";
  if (RESERVED_HANDLES.has(h)) return "Taken";
  return null;
}

export function isHandleAvailableShape(raw: string) {
  return handleError(raw) === null;
}

export function bioPath(handle: string) {
  return `/@${normalizeHandle(handle)}`;
}

export function parseAtHandle(pathname: string): string | null {
  let path = pathname;
  try {
    path = decodeURIComponent(pathname);
  } catch {
    /* keep */
  }
  const part = path.replace(/^\/+/, "").split("/")[0] || "";
  if (!part.startsWith("@")) return null;
  const h = normalizeHandle(part);
  return isHandleAvailableShape(h) ? h : null;
}

/** Wouter `/@:handle` is a literal (segment starts with `@`, not `:`). */
export const BIO_PUBLIC_PATH = /^\/@([a-z0-9._]{3,30})\/?$/i;

export function isSocialLinkType(type: string) {
  return SOCIAL_SET.has(type);
}

export function stackLinks(links: BioLink[]) {
  return links.filter((l) => l.type !== "maps" && l.type !== "call" && !SOCIAL_SET.has(l.type));
}

export function socialLinks(links: BioLink[]) {
  return links.filter((l) => SOCIAL_SET.has(l.type));
}

export function handleFromPlaceId(id: string) {
  const h = id
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._]/g, "");
  return handleError(h) ? null : h;
}

const HANDLE_STOP = new Set([
  "the",
  "a",
  "an",
  "and",
  "of",
  "at",
  "by",
  "pty",
  "ltd",
  "limited",
  "inc",
  "co",
  "company",
]);

export function nameWords(raw: string) {
  return raw
    .toLowerCase()
    .replace(/&/g, " ")
    .replace(/[^a-z0-9\s._-]/g, " ")
    .split(/[\s._-]+/)
    .filter(Boolean);
}

/** Short hex id people can use instead of a word handle, e.g. a7f3c21e. */
export function randomHexHandle(length = 8) {
  const n = Math.max(HANDLE_MIN, Math.min(HANDLE_MAX, Math.floor(length)));
  const bytes = new Uint8Array(Math.ceil(n / 2));
  if (typeof globalThis.crypto?.getRandomValues === "function") {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, n);
}

export function isHexHandle(raw: string) {
  const h = normalizeHandle(raw);
  return h.length >= HANDLE_MIN && /^[0-9a-f]+$/.test(h);
}

export function handleFromName(raw: string) {
  const words = nameWords(raw);
  const joined = words.join("");
  const compact = words.filter((w) => !HANDLE_STOP.has(w)).join("");
  for (const cand of [compact, joined, words[0] || ""]) {
    const h = normalizeHandle(cand).slice(0, HANDLE_MAX);
    if (!handleError(h)) return h;
  }
  const fallback = normalizeHandle(`${joined}co`).slice(0, HANDLE_MAX);
  return handleError(fallback) ? "" : fallback;
}

export function handleFromDomain(raw: string) {
  const host = raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0]
    .split(":")[0];
  const base = host.split(".")[0] || "";
  const h = normalizeHandle(base);
  return handleError(h) ? handleFromName(base) : h;
}

export function handleMatchesClaim(handle: string, parts: { name?: string; domain?: string; trademark?: string }) {
  const h = normalizeHandle(handle);
  if (!h) return false;
  const pool = [parts.name, parts.domain, parts.trademark].filter(Boolean) as string[];
  return pool.some((p) => {
    const fromName = handleFromName(p);
    const fromDomain = handleFromDomain(p);
    const compact = nameWords(p).join("");
    return (
      h === fromName ||
      h === fromDomain ||
      compact.includes(h) ||
      (fromName && h.includes(fromName)) ||
      (fromDomain && h.includes(fromDomain))
    );
  });
}

export function bioButtonLabel(handle: string) {
  return `@${normalizeHandle(handle)}`;
}

/**
 * Allowlist for outbound link hrefs. Blocks javascript:, data:, vbscript: and
 * other dangerous schemes at save time and at render time.
 */
export function isSafeBioHref(raw: unknown): boolean {
  if (typeof raw !== "string") return false;
  const href = raw.trim();
  if (!href) return false;
  const lower = href.toLowerCase();
  // Block dangerous schemes explicitly (leading whitespace/control chars trimmed above).
  if (/^(javascript|data|vbscript|file|blob):/.test(lower)) return false;
  if (lower.startsWith("http://") || lower.startsWith("https://")) return true;
  if (lower.startsWith("tel:") || lower.startsWith("mailto:")) return true;
  if (lower.startsWith("/")) return true;
  return false;
}

export function sanitizeBioHref(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const href = raw.trim().slice(0, 300);
  return href && isSafeBioHref(href) ? href : undefined;
}

const BIO_LINK_TYPE_SET = new Set<string>(BIO_LINK_TYPES.map((t) => t.id));
const BIO_LINKS_MAX = 24;

/** Instagram, Facebook, X, websites, WhatsApp, and the rest of the bio link row. */
/** YYYY-MM-DD or full ISO date, or empty when absent/invalid. */
export function cleanBioDate(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) return "";
  const d = new Date(value.trim());
  if (!Number.isFinite(d.getTime())) return "";
  return value.trim().slice(0, 10);
}

export function sanitizeBioLinks(rows: unknown): BioLink[] {
  if (!Array.isArray(rows)) return [];
  const out: BioLink[] = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const type = String(r.type || "");
    if (!BIO_LINK_TYPE_SET.has(type)) continue;
    const href = sanitizeBioHref(r.href);
    if (!href) continue;
    out.push({
      id: String(r.id || `l-${out.length}`).slice(0, 32),
      type: type as BioLinkType,
      label: String(r.label || type)
        .trim()
        .slice(0, 40),
      href,
      ...(r.featured === true ? { featured: true } : {}),
      ...(r.archived === true ? { archived: true } : {}),
      ...(cleanBioDate(r.startsAt) ? { startsAt: cleanBioDate(r.startsAt) } : {}),
      ...(cleanBioDate(r.endsAt) ? { endsAt: cleanBioDate(r.endsAt) } : {}),
    });
    if (out.length >= BIO_LINKS_MAX) break;
  }
  return out;
}

/** A link is live when not archived and inside its schedule window. */
export function isBioLinkLive(
  link: Pick<BioLink, "archived" | "startsAt" | "endsAt">,
  now: Date = new Date(),
): boolean {
  if (link.archived) return false;
  if (link.startsAt) {
    const start = new Date(`${link.startsAt}T00:00:00`);
    if (Number.isFinite(start.getTime()) && now < start) return false;
  }
  if (link.endsAt) {
    const end = new Date(`${link.endsAt}T23:59:59`);
    if (Number.isFinite(end.getTime()) && now > end) return false;
  }
  return true;
}

/** Public ordering: live only, featured first, stable otherwise. */
export function visibleBioLinks(links: BioLink[], now: Date = new Date()): BioLink[] {
  return links
    .filter((l) => isBioLinkLive(l, now))
    .sort((a, b) => Number(b.featured === true) - Number(a.featured === true));
}

export function sanitizeCatalog(kind: BioCatalogKind, rows: unknown): BioCatalogItem[] {
  if (!Array.isArray(rows)) return [];
  const out: BioCatalogItem[] = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const title = String(r.title || "").trim();
    if (!title) continue;
    out.push({
      id: String(r.id || `${kind}-${out.length}`).slice(0, 32),
      kind,
      title: title.slice(0, 60),
      detail: String(r.detail || "")
        .trim()
        .slice(0, 160),
      price:
        String(r.price || "")
          .trim()
          .slice(0, 24) || undefined,
      badge:
        String(r.badge || "")
          .trim()
          .slice(0, 32) || undefined,
      href: sanitizeBioHref(r.href),
    });
    if (out.length >= BIO_CATALOG_MAX) break;
  }
  return out;
}

export function catalogDeals(profile: Pick<BioProfile, "deals" | "offer">): BioCatalogItem[] {
  if (profile.deals?.length) return profile.deals;
  if (!profile.offer?.badge) return [];
  return [{ id: "offer", kind: "deal", title: profile.offer.badge, detail: profile.offer.detail, badge: "Offer" }];
}
