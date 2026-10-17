/** Room QR pairs from the live property. */
export function roomTokenEntries(roomTokens?: Record<string, string> | null): Array<[token: string, room: string]> {
  if (!roomTokens) return [];
  return Object.entries(roomTokens).filter(([token, room]) => token.trim() && room.trim());
}

/** Properties the host header and /host should watch. */
export function hostWatchPropertyIds(propertyIds: string[] | undefined): string[] {
  return [...(propertyIds || [])].filter(Boolean);
}

export function hostWorkspacePropertyId(propertyIds: string[] | undefined): string {
  return propertyIds?.[0] || "";
}
