import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const src = readFileSync(resolve(import.meta.dirname, "./BusinessPage.tsx"), "utf8");

describe("BusinessPage hooks order (Bug 2 guard)", () => {
  it("declares preview and handle before the first early return", () => {
    const previewAt = src.indexOf("const preview = useMemo");
    const handleAt = src.indexOf("const handle = mine?.handle");
    const firstReturn = src.indexOf("if (!authReady)");
    expect(previewAt).toBeGreaterThan(-1);
    expect(handleAt).toBeGreaterThan(-1);
    expect(firstReturn).toBeGreaterThan(-1);
    expect(handleAt).toBeLessThan(firstReturn);
    expect(previewAt).toBeLessThan(firstReturn);
  });

  it("is null-safe before the listing hydrates", () => {
    expect(src).toContain("const handle = mine?.handle || bio?.handle");
    expect(src).toContain("mine\n        ? withWalk(");
    expect(src).toContain("{preview && <PlaceCard");
    // No non-null assertion may run before the guards: everything above the
    // first early return must be null-safe.
    const beforeGuards = src.slice(0, src.indexOf("if (!authReady)"));
    expect(beforeGuards).not.toContain("mine!");
  });

  it("keeps the tab in the URL so ?tab= links survive", () => {
    expect(src).toContain("onTabChange={handleTabChange}");
    expect(src).toContain("nav(`/business?${params.toString()}`, { replace: true })");
  });
});
