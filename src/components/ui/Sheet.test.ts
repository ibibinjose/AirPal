import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Sheet focus trap", () => {
  it("does not re-bind focus when the close callback identity changes", () => {
    const code = readFileSync(new URL("./Sheet.tsx", import.meta.url), "utf8");
    // An inline onClose used to sit in this effect's deps. Cleanup then
    // restored focus after every keystroke, so controlled inputs kept one character.
    expect(code).toContain("onCloseRef");
    expect(code).toMatch(/document\.removeEventListener\("keydown", onKey\);\s*prevFocus\.current\?\.focus\?\.\(\);\s*\};\s*\}, \[open\]\);/);
  });
});
