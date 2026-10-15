/**
 * Shipped dock: Home / Circle / Bio (Discovery and Planning removed —
 * legacy /now, /explore, /guide, /p/*, /plan/*, /invite/* redirect to Home).
 * "scan" is a path bucket, not a tab — Scan lives behind + Create.
 */
export type GuestTab = "home" | "scan" | "inbox" | "me" | "circle" | "bio";

/** Map a route path to the bottom-tab it belongs to. Pure: safe to unit test. */
export function tabFromPath(path: string): GuestTab {
  if (path.startsWith("/circle")) return "circle";
  if (path.startsWith("/scan") || path.startsWith("/w/")) return "scan";
  if (path.startsWith("/bio") || path.startsWith("/@")) return "bio";
  if (path.startsWith("/me/inbox")) return "me";
  if (path.startsWith("/me") || path.startsWith("/settings")) return "me";
  if (path === "/") return "home";
  return "home";
}

/** Pass shell dock: Pass / Events / Tickets / Scan / Bio. */
export type PassTab = "pass" | "events" | "tickets" | "scan" | "bio";

/** Map a route path to the Pass-dock tab it belongs to. Pure: safe to unit test. */
export function passTabFromPath(path: string): PassTab {
  if (path.startsWith("/me/tickets") || path.startsWith("/ticket/")) return "tickets";
  if (path.startsWith("/events") || path.startsWith("/e/")) return "events";
  if (path.startsWith("/scan") || path.startsWith("/w/")) return "scan";
  if (path.startsWith("/me") || path.startsWith("/bio") || path.startsWith("/@") || path.startsWith("/settings")) {
    return "bio";
  }
  return "pass";
}
