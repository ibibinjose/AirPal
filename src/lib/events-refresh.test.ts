import { describe, expect, it } from "vitest";
import { classifyEventsRefreshError, eventsRefreshCopy } from "./events-refresh";

describe("events refresh errors", () => {
  it("does not call a rules denial a connection problem", () => {
    const kind = classifyEventsRefreshError({
      code: "permission-denied",
      message: "Missing or insufficient permissions.",
    });
    expect(kind).toBe("denied");
    expect(eventsRefreshCopy(kind).detail).toMatch(/access was denied/i);
    expect(eventsRefreshCopy(kind).detail).toMatch(/not a network outage/i);
    expect(eventsRefreshCopy(kind).detail).not.toMatch(/check your connection/i);
  });

  it("keeps an honest connection message for network failures", () => {
    const kind = classifyEventsRefreshError({
      code: "unavailable",
      message: "Failed to get document because the client is offline.",
    });
    expect(kind).toBe("offline");
    expect(eventsRefreshCopy(kind).detail).toMatch(/connection/i);
  });

  it("does not invent a network failure for other errors", () => {
    const kind = classifyEventsRefreshError(new Error("internal"));
    expect(kind).toBe("failed");
    expect(eventsRefreshCopy(kind).detail).not.toMatch(/check your connection/i);
  });
});
