import { isBusinessCategory } from "./business";
import type { ContentMeta } from "./content-meta";

export const EVENT_FLAVOURS = ["expo", "market", "event_space"] as const;
export type EventFlavour = (typeof EVENT_FLAVOURS)[number];

export const EVENT_FLAVOUR_LABELS: Record<EventFlavour, string> = {
  expo: "Expo",
  market: "Weekend market",
  event_space: "Event",
};

export const STALL_CATEGORIES = [
  { id: "eat", label: "Eat" },
  { id: "coffee", label: "Coffee" },
  { id: "bar", label: "Bar" },
  { id: "shops", label: "Shop" },
  { id: "things", label: "See" },
  { id: "wellness", label: "Wellness" },
  { id: "services", label: "Help" },
] as const;

export type StallCategoryId = (typeof STALL_CATEGORIES)[number]["id"];

/**
 * A program speaker or panel member. External guests carry just a name;
 * AirPal members link their @handle so the program shows their live
 * profile photo and links to their public bio.
 */
export type Speaker = {
  name: string;
  role?: string;
  handle?: string;
};

export function normalizeSpeakerHandle(raw: string): string {
  return raw.trim().replace(/^@+/, "").toLowerCase().slice(0, 30);
}

export const EVENT_LOCATION_TYPES = ["in_person", "virtual", "secret"] as const;
export type EventLocationType = (typeof EVENT_LOCATION_TYPES)[number];

export function isEventLocationType(value: unknown): value is EventLocationType {
  return typeof value === "string" && (EVENT_LOCATION_TYPES as readonly string[]).includes(value);
}

export type EventRecord = {
  id: string;
  name: string;
  flavour: EventFlavour;
  city: string;
  venue?: string;
  /** Room, hall, or stage inside the venue — festivals run concurrent rooms. */
  room?: string;
  address?: string;
  /** Venue mode: in-person, online/virtual stream, or secret/TBA. */
  locationType?: EventLocationType;
  /** Stream / meeting URL when locationType is virtual (Zoom, Google Meet, YouTube). */
  virtualUrl?: string;
  description?: string;
  shortWhy?: string;
  mapsPlaceId?: string;
  geo?: { lat: number; lng: number };
  coverImage?: string;
  /** Ambient theme hue tint (hex, e.g. #004eff) for specular halo and accents. */
  themeColor?: string;
  hostName?: string;
  hostHandle?: string;
  hostType?: "business" | "individual";
  businessName?: string;
  businessHandle?: string;
  collaboratorHandles?: string[];
  /** Sponsor @handles (no @ prefix, lowercase). Rendered as the Sponsors row. */
  sponsorHandles?: string[];
  startsAt: string;
  endsAt: string;
  status: "draft" | "live" | "ended";
  /** Ticket price in cents (0/undefined = free). Paid nights sell via Stripe bookings. */
  ticketPriceCents?: number;
  /** Named price tiers (e.g. General, VIP). Empty/absent = legacy single price. */
  ticketTiers?: EventTicketTier[];
  /** Recurring series id shared by all instances. Absent = one-off. */
  seriesId?: string;
  /** 1-based instance number within its series. */
  recurrenceIndex?: number;
  /** Total instances in the series (stored on every instance for display). */
  recurrenceCount?: number;
  /** Total tickets available. Undefined = unlimited free entry. */
  capacity?: number;
  /** Whether attendees require host approval before passes/tickets are confirmed. */
  requireApproval?: boolean;
  /** Timed run-sheet (e.g. 6:00pm doors, 6:30pm game 1). Rendered as the Schedule section. */
  agenda?: EventAgendaItem[];
  /** Refund & transfer policy text shown on the event page. Absent = section hidden. */
  refundPolicy?: string;
  /** How to find the group at the venue ("Take the lift to Level 4…"). */
  directions?: string;
  /** Host-closed registration. Closed card + notify-me replace the ticket flow. */
  registrationClosed?: boolean;
  gatePath: string;
  /** Festival program this session belongs to (festivals/{slug}). */
  festivalSlug?: string;
  /** Program track within the festival, e.g. "Hackathon", "Main stage". */
  track?: string;
  /** Off-platform booking link (Humanitix, Eventbrite). Attend on AirPal stays primary. */
  registrationUrl?: string;
  registrationNote?: string;
  speakers?: Speaker[];
  organiserUid?: string;
  organiserEmail?: string;
  categoryChips: StallCategoryId[];
  stallCount: number;
  source?: ContentMeta["source"];
  verifiedOwner?: boolean;
  reviewStatus?: ContentMeta["reviewStatus"];
  createdAt?: string;
  updatedAt?: string;
  expiresAt?: string;
  scheduleVerifiedAt?: string;
  /** Demo-business marker: filtered from guest discovery, `demo-` ids skip KPIs. */
  demo?: boolean;
};

