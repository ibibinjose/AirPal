import { describe, expect, it } from "vitest";
import { parseQrPayload, pathForIntent } from "./qr";

describe("qr payload", () => {
  it("routes @handle to the public bio", () => {
    expect(parseQrPayload("https://airpal.me/@cutbar")).toEqual({ kind: "url", href: "/@cutbar" });
    expect(pathForIntent({ kind: "url", href: "/@cutbar" })).toBe("/@cutbar");
  });

  it("passes retired stay URLs through as plain links", () => {
    expect(parseQrPayload("https://airpal.me/g/harbour-hotel?room=101")).toEqual({
      kind: "url",
      href: "/g/harbour-hotel?room=101",
    });
  });

  it("routes a Wave QR to /w/CODE", () => {
    expect(parseQrPayload("https://airpal.me/w/glen12")).toEqual({ kind: "url", href: "/w/GLEN12" });
    expect(pathForIntent({ kind: "url", href: "/w/GLEN12" })).toBe("/w/GLEN12");
  });

  it("keeps /q/{city}/{handle} as marker vanity", () => {
    expect(parseQrPayload("https://airpal.me/q/sydney/harbour-rocks-hotel")).toEqual({
      kind: "vanity",
      city: "sydney",
      handle: "harbour-rocks-hotel",
    });
    expect(pathForIntent({ kind: "vanity", city: "sydney", handle: "harbour-rocks-hotel" })).toBe(
      "/q/sydney/harbour-rocks-hotel",
    );
  });

  it("treats routeless surfaces as unknown instead of echoing a broken page", () => {
    expect(parseQrPayload("https://airpal.me/companion/abc123").kind).toBe("unknown");
    expect(pathForIntent(parseQrPayload("https://airpal.me/companion/abc123"))).toBe(null);
    expect(parseQrPayload("https://airpal.me/events")).toEqual({ kind: "url", href: "/events" });
    expect(parseQrPayload("https://airpal.me/stay/harbour-hotel")).toEqual({
      kind: "url",
      href: "/stay/harbour-hotel",
    });
  });

  it("routes a Pulse QR to /pulse/:token", () => {
    expect(parseQrPayload("https://airpal.me/pulse/pls_abcABC1234567890xyz")).toEqual({
      kind: "pulse",
      publicToken: "pls_abcABC1234567890xyz",
    });
    expect(pathForIntent({ kind: "pulse", publicToken: "pls_abcABC1234567890xyz" })).toBe(
      "/pulse/pls_abcABC1234567890xyz",
    );
  });
});
