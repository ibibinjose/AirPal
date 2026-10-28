import { BIO_CATALOG_MAX, type BioLinkType } from "@shared/bio";

/** Bio edit presets + social link formatting (moved from BioEditPage). */
// Personal Profile Category / Vibe Presets
export const PERSONAL_CATEGORY_PRESETS = [
  { id: "AirPal Star", label: "★ AirPal Star" },
  { id: "Explorer & Local", label: "Explorer & Local 🧭" },
  { id: "Travel Companion", label: "Travel Companion ✈️" },
  { id: "Creator & Artist", label: "Creator & Artist 🎨" },
  { id: "Food & Coffee Lover", label: "Food & Coffee Lover ☕" },
  { id: "Fashion & Style", label: "Fashion & Style 👗" },
  { id: "Fitness & Wellness", label: "Fitness & Wellness 🏃" },
  { id: "Student & Explorer", label: "Student & Explorer 🎒" },
  { id: "Community Host", label: "Community Host 🌟" },
] as const;

// Business Profile Category Presets
export const BUSINESS_CATEGORY_PRESETS = [
  { id: "Stay & Accommodation", label: "Stay & Hotel 🏢" },
  { id: "Boutique Hotel", label: "Boutique Hotel 🏨" },
  { id: "Food & Drink", label: "Food & Drink ☕" },
  { id: "Restaurant & Bar", label: "Restaurant & Bar 🍽️" },
  { id: "Local Business", label: "Local Business 🏪" },
  { id: "Boutique & Retail", label: "Boutique & Retail 🛍️" },
  { id: "Beauty & Wellness", label: "Beauty & Wellness 💈" },
  { id: "Music & Venue", label: "Events & Venue 🎭" },
  { id: "Services & Trades", label: "Services & Trades 🛠️" },
] as const;

// Personal Action Button Presets
export const PERSONAL_CTA_PRESETS = [
  "Catch Up",
  "Say Hello",
  "Hang Out",
  "Message WhatsApp",
  "Connect",
  "Follow Me",
] as const;

// Business Action Button Presets
export const BUSINESS_CTA_PRESETS = [
  "View Stay & Guide",
  "Book Direct",
  "Order Online",
  "Book Table",
  "View Menu",
  "Get Directions",
  "Message WhatsApp",
  "Contact Business",
] as const;

export const SOCIAL_CONFIG: Partial<
  Record<
    BioLinkType,
    {
      prefix: string;
      cleanPrefix: string;
      placeholder: string;
      example: string;
      domainRegex: RegExp;
    }
  >
> = {
  instagram: {
    prefix: "https://instagram.com/",
    cleanPrefix: "instagram.com/",
    placeholder: "username",
    example: "e.g. alex_sydney",
    domainRegex: /^(?:https?:\/\/)?(?:www\.)?instagram\.com\/(?:@)?/i,
  },
  facebook: {
    prefix: "https://facebook.com/",
    cleanPrefix: "facebook.com/",
    placeholder: "page or username",
    example: "e.g. alex.sydney",
    domainRegex: /^(?:https?:\/\/)?(?:www\.)?facebook\.com\//i,
  },
  tiktok: {
    prefix: "https://tiktok.com/@",
    cleanPrefix: "tiktok.com/@",
    placeholder: "username",
    example: "e.g. alexsydney",
    domainRegex: /^(?:https?:\/\/)?(?:www\.)?tiktok\.com\/(?:@)?/i,
  },
  x: {
    prefix: "https://x.com/",
    cleanPrefix: "x.com/",
    placeholder: "username",
    example: "e.g. alexsydney",
    domainRegex: /^(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\/(?:@)?/i,
  },
  youtube: {
    prefix: "https://youtube.com/@",
    cleanPrefix: "youtube.com/@",
    placeholder: "channel name",
    example: "e.g. alexsydney",
    domainRegex: /^(?:https?:\/\/)?(?:www\.)?youtube\.com\/(?:@|c\/|channel\/)?/i,
  },
  linkedin: {
    prefix: "https://linkedin.com/in/",
    cleanPrefix: "linkedin.com/in/",
    placeholder: "profile or company ID",
    example: "e.g. alex-morgan",
    domainRegex: /^(?:https?:\/\/)?(?:www\.)?linkedin\.com\/(?:in\/|company\/)?/i,
  },
  threads: {
    prefix: "https://threads.net/@",
    cleanPrefix: "threads.net/@",
    placeholder: "username",
    example: "e.g. alexsydney",
    domainRegex: /^(?:https?:\/\/)?(?:www\.)?threads\.net\/(?:@)?/i,
  },
  snapchat: {
    prefix: "https://snapchat.com/add/",
    cleanPrefix: "snapchat.com/add/",
    placeholder: "username",
    example: "e.g. alexsydney",
    domainRegex: /^(?:https?:\/\/)?(?:www\.)?snapchat\.com\/(?:add\/)?/i,
  },
  pinterest: {
    prefix: "https://pinterest.com/",
    cleanPrefix: "pinterest.com/",
    placeholder: "username",
    example: "e.g. alexsydney",
    domainRegex: /^(?:https?:\/\/)?(?:www\.)?pinterest\.com\//i,
  },
  whatsapp: {
    prefix: "https://wa.me/",
    cleanPrefix: "wa.me/",
    placeholder: "phone number with country code",
    example: "e.g. 61400123456",
    domainRegex: /^(?:https?:\/\/)?(?:www\.)?(?:wa\.me\/|api\.whatsapp\.com\/send\?phone=)/i,
  },
};

export function formatFinalLinkHref(type: BioLinkType, input: string): string {
  const raw = input.trim();
  if (!raw) return "";

  const social = SOCIAL_CONFIG[type];
  if (social) {
    let handle = raw.replace(social.domainRegex, "").replace(/^@/, "").trim();
    handle = handle.replace(/\/+$/, "");
    return `${social.prefix}${handle}`;
  }

  if (type === "call") {
    if (raw.startsWith("tel:")) return raw;
    return `tel:${raw.replace(/\s+/g, "")}`;
  }

  if (/^https?:\/\//i.test(raw)) return raw;
  if (/^[a-z0-9.-]+\.[a-z]{2,}/i.test(raw)) return `https://${raw}`;
  return raw;
}

/**
 * Empty-submit guard for the bio Links tab. An empty Add Link tap used to
 * return silently, which reads as broken — callers surface the message
 * (toast) instead of no-oping.
 */
export function newLinkError(type: BioLinkType, href: string): string | null {
  if (!href.trim() || !formatFinalLinkHref(type, href)) {
    return "Enter a value first — a username for socials, a URL for web links.";
  }
  return null;
}

/**
 * Empty/full guard for the Shop & Deals catalog form. Whitespace-only titles
 * slip past native `required`, so this keeps the no-op visible with an
 * inline message instead of silence.
 */
export function newCatalogItemError(title: string, count: number): string | null {
  if (!title.trim()) return "Give your item a title first.";
  if (count >= BIO_CATALOG_MAX) return `Catalog is full — ${BIO_CATALOG_MAX} per category max.`;
  return null;
}
