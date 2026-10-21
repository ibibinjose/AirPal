import { afterEach, describe, expect, it, vi } from "vitest";
import { sendEventRsvpEmail, sendTicketReceiptEmail } from "./email";

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
      isAdmin: false,
      events: {} as Record<string, Record<string, unknown>>,
      guestlist: {} as Record<string, Record<string, Record<string, unknown>>>,
      users: {} as Record<string, Record<string, unknown>>,
      audits: [] as unknown[],
    },
  };
});

function rowsOf(key: string, only?: string[]) {
  return Object.entries(fakes.guestlist[key] || {})
    .filter(([, d]) => !only || only.includes(String(d.status)))
    .map(([id, d]) => ({
      id,
      data: () => d,
      ref: {
        set: async (data: Record<string, unknown>) => {
          fakes.guestlist[key][id] = { ...fakes.guestlist[key][id], ...data };
        },
      },
    }));
}

function guestCol(key: string) {
  const store = () => {
    if (!fakes.guestlist[key]) fakes.guestlist[key] = {};
    return fakes.guestlist[key];
  };
  return {
    doc: (entryId: string) => ({
      get: async () => {
        const data = store()[entryId];
        return { exists: Boolean(data), data: () => data };
      },
      set: async (data: Record<string, unknown>, opts?: { merge?: boolean }) => {
        store()[entryId] = opts?.merge ? { ...store()[entryId], ...data } : data;
      },
    }),
    get: async () => ({ docs: rowsOf(key) }),
    where: (_field: string, _op: string, values: string[]) => ({
      get: async () => ({ docs: rowsOf(key, values) }),
    }),
  };
}

