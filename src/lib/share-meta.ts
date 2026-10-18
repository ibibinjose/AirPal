import { toPublicUrl } from "./public-origin";

const DEFAULT_TITLE = "AirPal.Me · Life Made Easy.";
const DEFAULT_DESCRIPTION = "Life Made Easy. People, places, things and experiences — made easier.";

/** Static per-route titles so every public page shares well. Dynamic detail
 * pages (events, bios) override these with their own setShareMeta. */
const ROUTE_META: Array<{ match: RegExp; title: string; description: string }> = [
  {
    match: /^\/pass(\/|$)/,
    title: "AirPal Pass · Events, Deals & Experiences",
    description: "Discover what's happening. Get access. Save money. Your pass to events, deals and experiences.",
  },
  {
    match: /^\/circle(\/|$)/,
    title: "Networking Circle · AirPal.Me",
    description: "Check in, see who is around, and hang out with your trusted inner circle.",
  },
  {
    match: /^\/events(\/|$)/,
    title: "Events · AirPal.Me",
    description: "Every upcoming event in one feed — at places, in the community, or from friends.",
  },
  {
    match: /^\/calendar(\/|$)/,
    title: "Event calendar · AirPal.Me",
    description: "What's on near you — month, week and day views of events and bookings.",
  },
  {
    match: /^\/event(\/|$)/,
    title: "Host an event · AirPal.Me",
    description: "List free or ticketed events on AirPal.Me — stalls, festivals, guest lists and door check-in.",
  },
  {
    match: /^\/places(\/|$)/,
    title: "Curated Places & Venues · AirPal.Me",
    description: "Explore curated venues, hospitality spots, and local destinations near you.",
  },
  {
    match: /^\/communities(\/|$)/,
    title: "Organizer Communities · AirPal.Me",
    description: "Discover organizer communities, follow cultural groups, and join local circles.",
  },
  {
    match: /^\/friends(\/|$)/,
    title: "Friends & Network · AirPal.Me",
    description: "Connect with friends, mutuals, and co-attendees on AirPal.",
  },
  {
    match: /^\/$/,
    title: "AirPal.Me · Life Made Easy.",
    description: "Life Made Easy. People, places, things and experiences — made easier.",
  },
  {
    match: /^\/helpdesk(\/|$)/,
    title: "Help Desk Operations · AirPal.Me",
    description: "Live Help Desk Console for event hosts, venues, and merchants on AirPal.Me.",
  },
  {
    match: /^\/help(\/|$)/,
    title: "Help center · AirPal.Me",
    description: "Guides to tickets, safety, and your account on AirPal.Me.",
  },
  {
    match: /^\/business(\/|$)/,
    title: "AirPal for Business",
    description: "List your place, publish experiences and offers, take bookings on AirPal.Me.",
  },
  {
    match: /^\/partners(\/|$)/,
    title: "Partner with AirPal.Me",
    description: "Add your place or venue to AirPal.Me and reach guests already nearby.",
  },
  {
    match: /^\/deals(\/|$)/,
    title: "Deals · AirPal.Me",
    description: "Local deals and offers from businesses on AirPal.Me — claim them in the app.",
  },
  {
    match: /^\/giveaways(\/|$)/,
    title: "Giveaways & Perks · AirPal.Me",
    description: "Exclusive member giveaways and rewards from local partners on AirPal.",
  },
  {
    match: /^\/birthday-freebies(\/|$)/,
    title: "Birthday Freebies & Treats · AirPal.Me",
    description: "Curated local birthday treats, dining perks, and free gifts on AirPal.",
  },
  {
    match: /^\/scan(\/|$)/,
    title: "Ticket Scanner & Check-in · AirPal.Me",
    description: "Fast door check-in scanner for event organizers and staff to validate tickets and passes.",
  },
  {
    match: /^\/trust(\/|$)/,
    title: "Trust · AirPal.Me",
    description: "Is AirPal.Me legit? Company facts, who runs it, and what it isn't.",
  },
  {
    match: /^\/alternatives\/meetup(\/|$)/,
    title: "Meetup alternative for casual catch-ups · AirPal.Me",
    description: "Blend catch-ups with local discovery: meet friends, and see what's on nearby.",
  },
  {
    match: /^\/alternatives\/eventbrite(\/|$)/,
    title: "Eventbrite alternative · AirPal.Me",
    description: "List events and let groups coordinate around them: ticketing, check-in, payouts.",
  },
  {
    match: /^\/about(\/|$)/,
    title: "About · AirPal.Me",
    description: "One trusted marketplace for people, places, things and experiences.",
  },
  { match: /^\/contact(\/|$)/, title: "Contact · AirPal.Me", description: "Get in touch with the AirPal.Me team." },
  {
    match: /^\/assist(\/|$)/,
    title: "Help & support · AirPal.Me",
    description: "Contact AirPal.Me support: help guides, safety, and how to reach the Sydney team.",
  },
  {
    match: /^\/unsubscribe(\/|$)/,
    title: "Unsubscribe · AirPal.Me",
    description: "Leave the AirPal Guestlist in one tap.",
  },
  {
    match: /^\/(getAirPalApp|getAirPal)(\/|$)/,
    title: "Get the AirPal app",
    description: "Take AirPal.Me anywhere — get the app for iOS and Android.",
  },
];

