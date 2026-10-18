import { beforeEach, describe, expect, it } from "vitest";
import { loadRecent, saveRecent } from "./recent-searches";

function stubStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  const store = {
    getItem: (k: string) => (data.has(k) ? data.get(k)! : null),
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
    clear: () => data.clear(),
    key: (i: number) => [...data.keys()][i] ?? null,
    get length() {
      return data.size;
    },
  } as Storage;
  (globalThis as Record<string, unknown>).localStorage = store;
  return { store, data };
}

beforeEach(() => {
  delete (globalThis as Record<string, unknown>).localStorage;
});

describe("recent searches", () => {
  it("saves most-recent-first, dedupes, and caps at five", () => {
    stubStorage();
    for (let i = 1; i <= 6; i++) saveRecent({ title: `place ${i}`, href: `/places/${i}` });
    const titles = loadRecent().map((r) => r.title);
    expect(titles).toEqual(["place 6", "place 5", "place 4", "place 3", "place 2"]);
    saveRecent({ title: "place 4", href: "/places/4" });
    expect(loadRecent()[0]).toEqual({ title: "place 4", href: "/places/4" });
    expect(loadRecent()).toHaveLength(5);
  });

  it("drops hostile and invalid entries on read and write", () => {
    const { data } = stubStorage({
      "airpal.recentSearches.v1": JSON.stringify([
        { title: "good spot", href: "/places/1" },
        { title: "x", href: "/Users/eve/evil" },
        { title: "node thing", href: "/node_modules/x" },
        { title: "file thing", href: "file:///etc/passwd" },
      ]),
    });
    expect(loadRecent()).toEqual([{ title: "good spot", href: "/places/1" }]);
    // read-back wrote the cleaned list
    expect(JSON.parse(data.get("airpal.recentSearches.v1")!)).toEqual([{ title: "good spot", href: "/places/1" }]);
    saveRecent({ title: "bad", href: "/Users/eve/evil" });
    expect(loadRecent()).toEqual([{ title: "good spot", href: "/places/1" }]);
  });

  it("returns empty when storage is unavailable or corrupt", () => {
    expect(loadRecent()).toEqual([]);
    stubStorage({ "airpal.recentSearches.v1": "not-json{{{" });
    expect(loadRecent()).toEqual([]);
  });
});
