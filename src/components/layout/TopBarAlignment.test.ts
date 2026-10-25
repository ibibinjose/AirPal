import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function read(name: string): string {
  return readFileSync(resolve(import.meta.dirname, name), "utf8");
}

/** Top menu bar alignment contract: every header control shares the same
 * control heights (32px center pills, 34px action controls), and header
 * triggers animate explicit properties instead of `transition-all`. */
describe("top bar alignment", () => {
  it("sizes center pills like the browse trigger", () => {
    const topNav = read("./TopNav.tsx");
    expect(topNav).toContain("flex h-8 sm:h-8.5 min-h-[32px]");
    expect(topNav).not.toMatch(/px-2\.5 py-0 text-\[11px\]/);
  });

  it("gives header text pills the same 34px height as icon buttons", () => {
    const topNav = read("./TopNav.tsx");
    const shell = read("./AppShell.tsx");
    expect(topNav).not.toMatch(/xl:inline-flex min-h-0/);
    expect(topNav).toContain("xl:inline-flex h-8.5 sm:h-9 min-h-[34px]");
    expect(shell).toContain("md:inline-flex h-8.5 sm:h-9 min-h-[34px]");
  });

  it("avoids transition-all on header triggers", () => {
    expect(read("./BrowseMenu.tsx")).not.toContain("font-semibold transition-all duration-200");
    expect(read("../auth/ProfileMenu.tsx")).not.toContain("bg-paper transition-all duration-200");
  });

  it("embeds the brand theme toggle in the header controls", () => {
    expect(read("./TopNav.tsx")).toContain("<ThemeToggle onBrand />");
    expect(read("./AppShell.tsx")).toContain("<ThemeToggle onBrand />");
  });
});