/** Detail pages own their tags (child effects run before AppShell's). */
const DYNAMIC_OWNED = [/^\/@/, /^\/e\/[^/]/, /^\/stay\/@/];

/** Pure route → static meta lookup. Null when a dynamic page owns the tags. */
export function routeMetaFor(pathname: string): { title: string; description: string; path: string } | null {
  const path = pathname.split("?")[0] || "/";
  if (DYNAMIC_OWNED.some((r) => r.test(path))) return null;
  const hit = ROUTE_META.find((r) => r.match.test(path));
  return {
    title: hit?.title || DEFAULT_TITLE,
    description: hit?.description || DEFAULT_DESCRIPTION,
    path,
  };
}

/** Apply the static route title/description/canonical for a pathname. */
export function applyRouteMeta(pathname: string) {
  if (typeof document === "undefined") return;
  const meta = routeMetaFor(pathname);
  if (!meta) return;
  setShareMeta({ ...meta, url: toPublicUrl(meta.path) });
}

export function setShareMeta(input: {
  title: string;
  description: string;
  image?: string;
  url?: string;
  type?: "website" | "profile" | "event" | "article";
  imageWidth?: number;
  imageHeight?: number;
  imageAlt?: string;
  jsonLd?: Record<string, unknown>;
}) {
  if (typeof document === "undefined") return;
  document.title = input.title;

  const set = (key: string, value: string, prop = "property") => {
    let tag = document.head.querySelector(`meta[${prop}="${key}"]`);
    if (!tag) {
      tag = document.createElement("meta");
      tag.setAttribute(prop, key);
      document.head.appendChild(tag);
    }
    tag.setAttribute("content", value);
  };

  set("og:site_name", "AirPal.Me");
  set("og:locale", "en_AU");
  set("og:type", input.type || "website");
  set("og:title", input.title);
  set("og:description", input.description);
  set("description", input.description, "name");

  set("twitter:card", "summary_large_image", "name");
  set("twitter:site", "@airpalme", "name");
  set("twitter:creator", "@airpalme", "name");
  set("twitter:title", input.title, "name");
  set("twitter:description", input.description, "name");

  if (input.image) {
    const rawImage = input.image.startsWith("idb:") ? undefined : input.image;
    if (rawImage) {
      const image = rawImage.startsWith("http") ? rawImage : toPublicUrl(rawImage);
      set("og:image", image);
      set("og:image:secure_url", image);
      set("og:image:width", String(input.imageWidth || 1200));
      set("og:image:height", String(input.imageHeight || 630));
      set("og:image:alt", input.imageAlt || input.title);
      set("twitter:image", image, "name");
      set("twitter:image:alt", input.imageAlt || input.title, "name");
    }
  }

  if (input.url) {
    const canonicalUrl = toPublicUrl(input.url);
    set("og:url", canonicalUrl);
    let canonical = document.head.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", canonicalUrl);
  }

  if (input.jsonLd) {
    let script = document.head.querySelector('script[id="dynamic-page-jsonld"]');
    if (!script) {
      script = document.createElement("script");
      script.setAttribute("type", "application/ld+json");
      script.setAttribute("id", "dynamic-page-jsonld");
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(input.jsonLd);
  }
}
