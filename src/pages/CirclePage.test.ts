import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CirclePage } from "./CirclePage";

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
    profiles: [],
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
}));

vi.mock("@/components/circle/HereCheckIn", () => ({
  HereCheckIn: () => createElement("div", { "data-testid": "here-check-in" }, "Here Check-in"),
}));

describe("CirclePage", () => {
  it("renders the networking circle header and invite button", () => {
    const markup = renderToStaticMarkup(createElement(CirclePage));
    expect(markup).toContain("My Circle");
    expect(markup).toContain("Networking Circle");
    expect(markup).toContain("Invite to Circle");
  });

  it("renders filter tabs for Places, Communities, Friends, and All", () => {
    const markup = renderToStaticMarkup(createElement(CirclePage));
    expect(markup).toContain(">All<");
    expect(markup).toContain(">Friends<");
    expect(markup).toContain(">Communities<");
    expect(markup).toContain(">Places<");
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

  it("displays met-in-person friends and no seed cohort community", () => {
    const markup = renderToStaticMarkup(createElement(CirclePage));
    expect(markup).toContain("Maya Lin");
    expect(markup).toContain("Met at The Rocks Market");
    expect(markup).not.toContain("Scape Darling Square");
    expect(markup).not.toContain("Resident Cohort");
  });
});
