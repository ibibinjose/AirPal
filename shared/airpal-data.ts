export interface PropertyInfo {
  id: string;
  name: string;
  tagline: string;
  /** Demo-business marker: filtered from guest discovery, `demo-` ids skip KPIs. */
  demo?: boolean;
  /** D3 commercial kinds; residential stays stay out until legal compliance lands. */
  kind?: "hotel" | "motel" | "serviced-apartment" | "hostel" | "boutique" | "campus" | "venue";
  destination: string;
  city: string;
  /** ISO 3166-1 alpha-2, e.g. AU, IN. */
  countryCode?: string;
  /** State / region (NSW, Kerala, CA). */
  state?: string;
  /** Postcode, ZIP, or PIN. */
  postalCode?: string;
  country: string;
  address: string;
  phone: string;
  phoneCountryCode?: string;
  /** Host-pinned GPS for Nearby origin and local matching. */
  geo?: { lat: number; lng: number };
  /** Coordinates alias for geo */
  coordinates?: { lat: number; lng: number };
  whatsapp: string;
  wifi: {
    network: string;
    password: string;
    speed: string;
  };
  checkIn: string;
  checkOut: string;
  breakfast: {
    hours: string;
    location: string;
    type: string;
    price: string;
  };
  facilities: FacilityItem[];
  roomsCount?: number;
  status?: "active" | "trial" | "suspended";
  ownerEmail?: string;
  /** Firebase Auth UID of the organisation that owns this property. */
  ownerId?: string;
  /** Host and staff UIDs that may manage this property. Authoritative with custom claims. */
  members?: Record<string, PropertyMemberRole>;
  monthlyRevenue?: number;
  plan?: "Starter" | "Professional" | "Enterprise";
  heroImage?: string;
  galleryImages?: string[];
  rating?: number;
  reviewsCount?: number;
  googlePlaceId?: string;
  googleRating?: number;
  googleReviewsCount?: number;
  googleReviewUrl?: string;
  claimedByOwner?: boolean;
  startingPrice?: number;
  originalPrice?: number;
  inclusions?: string[];
  badge?: string;
  cancellationPolicy?: string;
  /** Public vanity handle (slug). Separate from opaque property id. */
  handle?: string;
  /** Alias of handle for older docs. */
  slug?: string;
  /** token → human room number. Prefer resolving guest ?r= from this map. */
  roomTokens?: Record<string, string>;
  /** Default lobby / entrance marker id for /q/{markerId}. */
  lobbyMarkerId?: string;
  /** Slugified city for vanity URLs. */
  citySlug?: string;
  /** `${citySlug}/${handle}` unique vanity key. */
  vanityKey?: string;
  /** Nearby precinct this property belongs to (e.g. the-rocks). */
  precinctId?: string;
  /** Precinct place ids the host wants guests to see first. */
  recommendedPlaceIds?: string[];
  /**
   * Host opt-in to show same-trade rivals on Nearby.
   * Default false for hotels/venues. Street/precinct markers ignore this.
   */
  allowCompetitors?: boolean;
  /** Direct outbound booking engine or hotel website URL */
  bookingUrl?: string;
  /** Outbound action label (e.g. "Book Direct", "Book Stay", "Reserve on Hotel Site") */
  bookingLabel?: string;
  /** Estimated average booking / stay value in local currency (e.g. $320) for demand attribution calculations */
  avgBookingValue?: number;
  /** Room occupancy and housekeeping statuses from Property Management System (PMS) */
  roomStatuses?: Record<string, "occupied" | "vacant" | "maintenance" | "cleaning">;
  /** ISO time the host last saved or confirmed live Wi-Fi. */
  wifiUpdatedAt?: string;
  /** ISO time the host last confirmed check-in, breakfast, or facility hours. */
  hoursVerifiedAt?: string;
}

/** Shared facility shape for place and property bios (venues keep this). */
export interface FacilityItem {
  id?: string;
  name: string;
  hours: string;
  floor: string;
  details?: string;
  description?: string;
  status?: string;
  icon: string;
}

export type UserRole = "super_admin" | "host_admin" | "staff" | "guest";
export type PropertyMemberRole = "host_admin" | "staff";

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  propertyIds?: string[];
  createdAt?: string;
  emailVerified?: boolean;
  phone?: string;
  phoneVerified?: boolean;
  photoURL?: string;
  /** Birthday month 1–12 derived from DOB at signup (full DOB not stored). */
  birthdayMonth?: number;
  /** Explicit Adult 18+ consent at signup. */
  adultConsent?: boolean;
  adultConsentAt?: string;
  adultConfirmed?: boolean;
  /** Birthday-month freebie alerts; default on when birthdayMonth is set. */
  birthdayAlertsEnabled?: boolean;
  /** Preferred birthday freebies region (au|in|us|uae|eu). Default au. */
  birthdayAlertsRegion?: string;
  /** ISO timestamp of last birthday-month arrival alert (dupes guard). */
  lastBirthdayMonthAlertAt?: string;
  /** ISO timestamp of last mid-month birthday freebie nudge. */
  lastBirthdayMidMonthAlertAt?: string;
}