export type StallRecord = {
  id: string;
  eventId: string;
  name: string;
  category: StallCategoryId;
  /** Stall/exhibitor number, e.g. "12", "B7". */
  booth: string;
  /** Where to find it on the floor, e.g. "Aisle C · Bay 12". */
  location?: string;
  shortWhy: string;
  offer?: string;
  handle?: string;
  status: "active" | "inactive";
};

/** Trimmed floor location, max 120 chars. Undefined when blank. */
export function cleanStallLocation(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim().slice(0, 120);
  return trimmed || undefined;
}

/** Named price tier for an event. Ids are organiser-chosen slugs, unique per event. */
export type EventTicketTier = {
  id: string;
  name: string;
  /** Unit price in cents. */
  priceCents: number;
  /** Tier seats. Undefined = shares the event capacity. */
  capacity?: number;
};

/** Per-event coupon, stored at `events/{eventId}/coupons/{CODE}`. Server-validated only. */
export type EventCoupon = {
  code: string;
  /** Whole-percent discount, 1–90. */
  percentOff: number;
  active: boolean;
  /** Lifetime redemption cap. Undefined = uncapped. */
  maxRedemptions?: number;
  redemptions: number;
  createdAt?: string;
  updatedAt?: string;
};

/** Uppercase A–Z0–9 code, 3–16 chars. Empty string when unusable. */
export function normalizeCouponCode(value: unknown): string {
  if (typeof value !== "string") return "";
  const code = value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  return code.length >= 3 && code.length <= 16 ? code : "";
}

/** Organiser draft validation. Returns error messages, empty when valid. */
export function validateCouponDraft(input: { code: unknown; percentOff: unknown; maxRedemptions?: unknown }): string[] {
  const errors: string[] = [];
  if (!normalizeCouponCode(input.code)) errors.push("Code must be 3–16 letters or numbers.");
  const pct = typeof input.percentOff === "string" ? Number(input.percentOff) : input.percentOff;
  if (!Number.isInteger(pct) || (pct as number) < 1 || (pct as number) > 90) {
    errors.push("Discount must be a whole percent from 1 to 90.");
  }
  if (input.maxRedemptions !== undefined && input.maxRedemptions !== null && String(input.maxRedemptions) !== "") {
    const cap = Number(input.maxRedemptions);
    if (!Number.isInteger(cap) || cap < 1 || cap > 100000) errors.push("Redemption cap must be 1–100000.");
  }
  return errors;
}

/** Sanitized tiers for storage: max 8, unique ids, positive prices. Empty when none valid. */
export function cleanTicketTiers(value: unknown): EventTicketTier[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const seen = new Set<string>();
  const tiers: EventTicketTier[] = [];
  for (const row of value.slice(0, 8)) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const id = String(r.id || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "")
      .slice(0, 24);
    const name = String(r.name || "")
      .trim()
      .slice(0, 40);
    const priceCents = cleanTicketCents(r.priceCents);
    if (!id || !name || priceCents === undefined || seen.has(id)) continue;
    seen.add(id);
    const capRaw = Number(r.capacity);
    tiers.push({
      id,
      name,
      priceCents,
      ...(Number.isInteger(capRaw) && capRaw >= 1 && capRaw <= 2000 ? { capacity: capRaw } : {}),
    });
  }
  return tiers.length ? tiers : undefined;
}

/** Cleaned @handle list (no @ prefix, lowercase, max 20). Undefined when empty. */
export function cleanEventHandles(value: unknown, max = 20): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const row of value) {
    const clean = String(row || "")
      .trim()
      .replace(/^@+/, "")
      .toLowerCase()
      .slice(0, 30);
    if (!clean || seen.has(clean)) continue;
    seen.add(clean);
    out.push(clean);
    if (out.length >= max) break;
  }
  return out.length ? out : undefined;
}

