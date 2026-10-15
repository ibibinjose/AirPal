import type { WalkingTour } from "@shared/tours";

const KEY = "airpal.tours.v1";

function validTour(data: Record<string, unknown>): WalkingTour | null {
  if (typeof data.id !== "string" || typeof data.title !== "string" || !Array.isArray(data.stops)) return null;
  return data as unknown as WalkingTour;
}

function read(): WalkingTour[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const out: WalkingTour[] = [];
    for (const row of parsed) {
      const tour = validTour(row as Record<string, unknown>);
      if (tour) out.push(tour);
    }
    return out;
  } catch {
    return [];
  }
}

/** Cached tours (Firestore `tours`). Empty when nothing was ever published. */
export function loadTours(): WalkingTour[] {
  return read();
}

export function cacheTours(rows: WalkingTour[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(rows));
  } catch {
    /* ignore */
  }
}
