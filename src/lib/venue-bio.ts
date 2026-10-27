import { handleFromPlaceId, normalizeHandle, type BioKind } from "@shared/bio";
import type { BusinessCategoryId, BusinessListing } from "@shared/business";
import { parseAddress } from "@shared/geo-address";

/**
 * One-click venue bio creation: builds the exact `createProfile` input for a
 * listing the user owns, using the listing's own data and handle. Skips the
 * BioSetup name-match rule on purpose — that rule stops strangers claiming
 * brand handles, but this is the owner's own listing handle.
 */
export function venueBioHandle(listing: Pick<BusinessListing, "placeId" | "handle">): string {
  return normalizeHandle(listing.handle || handleFromPlaceId(listing.placeId) || "");
}

export type VenueBioInput = {
  handle: string;
  name: string;
  city: string;
  shortWhy: string;
  category: BusinessCategoryId;
  kind: BioKind;
  phone?: string;
  geo?: { lat: number; lng: number };
  listingId: string;
  placeId: string;
};

export function venueBioInput(listing: BusinessListing): VenueBioInput | null {
  const handle = venueBioHandle(listing);
  if (!handle) return null;
  return {
    handle,
    name: listing.name,
    city: parseAddress(listing.address).city || "Sydney",
    shortWhy: listing.shortWhy,
    category: listing.category,
    kind: "business",
    phone: listing.phone,
    geo: listing.geo,
    listingId: listing.id,
    placeId: listing.placeId,
  };
}
