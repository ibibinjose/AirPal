import { describe, expect, it } from "vitest";
import {
  canClaimDeal,
  normalizeEmail,
  parsePlatformAdminEmails,
  pinIsWellFormed,
  resolveRegistrationRole,
  roleFromAccessToken,
} from "./airpal-security";

describe("resolveRegistrationRole", () => {
  it("never grants super_admin from a client-requested role", () => {
    expect(resolveRegistrationRole("host@example.com", "super_admin", [])).toBe("guest");
    expect(resolveRegistrationRole("host@example.com", "staff", [])).toBe("guest");
  });

  it("grants platform admin only from the server allowlist", () => {
    expect(resolveRegistrationRole("bibin@airpal.me", "guest", ["bibin@airpal.me"])).toBe("super_admin");
    expect(resolveRegistrationRole("bibin.inc@gmail.com", "guest", [])).toBe("super_admin");
  });

  it("allows a host to register as host_admin", () => {
    expect(resolveRegistrationRole("gm@hotel.com", "host_admin", [])).toBe("host_admin");
  });
});

describe("roleFromAccessToken", () => {
  it("prefers custom claims over the user document role", () => {
    expect(roleFromAccessToken({ platform_admin: true, role: "guest" }, "guest")).toBe("super_admin");
    expect(roleFromAccessToken({ role: "staff" }, "host_admin")).toBe("staff");
  });
});

describe("canClaimDeal", () => {
  it("blocks inactive deals, duplicates, and exhausted inventory", () => {
    expect(canClaimDeal({ active: false, claimsCount: 0, existingActiveForUser: false }).ok).toBe(false);
    expect(canClaimDeal({ active: true, claimsCount: 0, existingActiveForUser: true }).ok).toBe(false);
    expect(canClaimDeal({ active: true, claimsCount: 10, claimLimit: 10, existingActiveForUser: false }).ok).toBe(
      false,
    );
    expect(canClaimDeal({ active: true, claimsCount: 2, claimLimit: 10, existingActiveForUser: false }).ok).toBe(true);
  });
});

describe("pin and email helpers", () => {
  it("accepts only 4-8 digit PINs", () => {
    expect(pinIsWellFormed("1234")).toBe(true);
    expect(pinIsWellFormed("12")).toBe(false);
    expect(pinIsWellFormed("abcd")).toBe(false);
  });

  it("parses the platform admin allowlist", () => {
    expect(parsePlatformAdminEmails("A@x.com, b@y.com ")).toEqual(["bibin.inc@gmail.com", "a@x.com", "b@y.com"]);
    expect(parsePlatformAdminEmails("")).toEqual(["bibin.inc@gmail.com"]);
    expect(normalizeEmail("  Host@AirPal.ME ")).toBe("host@airpal.me");
  });
});
