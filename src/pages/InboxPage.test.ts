import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NotificationRows } from "./InboxPage";
import type { PromotionNotification } from "@shared/promotions";

const base = {
  uid: "u1",
  kind: "ticket_confirmed",
  href: "/me/tickets",
  at: "2026-10-28T10:00:00+11:00",
} as const;

const unreadNote = {
  ...base,
  id: "n1",
  title: "Tickets confirmed",
  body: "Two spots for Friday night.",
  read: false,
} as PromotionNotification;

const readNote = {
  ...base,
  id: "n2",
  title: "Welcome to AirPal",
  body: "Your universal account is ready.",
  read: true,
} as PromotionNotification;

const noop = () => {};

describe("NotificationRows", () => {
  it("renders titles, bodies, and per-row actions", () => {
    const markup = renderToStaticMarkup(
      createElement(NotificationRows, {
        rows: [unreadNote, readNote],
        onOpen: noop,
        onToggleRead: noop,
        onDelete: noop,
      }),
    );
    expect(markup).toContain("Tickets confirmed");
    expect(markup).toContain("Two spots for Friday night.");
    expect(markup).toContain('aria-label="Mark as read"');
    expect(markup).toContain('aria-label="Mark as unread"');
    expect(markup).toContain('aria-label="Dismiss notification"');
  });

  it("marks unread rows bold without relying on color alone", () => {
    const markup = renderToStaticMarkup(
      createElement(NotificationRows, {
        rows: [unreadNote],
        onOpen: noop,
        onToggleRead: noop,
        onDelete: noop,
      }),
    );
    expect(markup).toContain("font-bold");
    // Unread dot has an accessible-adjacent state cue via the bold title.
    expect(markup).toContain("bg-brand");
  });
});
