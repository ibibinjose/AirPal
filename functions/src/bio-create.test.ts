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
      handles: {} as Record<string, Record<string, unknown>>,
      profiles: {} as Record<string, Record<string, unknown>>,
    },
  };
});

type Store = Record<string, Record<string, unknown>>;

function querySnapshot(store: Store, field: string, value: unknown) {
  const docs = Object.entries(store)
    .filter(([, data]) => data[field] === value)
    .map(([id, data]) => ({
      id,
      data: () => data,
      ref: {
        delete: async () => {
          delete store[id];
        },
      },
    }));
  return { docs, empty: docs.length === 0 };
}

function collectionMock(store: Store) {
  return {
    doc: (id: string) => ({
      id,
      get: async () => {
        const data = store[id];
        return { exists: Boolean(data), id, data: () => data };
      },
      set: async (data: Record<string, unknown>, opts?: { merge?: boolean }) => {
        store[id] = opts?.merge ? { ...store[id], ...data } : { ...data };
      },
      delete: async () => {
        delete store[id];
      },
    }),
    where: (field: string, _op: string, value: unknown) => ({
      get: async () => querySnapshot(store, field, value),
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
  requireAuth: (request: { auth?: { uid?: string } }) => {
    const uid = request.auth?.uid;
    if (!uid) throw new FakeHttpsError("unauthenticated", "Sign in.");
    return { uid };
  },
  isPlatformAdmin: () => false,
  db: {
    collection: (name: string) => {
      if (name === "handles") return collectionMock(fakes.handles);
      if (name === "profiles") return collectionMock(fakes.profiles);
      throw new Error(`unexpected collection ${name}`);
    },
  },
}));

vi.mock("./abuse", () => ({
  noteAppCheck: async () => undefined,
  enforceRateLimit: async () => undefined,
  isAnonymousAuth: () => false,
}));

vi.mock("./analytics", () => ({
  writeAuthoritativeEvent: async () => undefined,
}));

vi.mock("firebase-functions/v2/https", () => ({
  HttpsError: FakeHttpsError,
  onCall: vi.fn((_opts: unknown, handler: unknown) => handler),
}));

import { createBusinessProfile, updateBusinessProfile } from "./bio";

type Handler = (request: unknown) => Promise<Record<string, unknown>>;
const REQ = (uid: string, data: Record<string, unknown>) => ({ auth: { uid }, data });

const VENUE_ONE = {
  id: "bio-venue-one",
  handle: "spiceroom",
  kind: "business",
  ownerUid: "u-qa",
  name: "The Spice Room",
  aboutText: "Old venue about text.",
  hours: "Mon–Sun · 9am–9pm",
  listingId: "list-one",
};

describe("second venue business profiles", () => {
  beforeEach(() => {
    fakes.handles = { spiceroom: { handle: "spiceroom", profileId: "bio-venue-one", ownerUid: "u-qa" } };
    fakes.profiles = { "bio-venue-one": { ...VENUE_ONE } };
  });

  it("mints a new profile id for a second venue handle", async () => {
    const res = (await (createBusinessProfile as unknown as Handler)(
      REQ("u-qa", {
        handle: "airpalqatesthost",
        name: "AirPal QA Test Host",
        city: "Sydney",
        category: "eat",
        shortWhy: "QA test host, please ignore.",
        listingId: "list-two",
        kind: "business",
      }),
    )) as { profileId: string };
    expect(res.profileId).not.toBe("bio-venue-one");
    // Venue 1's profile keeps its own name, about, and hours.
    expect(fakes.profiles["bio-venue-one"]).toMatchObject({
      name: "The Spice Room",
      aboutText: "Old venue about text.",
      hours: "Mon–Sun · 9am–9pm",
    });
    // The new handle points at the new profile, and venue 1's handle survives.
    expect(fakes.handles["airpalqatesthost"]?.profileId).toBe(res.profileId);
    expect(fakes.handles["spiceroom"]?.profileId).toBe("bio-venue-one");
  });

  it("reuses the profile id when the owner re-saves the same handle", async () => {
    const res = (await (createBusinessProfile as unknown as Handler)(
      REQ("u-qa", { handle: "spiceroom", name: "The Spice Room", kind: "business" }),
    )) as { profileId: string };
    expect(res.profileId).toBe("bio-venue-one");
  });

  it("keeps single-identity reuse for personal profiles", async () => {
    fakes.handles = { nate: { handle: "nate", profileId: "bio-person", ownerUid: "u-qa" } };
    fakes.profiles = { "bio-person": { id: "bio-person", handle: "nate", kind: "person", ownerUid: "u-qa" } };
    const res = (await (createBusinessProfile as unknown as Handler)(
      REQ("u-qa", { handle: "nate2", name: "Nate", kind: "person" }),
    )) as { profileId: string };
    expect(res.profileId).toBe("bio-person");
  });

  it("updateBusinessProfile also mints a new id for a new venue handle", async () => {
    const res = (await (updateBusinessProfile as unknown as Handler)(
      REQ("u-qa", { handle: "airpalqatesthost", name: "AirPal QA Test Host", kind: "business" }),
    )) as { ok: boolean };
    expect(res.ok).toBe(true);
    expect(fakes.handles["airpalqatesthost"]?.profileId).not.toBe("bio-venue-one");
    expect(fakes.profiles["bio-venue-one"]?.name).toBe("The Spice Room");
  });
});
