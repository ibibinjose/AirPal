import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("BioEditPage preview mirror", () => {
  it("keeps the mockup primary CTA non-interactive", () => {
    const src = readFileSync(resolve(import.meta.dirname, "./BioEditPage.tsx"), "utf8");
    const start = src.indexOf("Primary Action Button styled with active theme");
    const end = src.indexOf("Quick Action Row", start);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const block = src.slice(start, end);
    expect(block).not.toContain("<button");
    expect(block).toContain('aria-hidden="true"');
  });
});
