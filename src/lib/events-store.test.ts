import { beforeEach, describe, expect, it } from "vitest";
import { loadEvents, loadStalls, persistEvents } from "./events-store";

// In-memory localStorage mock for node test environment
const memoryStorage: Record<string, string> = {};
if (typeof globalThis.localStorage === "undefined" || !globalThis.localStorage.getItem) {
  globalThis.localStorage = {
    getItem: (key: string) => memoryStorage[key] ?? null,
    setItem: (key: string, value: string) => {
      memoryStorage[key] = value;
    },
    removeItem: (key: string) => {
      delete memoryStorage[key];
    },
    clear: () => {
      for (const k in memoryStorage) delete memoryStorage[k];
    },
    length: 0,
    key: () => null,
  } as unknown as Storage;
}

describe("events-store honest empty", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns empty lists when nothing was stored — no seed event injected", () => {
    expect(loadEvents()).toEqual([]);
    expect(loadStalls()).toEqual([]);
  });

  it("round-trips stored organiser events without adding extras", () => {
    persistEvents([
      {
        id: "evt-mine",
        name: "My Gig",
        flavour: "event_space",
        city: "Sydney",
        startsAt: new Date().toISOString(),
        status: "draft",
      } as never,
    ]);
    const loaded = loadEvents();
    expect(loaded.map((e) => e.id)).toEqual(["evt-mine"]);
  });

  it("drops malformed rows instead of surfacing them", () => {
    localStorage.setItem("airpal.events.v1", JSON.stringify([{ nope: true }, null, "x"]));
    expect(loadEvents()).toEqual([]);
  });
});
