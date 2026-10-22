import { beforeEach, describe, expect, it } from "vitest";
import {
  __resetCatchUpMemoryForTests,
  checkTimeConflict,
  hasCatchUpReminder,
  listCatchUps,
  listCatchUpsForHandle,
  recordCatchUpInterest,
  setCatchUpDeleteHook,
  setCatchUpPersistHook,
  toggleCatchUpReminder,
} from "./catchup";

describe("catch-up proposals", () => {
  beforeEach(() => {
    __resetCatchUpMemoryForTests();
    setCatchUpPersistHook(async () => undefined);
    setCatchUpDeleteHook(async () => undefined);
  });

  it("records a 1-on-1 coffee against a handle after server persistence", async () => {
    const item = await recordCatchUpInterest({
      targetHandle: "xyz",
      requesterName: "Sam",
      requesterUid: "u1",
      type: "catchup",
      date: "2026-09-20",
      time: "14:00",
      venue: "The Rocks",
    });
    expect(item.targetHandle).toBe("xyz");
    expect(item.type).toBe("catchup");
    expect(listCatchUpsForHandle("xyz").some((r) => r.id === item.id)).toBe(true);
    // Interest is not a reminder-only toggle
    expect(hasCatchUpReminder("xyz")).toBe(false);
  });

  it("does not expose a proposal when its server write fails", async () => {
    setCatchUpPersistHook(async () => {
      throw new Error("offline");
    });
    await expect(
      recordCatchUpInterest({ targetHandle: "xyz", requesterName: "Sam", requesterUid: "u1" }),
    ).rejects.toThrow("offline");
    expect(listCatchUpsForHandle("xyz")).toEqual([]);
    expect(listCatchUps()).toEqual([]);
  });

  it("keeps a reminder visible when its server deletion fails", async () => {
    await toggleCatchUpReminder({ handle: "xyz-rem", name: "Xyz", requesterUid: "u1" });
    setCatchUpDeleteHook(async () => {
      throw new Error("offline");
    });
    await expect(toggleCatchUpReminder({ handle: "xyz-rem", name: "Xyz", requesterUid: "u1" })).rejects.toThrow(
      "offline",
    );
    expect(hasCatchUpReminder("xyz-rem")).toBe(true);
  });

  it("toggles a server-persisted reminder for a handle", async () => {
    const on = await toggleCatchUpReminder({ handle: "xyz-rem", name: "Xyz", requesterUid: "u1" });
    expect(on).toBe(true);
    expect(hasCatchUpReminder("xyz-rem")).toBe(true);
    const off = await toggleCatchUpReminder({ handle: "xyz-rem", name: "Xyz", requesterUid: "u1" });
    expect(off).toBe(false);
    expect(hasCatchUpReminder("xyz-rem")).toBe(false);
  });
});

describe("checkTimeConflict", () => {
  beforeEach(() => {
    __resetCatchUpMemoryForTests();
  });

  it("flags a catch-up within 60 minutes on the same date", () => {
    const result = checkTimeConflict(
      "2026-09-25",
      "14:00",
      [{ date: "2026-09-25", time: "14:30", title: "Coffee with Sam", type: "catchup" }],
      [],
    );
    expect(result.hasConflict).toBe(true);
    expect(result.conflictingTitle).toBe("Coffee with Sam");
    expect(result.conflictingTime).toBe("14:30");
  });

  it("allows a slot an hour or more away", () => {
    const result = checkTimeConflict(
      "2026-09-25",
      "14:00",
      [{ date: "2026-09-25", time: "16:00", title: "Later meetup", type: "meeting" }],
      [],
    );
    expect(result.hasConflict).toBe(false);
  });

  it("ignores reminder-only catch-ups when checking conflicts", () => {
    const result = checkTimeConflict(
      "2026-09-25",
      "14:00",
      [],
      [
        {
          id: "r1",
          targetHandle: "xyz",
          requesterName: "Sam",
          type: "catchup",
          date: "2026-09-25",
          time: "14:00",
          createdAt: new Date().toISOString(),
          isReminderOnly: true,
          status: "pending",
        },
      ],
    );
    expect(result.hasConflict).toBe(false);
  });

  it("handles custom duration intervals accurately", () => {
    // 15-minute sync from 14:00 to 14:15 doesn't conflict with meeting at 14:30
    const result = checkTimeConflict(
      "2026-09-25",
      "14:00",
      [{ date: "2026-09-25", time: "14:30", title: "Later call", type: "meeting", durationMinutes: 30 }],
      [],
      15,
    );
    expect(result.hasConflict).toBe(false);
  });
});
