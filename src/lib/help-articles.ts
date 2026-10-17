/** Static Knowledge Hub catalog for /help. Curated in-app content — no CMS.
 * Every href must be a registered internal route (see help-articles.test.ts).
 * Keep steps short, factual, and matched to shipped behavior. */

export type HelpCategoryId = "tickets" | "safety" | "account" | "arrival";

export interface HelpCategory {
  id: HelpCategoryId;
  label: string;
  blurb: string;
}

export interface HelpArticleLink {
  label: string;
  href: string;
}

export interface HelpArticle {
  id: string;
  title: string;
  category: HelpCategoryId;
  summary: string;
  steps: string[];
  links: HelpArticleLink[];
}

export const HELP_CATEGORIES: HelpCategory[] = [
  { id: "tickets", label: "Tickets & payments", blurb: "Pay, balances, cancellations, refunds." },
  { id: "safety", label: "Trust & safety", blurb: "Meet safely, verify, report, block." },
  { id: "account", label: "Account", blurb: "Sign in, profile, bio, settings." },
  { id: "arrival", label: "New in town", blurb: "First-week guide: events, circle, perks." },
];

export const HELP_ARTICLES: HelpArticle[] = [
  {
    id: "tickets-payments",
    title: "Tickets, bookings, and payments",
    category: "tickets",
    summary: "Pay for experiences securely. Free bookings need no payment at all.",
    steps: [
      "Book from an event or experience — free bookings confirm instantly.",
      "Paid bookings go through secure card checkout; AirPal never sees raw card numbers.",
      "Find every booking as a pass under Tickets in your account.",
      "Cancel unpaid bookings yourself; paid refunds go back to the original card.",
      "The host's share stays held until they mark the booking delivered.",
    ],
    links: [
      { label: "Your tickets", href: "/me/tickets" },
      { label: "Events", href: "/events" },
    ],
  },
  {
    id: "meet-safely",
    title: "Meet safely",
    category: "safety",
    summary: "Simple habits for meeting people through AirPal. AirPal never guarantees personal safety.",
    steps: [
      "Meet in a public place for the first few times.",
      "Tell someone where you're going and when you expect to be back.",
      "Keep plans and payments inside AirPal until you've met and trust is earned.",
      "Check verification badges on profiles before you commit.",
      "Trust your instincts — you can always cancel and leave.",
    ],
    links: [
      { label: "Inbox", href: "/me/inbox" },
      { label: "Contact us", href: "/contact" },
    ],
  },
  {
    id: "report-block",
    title: "Report someone",
    category: "safety",
    summary: "Tell us what happened — a human reviews every report.",
    steps: [
      "Open Contact us and include the person's @handle if you know it.",
      "Say where it happened (event, bio, booking) and what happened.",
      "A human reviews every case and acts on the account if needed.",
      "For anything urgent or unsafe, choose the Safety & Reports topic.",
      "Never share verification documents, passwords, or card details with anyone.",
    ],
    links: [{ label: "Contact us", href: "/contact" }],
  },
  {
    id: "account-bio",
    title: "Account, profile, and bio",
    category: "account",
    summary: "One AirPal account everywhere. You must be 18 or older to hold one.",
    steps: [
      "Sign in with email, phone, Google, or Apple — same account on web and app.",
      "Claim your personal @handle; it stays a person, never a business.",
      "Add a photo, bio, interests, and languages so friends know you.",
      "Businesses run on the same login as a separate profile.",
      "Manage privacy, notifications, and sign-in methods in Settings.",
    ],
    links: [
      { label: "Your account", href: "/me" },
      { label: "Settings", href: "/settings" },
      { label: "Set up your bio", href: "/bio/setup" },
    ],
  },
  {
    id: "resident-arrival",
    title: "New in town? Start here",
    category: "arrival",
    summary: "Your first week on AirPal: find events, save tickets, meet your circle.",
    steps: [
      "Open What's on to see events, gigs and experiences near you.",
      "Book free in seconds or check out securely for paid tickets.",
      "Find every booking as a scannable pass under Tickets in your account.",
      "Check in with your networking circle to see who is around.",
      "New to the neighbourhood? Claim local merchant perks on Deals.",
    ],
    links: [
      { label: "What's on", href: "/events" },
      { label: "Inner circle", href: "/circle" },
      { label: "Local deals", href: "/deals" },
    ],
  },
];

export function getHelpArticle(id: string): HelpArticle | undefined {
  return HELP_ARTICLES.find((a) => a.id === id);
}

/** Deep link support: /help?a=report-block opens that article when valid. */
export function helpArticleIdFromSearch(search: string): string | null {
  try {
    const id = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search).get("a");
    return id && getHelpArticle(id) ? id : null;
  } catch {
    return null;
  }
}
