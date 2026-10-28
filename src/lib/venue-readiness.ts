import { addressOk, parseAddress } from "@shared/geo-address";

/**
 * Step 1 of business setup counts complete only with a street-level address.
 * A bare suburb ("Sydney NSW 2000") or a duplicated locality line must never
 * mark the venue ready (finding 14) — parseAddress already drops
 * locality repeats, so a missing line1 fails addressOk.
 */
export function venueStreetReady(address: string | null | undefined): boolean {
  if (!address) return false;
  return addressOk(parseAddress(address));
}