/** Weekly recurrence expansion: N weekly instances from a start/end pair. Max 12. */
export function expandWeeklyRecurrence(
  startsAt: string,
  endsAt: string,
  count: number,
): { startsAt: string; endsAt: string }[] {
  const n = Math.min(12, Math.max(1, Math.floor(count) || 1));
  const start = new Date(startsAt).getTime();
  const end = new Date(endsAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
    return [{ startsAt, endsAt }];
  }
  const out: { startsAt: string; endsAt: string }[] = [];
  for (let i = 0; i < n; i++) {
    const shift = i * 7 * 86400000;
    out.push({ startsAt: new Date(start + shift).toISOString(), endsAt: new Date(end + shift).toISOString() });
  }
  return out;
}

/** Apply a whole-percent discount to a base price. Never trusts client math. */
export function couponPrice(baseCents: number, percentOff: number): number {
  if (!Number.isFinite(baseCents) || baseCents < 0) return 0;
  const pct = Math.min(90, Math.max(0, Math.floor(percentOff)));
  return Math.max(0, Math.round((baseCents * (100 - pct)) / 100));
}

export type UpsertEventCouponRequest = {
  eventId: string;
  code: string;
  percentOff: number;
  active?: boolean;
  maxRedemptions?: number | null;
};

export type ValidateEventCouponRequest = {
  eventId: string;
  code: string;
};

export type ValidateEventCouponResponse = {
  ok: true;
  code: string;
  percentOff: number;
};

/** Non-negative integer cents, or undefined when absent/invalid. Never trusts client math. */
export function cleanTicketCents(value: unknown): number | undefined {
  const n = typeof value === "string" ? Number(value) : typeof value === "number" ? value : NaN;
  if (!Number.isFinite(n) || n < 0) return undefined;
  return Math.floor(n);
}

/** Positive integer capacity (max 2000), or undefined when absent/invalid. */
export function cleanCapacity(value: unknown): number | undefined {
  const n = typeof value === "string" ? Number(value) : typeof value === "number" ? value : NaN;
  if (!Number.isInteger(n) || n < 1 || n > 2000) return undefined;
  return n;
}

export type SavedEvent = {
  eventId: string;
  name: string;
  flavour: EventFlavour;
  savedAt: string;
};

export type SavedStall = {
  stallId: string;
  eventId: string;
  name: string;
  category: StallCategoryId;
  booth: string;
  location?: string;
  offer?: string;
  handle?: string;
  savedAt: string;
};

export type AttendanceStatus = "going" | "interested";

export type UserEventState = {
  eventId: string;
  status?: AttendanceStatus | null;
  liked?: boolean;
  rescheduledDate?: string;
  rescheduledStartsAt?: string;
  rescheduledEndsAt?: string;
  updatedAt: string;
};

export type CalendarEventCategory = "market" | "music" | "food" | "culture" | "community" | "expo" | "workshop";

export type CalendarEvent = {
  id: string;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  date: string;
  timeLabel: string;
  city: string;
  venue: string;
  room?: string;
  category: CalendarEventCategory;
  categoryLabel: string;
  heroImage?: string;
  ticketPrice?: string;
  ticketUrl?: string;
  gatePath?: string;
  source: "local" | "community" | "partner" | "user";
  isLocal: boolean;
  isGoing: boolean;
  isInterested: boolean;
  isLiked: boolean;
  isRescheduled?: boolean;
  originalDate?: string;
  tags?: string[];
  scheduleVerifiedAt?: string;
  speakers?: Speaker[];
  ticketPriceCents?: number;
  ticketTiers?: { id: string; name: string; priceCents: number; capacity?: number }[];
  capacity?: number;
  organiserUid?: string;
  hostName?: string;
  hostHandle?: string;
  hostType?: "business" | "individual";
  businessName?: string;
  businessHandle?: string;
  collaboratorHandles?: string[];
  /** Sponsor @handles (no @ prefix, lowercase). Rendered as the Sponsors row. */
  sponsorHandles?: string[];
  address?: string;
  geo?: { lat: number; lng: number };
  registrationUrl?: string;
  registrationNote?: string;
  shortWhy?: string;
  locationType?: EventLocationType;
  virtualUrl?: string;
  requireApproval?: boolean;
  themeColor?: string;
  /** Timed run-sheet (e.g. 6:00pm doors, 6:30pm game 1). Rendered as the Schedule section. */
  agenda?: EventAgendaItem[];
  /** Refund & transfer policy text shown on the event page. Absent = section hidden. */
  refundPolicy?: string;
  /** How to find the group at the venue ("Take the lift to Level 4…"). */
  directions?: string;
  /** Host-closed registration. Closed card + notify-me replace the ticket flow. */
  registrationClosed?: boolean;
};

