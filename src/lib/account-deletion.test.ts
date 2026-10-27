import { beforeEach, describe, expect, it, vi } from "vitest";

const getDoc = vi.fn();
const setDoc = vi.fn();
const doc = vi.fn((...args: unknown[]) => ({ path: args.join("/") }));

vi.mock("firebase/firestore", () => ({
  doc: (...args: unknown[]) => doc(...args),
  getDoc: (...args: unknown[]) => getDoc(...args),
  setDoc: (...args: unknown[]) => setDoc(...args),
}));

import { ensureAccountDeletionMarker } from "./account-deletion";

const db = {} as never;

describe("ensureAccountDeletionMarker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates the requested marker on first delete", async () => {
    getDoc.mockResolvedValue({ exists: () => false });
    const result = await ensureAccountDeletionMarker(db, "uid-1", {
      email: "a@example.com",
      phone: "",
    });
    expect(result).toBe("created");
    expect(setDoc).toHaveBeenCalledTimes(1);
    const [, payload] = setDoc.mock.calls[0] as [unknown, Record<string, unknown>];
    expect(payload).toMatchObject({ uid: "uid-1", email: "a@example.com", status: "requested" });
    expect(typeof payload.requestedAt).toBe("string");
  });

  it("skips the write when the marker already exists — retry stays allowed", async () => {
    // Regression: the first attempt wrote the marker, then deleteUser failed
    // with auth/requires-recent-login. Retrying must not setDoc again, since
    // rules only let the owner create (a second write is an update → denied).
    getDoc.mockResolvedValue({ exists: () => true });
    const result = await ensureAccountDeletionMarker(db, "uid-1", {
      email: "a@example.com",
      phone: "",
    });
    expect(result).toBe("exists");
    expect(setDoc).not.toHaveBeenCalled();
  });

  it("attempts the create when the read itself fails", async () => {
    getDoc.mockRejectedValue(new Error("offline"));
    const result = await ensureAccountDeletionMarker(db, "uid-1", {
      email: "",
      phone: "+61400000000",
    });
    expect(result).toBe("created");
    expect(setDoc).toHaveBeenCalledTimes(1);
  });
});
