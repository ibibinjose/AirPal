import { beforeEach, describe, expect, it, vi } from "vitest";

function makeStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, val: string) => map.set(key, String(val)),
    removeItem: (key: string) => map.delete(key),
    clear: () => map.clear(),
    get length() {
      return map.size;
    },
    key: (i: number) => Array.from(map.keys())[i] ?? null,
  };
}

const localMock = makeStorage();
const sessionMock = makeStorage();

Object.defineProperty(globalThis, "localStorage", { value: localMock, writable: true });
Object.defineProperty(globalThis, "sessionStorage", { value: sessionMock, writable: true });
Object.defineProperty(globalThis, "window", {
  value: { location: { pathname: "/scan", search: "" } },
  writable: true,
  configurable: true,
});

vi.mock("firebase/auth", () => ({
  signInAnonymously: vi.fn(),
  getAuth: vi.fn(),
  initializeAuth: vi.fn(),
  connectAuthEmulator: vi.fn(),
  indexedDBLocalPersistence: {},
  browserLocalPersistence: {},
}));

vi.mock("./functions", () => ({
  liveBackendEnabled: vi.fn(() => true),
  recordAnalyticsBatchRemote: vi.fn(async () => ({ acceptedIds: [] })),
}));

import { isQualifiedAction, validateAnalyticsEvent, type AnalyticsEvent } from "@shared/analytics";
import { resetAnonymousSessionStateForTesting, setFirebaseAuthForTesting } from "./firebase";
import { setAnalyticsConsent, trackDoorAdmitCompleted } from "./analytics";

const QUEUE_KEY = "airpal.analytics.queue.v2"; // mirrors src/lib/analytics.ts

function readQueue(): AnalyticsEvent[] {
  const raw = localMock.getItem(QUEUE_KEY);
  return raw ? (JSON.parse(raw) as AnalyticsEvent[]) : [];
}

describe("trackDoorAdmitCompleted", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localMock.clear();
    sessionMock.clear();
    resetAnonymousSessionStateForTesting();
    setFirebaseAuthForTesting({ currentUser: { uid: "staff-1", isAnonymous: false } } as never);
    setAnalyticsConsent("analytics");
  });

  it("queues a qualified experience_completed event for the admitted ticket", async () => {
    await trackDoorAdmitCompleted("t_123");

    const queue = readQueue();
    expect(queue).toHaveLength(1);
    const event = queue[0];
    expect(event.eventName).toBe("content_action");
    expect(event.properties.actionType).toBe("experience_completed");
    expect(event.contextId).toBe("t_123");
    expect(event.contextType).toBe("event");
    expect(validateAnalyticsEvent(event).ok).toBe(true);
    expect(isQualifiedAction(event)).toBe(true);
  });

  it("dedupes same-ticket re-scans instead of double counting", async () => {
    await trackDoorAdmitCompleted("t_123");
    await trackDoorAdmitCompleted("t_123");

    expect(readQueue()).toHaveLength(1);
  });

  it("emits nothing when consent is denied", async () => {
    setAnalyticsConsent("denied");
    await trackDoorAdmitCompleted("t_123");

    expect(readQueue()).toHaveLength(0);
  });
});