export type EventAgendaItem = {
  time: string;
  title: string;
};

/** Cleaned run-sheet rows (max 12). Undefined when none survive. */
export function sanitizeAgenda(value: unknown): EventAgendaItem[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const rows: EventAgendaItem[] = [];
  for (const row of value.slice(0, 12)) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const time = String(r.time || "")
      .trim()
      .slice(0, 24);
    const title = String(r.title || "")
      .trim()
      .slice(0, 120);
    if (!time && !title) continue;
    rows.push({ time: time || "—", title: title || "Scheduled item" });
  }
  return rows.length ? rows : undefined;
}

export function isEventFlavour(value: string): value is EventFlavour {
  return (EVENT_FLAVOURS as readonly string[]).includes(value);
}

export function isStallCategory(value: string): value is StallCategoryId {
  return STALL_CATEGORIES.some((c) => c.id === value) || isBusinessCategory(value);
}

export function eventGatePath(eventId: string) {
  return `/e/${eventId}`;
}

/** Guest + organiser copy for a stall/exhibitor, the same fields on every flavour. */
export function stallFieldLabels(flavour: EventFlavour) {
  if (flavour === "expo") {
    return {
      unit: "Stand number",
      unitShort: "Stand",
      unitPlaceholder: "e.g. 214",
      business: "Business / exhibitor name",
      businessPlaceholder: "e.g. Harbour Linen",
      handle: "@handle",
      handlePlaceholder: "e.g. harbourlinen",
      about: "About this exhibitor",
      listNoun: "exhibitors",
      addTitle: "Add an exhibitor",
      empty: "No exhibitors yet. Add one below, or import a CSV.",
    };
  }
  if (flavour === "event_space") {
    return {
      unit: "Booth number",
      unitShort: "Booth",
      unitPlaceholder: "e.g. B4",
      business: "Business name",
      businessPlaceholder: "e.g. Laneway Pour",
      handle: "@handle",
      handlePlaceholder: "e.g. lanewaypour",
      about: "About this booth",
      listNoun: "booths",
      addTitle: "Add a booth",
      empty: "No booths yet. Add one below, or import a CSV.",
    };
  }
  return {
    unit: "Stall number",
    unitShort: "Stall",
    unitPlaceholder: "e.g. A12",
    business: "Business name",
    businessPlaceholder: "e.g. Salted Caramel Co",
    handle: "@handle",
    handlePlaceholder: "e.g. saltedcaramel",
    about: "About this stall",
    listNoun: "stalls",
    addTitle: "Add a stall",
    empty: "No stalls yet. Add one below, or import a CSV.",
  };
}

export function stallUnitDisplay(flavour: EventFlavour, booth?: string) {
  const { unitShort } = stallFieldLabels(flavour);
  const n = (booth || "").trim();
  return n ? `${unitShort} ${n}` : unitShort;
}

export function stallCsvTemplate(flavour: EventFlavour) {
  const l = stallFieldLabels(flavour);
  return [
    `business name,${l.unit.toLowerCase()},handle,category,about,offer,location`,
    "Salted Caramel Co,A12,saltedcaramel,eat,Handmade caramels,2 for $10,Aisle C Bay 12",
    "Harbour Linen,B04,harbourlinen,shops,Washed linen from Katoomba,Tote with $40+,",
    "Laneway Pour,C01,lanewaypour,coffee,Single origin takeaway,Second shot free,",
  ].join("\n");
}

export function isExpoEventId(id: string) {
  return id.startsWith("evt-");
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else quoted = !quoted;
      continue;
    }
    if (ch === "," && !quoted) {
      out.push(cur.trim());
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}

export type ParsedStall = {
  name: string;
  category: StallCategoryId;
  booth: string;
  location?: string;
  shortWhy: string;
  offer?: string;
  handle?: string;
};

