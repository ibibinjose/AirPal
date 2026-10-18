/**
 * AirPal Central Icon Library
 *
 * Provides brand-consistent icon styling defined in index.css (AirPal blue #004eff,
 * neutral dark text #121614, muted grey #6a726c, celebration palette, touch-target
 * ergonomics, and liquid glass badge containers).
 *
 * Re-exports all Lucide icons and types for unified single-point imports across the app.
 */

// Core icon components
export { Icon, IconBadge, type IconBadgeProps } from "./Icon";

// Utilities & mappings
export {
  resolveIconSize,
  resolveIconVariantClass,
  SIZE_MAP,
  VARIANT_CLASS_MAP,
  BADGE_VARIANT_MAP,
  BADGE_SIZE_MAP,
} from "./utils";

// Types
export type { IconSize, IconVariant, IconBadgeVariant, IconBadgeSize, AirPalIconProps } from "./types";

// Complete re-export of all Lucide icons and types for full compatibility
export * from "lucide-react";
