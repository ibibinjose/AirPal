import { afterEach, describe, expect, it, vi } from "vitest";
import { queryGeoPermission } from "./geo-locate";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("queryGeoPermission", () => {
  it("passes through granted, denied, and prompt states", async () => {
    for (const state of ["granted", "denied", "prompt"] as const) {
      vi.stubGlobal("navigator", {
        permissions: { query: async () => ({ state }) },
      });
      expect(await queryGeoPermission()).toBe(state);
    }
  });

  it("returns unknown without the Permissions API", async () => {
    vi.stubGlobal("navigator", {});
    expect(await queryGeoPermission()).toBe("unknown");
  });

  it("returns unknown when the query throws", async () => {
    vi.stubGlobal("navigator", {
      permissions: {
        query: async () => {
          throw new Error("unavailable");
        },
      },
    });
    expect(await queryGeoPermission()).toBe("unknown");
  });

  it("returns unknown without a navigator at all", async () => {
    vi.stubGlobal("navigator", undefined);
    expect(await queryGeoPermission()).toBe("unknown");
  });
});
