import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const src = readFileSync(resolve(import.meta.dirname, "./BioEditPage.tsx"), "utf8");

describe("BioEditPage kind guard (Bug 1 guard)", () => {
  it("waits for bios before choosing a profile", () => {
    expect(src).toContain("biosReady");
    expect(src).toContain("if (!biosReady)");
  });

  it("never falls back across kinds or to cached strangers", () => {
    expect(src).toContain('if (queryKind === "business") return business ?? null');
    expect(src).toContain('mine && mine.kind === "person" ? mine : null');
    expect(src).toContain("return mine || business || null");
    expect(src).not.toContain("profiles[0]");
  });

  it("only opens a handle the signed-in owner holds", () => {
    expect(src).toContain("hit.ownerUid === user.uid");
    expect(src).toContain("hit.ownerEmail");
  });

  it("shows the venue empty state for ?kind=business", () => {
    expect(src).toContain("Your venue has no public bio yet");
    expect(src).toContain("Create venue bio");
  });
});
