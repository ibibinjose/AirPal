export type SocialKind = "like" | "follow";

/** Pure toggle helper — returns the next set plus whether the id was added. */
export function toggleSocialId(current: Set<string>, id: string): { next: Set<string>; added: boolean } {
  const next = new Set(current);
  const added = !next.has(id);
  if (added) next.add(id);
  else next.delete(id);
  return { next, added };
}
