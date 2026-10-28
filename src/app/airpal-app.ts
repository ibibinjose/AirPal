/**
 * One AirPal App — canonical information architecture.
 *
 * Single source of truth for every first-class route in the unified app.
 * The router (`./routes.tsx`), tab bars, top nav, and footer all derive
 * from this registry so a route can never exist in one place and 404 in
 * another. Pure module: no React, no Firebase — safe to unit test.
 *
 * Sections mirror the product pillars:
 * - home: landing
 * - pass: Events & Access (ticketing, passbook, door)
 * - circle: Networking Circle + personal Bio/Me
 * - business: Business & Arrival engine (venues, promotions, cohorts)
 * - admin: platform console
 * - system: auth, settings, legal/static
 */

export type AppSectionId = "home" | "pass" | "discover" | "circle" | "business" | "admin" | "system";

export interface AppSection {
  id: AppSectionId;
  label: string;
  href: string;
  blurb: string;
}

export const APP_SECTIONS: AppSection[] = [
  { id: "home", label: "Home", href: "/", blurb: "Welcome to AirPal — life made easy." },
  { id: "pass", label: "Events & Access", href: "/pass", blurb: "Concerts, festivals, tickets, and door access." },
  { id: "discover", label: "Place & Community", href: "/places", blurb: "Venues to discover, organisers to follow." },
  { id: "circle", label: "Circle & Me", href: "/friends", blurb: "Friends, bios, calendar, and memories." },
  { id: "business", label: "Business & Arrival", href: "/business", blurb: "Venues, perks, arrivals, and belonging." },
  { id: "admin", label: "Admin", href: "/admin", blurb: "Platform console for AirPal stewards." },
  { id: "system", label: "System", href: "/settings", blurb: "Sign-in, settings, trust, and legal." },
];

/** A first-class route: rendered by its own page, never a redirect. */
export interface CanonicalRoute {
  pattern: string;
  section: AppSectionId;
  label: string;
}

/**
 * Every page in the unified app. Patterns use wouter `:param` syntax.
 * Keep sorted by section, then path, so dupes are obvious in review.
 */
