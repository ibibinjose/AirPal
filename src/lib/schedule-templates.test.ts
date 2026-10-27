import { describe, expect, it } from "vitest";
import { SCHEDULE_TEMPLATES, getScheduleTemplate } from "./schedule-templates";

describe("schedule templates", () => {
  it("ships a unique, valid preset per template", () => {
    const ids = SCHEDULE_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(["coffee", "dinner", "workout", "meeting", "nightout"]);
    for (const t of SCHEDULE_TEMPLATES) {
      expect(t.label.trim().length).toBeGreaterThan(0);
      expect(t.title.trim().length).toBeGreaterThan(0);
      expect(t.venueHint.trim().length).toBeGreaterThan(0);
      expect(t.time).toMatch(/^([01]\d|2[0-3]):[0-5]\d$/);
      expect(t.durationMinutes).toBeGreaterThanOrEqual(15);
      expect(t.durationMinutes).toBeLessThanOrEqual(240);
    }
  });

  it("resolves templates by id and misses unknown ids", () => {
    expect(getScheduleTemplate("coffee")?.title).toBe("Coffee catch-up");
    expect(getScheduleTemplate("dinner")?.durationMinutes).toBe(90);
    expect(getScheduleTemplate("nope")).toBeUndefined();
  });
});
