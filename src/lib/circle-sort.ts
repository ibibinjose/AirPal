import { sameCity } from "./circle";

export type CircleFilter = "all" | "friends" | "communities" | "places";
export type CircleRelationshipFilter = "all" | "mutual" | "incoming" | "met" | "nearby";

export interface CircleContact {
  id: string;
  handle: string;
  name: string;
  avatar?: string;
  city?: string;
  category: "friends" | "communities" | "places";
  categoryLabel: string;
  whereMet?: string;
  metAt?: string;
  isFollowing: boolean;
  isFollower: boolean;
  isMutual: boolean;
  isMet: boolean;
}

export function sortCircleContacts(contacts: CircleContact[], myCity?: string): CircleContact[] {
  const rank = (c: CircleContact): number => {
    if (c.isMutual) return 0;
    if (c.isFollower && !c.isFollowing) return 1;
    if (c.isMet) return 2;
    if (c.isFollowing) return 3;
    if (myCity && sameCity(c.city, myCity)) return 4;
    return 5;
  };
  return [...contacts].sort((a, b) => {
    const rDiff = rank(a) - rank(b);
    if (rDiff !== 0) return rDiff;
    return a.name.localeCompare(b.name);
  });
}
