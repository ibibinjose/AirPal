import { collection, query, where, type Firestore, type Query } from "firebase/firestore";

/** Statuses `firestore.rules` allows a guest to list on `events`. */
export const PUBLIC_EVENT_STATUSES = ["live", "ended"] as const;

/**
 * Public catalog query. A collection-wide `getDocs(events)` fails the whole
 * read when any draft (or other non-public) doc is in the result, because
 * rules deny that row. Firestore then reports permission-denied, which the
 * events page used to describe as a dropped connection.
 */
export function publicEventsQuery(db: Firestore): Query {
  return query(collection(db, "events"), where("status", "in", [...PUBLIC_EVENT_STATUSES]));
}

export type EventsRefreshFailure = "offline" | "denied" | "failed";

export function classifyEventsRefreshError(err: unknown): EventsRefreshFailure {
  const code = typeof err === "object" && err && "code" in err ? String((err as { code: unknown }).code || "") : "";
  const message = err instanceof Error ? err.message : String(err || "");
  const haystack = `${code} ${message}`.toLowerCase();
  if (haystack.includes("permission-denied") || haystack.includes("insufficient permissions")) return "denied";
  if (
    haystack.includes("unavailable") ||
    haystack.includes("deadline-exceeded") ||
    haystack.includes("network-request-failed") ||
    haystack.includes("failed to fetch") ||
    haystack.includes("client is offline")
  ) {
    return "offline";
  }
  return "failed";
}

export function eventsRefreshCopy(kind: EventsRefreshFailure): { title: string; detail: string } {
  if (kind === "offline") {
    return {
      title: "Couldn't refresh events",
      detail: "Check your connection and try again — showing what's saved on this device in the meantime.",
    };
  }
  if (kind === "denied") {
    return {
      title: "Couldn't refresh events",
      detail: "AirPal could not read the public events list because access was denied. This is not a network outage.",
    };
  }
  return {
    title: "Couldn't refresh events",
    detail: "The events refresh failed. Try again in a moment.",
  };
}
