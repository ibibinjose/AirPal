import { Compass, Users, CalendarDays, UserRound, type LucideIcon } from "lucide-react";

export type PillarId = "places" | "communities" | "friends" | "me";

export interface PillarSubLink {
  href: string;
  label: string;
  match?: (path: string) => boolean;
}

export interface PillarItem {
  id: PillarId;
  label: string;
  href: string;
  icon: LucideIcon;
  kicker: string;
  subLabel: string;
  match: (path: string) => boolean;
  subLinks: PillarSubLink[];
}

export const PILLARS: PillarItem[] = [
  {
    id: "places",
    label: "Places",
    href: "/explore",
    icon: Compass,
    kicker: "Explore & Discover",
    subLabel: "Precincts, Guides & What's Open Now",
    match: (p: string) =>
      p === "/places" ||
      p.startsWith("/explore") ||
      p.startsWith("/guide") ||
      p.startsWith("/now") ||
      p.startsWith("/deals") ||
      p.startsWith("/offers") ||
      p.startsWith("/promotions") ||
      p.startsWith("/tour/") ||
      p.startsWith("/p/"),
    subLinks: [
      { href: "/explore", label: "Explore" },
      { href: "/now", label: "Open Now" },
      { href: "/guide", label: "Guides" },
      { href: "/deals", label: "Perks & Deals" },
    ],
  },
  {
    id: "communities",
    label: "Communities",
    href: "/events",
    icon: Users,
    kicker: "Social & Belonging",
    subLabel: "Live Concerts, Pass & Networking Circle",
    match: (p: string) =>
      p === "/communities" ||
      p.startsWith("/events") ||
      p.startsWith("/pass") ||
      p.startsWith("/circle") ||
      p.startsWith("/event") ||
      p.startsWith("/e/"),
    subLinks: [
      { href: "/events", label: "Events" },
      { href: "/pass", label: "AirPal Pass" },
      { href: "/circle", label: "Circle" },
      { href: "/event", label: "Host" },
    ],
  },
  {
    id: "friends",
    label: "Friends",
    href: "/plan",
    icon: CalendarDays,
    kicker: "Coordinate & Meet Up",
    subLabel: "Hangouts, RSVPs & Shared Calendar",
    match: (p: string) =>
      p === "/friends" || p.startsWith("/plan") || p.startsWith("/invite") || p.startsWith("/calendar"),
    subLinks: [
      { href: "/plan", label: "My Plans" },
      { href: "/plan/new", label: "New Hangout" },
      { href: "/calendar", label: "Calendar" },
    ],
  },
  {
    id: "me",
    label: "Me",
    href: "/me",
    icon: UserRound,
    kicker: "Identity & Wallet",
    subLabel: "Passbook, Digital Bio & Preferences",
    match: (p: string) =>
      p.startsWith("/me") ||
      p.startsWith("/bio") ||
      p.startsWith("/@") ||
      p.startsWith("/settings") ||
      p.startsWith("/ticket"),
    subLinks: [
      { href: "/me", label: "Dashboard" },
      { href: "/me/tickets", label: "My Tickets" },
      { href: "/bio", label: "Digital Bio" },
      { href: "/settings", label: "Settings" },
    ],
  },
];

export function getActivePillar(path: string): PillarItem | undefined {
  return PILLARS.find((pillar) => pillar.match(path));
}
