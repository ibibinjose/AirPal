import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NotificationRow } from "./NotificationBell";

vi.mock("wouter", () => ({
  useLocation: () => ["/", vi.fn()],
  Link: ({ children, href, className, onClick }: Record<string, unknown>) =>
    createElement("a", { href, className, onClick }, children),
}));

const note = {
  id: "n1",
  uid: "u1",
  kind: "announcement",
  title: "AirPal Live is on",
  body: "Doors open at six in Sydney.",
  promotionId: "p1",
  href: "/events",
  read: false,
  at: "2026-10-26T10:00:00+11:00",
} as const;

describe("NotificationRow", () => {
  it("renders the note link with title and body", () => {
    const markup = renderToStaticMarkup(
      createElement(NotificationRow, { note: { ...note }, onOpen: vi.fn(), onDismiss: vi.fn() }),
    );
    expect(markup).toContain('href="/events"');
    expect(markup).toContain("AirPal Live is on");
    expect(markup).toContain("Doors open at six in Sydney.");
  });

  it("keeps dismiss as a sibling of the link, never nested inside it", () => {
    const markup = renderToStaticMarkup(
      createElement(NotificationRow, { note: { ...note }, onOpen: vi.fn(), onDismiss: vi.fn() }),
    );
    const anchorClose = markup.indexOf("</a>");
    const buttonOpen = markup.indexOf("<button");
    expect(anchorClose).toBeGreaterThan(-1);
    expect(buttonOpen).toBeGreaterThan(anchorClose);
    expect(markup).toContain('aria-label="Dismiss notification"');
  });

  it("gives dismiss a full 44px tap target", () => {
    const markup = renderToStaticMarkup(
      createElement(NotificationRow, { note: { ...note }, onOpen: vi.fn(), onDismiss: vi.fn() }),
    );
    expect(markup).toContain("h-11 w-11");
  });
});