export const CANONICAL_ROUTES: CanonicalRoute[] = [
  { pattern: "/", section: "home", label: "Home" },
  // Pass: Events & Access
  { pattern: "/pass", section: "pass", label: "Pass hub" },
  { pattern: "/pass/partners", section: "pass", label: "Partner directory" },
  { pattern: "/pass/partners/apply", section: "pass", label: "Partner application" },
  { pattern: "/pass/partners/:slug", section: "pass", label: "Partner detail" },
  { pattern: "/events", section: "pass", label: "Events list" },
  { pattern: "/events/new", section: "pass", label: "New event" },
  { pattern: "/e/:id", section: "pass", label: "Event detail" },
  { pattern: "/e/:id/guests", section: "pass", label: "Guestlist" },
  { pattern: "/e/:id/manage", section: "pass", label: "Manage event" },
  { pattern: "/event", section: "pass", label: "Organiser studio" },
  { pattern: "/event/manage", section: "pass", label: "Manage event (alias)" },
  { pattern: "/experience/:id", section: "pass", label: "Curated experience detail" },
  { pattern: "/ticket/:id", section: "pass", label: "Ticket pass" },
  { pattern: "/me/tickets", section: "pass", label: "Wallet" },
  { pattern: "/scan", section: "pass", label: "Door scanner" },
  { pattern: "/calendar", section: "pass", label: "Calendar" },
  // Discover: places & communities
  { pattern: "/places", section: "discover", label: "Place discovery" },
  { pattern: "/communities", section: "discover", label: "Community discovery" },
  // Circle & Me
  { pattern: "/circle", section: "circle", label: "Networking Circle" },
  { pattern: "/friends", section: "circle", label: "Friends" },
  { pattern: "/me", section: "circle", label: "Me dashboard" },
  { pattern: "/bio", section: "circle", label: "Me dashboard (alias)" },
  { pattern: "/@handle", section: "circle", label: "Public bio" },
  { pattern: "/bio/setup", section: "circle", label: "Bio setup" },
  { pattern: "/bio/edit", section: "circle", label: "Bio edit" },
  { pattern: "/bio/recover", section: "circle", label: "Handle recovery" },
  { pattern: "/bio/@:handle", section: "circle", label: "BioSite" },
  { pattern: "/me/memories", section: "circle", label: "Memory Wall" },
  { pattern: "/me/inbox", section: "circle", label: "Inbox" },
  // Business & Arrival
  { pattern: "/business", section: "business", label: "Business hub" },
  { pattern: "/business/partner", section: "business", label: "Partner dashboard" },
  { pattern: "/business/onboard", section: "business", label: "Business onboarding" },
  { pattern: "/business/setup", section: "business", label: "Business setup" },
  { pattern: "/business/promotions", section: "business", label: "Promotions list" },
  { pattern: "/business/promotions/new", section: "business", label: "New promotion" },
  { pattern: "/business/promotions/:id", section: "business", label: "Promotion detail (business)" },
  { pattern: "/claim", section: "business", label: "Claim venue" },
  { pattern: "/join", section: "business", label: "Arrival" },
  { pattern: "/join/:code", section: "business", label: "Arrival with code" },
  { pattern: "/arrival", section: "business", label: "Arrival (alias)" },
  { pattern: "/arrival/:code", section: "business", label: "Arrival with code (alias)" },
  { pattern: "/host", section: "business", label: "Host hub" },
  { pattern: "/host/pulse", section: "business", label: "Belonging report" },
  { pattern: "/pulse", section: "business", label: "Belonging reports" },
  { pattern: "/pulse/:token", section: "business", label: "Belonging report (shared)" },
  { pattern: "/deals", section: "business", label: "Member deals" },
  { pattern: "/deals/:id", section: "business", label: "Deal detail" },
  { pattern: "/giveaways", section: "business", label: "Giveaways" },
  { pattern: "/giveaways/:id", section: "business", label: "Giveaway detail" },
  { pattern: "/birthday-freebies", section: "business", label: "Birthday freebies" },
  { pattern: "/birthday-freebies/:region", section: "business", label: "Birthday freebies by region" },
  // Admin
  { pattern: "/admin", section: "admin", label: "Admin" },
  { pattern: "/admin/partners", section: "admin", label: "Partner applications" },
  { pattern: "/admin/search-analytics", section: "admin", label: "Search analytics" },
  { pattern: "/admin/promotions", section: "admin", label: "Admin promotions" },
  { pattern: "/admin/promotions/:id", section: "admin", label: "Admin promotion detail" },
  { pattern: "/admin/notifications", section: "admin", label: "Admin notifications" },
  // System
  { pattern: "/welcome", section: "system", label: "Welcome" },
  { pattern: "/onboarding", section: "system", label: "Onboarding" },
  { pattern: "/onboard", section: "system", label: "Onboarding (alias)" },
  { pattern: "/start", section: "system", label: "Sign-in" },
  { pattern: "/auth/action", section: "system", label: "Auth action" },
  { pattern: "/settings", section: "system", label: "Settings" },
  { pattern: "/about", section: "system", label: "About" },
  { pattern: "/trust", section: "system", label: "Trust" },
  { pattern: "/contact", section: "system", label: "Contact" },
  { pattern: "/help", section: "system", label: "Help" },
  { pattern: "/helpdesk", section: "system", label: "Help (alias)" },
  { pattern: "/privacy", section: "system", label: "Privacy" },
  { pattern: "/terms", section: "system", label: "Terms" },
  { pattern: "/cookies", section: "system", label: "Cookies" },
  { pattern: "/unsubscribe", section: "system", label: "Unsubscribe" },
  { pattern: "/alternatives/:slug", section: "system", label: "Alternatives" },
  { pattern: "/getAirPalApp", section: "system", label: "Get the app" },
];

/**
 * Legacy / alias URLs that redirect to a canonical route.
 * Static table — the router renders these, so renames stay in one place.
 * Param-preserving aliases (e.g. /promotions/:id) live in routes.tsx
 * because wouter needs a render function to forward params.
 */
