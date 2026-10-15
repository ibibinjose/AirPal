import type { PropertyInfo } from "@shared/airpal-data";
import type { Geo, NearbyPlace } from "@shared/nearby";
import { originFor } from "./catalog";

export type HighlightKind = "cafe" | "park" | "see";

export type Highlight = NearbyPlace & {
  kind: HighlightKind;
  meters: number;
  walk: string;
};

export function stayOrigin(property: PropertyInfo, markerGeo?: Geo): Geo {
  return property.geo || property.coordinates || markerGeo || originFor();
}
