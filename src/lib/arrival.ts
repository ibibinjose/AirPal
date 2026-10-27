import type { Geo } from "@shared/nearby";
import { calculateHaversineDistanceMeters, estimateWalkingMinutes, formatWalkingTime } from "./maps";

export type ArrivalPointType = "parking" | "train" | "metro" | "light_rail" | "bus";
export type ArrivalAvailability = "available" | "limited" | "full" | "unknown";

export interface ArrivalPoint {
  id: string;
  name: string;
  type: ArrivalPointType;
  geo: Geo;
  address?: string;
  walkingMinutes?: number;
  walkingMeters?: number;
  walkingLabel?: string;
  capacity?: number;
  availableSpaces?: number;
  availability: ArrivalAvailability;
  ratesHint?: string;
  restrictionsHint?: string;
  isRealTime?: boolean;
}

/**
 * Curated arrival and parking hubs across Sydney's primary cultural, event,
 * and entertainment precincts. Used to give attendees instant last-mile clarity.
 */
export const SYDNEY_PRECINCT_ARRIVAL_HUBS: Omit<ArrivalPoint, "walkingMinutes" | "walkingMeters" | "walkingLabel">[] = [
  // =========================================================================
  // ENMORE & NEWTOWN PRECINCT (Enmore Theatre, King St, Sydney Park)
  // =========================================================================
  {
    id: "enmore-edgeware",
    name: "Edgeware Rd Car Park",
    type: "parking",
    geo: { lat: -33.8996, lng: 151.1738 },
    address: "Edgeware Rd & Enmore Rd, Enmore",
    capacity: 75,
    availableSpaces: 34,
    availability: "available",
    ratesHint: "2P Metered · Free after 6pm",
    restrictionsHint: "No clearway",
    isRealTime: true,
  },
  {
    id: "newtown-lennox",
    name: "Lennox St Council Car Park",
    type: "parking",
    geo: { lat: -33.8962, lng: 151.1804 },
    address: "Lennox St, Newtown",
    capacity: 120,
    availableSpaces: 28,
    availability: "available",
    ratesHint: "Free 2 hours",
    restrictionsHint: "Standard council restrictions",
  },
  {
    id: "newtown-station",
    name: "Newtown Train Station",
    type: "train",
    geo: { lat: -33.8978, lng: 151.1797 },
    address: "King St, Newtown",
    availability: "available",
    restrictionsHint: "T2 Inner West Line (Trains every 5–10 mins)",
  },

  // =========================================================================
  // SYDNEY CBD & CIRCULAR QUAY (Opera House, State Theatre, Recital Hall)
  // =========================================================================
  {
    id: "opera-house-parking",
    name: "Sydney Opera House Car Park",
    type: "parking",
    geo: { lat: -33.8576, lng: 151.2144 },
    address: "2 Macquarie St, Sydney",
    capacity: 1200,
    availableSpaces: 180,
    availability: "available",
    ratesHint: "$15 night flat rate with event ticket",
    isRealTime: true,
  },
  {
    id: "circular-quay-station",
    name: "Circular Quay Station & Wharves",
    type: "train",
    geo: { lat: -33.8615, lng: 151.2107 },
    address: "Alfred St, Sydney",
    availability: "available",
    restrictionsHint: "T2, T3, T8 trains, L2/L3 light rail, F1–F9 ferries",
  },
  {
    id: "qvb-car-park",
    name: "QVB Car Park (York St)",
    type: "parking",
    geo: { lat: -33.8719, lng: 151.2065 },
    address: "111 York St, Sydney",
    capacity: 650,
    availableSpaces: 140,
    availability: "available",
    ratesHint: "Evenings $16 flat rate after 5pm",
    isRealTime: true,
  },
  {
    id: "town-hall-station",
    name: "Town Hall Station",
    type: "train",
    geo: { lat: -33.8735, lng: 151.2068 },
    address: "George St, Sydney",
    availability: "available",
    restrictionsHint: "T1, T2, T3, T4, T8, T9 trains",
  },

  // =========================================================================
  // MOORE PARK & ENTERTAINMENT QUARTER (Hordern Pavilion, SCG, Allianz)
  // =========================================================================
  {
    id: "eq-car-park",
    name: "The Entertainment Quarter Multi-deck",
    type: "parking",
    geo: { lat: -33.8935, lng: 151.2255 },
    address: "Errol Flynn Blvd, Moore Park",
    capacity: 2000,
    availableSpaces: 520,
    availability: "available",
    ratesHint: "First 2 hours free · Event flat rates apply",
    isRealTime: true,
  },
  {
    id: "moore-park-light-rail",
    name: "Moore Park Light Rail Stop",
    type: "light_rail",
    geo: { lat: -33.892, lng: 151.221 },
    address: "Anzac Pde, Moore Park",
    availability: "available",
    restrictionsHint: "L2 & L3 South East Light Rail (every 4–8 mins)",
  },

  // =========================================================================
  // SYDNEY OLYMPIC PARK (Accor Stadium, Qudos Bank Arena, Showground)
  // =========================================================================
  {
    id: "olympic-p1",
    name: "P1 Multi-Deck Car Park",
    type: "parking",
    geo: { lat: -33.8475, lng: 151.0638 },
    address: "Olympic Blvd, Sydney Olympic Park",
    capacity: 3200,
    availableSpaces: 890,
    availability: "available",
    ratesHint: "Major event flat rate $35 (pre-book recommended)",
    isRealTime: true,
  },
  {
    id: "olympic-park-station",
    name: "Olympic Park Train Station",
    type: "train",
    geo: { lat: -33.8479, lng: 151.0694 },
    address: "Olympic Blvd, Sydney Olympic Park",
    availability: "available",
    restrictionsHint: "Direct Olympic Park event sprint trains from Central",
  },

  // =========================================================================
  // SURRY HILLS & DARLINGHURST (Crown St, Oxford St, Belvoir St Theatre)
  // =========================================================================
  {
    id: "surry-hills-holt",
    name: "Wilson Parking — 55 Holt St",
    type: "parking",
    geo: { lat: -33.8872, lng: 151.2104 },
    address: "55 Holt St, Surry Hills",
    capacity: 180,
    availableSpaces: 45,
    availability: "available",
    ratesHint: "Evening rate $12 after 5pm",
  },
  {
    id: "surry-hills-light-rail",
    name: "Surry Hills Light Rail Stop",
    type: "light_rail",
    geo: { lat: -33.8864, lng: 151.212 },
    address: "Devonshire St, Surry Hills",
    availability: "available",
    restrictionsHint: "L2 & L3 Light Rail",
  },
];

