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

function docSnap(store: Record<string, Record<string, unknown>>, id: string) {
  const data = store[id];
  return {
    id,
    exists: Boolean(data),
    data: () => data,
    ref: {
      delete: async () => {
        delete store[id];
      },
    },
  };
}

vi.mock("./admin", () => ({
  CALLABLE: {},
  auth: {},
  db: {
    collection: (name: string) => {
      const store = name === "handles" ? fakes.handles : fakes.profiles;
      if (name !== "handles" && name !== "profiles") throw new Error(`unexpected ${name}`);
      return {
        doc: (id: string) => ({
          id,
          get: async () => docSnap(store, id),
          set: async (data: Record<string, unknown>) => {
            store[id] = { ...data };
          },
        }),
        where: (field: string, _op: string, value: unknown) => ({
          get: async () => {
            const docs = Object.entries(store)
              .filter(([, row]) => String(row[field] ?? "") === String(value))
              .map(([id]) => docSnap(store, id));
            return { docs, size: docs.length };
          },
        }),
      };
    },
  },
  requireAccount: (request: { auth?: { uid?: string } }) => {
    const uid = request.auth?.uid;
    if (!uid) throw new FakeHttpsError("unauthenticated", "Sign in.");
    return uid;
  },
  requireAuth: (uid?: string) => {
    if (!uid) throw new FakeHttpsError("unauthenticated", "Sign in.");
    return uid;
  },
  isPlatformAdmin: () => false,
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

import { createBusinessProfile } from "./bio";

type Handler = (request: unknown) => Promise<Record<string, unknown>>;

const UID = "qa-uid";

function seedPerson() {
  fakes.handles["airpalqa"] = { handle: "airpalqa", profileId: "bio-person1", ownerUid: UID };
  fakes.profiles["bio-person1"] = {
    id: "bio-person1",
    handle: "airpalqa",
    kind: "person",
    ownerUid: UID,
    name: "AirPal QA",
    shortWhy: "Testing AirPal in Sydney.",
    aboutText: "QA personal bio.",
  };
}

describe("createBusinessProfile kind guard", () => {
  beforeEach(() => {
    fakes.handles = {};
    fakes.profiles = {};
    vi.clearAllMocks();
  });

  it("refuses to turn your personal profile into a venue (the @airpalqa regression)", async () => {
    seedPerson();
    await expect(
      (createBusinessProfile as unknown as Handler)({
        auth: { uid: UID },
        data: {
          handle: "airpalqa",
          name: "Test venue",
          kind: "business",
          city: "Sydney",
          category: "eat",
          shortWhy: "Test venue created by AirPal QA",
        },
      }),
    ).rejects.toMatchObject({ code: "already-exists" });

    // Nothing was written: the person profile and its handle are untouched.
    expect(fakes.profiles["bio-person1"]).toMatchObject({
      kind: "person",
      name: "AirPal QA",
      shortWhy: "Testing AirPal in Sydney.",
      aboutText: "QA personal bio.",
    });
    expect(fakes.handles["airpalqa"]).toMatchObject({ profileId: "bio-person1" });
  });

  it("refuses to turn your venue profile into a personal bio", async () => {
    fakes.handles["myvenue"] = { handle: "myvenue", profileId: "bio-biz1", ownerUid: UID };
    fakes.profiles["bio-biz1"] = {
      id: "bio-biz1",
      handle: "myvenue",
      kind: "business",
      ownerUid: UID,
      name: "My Venue",
      shortWhy: "Venue.",
    };
    await expect(
      (createBusinessProfile as unknown as Handler)({
        auth: { uid: UID },
        data: { handle: "myvenue", name: "Me", kind: "person", city: "Sydney", shortWhy: "Me." },
      }),
    ).rejects.toMatchObject({ code: "already-exists" });
    expect(fakes.profiles["bio-biz1"]).toMatchObject({ kind: "business", name: "My Venue" });
  });

  it("still allows idempotent venue creation on your own venue handle", async () => {
    fakes.handles["myvenue"] = { handle: "myvenue", profileId: "bio-biz1", ownerUid: UID };
    fakes.profiles["bio-biz1"] = {
      id: "bio-biz1",
      handle: "myvenue",
      kind: "business",
      ownerUid: UID,
      name: "My Venue",
      shortWhy: "Venue.",
    };
    const res = (await (createBusinessProfile as unknown as Handler)({
      auth: { uid: UID },
      data: { handle: "myvenue", name: "My Venue Updated", kind: "business", city: "Sydney", shortWhy: "Venue." },
    })) as unknown as { profileId: string; handle: string };
    expect(res.profileId).toBe("bio-biz1");
    expect(fakes.profiles["bio-biz1"]).toMatchObject({ kind: "business", name: "My Venue Updated" });
  });

  it("still creates a fresh personal bio when nothing collides", async () => {
    const res = (await (createBusinessProfile as unknown as Handler)({
      auth: { uid: UID },
      data: { handle: "newhuman", name: "New Human", kind: "person", city: "Sydney", shortWhy: "Hi." },
    })) as unknown as { profileId: string; handle: string };
    expect(res.profileId).toMatch(/^bio-/);
    expect(fakes.profiles[res.profileId]).toMatchObject({ kind: "person", handle: "newhuman" });
  });
});
