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
      events: {} as Record<string, Record<string, unknown>>,
      guestlists: {} as Record<string, Record<string, unknown>[]>,
      bookings: [] as Record<string, unknown>[],
      followers: {} as Record<string, { uid: string }[]>,
      notifications: [] as Record<string, unknown>[],
      broadcasts: [] as Record<string, unknown>[],
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
  isPlatformAdmin: () => false,
  db: {
    collection: (name: string) => ({
      doc: (id: string) => ({
        collection: (_sub: string) => ({
          get: async () => ({
            docs: (fakes.guestlists[`${id}`] || []).map((data) => ({ data: () => data })),
          }),
          limit: (_n: number) => ({
            get: async () => ({
              docs: (fakes.followers[`${id}`] || []).map((data) => ({ data: () => data })),
            }),
          }),
        }),
        get: async () => {
          const data = name === "events" ? fakes.events[id] : undefined;
          return { exists: Boolean(data), id, data: () => data };
        },
      }),
      where: (_field: string, _op: string, value: unknown) => ({
        get: async () => ({
          docs: fakes.bookings
            .filter((b) => (b as Record<string, unknown>).eventId === value)
            .map((data) => ({ data: () => data })),
        }),
      }),
      add: async (data: Record<string, unknown>) => {
        const ref = { id: `bc-${fakes.broadcasts.length}`, update: async () => undefined };
        if (name === "broadcasts") fakes.broadcasts.push(data);
        if (name === "promotion_notifications") fakes.notifications.push(data);
        return ref;
      },
    }),
    batch: () => ({
      set: (ref: unknown, data: unknown) => {
        void ref;
        fakes.notifications.push(data as Record<string, unknown>);
      },
      commit: async () => undefined,
    }),
  },
}));

vi.mock("./abuse", () => ({
  noteAppCheck: async () => undefined,
  enforceRateLimit: async () => undefined,
  isAnonymousAuth: () => false,
  writeAudit: async () => undefined,
}));

vi.mock("firebase-functions/v2/https", () => ({
  HttpsError: FakeHttpsError,
  onCall: vi.fn((_opts: unknown, handler: unknown) => handler),
}));

vi.mock("firebase-functions/v2/firestore", () => ({
  onDocumentCreated: vi.fn((_path: unknown, handler: unknown) => handler),
}));

vi.mock("firebase-admin/messaging", () => ({
  getMessaging: () => ({ sendEachForMulticast: async () => undefined }),
}));

vi.mock("./guestlist", () => ({
  scopeHostUids: async (scope: string, id: string) => {
    if (scope !== "event") return null;
    const e = fakes.events[id] as { organiserUid?: string; coHostUids?: string[] } | undefined;
    if (!e?.organiserUid) return null;
    return { ownerUid: e.organiserUid, coHostUids: e.coHostUids || [] };
  },
}));

import { announceEventToGuests, onEventPublishedToFollowers } from "./notifications";

type Handler = (request: unknown) => Promise<Record<string, unknown>>;
type Trigger = (event: unknown) => Promise<unknown>;

const HOST = { auth: { uid: "org-1" }, data: {} };

describe("guest messaging", () => {
  beforeEach(() => {
    fakes.events = { "evt-1": { organiserUid: "org-1" } };
    fakes.guestlists = {
      "evt-1": [
        { uid: "guest-1", status: "going" },
        { uid: "guest-2", status: "interested" },
        { uid: "guest-3", status: "cancelled" },
      ],
    };
    fakes.bookings = [{ customerUid: "guest-4", status: "confirmed", eventId: "evt-1" }];
    fakes.notifications = [];
    fakes.broadcasts = [];
  });

  it("messages RSVPs and ticket holders, nobody else", async () => {
    const res = (await (announceEventToGuests as unknown as Handler)({
      ...HOST,
      data: { eventId: "evt-1", title: "Doors early", body: "Doors open at 6pm tonight." },
    })) as { sent: number };
    expect(res.sent).toBe(3);
    const reached = fakes.notifications.map((n) => n.uid).sort();
    expect(reached).toEqual(["guest-1", "guest-2", "guest-4"]);
  });

  it("refuses strangers and empty lists", async () => {
    await expect(
      (announceEventToGuests as unknown as Handler)({
        auth: { uid: "stranger" },
        data: { eventId: "evt-1", title: "Hi", body: "Hello there." },
      }),
    ).rejects.toThrowError();
    fakes.guestlists = { "evt-1": [] };
    fakes.bookings = [];
    await expect(
      (announceEventToGuests as unknown as Handler)({
        ...HOST,
        data: { eventId: "evt-1", title: "Hi", body: "Hello there." },
      }),
    ).rejects.toThrowError();
  });
});

describe("calendar-subscribe", () => {
  beforeEach(() => {
    fakes.followers = { rocksmarkets: [{ uid: "fan-1" }, { uid: "org-1" }] };
    fakes.notifications = [];
  });

  const fire = (data: Record<string, unknown>) =>
    (onEventPublishedToFollowers as unknown as Trigger)({
      params: { eventId: "evt-9" },
      data: { data: () => data },
    });

  it("notifies followers when a live event publishes, minus the organiser", async () => {
    await fire({
      name: "Night Market",
      city: "Sydney",
      status: "live",
      organiserUid: "org-1",
      businessHandle: "rocksmarkets",
    });
    expect(fakes.notifications.map((n) => n.uid)).toEqual(["fan-1"]);
  });

  it("stays silent for drafts, demos, and handle-less events", async () => {
    await fire({ name: "Draft", status: "draft", organiserUid: "org-1", businessHandle: "rocksmarkets" });
    await fire({ name: "Demo", status: "live", demo: true, organiserUid: "org-1", businessHandle: "rocksmarkets" });
    await fire({ name: "No handle", status: "live", organiserUid: "org-1" });
    expect(fakes.notifications).toEqual([]);
  });
});
