import { beforeEach, describe, expect, it, vi } from "vitest";

const { fakes, FakeHttpsError, ledger } = vi.hoisted(() => {
  class FakeHttpsError extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.code = code;
    }
  }
  return {
    FakeHttpsError,
    ledger: [] as Array<{ eventName: string; properties: Record<string, unknown> }>,
    fakes: {
      listings: {} as Record<string, Record<string, unknown>>,
      places: {} as Record<string, Record<string, unknown>>,
    },
  };
});

vi.mock("./admin", () => ({
  CALLABLE: {},
  auth: {},
  requireAccount: (request: { auth?: { uid?: string } }) => {
    const uid = request.auth?.uid;
    if (!uid) throw new FakeHttpsError("unauthenticated", "Sign in.");
    return uid;
  },
  isPlatformAdmin: (claims: { platform_admin?: boolean } | undefined) => claims?.platform_admin === true,
  db: {
    collection: (name: string) => {
      const store = name === "listings" ? fakes.listings : fakes.places;
      if (name !== "listings" && name !== "places") throw new Error(`unexpected ${name}`);
      return {
        doc: (id: string) => ({
          id,
          get: async () => {
            const data = store[id];
            return { exists: Boolean(data), id, data: () => data };
          },
          set: async (data: Record<string, unknown>, opts?: { merge?: boolean }) => {
            store[id] = opts?.merge ? { ...store[id], ...data } : data;
          },
        }),
      };
    },
    runTransaction: async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        delete: (ref: { id: string }) => {
          delete fakes.listings[ref.id];
        },
        set: (ref: { id: string }, data: unknown, opts?: unknown) => {
          void opts;
          fakes.places[ref.id] = { ...fakes.places[ref.id], ...(data as Record<string, unknown>) };
        },
      };
      return fn(tx);
    },
  },
}));

vi.mock("./abuse", () => ({
  noteAppCheck: async () => undefined,
  enforceRateLimit: async () => undefined,
  isAnonymousAuth: () => false,
  writeAudit: async () => undefined,
}));

vi.mock("./analytics", () => ({
  writeAuthoritativeEvent: async (input: { eventName: string; properties: Record<string, unknown> }) => {
    ledger.push({ eventName: input.eventName, properties: input.properties });
  },
}));

vi.mock("firebase-functions/v2/https", () => ({
  HttpsError: FakeHttpsError,
  onCall: vi.fn((_opts: unknown, handler: unknown) => handler),
}));

import { deleteBusinessListing } from "./listings";

type Handler = (request: unknown) => Promise<{ listingId: string; placeId: string }>;

const OWNER_REQ = { auth: { uid: "org-1", token: {} }, data: { listingId: "list-1" } };

describe("deleteBusinessListing", () => {
  beforeEach(() => {
    fakes.listings = {
      "list-1": { id: "list-1", placeId: "pl-1", ownerUid: "org-1", status: "active" },
    };
    fakes.places = { "pl-1": { status: "active" } };
    ledger.length = 0;
  });

  it("deletes the listing, parks the place, and writes the ledger", async () => {
    const res = (await (deleteBusinessListing as unknown as Handler)(OWNER_REQ)) as {
      listingId: string;
      placeId: string;
    };
    expect(res).toEqual({ listingId: "list-1", placeId: "pl-1" });
    expect(fakes.listings["list-1"]).toBeUndefined();
    expect(fakes.places["pl-1"].status).toBe("inactive");
    expect(ledger).toHaveLength(1);
    expect(ledger[0]).toMatchObject({
      eventName: "host_activation",
      properties: { activationStep: "listing_deleted", contextId: "list-1" },
    });
  });

  it("denies strangers and missing listings", async () => {
    await expect(
      (deleteBusinessListing as unknown as Handler)({
        auth: { uid: "mallory", token: {} },
        data: { listingId: "list-1" },
      }),
    ).rejects.toThrowError(expect.objectContaining({ code: "permission-denied" }));
    expect(fakes.listings["list-1"]).toBeDefined();
    await expect(
      (deleteBusinessListing as unknown as Handler)({
        ...OWNER_REQ,
        data: { listingId: "nope" },
      }),
    ).rejects.toThrowError(expect.objectContaining({ code: "not-found" }));
  });

  it("lets platform admins delete foreign listings", async () => {
    const res = (await (deleteBusinessListing as unknown as Handler)({
      auth: { uid: "admin-1", token: { platform_admin: true } },
      data: { listingId: "list-1" },
    })) as { listingId: string };
    expect(res.listingId).toBe("list-1");
    expect(fakes.listings["list-1"]).toBeUndefined();
  });
});
