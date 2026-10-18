import { beforeEach, describe, expect, it, vi } from "vitest";

const { fakes, FakeHttpsError } = vi.hoisted(() => {
  class FakeHttpsError extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.code = code;
    }
  }
  return {
    FakeHttpsError,
    fakes: {
      users: {} as Record<string, Record<string, unknown>>,
      events: {} as Record<string, Record<string, unknown>>,
      bookings: {} as Record<string, Record<string, unknown>>,
      catchups: {} as Record<string, Record<string, unknown>>,
      mail: [] as Record<string, unknown>[],
      notifications: [] as Record<string, unknown>[],
      isAdmin: false,
    },
  };
});

vi.mock("./admin", () => ({
  CALLABLE: {},
  requireAccount: (request: { auth?: { uid?: string } }) => {
    const uid = request.auth?.uid;
    if (!uid) throw new FakeHttpsError("unauthenticated", "Sign in.");
    return uid;
  },
  isPlatformAdmin: () => fakes.isAdmin,
  db: {
    collection: (name: string) => ({
      doc: (id: string) => ({
        get: async () => {
          let data: Record<string, unknown> | undefined;
          if (name === "users") data = fakes.users[id];
          if (name === "events") data = fakes.events[id];
          if (name === "bookings") data = fakes.bookings[id];
          if (name === "catchups") data = fakes.catchups[id];
          return { exists: Boolean(data), id, data: () => data };
        },
      }),
      add: async (data: Record<string, unknown>) => {
        const item = { id: `doc-${Date.now()}-${Math.random()}`, ...data };
        if (name === "mail") fakes.mail.push(item);
        if (name === "promotion_notifications") fakes.notifications.push(item);
        return { id: item.id, update: async () => undefined };
      },
    }),
  },
}));

vi.mock("./abuse", () => ({
  noteAppCheck: async () => undefined,
  enforceRateLimit: async () => undefined,
  isAnonymousAuth: () => false,
}));

vi.mock("./notifications", () => ({
  sendPushIfAllowed: async () => undefined,
}));

vi.mock("firebase-functions/v2/https", () => ({
  HttpsError: FakeHttpsError,
  onCall: vi.fn((_opts: unknown, handler: unknown) => handler),
}));

vi.mock("firebase-functions/v2/firestore", () => ({
  onDocumentCreated: vi.fn((_path: unknown, handler: unknown) => handler),
  onDocumentWritten: vi.fn((_path: unknown, handler: unknown) => handler),
}));

import {
  createInAppNotification,
  sendBrandEmail,
  sendCatchUpNoticeEmail,
  sendEventRsvpEmail,
  sendTicketReceiptEmail,
  sendWelcomeEmail,
  testSendBrandEmail,
} from "./email";

describe("sendBrandEmail pipeline", () => {
  beforeEach(() => {
    fakes.users = {};
    fakes.events = {};
    fakes.bookings = {};
    fakes.catchups = {};
    fakes.mail = [];
    fakes.notifications = [];
    fakes.isAdmin = false;
  });

  it("queues valid email to firestore mail collection", async () => {
    const res = await sendBrandEmail({
      to: "guest@example.com",
      subject: "Your Pass is Ready",
      html: "<p>Pass HTML</p>",
      text: "Pass Text",
      kind: "ticket_confirmed",
    });

    expect(res.ok).toBe(true);
    expect(res.status).toBe("queued");
    expect(fakes.mail.length).toBe(1);
    expect(fakes.mail[0].to).toEqual(["guest@example.com"]);
    const msg = fakes.mail[0].message as Record<string, unknown>;
    expect(msg.subject).toBe("Your Pass is Ready");
    expect(msg.html).toBe("<p>Pass HTML</p>");
  });

  it("rejects invalid or blank email addresses", async () => {
    const res = await sendBrandEmail({
      to: "not-an-email",
      subject: "Test",
      html: "<p>Test</p>",
      text: "Test",
    });
    expect(res.ok).toBe(false);
    expect(res.status).toBe("invalid_address");
    expect(fakes.mail.length).toBe(0);
  });

  it("suppresses marketing email when user has opted out", async () => {
    fakes.users["user-optout"] = {
      email: "optout@example.com",
      notifications: { marketingEmail: false },
    };

    const res = await sendBrandEmail({
      to: "optout@example.com",
      subject: "Giveaway Live",
      html: "<p>Win prizes</p>",
      text: "Win prizes",
      kind: "giveaway_launched", // marketing kind
      uid: "user-optout",
    });

    expect(res.ok).toBe(false);
    expect(res.status).toBe("opted_out");
    expect(fakes.mail.length).toBe(0);
  });

  it("delivers transactional emails even if marketing is off", async () => {
    fakes.users["user-optout"] = {
      email: "optout@example.com",
      notifications: { marketingEmail: false },
    };

    const res = await sendBrandEmail({
      to: "optout@example.com",
      subject: "Ticket Confirmed",
      html: "<p>Your Ticket</p>",
      text: "Your Ticket",
      kind: "ticket_confirmed", // transactional
      uid: "user-optout",
    });

    expect(res.ok).toBe(true);
    expect(fakes.mail.length).toBe(1);
  });
});

