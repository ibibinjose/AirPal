import { beforeEach, describe, expect, it, vi } from "vitest";
import { FakeHttpsError, fakes, fakeDb, readDoc, resetFakes, runV3, seedDoc } from "./fakes";

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
  requireAccount: (request: { auth?: { uid?: string; token?: { firebase?: { sign_in_provider?: string } } } }) => {
    const uid = request.auth?.uid;
    if (!uid) throw new FakeHttpsError("unauthenticated", "Sign in required.");
    if (request.auth?.token?.firebase?.sign_in_provider === "anonymous") {
      throw new FakeHttpsError("failed-precondition", "Create an email account.");
    }
    return uid;
  },
  isPlatformAdmin: () => fakes.isAdmin,
  db: fakeDb,
}));

vi.mock("../abuse", () => ({
  noteAppCheck: async () => undefined,
  isAnonymousAuth: (request: { auth?: { token?: { firebase?: { sign_in_provider?: string } } } }) =>
    request.auth?.token?.firebase?.sign_in_provider === "anonymous",
  enforceRateLimit: async (uid: string, action: string) => {
    fakes.rateLimited.push(`${uid}:${action}`);
  },
}));

vi.mock("firebase-functions/v2/https", () => ({
  HttpsError: FakeHttpsError,
  onCall: vi.fn((_opts: unknown, handler: unknown) => handler),
  onRequest: vi.fn((_handler: unknown) => _handler),
}));

import { v3BootstrapAccount, v3ClaimHandle, v3SetProfileVisibility, v3UpdateProfile } from "./identity";

describe("v3 identity", () => {
  beforeEach(() => {
    resetFakes();
  });

  it("bootstraps a private account shell once", async () => {
    const first = await runV3(v3BootstrapAccount, "uid-1", { displayName: "Ava", marketingEmail: true });
    expect(first).toEqual({ uid: "uid-1", created: true });
    expect(readDoc("users/uid-1")).toMatchObject({
      displayName: "Ava",
      preferences: { marketingEmail: true },
      planIds: [],
      blockedUids: [],
    });
    const second = await runV3(v3BootstrapAccount, "uid-1", {});
    expect(second).toEqual({ uid: "uid-1", created: false });
    expect(readDoc("users/uid-1")).toMatchObject({ displayName: "Ava" });
    expect(fakes.rateLimited).toContain("uid-1:v3Identity");
  });

  it("bootstrap requires sign-in", async () => {
    await expect(runV3(v3BootstrapAccount, undefined, {})).rejects.toMatchObject({ code: "unauthenticated" });
  });

  it("claims a handle and releases the previous one", async () => {
    seedDoc("users/uid-1", { uid: "uid-1", handle: "ava.old", planIds: [] });
    await runV3(v3ClaimHandle, "uid-1", { handle: "ava.new" });
    expect(readDoc("handles/ava.new")).toMatchObject({ ownerUid: "uid-1", active: true });
    expect(readDoc("handles/ava.old")).toMatchObject({ active: false });
    expect(readDoc("users/uid-1")).toMatchObject({ handle: "ava.new" });
    expect(readDoc("profiles/uid-1")).toMatchObject({ handle: "ava.new", visibility: "private" });
  });

  it("refuses taken handles and re-claims idempotently", async () => {
    seedDoc("handles/taken", { ownerUid: "uid-9", active: true });
    await expect(runV3(v3ClaimHandle, "uid-1", { handle: "taken" })).rejects.toMatchObject({ code: "already-exists" });
    seedDoc("handles/min.e", { ownerUid: "uid-1", active: true });
    const res = await runV3(v3ClaimHandle, "uid-1", { handle: "min.e" });
    expect(res).toMatchObject({ handle: "min.e", changed: false });
  });

  it("rejects anonymous handle claims and invalid handles", async () => {
    await expect(runV3(v3ClaimHandle, "uid-1", { handle: "ava" }, true)).rejects.toMatchObject({
      code: "failed-precondition",
    });
    await expect(runV3(v3ClaimHandle, "uid-1", { handle: "no spaces" })).rejects.toMatchObject({
      code: "invalid-argument",
    });
  });

  it("updates the bio and rejects unsafe link URLs", async () => {
    seedDoc("users/uid-1", { uid: "uid-1", handle: "ava" });
    await runV3(v3UpdateProfile, "uid-1", {
      displayName: "Ava",
      city: "Sydney",
      links: [{ id: "site", label: "Site", href: "https://example.com" }],
    });
    expect(readDoc("profiles/uid-1")).toMatchObject({ displayName: "Ava", city: "Sydney", handle: "ava" });
    await expect(
      runV3(v3UpdateProfile, "uid-1", { links: [{ id: "x", label: "X", href: "javascript:alert(1)" }] }),
    ).rejects.toMatchObject({ code: "invalid-argument" });
  });

  it("sets visibility and validates the value", async () => {
    const res = await runV3(v3SetProfileVisibility, "uid-1", { visibility: "public" });
    expect(res).toEqual({ uid: "uid-1", visibility: "public" });
    expect(readDoc("profiles/uid-1")).toMatchObject({ visibility: "public" });
    await expect(runV3(v3SetProfileVisibility, "uid-1", { visibility: "friends" })).rejects.toMatchObject({
      code: "invalid-argument",
    });
  });
});
