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
    calendarEvents: [],
    savedEvents: [],
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
  it("renders Me with today's agenda, appointments, tickets and catch-ups", () => {
    const markup = renderToStaticMarkup(createElement(MePage));

    // Identity and handle
    expect(markup).toContain("Test User");
    expect(markup).toContain("@testmate");

    // Today's Agenda
    expect(markup).toContain("Today&#x27;s Agenda");
    expect(markup).toContain("Sarah M");
    expect(markup).toContain("Sydney Opera Live Concert");

    // Appointments Section
    expect(markup).toContain("Appointments &amp; Catch-ups");
    expect(markup).toContain("Surry Hills Cafe");

    // Tickets Section
    expect(markup).toContain("AirPal Pass · Digital Wallet");
    expect(markup).toContain("Circular Quay");

    // Digital Bio Pass card
    expect(markup).toContain("My Digital Bio Pass");

    // Saved catch-up reminders surface on /me without leaking into the inbox
    expect(markup).toContain("People to catch up with (1)");
    expect(markup).toContain("Bibin Jose");
    expect(markup).toContain("@bibinjose");
    expect(markup).toContain("Remove reminder for Bibin Jose");
    expect(markup).not.toContain("Requests awaiting your response");
  });
});
