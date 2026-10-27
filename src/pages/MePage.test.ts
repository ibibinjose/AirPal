import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MePage } from "./MePage";

vi.mock("wouter", () => ({
  useLocation: () => ["/me", vi.fn()],
  Link: ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) =>
    createElement("a", { href, className }, children),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { uid: "u123", email: "test@example.com", displayName: "Test User", emailVerified: true },
    logout: vi.fn(),
    sendVerificationEmail: vi.fn(),
    isHost: false,
  }),
}));

vi.mock("@/contexts/BioContext", () => ({
  useBio: () => ({
    mine: {
      id: "bio1",
      handle: "testmate",
      name: "Test User",
      kind: "person",
      avatar: "",
      city: "Sydney",
    },
    business: undefined,
    biosReady: true,
    updateProfile: vi.fn(),
  }),
}));

vi.mock("@/contexts/EventsContext", () => ({
  useEvents: () => ({
    myEvent: undefined,
    calendarEvents: [
      {
        id: "plan-1",
        title: "Morning Run",
        description: "",
        startsAt: "2026-10-10T07:00:00",
        endsAt: "2026-10-10T08:00:00",
        date: "2026-10-10",
        timeLabel: "07:00",
        city: "Sydney",
        venue: "Park",
        category: "food",
        categoryLabel: "Food",
        source: "user",
        isLocal: true,
        isGoing: true,
        isInterested: false,
        isLiked: false,
        isRescheduled: false,
      },
    ],
    savedEvents: [],
    upsertEvent: vi.fn(),
    setEventStatus: vi.fn(),
  }),
}));

vi.mock("@/contexts/LocalNowContext", () => ({
  useLocalNow: () => ({
    today: "2026-10-10",
    day: "Saturday",
    time: "14:00",
    city: "Sydney",
    weather: { temp: 22, code: 0, isDay: true },
  }),
}));

vi.mock("@/hooks/useMyBookings", () => ({
  useMyBookings: () => ({
    bookings: [
      {
        id: "bk-1",
        title: "Sydney Opera Live Concert",
        date: "2026-10-10",
        time: "19:00",
        suburb: "Circular Quay",
        spots: 2,
        priceCents: 5000,
        status: "confirmed",
      },
    ],
    upcomingBookings: [
      {
        id: "bk-1",
        title: "Sydney Opera Live Concert",
        date: "2026-10-10",
        time: "19:00",
        suburb: "Circular Quay",
        spots: 2,
        priceCents: 5000,
        status: "confirmed",
      },
    ],
    pastBookings: [],
    loading: false,
    refresh: vi.fn(),
  }),
}));

vi.mock("@/lib/catchup", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/catchup")>();
  const testItem = {
    id: "cup-1",
    requesterName: "Sarah M",
    requesterHandle: "sarah",
    type: "catchup",
    date: "2026-10-10",
    time: "10:30",
    venue: "Surry Hills Cafe",
    status: "accepted",
    meetingLink: "https://meet.google.com/abc",
  };
  const reminderItem = {
    id: "cup-rem-1",
    targetHandle: "bibinjose",
    requesterUid: "u123",
    requesterName: "Bibin Jose",
    type: "catchup",
    venue: "Sydney",
    status: "pending",
    isReminderOnly: true,
    createdAt: "2026-10-09T00:00:00+10:00",
  };
  return {
    ...actual,
    listCatchUps: () => [testItem, reminderItem],
    subscribeCatchUpsForOwner: (_uid: string, cb: (items: unknown[]) => void) => {
      cb([testItem]);
      return () => undefined;
    },
    subscribeMyCatchUps: (_uid: string, cb: (items: unknown[]) => void) => {
      cb([reminderItem]);
      return () => undefined;
    },
    updateCatchUpStatus: vi.fn(),
  };
});

