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
      guestRows: {} as Record<string, Record<string, unknown>>,
      bookings: {} as Record<string, Record<string, unknown>>,
    },
  };
});

function eventDoc(id: string) {
  return {
    get: async () => {
      const data = fakes.events[id];
      return { exists: Boolean(data), id, data: () => data };
    },
    collection: (sub: string) => {
      if (sub !== "guestlist") throw new Error(`unexpected subcollection ${sub}`);
      return {
        where: (_field: string, _op: string, values: unknown[]) => ({
          get: async () => ({
            docs: Object.entries(fakes.guestRows)
              .filter(([k, row]) => k.startsWith(`${id}/`) && (values as unknown[]).includes(row.status))
              .map(([k, row]) => ({ id: k.split("/")[1], data: () => row })),
          }),
        }),
        doc: (rowId: string) => ({
          get: async () => {
            const data = fakes.guestRows[`${id}/${rowId}`];
            return { exists: Boolean(data), id: rowId, data: () => data };
          },
          set: async (data: Record<string, unknown>) => {
            fakes.guestRows[`${id}/${rowId}`] = data;
          },
        }),
      };
    },
  };
}

vi.mock("./admin", () => ({
  CALLABLE: { secrets: [] },
  db: {
    collection: (name: string) => {
      if (name === "events") {
        return { doc: (id: string) => eventDoc(id) };
      }
      if (name === "bookings") {
        const filters: Array<{ field: string; value: unknown }> = [];
        const query = {
          where: (field: string, _op: string, value: unknown) => {
            filters.push({ field, value });
            return query;
          },
          get: async () => ({
            docs: Object.entries(fakes.bookings)
              .filter(([, row]) => filters.every((f) => String(row[f.field] ?? "") === String(f.value)))
              .map(([bid, row]) => ({ id: bid, data: () => row })),
          }),
        };
        return {
          ...query,
          doc: (id?: string) => {
            const bid = id || `bk-${Object.keys(fakes.bookings).length}`;
            return {
              id: bid,
              get: async () => {
                const data = fakes.bookings[bid];
                return { exists: Boolean(data), id: bid, data: () => data };
              },
              set: async (data: Record<string, unknown>, opts?: { merge?: boolean }) => {
                fakes.bookings[bid] = opts?.merge ? { ...fakes.bookings[bid], ...data } : data;
              },
            };
          },
        };
      }
      throw new Error(`unexpected collection ${name}`);
    },
    runTransaction: async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        get: (ref: { get: () => Promise<unknown> }) => ref.get(),
        set: (ref: { set: (d: unknown, o?: unknown) => unknown }, data: unknown, opts?: unknown) => {
          void ref.set(data, opts);
        },
      };
      return fn(tx);
    },
  },
  requireAuth: (uid: string | undefined) => {
    if (!uid) throw new FakeHttpsError("unauthenticated", "Sign in.");
    return uid;
  },
  requireAccount: (request: { auth?: { uid?: string } }) => {
    const uid = request.auth?.uid;
    if (!uid) throw new FakeHttpsError("unauthenticated", "Sign in.");
    return uid;
  },
  isPlatformAdmin: () => false,
}));

vi.mock("./abuse", () => ({
  noteAppCheck: async () => undefined,
  enforceRateLimit: async () => undefined,
  isAnonymousAuth: () => false,
  writeAudit: async () => undefined,
}));

vi.mock("./email", () => ({
  sendEventRsvpEmail: async () => undefined,
  sendTicketReceiptEmail: async () => undefined,
}));

vi.mock("./notifications", () => ({
  sendPushIfAllowed: async () => undefined,
}));

vi.mock("firebase-functions/v2/https", () => ({
  HttpsError: FakeHttpsError,
  onCall: vi.fn((_opts: unknown, handler: unknown) => handler),
  onRequest: vi.fn((_opts: unknown, handler: unknown) => handler),
}));

import { createEventBooking } from "./stripe";

type Handler = (request: unknown) => Promise<{ bookingId: string }>;

const GUEST_REQ = { auth: { uid: "guest-9" }, data: {} };

function liveEvent(overrides: Record<string, unknown> = {}) {
  fakes.events["evt-1"] = {
    status: "live",
    organiserUid: "org-1",
    name: "Rocks Market Live",
    hostName: "AirPal",
    venue: "The Rocks",
    startsAt: "2026-11-01T19:00:00+11:00",
    ticketPriceCents: 1000,
    ticketTiers: [],
    capacity: null,
    ...overrides,
  };
}

describe("createEventBooking transaction gap", () => {
  beforeEach(() => {
    fakes.events = {};
    fakes.guestRows = {};
    fakes.bookings = {};
    liveEvent();
  });

  it("prices legacy VIP per spot through the handler", async () => {
    const { bookingId } = (await (createEventBooking as unknown as Handler)({
      ...GUEST_REQ,
      data: { eventId: "evt-1", spots: 2, tierId: "vip" },
    })) as { bookingId: string };
    expect(fakes.bookings[bookingId]).toMatchObject({ priceCents: 3000, spots: 2, tierId: "vip" });
  });

  it("normalizes group bundles to 4 spots at the bundle price", async () => {
    const { bookingId } = (await (createEventBooking as unknown as Handler)({
      ...GUEST_REQ,
      data: { eventId: "evt-1", spots: 4, tierId: "group" },
    })) as { bookingId: string };
    expect(fakes.bookings[bookingId]).toMatchObject({ priceCents: 3600, spots: 4 });
  });

  it("rejects oversell inside the transaction without creating a booking", async () => {
    liveEvent({ capacity: 2 });
    fakes.guestRows["evt-1/rsvp_a"] = { status: "going", partySize: 1 };
    fakes.guestRows["evt-1/rsvp_b"] = { status: "going", partySize: 1 };
    await expect(
      (createEventBooking as unknown as Handler)({
        ...GUEST_REQ,
        data: { eventId: "evt-1", spots: 1 },
      }),
    ).rejects.toThrowError("sold out");
    expect(Object.keys(fakes.bookings)).toHaveLength(0);
  });

  it("counts unpaid pending holds against the same event", async () => {
    liveEvent({ capacity: 2 });
    fakes.bookings["bk-old"] = {
      eventId: "evt-1",
      paymentStatus: "unpaid",
      status: "pending",
      spots: 2,
      priceCents: 2000,
    };
    await expect(
      (createEventBooking as unknown as Handler)({
        ...GUEST_REQ,
        data: { eventId: "evt-1", spots: 1 },
      }),
    ).rejects.toThrowError("sold out");
  });

  it("rejects unknown tiers instead of falling back to 1x", async () => {
    await expect(
      (createEventBooking as unknown as Handler)({
        ...GUEST_REQ,
        data: { eventId: "evt-1", spots: 1, tierId: "nope" },
      }),
    ).rejects.toThrowError(expect.objectContaining({ code: "failed-precondition" }));
  });
});
