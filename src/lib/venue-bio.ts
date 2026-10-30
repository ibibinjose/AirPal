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
  aboutText?: string;
  category: BusinessCategoryId;
  kind: BioKind;
  phone?: string;
  hours?: string;
  geo?: { lat: number; lng: number };
  listingId: string;
  placeId: string;
};

/**
 * Which existing business bio (if any) a venue-bio create may inherit unset
 * fields from. Scoped to the same venue listing: launching a second venue
 * must start fresh instead of copying the first venue's about text, hours,
 * and photos. A missing input listing id means a legacy edit flow with no
 * listing context — keep inheriting so re-saves stay stable.
 */
export function shouldKeepBusinessBio(
  business: { listingId?: string | null } | null | undefined,
  inputListingId?: string | null,
): boolean {
  if (!business) return false;
  if (!inputListingId) return true;
  return (business.listingId || null) === (inputListingId || null);
}

export function venueBioInput(listing: BusinessListing): VenueBioInput | null {
  const handle = venueBioHandle(listing);
  if (!handle) return null;
  return {
    handle,
    name: listing.name,
    city: parseAddress(listing.address).city || "Sydney",
    shortWhy: listing.shortWhy,
    aboutText: listing.description?.trim() || undefined,
    category: listing.category,
    kind: "business",
    phone: listing.phone,
    hours: listing.hours?.trim() || undefined,
    geo: listing.geo,
    listingId: listing.id,
    placeId: listing.placeId,
  };
}