describe("createInAppNotification", () => {
  beforeEach(() => {
    fakes.notifications = [];
  });

  it("creates notification document with default read:false", async () => {
    const id = await createInAppNotification({
      uid: "user-1",
      kind: "ticket_confirmed",
      title: "Ticket Confirmed: Summer Fest",
      body: "Doors open at 6pm.",
      href: "/me/tickets",
    });

    expect(id).toBeDefined();
    expect(fakes.notifications.length).toBe(1);
    expect(fakes.notifications[0].uid).toBe("user-1");
    expect(fakes.notifications[0].read).toBe(false);
    expect(fakes.notifications[0].href).toBe("/me/tickets");
  });

  it("returns empty string if uid, title or body are missing", async () => {
    const id = await createInAppNotification({
      uid: "",
      kind: "ticket_confirmed",
      title: "Hi",
      body: "There",
      href: "/test",
    });
    expect(id).toBe("");
    expect(fakes.notifications.length).toBe(0);
  });
});

describe("lifecycle triggers", () => {
  beforeEach(() => {
    fakes.users = {
      "user-1": { displayName: "Ravi Kumar", email: "ravi@example.com" },
      "user-2": { displayName: "Aria Smith", email: "aria@example.com", handle: "aria" },
    };
    fakes.events = {
      "evt-1": {
        name: "Sydney Diwali Concert",
        date: "2026-11-01",
        time: "18:00",
        venue: "Olympic Park",
        city: "Sydney",
      },
    };
    fakes.bookings = {
      "b-1": {
        eventId: "evt-1",
        customerUid: "user-1",
        customerName: "Ravi Kumar",
        customerEmail: "ravi@example.com",
        paymentStatus: "paid",
        status: "confirmed",
        spots: 2,
        priceCents: 5000,
        currency: "aud",
      },
    };
    fakes.catchups = {
      "c-1": {
        requesterUid: "user-2",
        requesterName: "Aria Smith",
        targetOwnerUid: "user-1",
        type: "coffee",
        date: "2026-11-05",
        time: "10:00",
        venue: "Surry Hills Cafe",
      },
    };
    fakes.mail = [];
    fakes.notifications = [];
  });

  it("sendTicketReceiptEmail creates notification and queues receipt email", async () => {
    const ok = await sendTicketReceiptEmail("b-1");
    expect(ok).toBe(true);

    // In-app note
    expect(fakes.notifications.length).toBe(1);
    expect(fakes.notifications[0].kind).toBe("ticket_confirmed");
    expect(fakes.notifications[0].uid).toBe("user-1");

    // Email queued
    expect(fakes.mail.length).toBe(1);
    expect(fakes.mail[0].to).toEqual(["ravi@example.com"]);
    const msg = fakes.mail[0].message as Record<string, unknown>;
    expect(msg.subject).toContain("Sydney Diwali Concert");
  });

  it("sendEventRsvpEmail creates RSVP notification and email", async () => {
    const ok = await sendEventRsvpEmail("evt-1", "user-1");
    expect(ok).toBe(true);

    expect(fakes.notifications.length).toBe(1);
    expect(fakes.notifications[0].kind).toBe("event_rsvp");

    expect(fakes.mail.length).toBe(1);
    expect(fakes.mail[0].to).toEqual(["ravi@example.com"]);
  });

  it("sendCatchUpNoticeEmail invites target user via email", async () => {
    const ok = await sendCatchUpNoticeEmail("c-1");
    expect(ok).toBe(true);

    expect(fakes.mail.length).toBe(1);
    expect(fakes.mail[0].to).toEqual(["ravi@example.com"]);
    const msg = fakes.mail[0].message as Record<string, unknown>;
    expect(msg.subject).toContain("Aria Smith proposed a Coffee");
  });

  it("sendWelcomeEmail sends dual-lens orientation email", async () => {
    const ok = await sendWelcomeEmail("user-1");
    expect(ok).toBe(true);

    expect(fakes.notifications.length).toBe(1);
    expect(fakes.notifications[0].kind).toBe("welcome");

    expect(fakes.mail.length).toBe(1);
    expect(fakes.mail[0].to).toEqual(["ravi@example.com"]);
    const msg = fakes.mail[0].message as Record<string, unknown>;
    expect(msg.subject).toContain("Welcome to AirPal");
  });
});

describe("testSendBrandEmail callable", () => {
  beforeEach(() => {
    fakes.mail = [];
    fakes.isAdmin = true;
  });

  it("allows platform admins to send test previews", async () => {
    type Handler = (req: unknown) => Promise<Record<string, unknown>>;
    const res = await (testSendBrandEmail as unknown as Handler)({
      auth: { uid: "admin-1" },
      data: {
        template: "ticket",
        to: "admin@airpal.com",
      },
    });

    expect(res.ok).toBe(true);
    expect(fakes.mail.length).toBe(1);
    expect(fakes.mail[0].to).toEqual(["admin@airpal.com"]);
  });

  it("rejects non-platform-admins", async () => {
    fakes.isAdmin = false;
    type Handler = (req: unknown) => Promise<Record<string, unknown>>;
    await expect(
      (testSendBrandEmail as unknown as Handler)({
        auth: { uid: "regular-user" },
        data: {
          template: "ticket",
          to: "test@airpal.com",
        },
      }),
    ).rejects.toThrow();
  });
});
