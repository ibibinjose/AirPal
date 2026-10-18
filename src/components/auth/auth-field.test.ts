import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/keyboard", () => ({
  ensureElementInView: vi.fn(),
}));

import { ensureElementInView } from "@/lib/keyboard";
import { KEYBOARD_SAFE_INPUT, nudgeIntoView } from "./auth-field";

describe("auth field helpers", () => {
  it("keeps inputs at 16px on mobile to prevent auto-zoom", () => {
    expect(KEYBOARD_SAFE_INPUT).toContain("text-[16px]");
  });

  it("nudges the focused element into view with fixed clearances", () => {
    const target = {} as HTMLElement;
    nudgeIntoView({ currentTarget: target } as unknown as React.FocusEvent<HTMLElement>);
    expect(ensureElementInView).toHaveBeenCalledWith(target, {
      block: "center",
      topClearance: 70,
      bottomClearance: 24,
      behavior: "smooth",
    });
  });
});
