import { describe, expect, it } from "vitest";
import { catchUpNotice, proposeCatchUpSlots } from "./catchup-agent";

describe("catch-up scheduler", () => {
  const now = new Date("2026-10-03T00:00:00Z");

  it("leads with a future requested time and fills Sydney windows", () => {
    const slots = proposeCatchUpSlots({
      now,
      requestedDate: "2026-10-03",
      requestedTime: "16:00",
    });
    expect(slots[0]).toMatchObject({ date: "2026-10-03", time: "16:00" });
    expect(slots.length).toBe(3);
    expect(new Set(slots.map((slot) => slot.id)).size).toBe(3);
    expect(slots.every((slot) => slot.label.length > 0)).toBe(true);
  });

  it("skips busy times and times already past", () => {
    const slots = proposeCatchUpSlots({
      now,
      requestedDate: "2026-10-02",
      requestedTime: "09:00",
      busy: [{ date: "2026-10-03", time: "09:00" }],
    });
    expect(slots.some((slot) => slot.date === "2026-10-02")).toBe(false);
    expect(slots.some((slot) => slot.id === "2026-10-03-0900")).toBe(false);
    expect(slots.length).toBeGreaterThan(0);
  });

  it("writes a proposal and a lock-in notice that links to the bio", () => {
    const slots = proposeCatchUpSlots({ now, requestedDate: "2026-10-04", requestedTime: "12:30" });
    const notice = catchUpNotice({
      phase: "proposed",
      who: "Maya",
      typeLabel: "meeting",
      slot: slots[0],
      handle: "maya",
    });
    expect(notice.kind).toBe("catchup_proposed");
    expect(notice.href).toBe("/@maya");
    expect(notice.body).toContain(slots[0]!.label);
  });
});
