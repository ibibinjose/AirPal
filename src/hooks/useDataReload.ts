import { useCallback } from "react";
import { useLocalNow } from "@/hooks/useLocalNow";
import { useEvents } from "@/contexts/EventsContext";
import { fetchPlaces } from "@/lib/places-store";

const RELOAD_DATA_EVENT = "airpal:reload-data";

/**
 * Top-level data reload orchestrator. Refreshes clock, weather,
 * events, place catalog, and triggers page listeners.
 */
export function useDataReload() {
  const { refresh: refreshLocalNow } = useLocalNow();
  const { refresh: refreshEvents } = useEvents();

  const reloadAllData = useCallback(async () => {
    const startTime = Date.now();

    try {
      const tasks: Promise<unknown>[] = [
        // 1. Refetch weather and recalculate local now / anchor
        Promise.resolve(refreshLocalNow?.()),
        // 2. Reload cached/saved events, stalls, and calendar states
        Promise.resolve(refreshEvents?.()),
        // 3. Refetch active precinct places from Firestore
        fetchPlaces(),
      ];

      // 4. Fire window event so active pages re-evaluate or refetch
      window.dispatchEvent(new CustomEvent(RELOAD_DATA_EVENT, { detail: { timestamp: Date.now() } }));

      await Promise.allSettled(tasks);
    } catch (err) {
      console.warn("Data reload encountered an issue:", err);
    } finally {
      // Ensure minimum visual feedback duration so animation is clear
      const elapsed = Date.now() - startTime;
      if (elapsed < 600) {
        await new Promise((resolve) => setTimeout(resolve, 600 - elapsed));
      }
    }
  }, [refreshLocalNow, refreshEvents]);

  return { reloadAllData };
}
