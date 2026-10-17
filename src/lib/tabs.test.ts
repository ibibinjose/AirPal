import { describe, expect, it } from "vitest";
import { passTabFromPath, tabFromPath } from "./tabs";

describe("tabFromPath", () => {
  it("maps the five dock tabs", () => {
    expect(tabFromPath("/")).toBe("home");
    expect(tabFromPath("/places")).toBe("places");
    expect(tabFromPath("/communities")).toBe("communities");
    expect(tabFromPath("/friends")).toBe("friends");
    expect(tabFromPath("/circle")).toBe("friends");
    expect(tabFromPath("/me")).toBe("me");
    expect(tabFromPath("/scan")).toBe("scan");
    expect(tabFromPath("/w/abcd")).toBe("scan");
  });

  it("maps personal bio, calendar, and settings to the Me tab", () => {
    expect(tabFromPath("/me/inbox")).toBe("me");
    expect(tabFromPath("/settings")).toBe("me");
    expect(tabFromPath("/bio/setup")).toBe("me");
    expect(tabFromPath("/@maya")).toBe("me");
    expect(tabFromPath("/calendar")).toBe("me");
  });

  it("falls back to home for removed Planning and legacy routes", () => {
    expect(tabFromPath("/now")).toBe("home");
    expect(tabFromPath("/pass")).toBe("home");
    expect(tabFromPath("/explore")).toBe("home");
    expect(tabFromPath("/concierge")).toBe("home");
    expect(tabFromPath("/plan")).toBe("home");
    expect(tabFromPath("/invite/abc")).toBe("home");
  });
});

describe("passTabFromPath (Pass dock)", () => {
  it("maps pass surfaces to pass tabs", () => {
    expect(passTabFromPath("/pass")).toBe("pass");
    expect(passTabFromPath("/places")).toBe("pass");
    expect(passTabFromPath("/deals")).toBe("pass");
    expect(passTabFromPath("/event")).toBe("pass");
    expect(passTabFromPath("/events")).toBe("events");
    expect(passTabFromPath("/communities")).toBe("events");
    expect(passTabFromPath("/e/abc")).toBe("events");
    expect(passTabFromPath("/e/abc/guests")).toBe("events");
    expect(passTabFromPath("/me/tickets")).toBe("tickets");
    expect(passTabFromPath("/ticket/abc")).toBe("tickets");
    expect(passTabFromPath("/scan")).toBe("scan");
    expect(passTabFromPath("/me")).toBe("bio");
    expect(passTabFromPath("/friends")).toBe("bio");
    expect(passTabFromPath("/@handle")).toBe("bio");
    expect(passTabFromPath("/bio")).toBe("bio");
  });
});