vi.mock("./admin", () => ({
  CALLABLE: {},
  requireAccount: (request: { auth?: { uid?: string } }) => {
    const uid = request.auth?.uid;
    if (!uid) throw new FakeHttpsError("unauthenticated", "Sign in.");
    return uid;
  },
  isPlatformAdmin: () => fakes.isAdmin,
  db: {
    collection: (name: string) => {
      if (name === "events") {
        const docs = fakes.events;
        return {
          doc: (id: string) => ({
            get: async () => {
              const data = docs[id];
              return { exists: Boolean(data), data: () => data };
            },
            set: async (data: Record<string, unknown>, opts?: { merge?: boolean }) => {
              docs[id] = opts?.merge ? { ...docs[id], ...data } : data;
            },
            collection: (sub: string) => {
              if (sub !== "guestlist") throw new Error(`unexpected subcollection ${sub}`);
              return guestCol(`${name}/${id}`);
            },
          }),
        };
      }
      if (name === "users") {
        return {
          doc: (id: string) => ({
            get: async () => {
              const data = fakes.users[id];
              return { exists: Boolean(data), data: () => data };
            },
          }),
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
    batch: () => {
      const ops: (() => Promise<void>)[] = [];
      return {
        set: (
          ref: { set: (d: Record<string, unknown>, o?: unknown) => Promise<void> },
          data: Record<string, unknown>,
          opts?: unknown,
        ) => {
          ops.push(() => ref.set(data, opts));
        },
        commit: async () => {
          for (const op of ops) await op();
        },
      };
    },
  },
}));

vi.mock("./abuse", () => ({
  noteAppCheck: async () => undefined,
  enforceRateLimit: async () => undefined,
  writeAudit: async (row: unknown) => {
    fakes.audits.push(row);
  },
}));

vi.mock("firebase-functions/v2/https", () => ({
  HttpsError: FakeHttpsError,
  onCall: vi.fn((_opts: unknown, handler: unknown) => handler),
}));

vi.mock("firebase-functions/v2/firestore", () => ({
  onDocumentWritten: vi.fn((_path: unknown, handler: unknown) => handler),
  onDocumentCreated: vi.fn((_path: unknown, handler: unknown) => handler),
  onDocumentUpdated: vi.fn((_path: unknown, handler: unknown) => handler),
}));

vi.mock("./email", () => ({
  sendEventRsvpEmail: vi.fn(async () => true),
  sendTicketReceiptEmail: vi.fn(async () => true),
}));

import {
  checkInGuest,
  closeGuestlist,
  listDoorTeam,
  markTicketCheckedIn,
  onGuestBookingWritten,
  onGuestRsvpWritten,
  onGuestlistEntryWritten,
} from "./guestlist";

type Handler = (request: unknown) => Promise<Record<string, unknown>>;
type Trigger = (event: unknown) => Promise<void>;

function run(handler: unknown, uid: string | undefined, data: unknown) {
  return (handler as unknown as Handler)({ auth: uid ? { uid, token: {} } : {}, data });
}

function fire(trigger: unknown, params: Record<string, string>, afterData?: Record<string, unknown>) {
  return (trigger as unknown as Trigger)({
    params,
    data: { after: { data: () => afterData } },
  });
}

describe("guestlist server", () => {
  afterEach(() => {
    vi.clearAllMocks();
    fakes.isAdmin = false;
    fakes.events = {};
    fakes.guestlist = {};
    fakes.users = {};
    fakes.audits.length = 0;
  });

  it("checkInGuest requires sign-in, scope, and the door team", async () => {
    fakes.events = { "evt-1": { organiserUid: "org-1" } };
    await expect(run(checkInGuest, undefined, { scope: "event", id: "evt-1", entryId: "a" })).rejects.toMatchObject({
      code: "unauthenticated",
    });
    await expect(run(checkInGuest, "org-1", { scope: "venue", id: "evt-1", entryId: "a" })).rejects.toMatchObject({
      code: "invalid-argument",
    });
    await expect(run(checkInGuest, "stranger", { scope: "event", id: "evt-1", entryId: "a" })).rejects.toMatchObject({
      code: "permission-denied",
    });
    await expect(run(checkInGuest, "org-1", { scope: "event", id: "nope", entryId: "a" })).rejects.toMatchObject({
      code: "not-found",
    });
  });

  it("checkInGuest admits co-hosts and rejects the removed plan scope", async () => {
    fakes.events = { "evt-1": { organiserUid: "org-1", coHostUids: ["co-1"] } };
    fakes.guestlist = {
      "events/evt-1": { door1: { name: "Walk In", status: "going", partySize: 2 } },
    };
    const first = await run(checkInGuest, "co-1", { scope: "event", id: "evt-1", entryId: "door1" });
    expect(first.already).toBe(false);
    expect(fakes.guestlist["events/evt-1"].door1.status).toBe("checked-in");
    const second = await run(checkInGuest, "co-1", { scope: "event", id: "evt-1", entryId: "door1" });
    expect(second.already).toBe(true);
    await expect(run(checkInGuest, "co-1", { scope: "plan", id: "evt-1", entryId: "door1" })).rejects.toMatchObject({
      code: "invalid-argument",
    });
  });

  it("closeGuestlist turns the waiting into no-shows, never the checked-in", async () => {
    fakes.events = { "evt-1": { organiserUid: "org-1" } };
    fakes.guestlist = {
      "events/evt-1": {
        a: { name: "A", status: "going", partySize: 1 },
        b: { name: "B", status: "invited", partySize: 2 },
        c: { name: "C", status: "checked-in", partySize: 1 },
      },
    };
    await expect(run(closeGuestlist, "stranger", { scope: "event", id: "evt-1" })).rejects.toMatchObject({
      code: "permission-denied",
    });
    const done = await run(closeGuestlist, "org-1", { scope: "event", id: "evt-1" });
    expect(done.closed).toBe(2);
    expect(fakes.guestlist["events/evt-1"].a.status).toBe("no-show");
    expect(fakes.guestlist["events/evt-1"].b.status).toBe("no-show");
    expect(fakes.guestlist["events/evt-1"].c.status).toBe("checked-in");
    expect(fakes.events["evt-1"].guestCounts).toMatchObject({ noshowHeads: 3, checkedInHeads: 1 });
  });

  it("listDoorTeam resolves the roster for the door team only", async () => {
    fakes.events = { "evt-1": { organiserUid: "org-1", coHostUids: ["co-1"] } };
    fakes.users = {
      "org-1": { displayName: "Oz Organiser", handle: "oz" },
      "co-1": { displayName: "Dee Door" },
    };
    await expect(listDoorTeam && run(listDoorTeam, "stranger", { scope: "event", id: "evt-1" })).rejects.toMatchObject({
      code: "permission-denied",
    });
    const done = (await run(listDoorTeam, "co-1", { scope: "event", id: "evt-1" })) as unknown as {
      members: Array<{ uid: string; name: string; handle?: string; owner: boolean }>;
    };
    expect(done.members).toEqual([
      { uid: "org-1", name: "Oz Organiser", handle: "oz", owner: true },
      { uid: "co-1", name: "Dee Door", owner: false },
    ]);
  });

  it("RSVP going upserts the account row with the profile name", async () => {
    fakes.events = { "evt-1": { organiserUid: "org-1" } };
    fakes.users = { "u-9": { displayName: "Ava Stone", handle: "ava", isVerified: true } };
    await fire(onGuestRsvpWritten, { uid: "u-9", eventId: "evt-1" }, { status: "going" });
    expect(fakes.guestlist["events/evt-1"]["rsvp_u-9"]).toMatchObject({
      name: "Ava Stone",
      handle: "ava",
      verified: true,
      status: "going",
      source: "rsvp",
    });
    expect(fakes.events["evt-1"].guestCounts).toMatchObject({ goingHeads: 1 });
    expect(fakes.events["evt-1"].bookedHeads).toBe(1);
    expect(sendEventRsvpEmail).toHaveBeenCalledWith("evt-1", "u-9");
  });

  it("RSVP going is refused when the event is already full", async () => {
    fakes.events = { "evt-1": { organiserUid: "org-1", capacity: 2 } };
    fakes.guestlist = {
      "events/evt-1": {
        rsvp_a: { name: "A", status: "going", partySize: 1, source: "rsvp" },
        t_bk: { name: "B", status: "checked-in", partySize: 1, source: "ticket" },
      },
    };
    fakes.users = { "u-9": { displayName: "Ava Stone" } };
    await fire(onGuestRsvpWritten, { uid: "u-9", eventId: "evt-1" }, { status: "going" });
    expect(fakes.guestlist["events/evt-1"]["rsvp_u-9"]).toBeUndefined();
    expect(fakes.events["evt-1"].bookedHeads).toBe(2);
  });

  it("RSVP going keeps its own seat when re-affirming at capacity", async () => {
    fakes.events = { "evt-1": { organiserUid: "org-1", capacity: 1 } };
    fakes.guestlist = {
      "events/evt-1": {
        rsvp_u9: { name: "Ava", status: "going", partySize: 1, source: "rsvp" },
      },
    };
    fakes.users = { "u-9": { displayName: "Ava Stone" } };
    await fire(onGuestRsvpWritten, { uid: "u-9", eventId: "evt-1" }, { status: "going" });
    expect(fakes.guestlist["events/evt-1"]["rsvp_u9"].status).toBe("going");
  });

  it("RSVP withdrawal cancels the row but never a checked-in guest", async () => {
    fakes.events = { "evt-1": { organiserUid: "org-1" } };
    fakes.guestlist = {
      "events/evt-1": {
        rsvp_u1: { name: "A", status: "going", partySize: 1, source: "rsvp" },
        rsvp_u2: { name: "B", status: "checked-in", partySize: 1, source: "rsvp" },
      },
    };
    await fire(onGuestRsvpWritten, { uid: "u1", eventId: "evt-1" }, { status: "interested" });
    await fire(onGuestRsvpWritten, { uid: "u2", eventId: "evt-1" }, { status: null } as never);
    expect(fakes.guestlist["events/evt-1"].rsvp_u1.status).toBe("cancelled");
    expect(fakes.guestlist["events/evt-1"].rsvp_u2.status).toBe("checked-in");
  });

  it("RSVP for an unknown event is skipped", async () => {
    await fire(onGuestRsvpWritten, { uid: "u-9", eventId: "local-only" }, { status: "going" });
    expect(fakes.guestlist["events/local-only"]).toBeUndefined();
  });

  it("paid ticket bookings upsert the ticket row; pending ones wait", async () => {
    fakes.events = { "evt-1": { organiserUid: "org-1" } };
    fakes.users = { "g-1": { displayName: "Theo" } };
    await fire(
      onGuestBookingWritten,
      { bookingId: "bk-1" },
      {
        eventId: "evt-1",
        customerUid: "g-1",
        priceCents: 5000,
        paymentStatus: "paid",
        status: "confirmed",
        spots: 3,
      },
    );
    expect(fakes.guestlist["events/evt-1"]["t_bk-1"]).toMatchObject({
      name: "Theo",
      status: "going",
      partySize: 3,
      ticketId: "bk-1",
      source: "ticket",
    });
    expect(sendTicketReceiptEmail).toHaveBeenCalledWith("bk-1");
    await fire(
      onGuestBookingWritten,
      { bookingId: "bk-2" },
      { eventId: "evt-1", customerUid: "g-2", priceCents: 5000, paymentStatus: "unpaid", status: "pending" },
    );
    expect(fakes.guestlist["events/evt-1"]["t_bk-2"]).toBeUndefined();
  });

  it("bookings without an event are ignored", async () => {
    fakes.users = { "g-7": { displayName: "Pip" } };
    await fire(
      onGuestBookingWritten,
      { bookingId: "bk-7" },
      {
        requestId: "req-7",
        customerUid: "g-7",
        priceCents: 0,
        paymentStatus: "paid",
        status: "confirmed",
        spots: 2,
      },
    );
    expect(fakes.guestlist["events/evt-1"]).toBeUndefined();
    expect(Object.keys(fakes.guestlist)).toHaveLength(0);
  });

  it("refunded bookings cancel the ticket row", async () => {
    fakes.events = { "evt-1": { organiserUid: "org-1" } };
    fakes.guestlist = { "events/evt-1": { "t_bk-1": { name: "T", status: "going", partySize: 1 } } };
    await fire(
      onGuestBookingWritten,
      { bookingId: "bk-1" },
      { eventId: "evt-1", customerUid: "g-1", priceCents: 5000, paymentStatus: "refunded", status: "refunded" },
    );
    expect(fakes.guestlist["events/evt-1"]["t_bk-1"].status).toBe("cancelled");
  });

  it("markTicketCheckedIn prefers the ticket row, then the RSVP row", async () => {
    fakes.events = { "evt-1": { organiserUid: "org-1" } };
    fakes.guestlist = {
      "events/evt-1": {
        "t_bk-1": { name: "T", status: "going", partySize: 2 },
        rsvp_g2: { name: "G", status: "going", partySize: 1 },
      },
    };
    await markTicketCheckedIn("event", "evt-1", "bk-1", "g-1");
    expect(fakes.guestlist["events/evt-1"]["t_bk-1"].status).toBe("checked-in");
    await markTicketCheckedIn("event", "evt-1", "bk-9", "g2");
    expect(fakes.guestlist["events/evt-1"].rsvp_g2.status).toBe("checked-in");
    expect(fakes.guestlist["events/evt-1"].rsvp_g2.ticketId).toBe("bk-9");
  });

  it("markTicketCheckedIn skips missing lists", async () => {
    await markTicketCheckedIn("event", "ghost", "bk-1", "g-1");
    expect(fakes.guestlist["events/ghost"]).toBeUndefined();
  });

  it("onGuestlistEntryWritten recomputes guestCounts on direct entry change", async () => {
    fakes.events = { "evt-1": { organiserUid: "org-1" } };
    fakes.guestlist = {
      "events/evt-1": {
        entry_1: { name: "VIP Walk-in", status: "going", partySize: 3 },
      },
    };
    await fire(onGuestlistEntryWritten, { eventId: "evt-1", entryId: "entry_1" });
    expect(fakes.events["evt-1"].guestCounts).toEqual({
      listedHeads: 3,
      goingHeads: 3,
      checkedInHeads: 0,
      noshowHeads: 0,
      entries: 1,
    });
  });
});
