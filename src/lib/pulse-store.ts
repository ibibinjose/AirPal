import { getBioPulseRemote, liveBackendEnabled } from "./functions";

export async function fetchBioPulse(propertyId: string) {
  if (!liveBackendEnabled()) return { found: false as const };
  return getBioPulseRemote({ propertyId });
}
