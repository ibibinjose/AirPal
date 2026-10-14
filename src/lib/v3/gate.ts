/**
 * Local-only V3 feature gate. V3 adapters activate only when the operator
 * opts in AND the app points at the Firebase Emulator Suite, so the V3
 * cutover candidate can never light up against production from this client.
 */
export function isV3AdaptersEnabled(): boolean {
  return import.meta.env.VITE_V3_ADAPTERS === "true" && import.meta.env.VITE_USE_FIREBASE_EMULATOR === "true";
}

export function requireV3Adapters(): void {
  if (!isV3AdaptersEnabled()) {
    throw new Error("V3 adapters are disabled. Set VITE_V3_ADAPTERS=true with the Firebase emulator.");
  }
}
