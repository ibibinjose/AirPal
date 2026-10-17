/**
 * Shipped dock: Home / Place / Community / Friends / Me.
 * "scan" is a path bucket, not a tab — Scan lives behind + Create.
 * Bio pages (`/bio*`, `/@handle`) and Circle belong to the Me/Friends tabs.
 */
export type GuestTab = "home" | "places" | "communities" | "friends" | "me" | "scan" | "inbox";

/** Map a route path to the bottom-tab it belongs to. Pure: safe to unit test. */
export function tabFromPath(path: string): GuestTab {
  if (path.startsWith("/places")) return "places";
  if (path.startsWith("/communities")) return "communities";
  if (path.startsWith("/friends") || path.startsWith("/circle")) return "friends";
  if (path.startsWith("/scan") || path.startsWith("/w/")) return "scan";
  if (path.startsWith("/me/inbox")) return "me";
  if (
    path.startsWith("/me") ||
    path.startsWith("/bio") ||
    path.startsWith("/@") ||
    path.startsWith("/settings") ||
    path.startsWith("/calendar")
  ) {
    return "me";
  }
  if (path === "/") return "home";
  return "home";
}

/** Pass shell dock: Pass / Events / Tickets / Scan / Bio. */
export type PassTab = "pass" | "events" | "tickets" | "scan" | "bio";

/** Map a route path to the Pass-dock tab it belongs to. Pure: safe to unit test. */
export function passTabFromPath(path: string): PassTab {
  if (path.startsWith("/me/tickets") || path.startsWith("/ticket/")) return "tickets";
  if (path.startsWith("/events") || path.startsWith("/e/") || path.startsWith("/communities")) {
    return "events";
  }
  if (path.startsWith("/scan") || path.startsWith("/w/")) return "scan";
  if (
    path.startsWith("/me") ||
    path.startsWith("/bio") ||
    path.startsWith("/@") ||
    path.startsWith("/settings") ||
    path.startsWith("/friends") ||
    path.startsWith("/circle")
  ) {
    return "bio";
  }
  return "pass";
}
