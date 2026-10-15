import { describe, expect, it } from "vitest";
import { passTabFromPath, tabFromPath } from "./tabs";

describe("tabFromPath", () => {
  it("maps the companion tabs", () => {
    expect(tabFromPath("/")).toBe("home");
    expect(tabFromPath("/scan")).toBe("scan");
    expect(tabFromPath("/w/abcd")).toBe("scan");
  });

  it("maps personal bio to the Bio tab, circle to Circle tab, and dashboard/settings to the Me tab", () => {
    expect(tabFromPath("/circle")).toBe("circle");
    expect(tabFromPath("/me")).toBe("me");
    expect(tabFromPath("/me/inbox")).toBe("me");
    expect(tabFromPath("/settings")).toBe("me");
    expect(tabFromPath("/bio/setup")).toBe("bio");
    expect(tabFromPath("/@maya")).toBe("bio");
  });

  it("falls back to home for removed Discovery, Planning, and Phase 6 routes", () => {
    expect(tabFromPath("/now")).toBe("home");
    expect(tabFromPath("/pass")).toBe("home");
    expect(tabFromPath("/explore")).toBe("home");
    expect(tabFromPath("/calendar")).toBe("home");
    expect(tabFromPath("/concierge")).toBe("home");
    expect(tabFromPath("/g/harbour-hotel")).toBe("home");
    expect(tabFromPath("/q/sydney/harbour")).toBe("home");
    expect(tabFromPath("/mate")).toBe("home");
    expect(tabFromPath("/mate/request")).toBe("home");
    expect(tabFromPath("/experiences")).toBe("home");
    expect(tabFromPath("/plan")).toBe("home");
    expect(tabFromPath("/plan/new")).toBe("home");
    expect(tabFromPath("/invite/abc")).toBe("home");
  });

  it("parks directory and account under Home, not extra tabs", () => {
    expect(tabFromPath("/deals")).toBe("home");
    expect(tabFromPath("/guide")).toBe("home");
    expect(tabFromPath("/join")).toBe("home");
  });
});

describe("passTabFromPath (Pass dock)", () => {
  it("maps pass surfaces to pass tabs", () => {
    expect(passTabFromPath("/pass")).toBe("pass");
    expect(passTabFromPath("/pass/deals")).toBe("pass");
    expect(passTabFromPath("/deals")).toBe("pass");
    expect(passTabFromPath("/event")).toBe("pass");
    expect(passTabFromPath("/events")).toBe("events");
    expect(passTabFromPath("/e/abc")).toBe("events");
    expect(passTabFromPath("/e/abc/guests")).toBe("events");
    expect(passTabFromPath("/me/tickets")).toBe("tickets");
    expect(passTabFromPath("/ticket/abc")).toBe("tickets");
    expect(passTabFromPath("/scan")).toBe("scan");
    expect(passTabFromPath("/me")).toBe("bio");
    expect(passTabFromPath("/@handle")).toBe("bio");
    expect(passTabFromPath("/bio")).toBe("bio");
  });
});