export const STATIC_ALIASES: Array<{ from: string; to: string }> = [
  // Retired Discovery + Planning surfaces land on Home (pillar contract).
  { from: "/now", to: "/" },
  { from: "/explore", to: "/" },
  { from: "/explore/attractions", to: "/" },
  { from: "/discover", to: "/" },
  { from: "/discovery", to: "/" },
  { from: "/guide", to: "/" },
  { from: "/my-day", to: "/" },
  { from: "/search", to: "/" },
  { from: "/venues", to: "/" },
  { from: "/tour/:id", to: "/" },
  { from: "/concierge", to: "/" },
  { from: "/os", to: "/" },
  { from: "/plans", to: "/" },
  { from: "/plan", to: "/" },
  { from: "/plan/new", to: "/" },
  { from: "/plan/:id", to: "/" },
  { from: "/plan/:id/edit", to: "/" },
  { from: "/plan/:id/guests", to: "/" },
  { from: "/invite/:code", to: "/" },
  { from: "/p/:id", to: "/" },
  { from: "/q", to: "/" },
  { from: "/q/:a", to: "/" },
  { from: "/q/:city/:handle", to: "/" },
  // Retired legacy shells land on their pillar home.
  { from: "/c", to: "/events" },
  { from: "/c/:id", to: "/events" },
  { from: "/f", to: "/events" },
  { from: "/event-categories", to: "/events" },
  { from: "/stay", to: "/business" },
  { from: "/g", to: "/business" },
  { from: "/g/:id", to: "/business" },
  { from: "/stay/:id", to: "/business" },
  { from: "/partners", to: "/business" },
  { from: "/partner", to: "/business" },
  { from: "/listings", to: "/business" },
  { from: "/passbook", to: "/me/tickets" },
  { from: "/wallet", to: "/me/tickets" },
  { from: "/check-in-history", to: "/me/tickets" },
  { from: "/saved-experiences", to: "/me/tickets" },
  { from: "/w/:code", to: "/circle" },
  { from: "/pass/events", to: "/events" },
  { from: "/pass/deals", to: "/deals" },
  { from: "/pass/tickets", to: "/me/tickets" },
  { from: "/pass/scan", to: "/scan" },
  { from: "/qr-scanner", to: "/scan" },
  { from: "/notifications", to: "/me/inbox" },
  { from: "/inbox", to: "/me/inbox" },

  { from: "/account-sync", to: "/calendar" },
  { from: "/search/analytics", to: "/admin/search-analytics" },
  { from: "/offers", to: "/deals" },
  { from: "/promotions", to: "/deals" },
  { from: "/create", to: "/event" },
  { from: "/event/new", to: "/event" },
  { from: "/event-analytics", to: "/event" },
  { from: "/f/new", to: "/event" },
  { from: "/host/helpdesk", to: "/help" },
  { from: "/business/helpdesk", to: "/business" },
  { from: "/support", to: "/help" },
  { from: "/assist", to: "/help" },
  { from: "/founders", to: "/about" },
  { from: "/legal", to: "/privacy" },
  { from: "/reset", to: "/start?tab=reset" },
  { from: "/auth", to: "/start?tab=signin" },
  { from: "/signin", to: "/start?tab=signin" },
  { from: "/getAirPal", to: "/getAirPalApp" },
  // Retired deep-link targets still emitted by promotion + birthday data
  // land on the closest live pillar surface instead of a 404.
  { from: "/mate", to: "/friends" },
  { from: "/experiences", to: "/events" },
  { from: "/fashion", to: "/deals" },
];

/** Match a concrete path against a `:param` pattern (exact-segment). */
export function patternMatches(pattern: string, path: string): boolean {
  const pSegs = pattern.split("/");
  const pathSegs = path.split("?")[0]?.split("/") ?? [];
  if (pSegs.length !== pathSegs.length) return false;
  return pSegs.every(
    (seg, i) =>
      seg.startsWith(":") ||
      // @-scoped params (e.g. /bio/@:handle) need the literal @ prefix,
      // exactly like wouter matches them in the router.
      (seg.startsWith("@:") && (pathSegs[i]?.startsWith("@") ?? false)) ||
      seg === pathSegs[i],
  );
}

/** Find the canonical route for a concrete path, if it is first-class. */
export function canonicalRouteFor(path: string): CanonicalRoute | undefined {
  return CANONICAL_ROUTES.find((r) => patternMatches(r.pattern, path));
}

/** All canonical patterns for a section, in registry order. */
export function routesForSection(section: AppSectionId): CanonicalRoute[] {
  return CANONICAL_ROUTES.filter((r) => r.section === section);
}
