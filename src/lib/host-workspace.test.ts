import { describe, expect, it } from "vitest";
import { hostWatchPropertyIds, hostWorkspacePropertyId, roomTokenEntries } from "./host-workspace";

describe("host workspace", () => {
  it("does not invent a demo room token", () => {
    expect(roomTokenEntries(undefined)).toEqual([]);
    expect(roomTokenEntries({})).toEqual([]);
    expect(roomTokenEntries({ "tok-101-demo": "101" })).toEqual([["tok-101-demo", "101"]]);
  });

  it("returns only the user's own properties, never a default stay", () => {
    expect(hostWorkspacePropertyId([])).toBe("");
    expect(hostWorkspacePropertyId(["mine"])).toBe("mine");
    expect(hostWatchPropertyIds([])).toEqual([]);
    expect(hostWatchPropertyIds(["mine"])).toEqual(["mine"]);
  });
});
