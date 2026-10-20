import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LikeButton } from "./SocialButtons";

let liked = false;

vi.mock("@/contexts/SocialContext", () => ({
  useSocial: () => ({
    isLiked: () => liked,
    toggleLike: vi.fn(),
    isFollowing: () => false,
    toggleFollow: vi.fn(),
  }),
}));

describe("LikeButton", () => {
  it("renders a Lucide heart, never an emoji", () => {
    liked = false;
    const markup = renderToStaticMarkup(createElement(LikeButton, { handle: "maya", name: "Maya" }));
    expect(markup).toContain("<svg");
    expect(markup).not.toContain("❤️");
    expect(markup).toContain("Like");
  });

  it("fills the heart only when liked", () => {
    liked = false;
    const off = renderToStaticMarkup(createElement(LikeButton, { handle: "maya" }));
    expect(off).not.toContain("fill-current");
    liked = true;
    const on = renderToStaticMarkup(createElement(LikeButton, { handle: "maya" }));
    expect(on).toContain("fill-current");
    expect(on).toContain("Liked");
  });
});
