import { describe, expect, it } from "vitest";
import { omitUndefinedDeep } from "./firestore-data";

describe("omitUndefinedDeep", () => {
  it("drops endTime and nested undefined before Firestore writes", () => {
    const doc = omitUndefinedDeep({
      id: "doc-1",
      endTime: undefined,
      geo: undefined,
      creator: { name: "Maya", handle: undefined },
      spots: [{ name: "Cafe", time: undefined }],
    });
    expect(doc).toEqual({
      id: "doc-1",
      creator: { name: "Maya" },
      spots: [{ name: "Cafe" }],
    });
    expect("endTime" in doc).toBe(false);
  });
});
