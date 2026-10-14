import { describe, expect, it, vi } from "vitest";
import { FakeHttpsError, fakes, fakeDb } from "./fakes";

vi.mock("firebase-admin/firestore", () => ({
  FieldValue: {
    serverTimestamp: () => ({ __op: "timestamp" }),
    arrayUnion: (...values: unknown[]) => ({ __op: "union", values }),
    arrayRemove: (...values: unknown[]) => ({ __op: "remove", values }),
    delete: () => ({ __op: "delete" }),
  },
}));

vi.mock("../admin", () => ({
  CALLABLE: {},
  requireAuth: (uid: string | undefined) => {
    if (!uid) throw new FakeHttpsError("unauthenticated", "Sign in required.");
    return uid;
  },
  requireAccount: (request: { auth?: { uid?: string } }) => {
    if (!request.auth?.uid) throw new FakeHttpsError("unauthenticated", "Sign in required.");
    return request.auth.uid;
  },
  isPlatformAdmin: () => fakes.isAdmin,
  db: fakeDb,
}));

vi.mock("../abuse", () => ({
  noteAppCheck: async () => undefined,
  isAnonymousAuth: () => false,
  enforceRateLimit: async () => undefined,
}));

vi.mock("firebase-functions/v2/https", () => ({
  HttpsError: FakeHttpsError,
  onCall: vi.fn((_opts: unknown, handler: unknown) => handler),
  onRequest: vi.fn((_handler: unknown) => _handler),
}));

import { v3Arg, v3Clean, v3IdemDocId } from "./common";

describe("v3 common helpers", () => {
  it("strips undefined write fields and keeps defined values", () => {
    expect(v3Clean({ a: 1, b: undefined, c: null, d: 0, e: false, f: "" })).toEqual({
      a: 1,
      c: null,
      d: 0,
      e: false,
      f: "",
    });
  });

  it("maps parser errors to invalid-argument", () => {
    expect(() => v3Arg(() => "ok")).not.toThrow();
    try {
      v3Arg(() => {
        throw new Error("Handle is invalid.");
      });
      expect.unreachable("v3Arg must throw");
    } catch (err) {
      expect((err as { code?: string }).code).toBe("invalid-argument");
      expect((err as Error).message).toBe("Handle is invalid.");
    }
  });

  it("derives safe deterministic doc ids", () => {
    const id = v3IdemDocId("o", "uid-1", "key-001");
    expect(id).toBe("o_uid-1_key-001");
    expect(v3IdemDocId("t", "a/b", "x y")).toBe("t_a_b_x_y");
  });
});
