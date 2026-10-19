import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CirclePage, sortCircleContacts, type CircleContact } from "./CirclePage";

vi.mock("wouter", () => ({
  useLocation: () => ["/circle", vi.fn()],
  Link: ({
    children,
    href,
    className,
    "aria-label": ariaLabel,
  }: {
    children: React.ReactNode;
    href: string;
    className?: string;
    "aria-label"?: string;
  }) => createElement("a", { href, className, "aria-label": ariaLabel }, children),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { uid: "u123", email: "guest@example.com", displayName: "Guest User" },
  }),
}));

vi.mock("@/contexts/BioContext", () => ({
  useBio: () => ({
    mine: {
      id: "bio1",
      handle: "guest",
      name: "Guest User",
      kind: "person",
      avatar: "",
      city: "Sydney",
    },
    profiles: [
      {
        id: "bio-bibinjose",
        handle: "bibinjose",
        name: "Bibin Jose",
        kind: "person",
        avatar: "",
        city: "Sydney",
      },
    ],
  }),
}));

vi.mock("@/contexts/EventsContext", () => ({
  useEvents: () => ({
    calendarEvents: [],
  }),
}));

vi.mock("@/contexts/SocialContext", () => ({
  useSocial: () => ({
    followedHandles: new Set<string>(),
    followerHandles: new Set<string>(["bibinjose"]),
    likedHandles: new Set<string>(),
    likedByHandles: new Set<string>(),
    isFollowing: (h: string) => h === "theglenmore",
    isLiked: () => false,
    toggleFollow: vi.fn(),
    toggleLike: vi.fn(),
  }),
}));

vi.mock("@/lib/people", () => ({
  listPeople: () => [
    {
      id: "p1",
      handle: "maya",
      name: "Maya Lin",
      whereMet: "The Rocks Market",
      metAt: "2026-10-10",
    },
  ],
  upsertPerson: vi.fn(),
  openVCardContact: vi.fn(),
  saveBioContact: vi.fn(),
}));

vi.mock("@/components/circle/HereCheckIn", () => ({
  HereCheckIn: () => createElement("div", { "data-testid": "here-check-in" }, "Here Check-in"),
}));

describe("CirclePage", () => {
  it("renders the networking circle header, QR pass, Log Met IRL, and invite button", () => {
    const markup = renderToStaticMarkup(createElement(CirclePage));
    expect(markup).toContain("My Circle");
    expect(markup).toContain("Networking Circle");
    expect(markup).toContain("Log Met IRL");
    expect(markup).toContain("QR Pass");
    expect(markup).toContain("Invite to Circle");
  });

  it("renders filter tabs for Places, Communities, Friends, and All", () => {
    const markup = renderToStaticMarkup(createElement(CirclePage));
    expect(markup).toContain(">All<");
    expect(markup).toContain(">Friends<");
    expect(markup).toContain(">Communities<");
    expect(markup).toContain(">Places<");
  });

  it("renders relationship sub-filter pills for Follows you, Met IRL, and city", () => {
    const markup = renderToStaticMarkup(createElement(CirclePage));
    expect(markup).toContain("All relationships");
    expect(markup).toContain("Follows you");
    expect(markup).toContain("Met IRL");
    expect(markup).toContain("In Sydney");
  });

  it("renders contact-list view with search input", () => {
    const markup = renderToStaticMarkup(createElement(CirclePage));
    expect(markup).toContain('placeholder="Search by name, @handle, community, or precinct..."');
  });

  it("shows Follow Back for a real incoming follower Bibin Jose", () => {
    const markup = renderToStaticMarkup(createElement(CirclePage));
    expect(markup).toContain("Bibin Jose");
    expect(markup).toContain("@bibinjose");
    expect(markup).toContain("Follows you");
    expect(markup).toContain("Follow Back");
  });

  it("shows only real relationship info, never fabricated in-common counts", () => {
    const markup = renderToStaticMarkup(createElement(CirclePage));
    expect(markup).toContain("Personal Friend");
    expect(markup).toContain("Met at The Rocks Market");
    expect(markup).not.toContain("in common");
  });

  it("displays met-in-person friends with vCard save action and no seed cohort community", () => {
    const markup = renderToStaticMarkup(createElement(CirclePage));
    expect(markup).toContain("Maya Lin");
    expect(markup).toContain("Met at The Rocks Market");
    expect(markup).toContain('aria-label="Save contact card for Maya Lin"');
    expect(markup).not.toContain("Scape Darling Square");
    expect(markup).not.toContain("Resident Cohort");
  });

  it("prioritizes mutuals, incoming followers, and met friends in sortCircleContacts", () => {
    const base: Omit<CircleContact, "id" | "handle" | "name" | "isFollowing" | "isFollower" | "isMutual" | "isMet"> = {
      category: "friends",
      categoryLabel: "Friend",
      city: "Sydney",
    };
    const contacts: CircleContact[] = [
      {
        ...base,
        id: "4",
        handle: "zoe",
        name: "Zoe",
        isFollowing: true,
        isFollower: false,
        isMutual: false,
        isMet: false,
      },
      {
        ...base,
        id: "2",
        handle: "bibin",
        name: "Bibin",
        isFollowing: false,
        isFollower: true,
        isMutual: false,
        isMet: false,
      },
      {
        ...base,
        id: "3",
        handle: "maya",
        name: "Maya",
        isFollowing: false,
        isFollower: false,
        isMutual: false,
        isMet: true,
      },
      {
        ...base,
        id: "1",
        handle: "alex",
        name: "Alex",
        isFollowing: true,
        isFollower: true,
        isMutual: true,
        isMet: false,
      },
    ];
    const sorted = sortCircleContacts(contacts, "Sydney");
    expect(sorted.map((c) => c.handle)).toEqual(["alex", "bibin", "maya", "zoe"]);
  });
});
