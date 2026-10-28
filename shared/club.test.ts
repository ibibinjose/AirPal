import { describe, expect, it } from "vitest";
import { guestEmailError, inviteMailto } from "./club";

describe("guestEmailError", () => {
  it("flags empty and whitespace-only input instead of silently no-oping", () => {
    expect(guestEmailError("")).toContain("email first");
    expect(guestEmailError("   ")).toContain("email first");
  });

  it("flags malformed addresses with a fix-it message", () => {
    expect(guestEmailError("not-an-email")).toContain("check it");
  });

  it("passes real addresses through", () => {
    expect(guestEmailError("guest@example.com")).toBeNull();
  });
});

describe("inviteMailto", () => {
  it("puts the first address in to and the rest in bcc", () => {
    const href = inviteMailto(["a@example.com", "b@example.com"], "You're on the list", "Show this at the door");
    expect(href).toContain(`mailto:${encodeURIComponent("a@example.com")}`);
    expect(href).toContain(`bcc=${encodeURIComponent("b@example.com")}`);
    expect(href).toContain("subject=");
  });
});
