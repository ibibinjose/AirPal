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
      taps: {} as Record<string, Record<string, unknown>>,
      wrote: [] as Array<{ path: string; data: Record<string, unknown> }>,
    },
  };
});

function tapsCollection(profileId: string) {
  return {
    doc: (id: string) => ({
      get: async () => {
        const data = fakes.taps[`${profileId}/${id}`];
        return { exists: Boolean(data), id, data: () => data };
      },
      set: async (data: Record<string, unknown>) => {
        fakes.wrote.push({ path: `profiles/${profileId}/taps/${id}`, data });
        fakes.taps[`${profileId}/${id}`] = { ...fakes.taps[`${profileId}/${id}`], ...data };
      },
    }),
    where: (_field: string, _op: string, _value: string) => ({
      limit: (_n: number) => ({
        get: async () => ({
          docs: Object.entries(fakes.taps)
            .filter(([k]) => k.startsWith(`${profileId}/`))
            .map(([, data]) => ({ data: () => data })),
        }),
      }),
    }),
  };
}

vi.mock("./admin", () => ({
  CALLABLE: {},
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
  db: {
    collection: (name: string) => ({
      doc: (id: string) => ({
        collection: (sub: string) => {
          if (name === "profiles" && sub === "taps") return tapsCollection(id);
          throw new Error(`unexpected subcollection ${name}/${id}/${sub}`);
        },
        get: async () => {
          const store = name === "handles" ? fakes.handles : fakes.profiles;
          const data = store[id];
          return { exists: Boolean(data), id, data: () => data };
        },
      }),
    }),
  },
}));

vi.mock("./abuse", () => ({
  noteAppCheck: async () => undefined,
  enforceRateLimit: async () => undefined,
  isAnonymousAuth: () => false,
}));

vi.mock("firebase-admin/firestore", () => ({
  FieldValue: {
    increment: (n: number) => ({ __increment: n }),
    serverTimestamp: () => ({ __serverTimestamp: true }),
  },
}));

vi.mock("firebase-functions/v2/https", () => ({
  HttpsError: FakeHttpsError,
  onCall: vi.fn((_opts: unknown, handler: unknown) => handler),
}));

import { getBioLinkStats, recordBioTap } from "./bio";

type Handler = (request: unknown) => Promise<Record<string, unknown>>;

const OWNER = "owner-1";
const GUEST = "guest-9";

function today(offsetDays = 0): string {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) + offsetDays * 86400000);
  return d.toISOString().slice(0, 10);
}

describe("bio link stats", () => {
  beforeEach(() => {
    fakes.handles = { sunrise: { profileId: "prof-1" } };
    fakes.profiles = { "prof-1": { ownerUid: OWNER } };
    fakes.taps = {
      [`prof-1/${today()}`]: { day: today(), taps: 10 },
      [`prof-1/${today()}__link-a`]: { day: today(), linkId: "link-a", taps: 6 },
      [`prof-1/${today()}__link-b`]: { day: today(), linkId: "link-b", taps: 2 },
      [`prof-1/${today(-40)}`]: { day: today(-40), taps: 99 },
      [`prof-1/${today(-40)}__link-a`]: { day: today(-40), linkId: "link-a", taps: 50 },
    };
    fakes.wrote = [];
  });

  it("aggregates owner totals while dropping out-of-window days", async () => {
    const res = (await (getBioLinkStats as unknown as Handler)({
      auth: { uid: OWNER },
      data: { handle: "sunrise", days: 30 },
    })) as unknown as { total: number; byLink: Array<{ linkId: string; taps: number }> };
    expect(res.total).toBe(10);
    expect(res.byLink).toEqual([
      { linkId: "link-a", taps: 6 },
      { linkId: "link-b", taps: 2 },
    ]);
  });

  it("refuses non-owners and bad input", async () => {
    await expect(
      (getBioLinkStats as unknown as Handler)({ auth: { uid: GUEST }, data: { handle: "sunrise" } }),
    ).rejects.toMatchObject({ code: "permission-denied" });
    await expect(
      (getBioLinkStats as unknown as Handler)({ auth: { uid: OWNER }, data: { handle: "!!!" } }),
    ).rejects.toMatchObject({ code: "invalid-argument" });
  });

  it("records per-link taps beside the daily total", async () => {
    await (recordBioTap as unknown as Handler)({
      auth: { uid: GUEST },
      data: { handle: "sunrise", kind: "website", linkId: "link-a" },
    });
    const paths = fakes.wrote.map((w) => w.path);
    expect(paths).toContain(`profiles/prof-1/taps/${today()}`);
    expect(paths).toContain(`profiles/prof-1/taps/${today()}__link-a`);
  });
});
