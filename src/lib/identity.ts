import { normalizeHandle, type BioProfile } from "@shared/bio";
import { placeCategoryFor } from "@shared/business";
import { getCachedListings, listingDefaults, upsertCachedListing } from "./listings";
import { loadBios, persistBios } from "./bio-store";
import { isOpenAt } from "./hours";

export function syncBioToListing(bio: BioProfile) {
  if (bio.kind === "person") return;
  const listings = getCachedListings();
  const hit = listings.find(
    (row) => row.id === bio.listingId || row.handle === bio.handle || row.placeId === bio.placeId,
  );
  const id = bio.listingId || hit?.id || `list-${bio.handle}`;
  const base =
    hit ||
    listingDefaults({
      id,
      name: bio.name,
      category: bio.category,
      placeCategory: placeCategoryFor(bio.category),
      address: bio.city,
      shortWhy: bio.shortWhy,
    });
  upsertCachedListing({
    ...base,
    id,
    placeId: bio.placeId || base.placeId,
    name: bio.name,
    hours: bio.hours || base.hours,
    shortWhy: bio.shortWhy,
    description: bio.aboutText || base.description,
    phone: bio.phone || base.phone,
    handle: bio.handle,
    heroImage: bio.cover || bio.avatar || base.heroImage,
    deal: bio.offer ? { badge: bio.offer.badge, detail: bio.offer.detail, claimHint: "Show AirPal" } : base.deal,
    geo: bio.geo || base.geo,
    ownerUid: bio.ownerUid || base.ownerUid,
    ownerEmail: bio.ownerEmail || base.ownerEmail,
  });
}

export function syncListingToBio(listing: {
  id: string;
  name: string;
  hours: string;
  shortWhy: string;
  description?: string;
  phone?: string;
  handle?: string;
  heroImage?: string;
  deal?: { badge: string; detail: string };
  geo?: { lat: number; lng: number };
  ownerUid?: string;
  ownerEmail?: string;
}) {
  const bios = loadBios();
  const bio = bios.find((row) => {
    if (row.kind === "person") return false;
    return row.listingId === listing.id || Boolean(listing.handle && row.handle === listing.handle);
  });
  if (!bio) {
    if (!listing.handle) return;
    const h = normalizeHandle(listing.handle);
    const existingAny = bios.find((row) => row.handle === h);
    if (existingAny) return;
    const newBio: BioProfile = {
      id: `bio-${listing.id.replace(/^list-/, "")}`,
      handle: h,
      kind: "business",
      visibility: "public",
      name: listing.name,
      shortWhy: listing.shortWhy,
      aboutText: listing.description !== undefined ? listing.description.trim() || undefined : undefined,
      city: "Sydney",
      category: "eat",
      hours: listing.hours,
      openNow: listing.hours ? (isOpenAt(listing.hours, new Date(), "Australia/Sydney") ?? true) : true,
      phone: listing.phone,
      geo: listing.geo,
      avatar: listing.heroImage,
      cover: listing.heroImage,
      listingId: listing.id,
      ownerUid: listing.ownerUid,
      ownerEmail: listing.ownerEmail,
      offer: listing.deal ? { badge: listing.deal.badge, detail: listing.deal.detail } : undefined,
      deals: listing.deal
        ? [
            {
              id: "offer",
              kind: "deal" as const,
              title: listing.deal.badge,
              detail: listing.deal.detail,
              badge: listing.deal.badge,
            },
          ]
        : [],
      products: [],
      services: [],
      links: [],
    };
    persistBios([...bios, newBio]);
    return;
  }
  persistBios([
    {
      ...bio,
      name: listing.name,
      hours: listing.hours,
      shortWhy: listing.shortWhy,
      aboutText: listing.description !== undefined ? listing.description || undefined : bio.aboutText,
      phone: listing.phone || bio.phone,
      listingId: listing.id,
      cover: listing.heroImage || bio.cover,
      geo: listing.geo || bio.geo,
      offer: listing.deal ? { badge: listing.deal.badge, detail: listing.deal.detail } : bio.offer,
      deals: listing.deal
        ? [
            {
              id: bio.deals[0]?.id || "offer",
              kind: "deal" as const,
              title: listing.deal.badge,
              detail: listing.deal.detail,
              badge: listing.deal.badge,
            },
            ...bio.deals.slice(1),
          ]
        : bio.deals,
    },
    ...bios.filter((row) => row.handle !== bio.handle),
  ]);
}
