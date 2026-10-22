import { describe, expect, it } from "vitest";
import { replacePeople, setPeopleAccount, type PersonMet } from "./people";

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => map.set(key, value),
    removeItem: (key: string) => map.delete(key),
    clear: () => map.clear(),
  };
}

if (typeof globalThis.localStorage === "undefined" || !globalThis.localStorage.getItem) {
  (globalThis as Record<string, unknown>).localStorage = memoryStorage();
}

describe("account-scoped person cache", () => {
  it("does not expose one account's cached data to another", () => {
    localStorage.clear();
    const row: PersonMet = { id: "p-1", name: "Maya", metAt: "2026-01-01T00:00:00.000Z" };
    setPeopleAccount("user-a");
    replacePeople([row]);
    setPeopleAccount("user-b");
    expect(JSON.parse(localStorage.getItem("airpal:people:v2:user-b") || "[]")).toEqual([]);
    setPeopleAccount("user-a");
    expect(JSON.parse(localStorage.getItem("airpal:people:v2:user-a") || "[]")).toEqual([row]);
  });
});