describe("MePage", () => {
  it("renders the Overview dashboard on all without stacking full sections", () => {
    const markup = renderToStaticMarkup(createElement(MePage, { defaultTab: "all" }));

    // Identity and handle
    expect(markup).toContain("Test User");
    expect(markup).toContain("@testmate");

    expect(markup).toContain("neu-inset");
    expect(markup).toContain("neu-section");
    expect(markup).toContain("Jump to section");

    // Dashboard order: glance, coming up, pass teaser
    expect(markup).toContain("Today at a glance");
    expect(markup).toContain("Coming up");
    expect(markup).toContain("Your Pass");
    expect(markup).toContain("Open Bio &amp; QR Pass");

    // Condensed glance items from every source with kind chips
    expect(markup).toContain("Sarah M");
    expect(markup).toContain("Morning Run");
    expect(markup).toContain("Sydney Opera Live Concert");
    expect(markup).toContain("My plan");

    // Synced data means no loading placeholders
    expect(markup).not.toContain("Checking your day");
    expect(markup).not.toContain("Loading your agenda");

    // Full sections stay in their own tabs
    expect(markup).not.toContain("Today&#x27;s Agenda");
    expect(markup).not.toContain("Appointments &amp; Catch-ups");
    expect(markup).not.toContain("AirPal Pass · Digital Wallet");
    expect(markup).not.toContain("My Digital Bio Pass");
    expect(markup).not.toContain("People to catch up with");
  });

  it("renders full catch-up management on the appointments tab", () => {
    const markup = renderToStaticMarkup(createElement(MePage, { defaultTab: "appointments" }));

    expect(markup).toContain("Appointments &amp; Catch-ups");
    expect(markup).toContain("Surry Hills Cafe");

    // Saved catch-up reminders surface on /me without leaking into the inbox
    expect(markup).toContain("People to catch up with (1)");
    expect(markup).toContain("Bibin Jose");
    expect(markup).toContain("@bibinjose");
    expect(markup).toContain("Remove reminder for Bibin Jose");
    expect(markup).not.toContain("Requests awaiting your response");
  });

  it("renders the full wallet on the tickets tab", () => {
    const markup = renderToStaticMarkup(createElement(MePage, { defaultTab: "tickets" }));

    expect(markup).toContain("AirPal Pass · Digital Wallet");
    expect(markup).toContain("Circular Quay");
  });

  it("renders personal plans in Today with CRUD entry points", () => {
    const markup = renderToStaticMarkup(createElement(MePage));
    // Personal plan row from the Going calendar commitment
    expect(markup).toContain("Morning Run");
    expect(markup).toContain("My plans today");
    expect(markup).toContain("Catch-ups today");
    expect(markup).toContain("Passes today");
    expect(markup).toContain("Reschedule");
    // Header add-plan entry point
    expect(markup).toContain("Add a personal plan for today");
    // Accepted catch-up from the owner inbox surfaces a two-tap cancel
    expect(markup).toContain("Cancel catch-up with Sarah M");
  });

  it("renders Today as the first tab and all as Overview", () => {
    const markup = renderToStaticMarkup(createElement(MePage));
    expect(markup).toContain("Today&#x27;s Agenda");
    expect(markup).toContain("Today");
    expect(markup).toContain("Overview");
    expect(markup).toContain("Catch-ups");
    expect(markup).toContain("Tickets");
    expect(markup).toContain("Bio &amp; QR Pass");
  });

  it("renders dedicated Bio & QR Pass tab with passbook showcase and capabilities", () => {
    const markup = renderToStaticMarkup(createElement(MePage, { defaultTab: "pass" }));
    expect(markup).toContain("AirPal Passbook &amp; Identity Pass");
    expect(markup).toContain("Universal Digital Pass");
    expect(markup).toContain("NFC &amp; Wallet Ready");
    expect(markup).toContain("My Digital Bio Pass");
    expect(markup).toContain("Apple &amp; Google Wallet");
    expect(markup).toContain("Scannable Anywhere");
    expect(markup).toContain("Instant vCard Contacts");
    // BioSite preview entry point lives beside the pass actions
    expect(markup).toContain("Preview site");
  });

  it("keeps the stat strip uniform with explicit motion", () => {
    const src = readFileSync(resolve(import.meta.dirname, "./MePage.tsx"), "utf8");
    expect(src).toContain('data-theme="light"');
    expect(src).toContain("grid grid-cols-3 gap-1 neu-inset");
    expect(src).toContain('aria-label="Jump to section"');
    expect(src).not.toContain("ring-line");
    expect(src).not.toContain("ring-white");
    expect(src).not.toContain("ring-1 ring-");
    expect(src).not.toContain("border-line");
    expect(src).not.toContain("shadow-clay");
    expect(src).not.toContain("divide-line");
    expect(src).not.toContain("border-dashed");
    expect(src).not.toContain("purple-");
    expect(src).not.toContain("transition-all");
    expect(src).not.toMatch(/[^a-z-:]transition[" ]/);
  });

  it("gives the avatar camera trigger an accessible name and full tap target", () => {
    const markup = renderToStaticMarkup(createElement(MePage, { defaultTab: "all" }));
    expect(markup).toContain('aria-label="Upload profile photo"');
  });
});
