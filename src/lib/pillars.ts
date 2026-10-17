import { Users, UserRound, type LucideIcon } from "lucide-react";

export type PillarId = "communities" | "me";

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
    id: "communities",
    label: "Explore",
    href: "/events",
    icon: Users,
    kicker: "Social & Belonging",
    subLabel: "Live Concerts, Pass & Networking Circle",
    match: (p: string) =>
      p.startsWith("/events") ||
      p.startsWith("/pass") ||
      p.startsWith("/places") ||
      p.startsWith("/communities") ||
      p.startsWith("/friends") ||
      p.startsWith("/circle") ||
      p.startsWith("/event") ||
      p.startsWith("/e/") ||
      p.startsWith("/join") ||
      p.startsWith("/arrival") ||
      p.startsWith("/host") ||
      p.startsWith("/pulse") ||
      p.startsWith("/deals") ||
      p.startsWith("/giveaways") ||
      p.startsWith("/birthday-freebies") ||
      p.startsWith("/business") ||
      p.startsWith("/claim") ||
      p.startsWith("/calendar"),
    subLinks: [
      { href: "/events", label: "Events" },
      { href: "/pass", label: "AirPal Pass" },
      { href: "/places", label: "Places" },
      { href: "/communities", label: "Communities" },
      { href: "/friends", label: "Friends" },
      { href: "/circle", label: "Circle" },
      { href: "/deals", label: "Deals" },
      { href: "/event", label: "Host" },
      { href: "/business", label: "Business" },
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
