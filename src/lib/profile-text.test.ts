import { describe, expect, it } from "vitest";
import { cleanHandle, firstNameOf, initialsOf } from "./profile-text";

describe("cleanHandle", () => {
  it("strips @ prefixes, trims, and lowercases", () => {
    expect(cleanHandle("@BibinJose")).toBe("bibinjose");
    expect(cleanHandle("  @Bibin  ")).toBe("bibin");
  });

  it("returns empty string for missing handles instead of throwing", () => {
    expect(cleanHandle(undefined)).toBe("");
    expect(cleanHandle(null)).toBe("");
    expect(cleanHandle("")).toBe("");
  });
});

describe("firstNameOf", () => {
  it("returns the first word of a display name", () => {
    expect(firstNameOf("Bibin Jose")).toBe("Bibin");
    expect(firstNameOf("  Bibin   Jose  ")).toBe("Bibin");
  });

  it("never throws on missing names", () => {
    expect(firstNameOf(undefined)).toBe("");
    expect(firstNameOf(null)).toBe("");
    expect(firstNameOf("   ")).toBe("");
  });
});

describe("initialsOf", () => {
  it("builds one- and two-word initials", () => {
    expect(initialsOf("Bibin Jose")).toBe("BJ");
    expect(initialsOf("Madonna")).toBe("MA");
  });

  it("falls back instead of throwing", () => {
    expect(initialsOf(undefined)).toBe("AP");
    expect(initialsOf(null)).toBe("AP");
    expect(initialsOf("   ")).toBe("AP");
  });
});
