import { describe, expect, it } from "vitest";
import { PILLARS, getActivePillar } from "./pillars";

describe("pillars model", () => {
  it("defines the 2 core pillars in requested order", () => {
    expect(PILLARS.map((p) => p.id)).toEqual(["communities", "me"]);
    expect(PILLARS.map((p) => p.label)).toEqual(["Communities", "Me"]);
  });

  it("maps communities paths correctly", () => {
    const comm = PILLARS[0];
    expect(comm.match("/communities")).toBe(true);
    expect(comm.match("/events")).toBe(true);
    expect(comm.match("/pass")).toBe(true);
    expect(comm.match("/circle")).toBe(true);
    expect(comm.match("/event")).toBe(true);
    expect(comm.match("/e/concert-123")).toBe(true);
    expect(getActivePillar("/events")?.id).toBe("communities");
  });

  it("maps me paths correctly", () => {
    const me = PILLARS[1];
    expect(me.match("/me")).toBe(true);
    expect(me.match("/me/tickets")).toBe(true);
    expect(me.match("/bio")).toBe(true);
    expect(me.match("/@bibin")).toBe(true);
    expect(me.match("/settings")).toBe(true);
    expect(me.match("/ticket/pass-123")).toBe(true);
    expect(getActivePillar("/me/tickets")?.id).toBe("me");
  });

  it("returns undefined for home, removed Discovery/Planning routes, or unrelated roots", () => {
    expect(getActivePillar("/")).toBeUndefined();
    expect(getActivePillar("/now")).toBeUndefined();
    expect(getActivePillar("/explore")).toBeUndefined();
    expect(getActivePillar("/guide")).toBeUndefined();
    expect(getActivePillar("/plan")).toBeUndefined();
    expect(getActivePillar("/invite/abc")).toBeUndefined();
    expect(getActivePillar("/privacy")).toBeUndefined();
  });
});
