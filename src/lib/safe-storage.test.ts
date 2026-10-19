import { describe, expect, it } from "vitest";
import {
  safeGetItem,
  safeGetJSON,
  safeLocalStorage,
  safeRemoveItem,
  safeSessionStorage,
  safeSetItem,
  safeSetJSON,
} from "./safe-storage";

describe("safe storage accessors", () => {
  it("falls back to memory store when web storage is unavailable", () => {
    const g = globalThis as Record<string, unknown>;
    const prevLocal = g.localStorage;
    const prevSession = g.sessionStorage;
    delete g.localStorage;
    delete g.sessionStorage;
    try {
      expect(safeLocalStorage()).toBeNull();
      expect(safeSessionStorage()).toBeNull();
      expect(safeGetItem("unassigned_key")).toBeNull();
      expect(safeSetItem("memory_key", "val")).toBe(true);
      expect(safeGetItem("memory_key")).toBe("val");
      expect(safeSetJSON("memory_json", { fallback: false })).toBe(true);
      expect(safeGetJSON("memory_json", { fallback: true })).toEqual({ fallback: false });
      expect(safeRemoveItem("memory_key")).toBe(true);
      expect(safeGetItem("memory_key")).toBeNull();
    } finally {
      if (prevLocal !== undefined) g.localStorage = prevLocal;
      if (prevSession !== undefined) g.sessionStorage = prevSession;
    }
  });

  it("handles live storage interactions correctly", () => {
    const mockStore: Record<string, string> = {};
    const local = {
      getItem: (k: string) => mockStore[k] ?? null,
      setItem: (k: string, v: string) => {
        mockStore[k] = v;
      },
      removeItem: (k: string) => {
        delete mockStore[k];
      },
    } as unknown as Storage;
    const session = { fake: "session" } as unknown as Storage;
    (globalThis as Record<string, unknown>).localStorage = local;
    (globalThis as Record<string, unknown>).sessionStorage = session;
    try {
      expect(safeLocalStorage()).toBe(local);
      expect(safeSessionStorage()).toBe(session);

      expect(safeSetItem("name", "AirPal")).toBe(true);
      expect(safeGetItem("name")).toBe("AirPal");

      expect(safeSetJSON("profile", { handle: "alex" })).toBe(true);
      expect(safeGetJSON("profile", { handle: "default" })).toEqual({ handle: "alex" });

      expect(safeRemoveItem("name")).toBe(true);
      expect(safeGetItem("name")).toBeNull();
    } finally {
      delete (globalThis as Record<string, unknown>).localStorage;
      delete (globalThis as Record<string, unknown>).sessionStorage;
    }
  });
});