export function parseStallCsv(text: string): ParsedStall[] {
  const lines = text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .filter((line) => line.trim());
  if (lines.length < 2) return [];
  const header = splitCsvLine(lines[0]!).map((h) => h.toLowerCase());
  const col = (names: string[]) => names.map((n) => header.indexOf(n)).find((i) => i >= 0) ?? -1;
  const nameI = col(["name", "stall", "business", "business name", "exhibitor", "trader"]);
  const catI = col(["category", "cat"]);
  const boothI = col(["booth", "stand", "bay", "stall number", "stand number", "booth number", "stall no", "stand no"]);
  const whyI = col(["shortwhy", "why", "about"]);
  const offerI = col(["offer", "deal", "perk"]);
  const handleI = col(["handle", "@", "username", "@handle"]);
  const locationI = col(["location", "where", "aisle", "zone", "area"]);
  if (nameI < 0) return [];
  const rows: ParsedStall[] = [];
  for (const line of lines.slice(1)) {
    const cells = splitCsvLine(line);
    const name = cells[nameI]?.trim();
    if (!name) continue;
    const rawCat = (catI >= 0 ? cells[catI] : "shops") || "shops";
    const category = isStallCategory(rawCat.toLowerCase()) ? (rawCat.toLowerCase() as StallCategoryId) : "shops";
    const rawHandle = handleI >= 0 ? cells[handleI] : "";
    rows.push({
      name,
      category,
      booth: (boothI >= 0 ? cells[boothI] : "") || "",
      location: cleanStallLocation(locationI >= 0 ? cells[locationI] : ""),
      shortWhy: (whyI >= 0 ? cells[whyI] : "") || "",
      offer: offerI >= 0 ? cells[offerI] || undefined : undefined,
      handle: rawHandle
        ? rawHandle
            .replace(/^@+/, "")
            .toLowerCase()
            .replace(/[^a-z0-9._]/g, "") || undefined
        : undefined,
    });
  }
  return rows;
}

export const SEED_EVENT_ID = "evt-rocks-market";

export const SEED_EVENT: EventRecord = {
  id: SEED_EVENT_ID,
  name: "The Rocks Weekend Market",
  flavour: "market",
  city: "Sydney",
  venue: "Playfair & George",
  startsAt: "2026-09-12T00:00:00+10:00",
  endsAt: "2026-09-13T17:00:00+10:00",
  status: "live",
  gatePath: eventGatePath(SEED_EVENT_ID),
  categoryChips: ["eat", "coffee", "shops", "things"],
  stallCount: 9,
};

export const SEED_STALLS: StallRecord[] = [
  {
    id: "st-salt",
    eventId: SEED_EVENT_ID,
    name: "Salted Caramel Co",
    category: "eat",
    booth: "A12",
    shortWhy: "Handmade caramels.",
    offer: "2 for $10",
    handle: "saltedcaramel",
    status: "active",
  },
  {
    id: "st-linen",
    eventId: SEED_EVENT_ID,
    name: "Harbour Linen",
    category: "shops",
    booth: "B04",
    shortWhy: "Washed linen from Katoomba.",
    offer: "Tote with $40+",
    handle: "harbourlinen",
    status: "active",
  },
  {
    id: "st-pour",
    eventId: SEED_EVENT_ID,
    name: "Laneway Pour",
    category: "coffee",
    booth: "C01",
    shortWhy: "Single origin, takeaway.",
    offer: "Second shot free",
    handle: "lanewaypour",
    status: "active",
  },
  {
    id: "st-print",
    eventId: SEED_EVENT_ID,
    name: "Cut Print Studio",
    category: "shops",
    booth: "B18",
    shortWhy: "Harbour linocuts.",
    handle: "cutprint",
    status: "active",
  },
  {
    id: "st-clay",
    eventId: SEED_EVENT_ID,
    name: "Argyle Clay",
    category: "shops",
    booth: "A07",
    shortWhy: "Small-batch cups.",
    offer: "15% this weekend",
    handle: "argyleclay",
    status: "active",
  },
  {
    id: "st-bao",
    eventId: SEED_EVENT_ID,
    name: "Quay Bao",
    category: "eat",
    booth: "C08",
    shortWhy: "Pork and mushroom bao.",
    handle: "quaybao",
    status: "active",
  },
  {
    id: "st-plants",
    eventId: SEED_EVENT_ID,
    name: "First Fleet Ferns",
    category: "things",
    booth: "D02",
    shortWhy: "Potted ferns for the ferry home.",
    handle: "fleetferns",
    status: "active",
  },
  {
    id: "st-oil",
    eventId: SEED_EVENT_ID,
    name: "Soap & Oil",
    category: "wellness",
    booth: "A22",
    shortWhy: "Native botanicals.",
    offer: "Sample with any tin",
    handle: "soapandoil",
    status: "active",
  },
  {
    id: "st-cutbar",
    eventId: SEED_EVENT_ID,
    name: "The Cut Bar & Grill",
    category: "eat",
    booth: "A01",
    shortWhy: "Dry-aged beef, market hours.",
    offer: "Welcome flute",
    handle: "cutbar",
    status: "active",
  },
];
