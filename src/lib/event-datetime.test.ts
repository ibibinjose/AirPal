import { describe, expect, it } from "vitest";
import { formatWhen, fromLocalInput, nextSaturdayNine, pad, sameDayFifteen, toLocalInput } from "./event-datetime";

describe("event datetime helpers", () => {
  it("pads and converts ISO to datetime-local input and back", () => {
    expect(pad(5)).toBe("05");
    expect(pad(12)).toBe("12");
    const iso = "2026-09-15T08:00:00.000Z";
    const local = toLocalInput(iso);
    expect(local).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    expect(fromLocalInput(local)).toBe(new Date(local).toISOString());
    expect(toLocalInput("")).toBe("");
    expect(toLocalInput("not-a-date")).toBe("");
    expect(fromLocalInput("")).toBe("");
  });

  it("defaults to next Saturday 9am and same-day 3pm", () => {
    const sat = nextSaturdayNine();
    expect(sat.getDay()).toBe(6);
    expect(sat.getHours()).toBe(9);
    expect(sat.getMinutes()).toBe(0);
    const start = new Date(2026, 8, 15, 10, 30);
    const end = sameDayFifteen(start);
    expect(end.getFullYear()).toBe(2026);
    expect(end.getMonth()).toBe(8);
    expect(end.getDate()).toBe(15);
    expect(end.getHours()).toBe(15);
  });

  it("formats a human when-label and blanks invalid input", () => {
    expect(formatWhen("2026-09-15T18:00:00+10:00")).not.toBe("");
    expect(formatWhen("")).toBe("");
    expect(formatWhen(undefined)).toBe("");
    expect(formatWhen("garbage")).toBe("");
  });
});
