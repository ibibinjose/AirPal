import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/** Live Now strip contract: always bright white in every color scheme —
 * a fixed white fill, the day palette pinned via `data-theme="light"`,
 * and no OS-driven `dark:` overrides left in the file. */
describe("live now bar color", () => {
  it("stays bright white with a pinned day palette", () => {
    const bar = readFileSync(resolve(import.meta.dirname, "./LocalNowBar.tsx"), "utf8");
    expect(bar).toContain("bg-white");
    expect(bar).toContain('data-theme="light"');
    expect(bar).not.toMatch(/dark:/);
  });
});