/**
 * Returns nearby arrival hubs (parking and transit) ranked by walking distance & time to the destination.
 */
export function getNearbyArrivalPoints(
  destination: Geo,
  options: {
    max?: number;
    filterType?: "parking" | "transit";
    maxWalkingMinutes?: number;
  } = {},
): ArrivalPoint[] {
  const { max = 3, filterType, maxWalkingMinutes = 30 } = options;

  const points: ArrivalPoint[] = SYDNEY_PRECINCT_ARRIVAL_HUBS.map((hub) => {
    const meters = calculateHaversineDistanceMeters(hub.geo, destination);
    const minutes = estimateWalkingMinutes(meters);
    return {
      ...hub,
      walkingMeters: meters,
      walkingMinutes: minutes,
      walkingLabel: formatWalkingTime(meters),
    };
  });

  return points
    .filter((pt) => {
      if (filterType === "parking" && pt.type !== "parking") return false;
      if (filterType === "transit" && pt.type === "parking") return false;
      if (pt.walkingMinutes && pt.walkingMinutes > maxWalkingMinutes) return false;
      return true;
    })
    .sort((a, b) => (a.walkingMeters ?? 0) - (b.walkingMeters ?? 0))
    .slice(0, max);
}

/**
 * Provides an optimal arrival overview for a venue or event location:
 * - Best recommended parking
 * - Nearest public transit station
 * - Full sorted arrival list
 */
export function getVenueArrivalOverview(destination: Geo): {
  nearestParking?: ArrivalPoint;
  nearestTransit?: ArrivalPoint;
  allPoints: ArrivalPoint[];
} {
  const parkings = getNearbyArrivalPoints(destination, { max: 1, filterType: "parking" });
  const transits = getNearbyArrivalPoints(destination, { max: 1, filterType: "transit" });
  const all = getNearbyArrivalPoints(destination, { max: 4 });

  return {
    nearestParking: parkings[0],
    nearestTransit: transits[0],
    allPoints: all,
  };
}

/**
 * Resolves a venue name or suburb string to an approximate geographic anchor
 * for last-mile parking ranking when exact coordinates are not yet provided.
 */
export function resolvePrecinctGeo(suburbOrName?: string): Geo {
  if (!suburbOrName) return { lat: -33.8688, lng: 151.2093 };
  const s = suburbOrName.toLowerCase();
  if (s.includes("enmore") || s.includes("newtown")) return { lat: -33.8992, lng: 151.1744 };
  if (
    s.includes("moore park") ||
    s.includes("hordern") ||
    s.includes("scg") ||
    s.includes("allianz") ||
    s.includes("entertainment quarter")
  )
    return { lat: -33.8935, lng: 151.2255 };
  if (s.includes("olympic") || s.includes("accor") || s.includes("qudos") || s.includes("showground"))
    return { lat: -33.8475, lng: 151.0638 };
  if (s.includes("surry hills") || s.includes("darlinghurst") || s.includes("belvoir"))
    return { lat: -33.8872, lng: 151.2104 };
  if (s.includes("barangaroo")) return { lat: -33.8634, lng: 151.2014 };
  if (s.includes("the rocks") || s.includes("rocks") || s.includes("circular quay") || s.includes("opera"))
    return { lat: -33.8568, lng: 151.2153 };
  if (s.includes("darling harbour") || s.includes("icc")) return { lat: -33.8748, lng: 151.2009 };
  if (s.includes("bondi")) return { lat: -33.8915, lng: 151.2767 };
  if (s.includes("manly")) return { lat: -33.7971, lng: 151.2881 };
  return { lat: -33.8688, lng: 151.2093 };
}
