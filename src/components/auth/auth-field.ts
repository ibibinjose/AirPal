import type { FocusEvent } from "react";
import { ensureElementInView } from "@/lib/keyboard";

/**
 * Mobile typography hygiene: 16px font prevents iOS Safari and Android
 * webviews from triggering unexpected viewport auto-zooms upon input focus.
 */
export const KEYBOARD_SAFE_INPUT = "text-[16px] sm:text-sm";

export function nudgeIntoView(e: FocusEvent<HTMLElement>) {
  ensureElementInView(e.currentTarget, {
    block: "center",
    topClearance: 70,
    bottomClearance: 24,
    behavior: "smooth",
  });
}
