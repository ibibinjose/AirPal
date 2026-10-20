/**
 * Single source for the /events page's structured data.
 *
 * The CollectionPage block describes the events directory itself (never
 * individual events, whose lineup changes daily). The page renders it at
 * runtime and the prerender step embeds the same block in static HTML for
 * non-JS crawlers (see scripts/prerender-routes.json, enforced by
 * prerender.test.ts).
 */

const EVENTS_COLLECTION_JSON_LD: Record<string, unknown> = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Events · AirPal.Me",
  description:
    "Every upcoming event in one feed — gigs and dinners at places, community markets and expos, and events from friends.",
  url: "https://airpal.me/events",
  isPartOf: {
    "@type": "WebSite",
    name: "AirPal.Me",
    url: "https://airpal.me/",
  },
  about: {
    "@type": "Thing",
    name: "Local events, concerts, cultural festivals, gigs and nightlife in Sydney, Australia",
  },
};

/** CollectionPage block, in render order. */
export function buildEventsJsonLd(): Record<string, unknown>[] {
  return [EVENTS_COLLECTION_JSON_LD];
}
