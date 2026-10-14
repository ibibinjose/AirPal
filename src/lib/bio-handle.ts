import { bioPath, catalogDeals, handleFromPlaceId, normalizeHandle, type BioLink, type BioProfile } from "@shared/bio";
import { isBusinessCategory, type BusinessCategoryId } from "@shared/business";
import type { StallRecord } from "@shared/event";
import type { NearbyPlace } from "@shared/nearby";
import { loadBios } from "./bio-store";
import { placeByHandle } from "./catalog";
import { loadStalls } from "./events-store";

export function handleOfPlace(place: Pick<NearbyPlace, "id" | "handle">): string | undefined {
  if (place.handle) return normalizeHandle(place.handle);
  const fromBio = loadBios().find((p) => p.placeId === place.id || p.listingId === place.id);
  if (fromBio) return fromBio.handle;
  return handleFromPlaceId(place.id) || undefined;
}

export function hrefForPlace(place: Pick<NearbyPlace, "id" | "handle">) {
  const handle = handleOfPlace(place);
  return handle ? bioPath(handle) : `/p/${place.id}`;
}

export function stallByHandle(handle: string) {
  const h = normalizeHandle(handle);
  return loadStalls().find((s) => s.handle === h && s.status === "active");
}

export function hrefForStall(stall: Pick<StallRecord, "id" | "eventId" | "handle">) {
  return stall.handle ? bioPath(stall.handle) : `/e/${stall.eventId}/s/${stall.id}`;
}

export function placeAsBio(place: NearbyPlace, handle: string): BioProfile {
  const links: BioLink[] = [];
  if (place.bookingUrl) {
    links.push({
      id: "l-book",
      type: place.bookingActionType === "order" ? "order" : "book",
      label: place.bookingLabel || "Book",
      href: place.bookingUrl,
    });
  }
  const category = (
    place.category === "shops" ? "shops" : place.category === "coffee" ? "coffee" : "eat"
  ) as BusinessCategoryId;
  return {
    id: `place-${place.id}`,
    handle: normalizeHandle(handle),
    name: place.name,
    shortWhy: place.shortWhy,
    city: "Sydney",
    category,
    hours: place.hours || "",
    openNow: place.openNow ?? true,
    phone: place.phone,
    avatar: place.heroImage,
    cover: place.heroImage || place.photos?.[0],
    geo: place.geo,
    offer: place.deal ? { badge: place.deal.badge, detail: place.deal.detail } : undefined,
    products: [],
    services: [],
    deals: catalogDeals({
      deals: [],
      offer: place.deal ? { badge: place.deal.badge, detail: place.deal.detail } : undefined,
    }),
    links,
    placeId: place.id,
    mapsPlaceId: place.mapsPlaceId,
  };
}

export function stallAsBio(stall: StallRecord, handle: string): BioProfile {
  const category: BusinessCategoryId = isBusinessCategory(stall.category) ? stall.category : "shops";
  return {
    id: `stall-${stall.id}`,
    handle: normalizeHandle(handle),
    name: stall.name,
    shortWhy: stall.shortWhy,
    city: "Sydney",
    category,
    hours: "Market hours",
    openNow: true,
    offer: stall.offer ? { badge: "Market", detail: stall.offer } : undefined,
    products: [],
    services: [],
    deals: stall.offer
      ? [{ id: "offer", kind: "deal", title: stall.offer, detail: "Show at the stall.", badge: "Market" }]
      : [],
    links: [],
    stallId: stall.id,
    eventId: stall.eventId,
  };
}

export const BIBIN_JOSE_PROFILE: BioProfile = {
  id: "bio-bibinjose",
  handle: "bibinjose",
  name: "Bibin Jose",
  kind: "person",
  visibility: "public",
  shortWhy: "Founder & CTO at AirPal · Building Life Made Easy across Sydney & beyond.",
  aboutText:
    "17+ years in full-stack architecture, infrastructure, and product engineering. Building AirPal to make everyday city life, concerts, hangouts, and authentic experiences effortless.",
  city: "Sydney",
  category: "services",
  categoryTag: "Founder & CTO",
  pronouns: "he/him",
  languages: "English",
  avatar: "/media/harbour.jpg",
  cover: "/media/harbour.jpg",
  customStatus: "Building AirPal in Sydney 🇦🇺",
  customStatusEmoji: "⚡",
  availabilityStatus: "available",
  hours: "9am–6pm",
  openNow: true,
  phone: "+61 400 000 000",
  links: [
    {
      id: "l-web",
      type: "website",
      label: "AirPal · Life Made Easy",
      href: "https://airpal.me",
    },
    {
      id: "l-founders",
      type: "website",
      label: "Founding Member 100k Draw",
      href: "https://airpal.me/founders",
    },
    {
      id: "l-circle",
      type: "website",
      label: "AirPal Networking Circle",
      href: "https://airpal.me/circle",
    },
    {
      id: "l-guide",
      type: "website",
      label: "Sydney Curated Experiences",
      href: "https://airpal.me/explore",
    },
  ],
  deals: [],
  products: [],
  services: [
    {
      id: "srv-eng",
      kind: "service",
      title: "Full-Stack Architecture & Infra",
      detail: "Advising and building high-scale distributed apps and real-time platforms.",
      badge: "CTO & Architect",
    },
    {
      id: "srv-airpal",
      kind: "service",
      title: "AirPal Ecosystem & Platform",
      detail: "Unified discovery, ticketing passbook, and local arrival cohorts.",
      badge: "Platform",
    },
  ],
};

export function resolvePublicBio(
  handle: string,
  byHandle: (h: string) => BioProfile | undefined,
): BioProfile | undefined {
  const h = normalizeHandle(handle);
  const owned = byHandle(h);
  if (owned) return owned;
  if (h === "bibinjose") return BIBIN_JOSE_PROFILE;
  const place = placeByHandle(h);
  if (place) return placeAsBio(place, h);
  const stall = stallByHandle(h);
  return stall ? stallAsBio(stall, h) : undefined;
}
