import { describe, expect, it } from "vitest";
import { PILLARS, getActivePillar } from "./pillars";

describe("pillars model", () => {
  it("defines the 4 core pillars in requested order", () => {
    expect(PILLARS.map((p) => p.id)).toEqual(["places", "communities", "friends", "me"]);
    expect(PILLARS.map((p) => p.label)).toEqual(["Places", "Communities", "Friends", "Me"]);
  });

  it("maps places paths correctly", () => {
    const places = PILLARS[0];
    expect(places.match("/places")).toBe(true);
    expect(places.match("/explore")).toBe(true);
    expect(places.match("/guide")).toBe(true);
    expect(places.match("/now")).toBe(true);
    expect(places.match("/deals")).toBe(true);
    expect(places.match("/offers")).toBe(true);
    expect(places.match("/tour/harbour")).toBe(true);
    expect(places.match("/p/the-rocks")).toBe(true);
    expect(getActivePillar("/explore")?.id).toBe("places");
  });

  it("maps communities paths correctly", () => {
    const comm = PILLARS[1];
    expect(comm.match("/communities")).toBe(true);
    expect(comm.match("/events")).toBe(true);
    expect(comm.match("/pass")).toBe(true);
    expect(comm.match("/circle")).toBe(true);
    expect(comm.match("/event")).toBe(true);
    expect(comm.match("/e/concert-123")).toBe(true);
    expect(getActivePillar("/events")?.id).toBe("communities");
  });

  it("maps friends paths correctly", () => {
    const friends = PILLARS[2];
    expect(friends.match("/friends")).toBe(true);
    expect(friends.match("/plan")).toBe(true);
    expect(friends.match("/plan/123")).toBe(true);
    expect(friends.match("/invite/abc")).toBe(true);
    expect(friends.match("/calendar")).toBe(true);
    expect(getActivePillar("/plan")?.id).toBe("friends");
  });

  it("maps me paths correctly", () => {
    const me = PILLARS[3];
    expect(me.match("/me")).toBe(true);
    expect(me.match("/me/tickets")).toBe(true);
    expect(me.match("/bio")).toBe(true);
    expect(me.match("/@bibin")).toBe(true);
    expect(me.match("/settings")).toBe(true);
    expect(me.match("/ticket/pass-123")).toBe(true);
    expect(getActivePillar("/me/tickets")?.id).toBe("me");
  });

  it("returns undefined for home or unrelated roots", () => {
    expect(getActivePillar("/")).toBeUndefined();
    expect(getActivePillar("/privacy")).toBeUndefined();
  });
});
