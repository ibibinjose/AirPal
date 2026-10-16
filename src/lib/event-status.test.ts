import { describe, expect, it } from "vitest";

import { isEventEnded } from "./event-status";

describe("isEventEnded", () => {
  it("marks past dates as ended", () => {
    expect(isEventEnded("2026-10-01", "2026-10-16")).toBe(true);
  });

  it("keeps today and future dates open", () => {
    expect(isEventEnded("2026-10-16", "2026-10-16")).toBe(false);
    expect(isEventEnded("2026-12-25", "2026-10-16")).toBe(false);
  });

  it("never closes on blank or unparseable input", () => {
    expect(isEventEnded("", "2026-10-16")).toBe(false);
    expect(isEventEnded("not-a-date", "2026-10-16")).toBe(false);
    expect(isEventEnded("2026-10-01", "")).toBe(false);
  });
});
