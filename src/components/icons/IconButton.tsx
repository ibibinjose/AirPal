import React from "react";
import { cn } from "@/lib/cn";
import { triggerHaptic, triggerHapticSelection } from "@/lib/native";
import { Icon } from "./Icon";
import type { IconButtonProps } from "./types";

const VARIANT_MAP: Record<NonNullable<IconButtonProps["variant"]>, string> = {
  ghost: "bg-transparent text-ink/75 hover:bg-card/70 hover:text-ink active:bg-card/90",
  soft: "bg-card text-ink ring-1 ring-line/80 shadow-xs hover:bg-card/90 hover:ring-brand/30",
  filled: "bg-brand text-white shadow-xs hover:bg-brand/90 active:bg-brand-ink",
  glass: "apple-liquid-glass-dock text-ink hover:ring-brand/40 shadow-xs",
  outline: "bg-transparent text-ink ring-1 ring-line hover:bg-card/60 hover:ring-line/90",
};

/**
 * Apple HIG Compliant Icon Button:
 * - Guaranteed touch target >= 44x44pt (Apple HIG minimum)
 * - Tactile scale depression (scale-[0.96] on tap)
 * - Tactile micro-haptic on tap
 * - Concentric squircle geometry
 * - Explicit aria-label accessibility
 */
export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  {
    icon,
    "aria-label": ariaLabel,
    variant = "ghost",
    shape = "circle",
    size = "md",
    iconVariant = "current",
    weight = "medium",
    haptic = "selection",
    active = false,
    className,
    onClick,
    type = "button",
    disabled,
    ...rest
  },
  ref,
) {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (haptic === "selection") {
      void triggerHapticSelection();
    } else if (haptic !== "none") {
      void triggerHaptic(haptic);
    }
    onClick?.(e);
  };

  const variantClass = VARIANT_MAP[variant] || VARIANT_MAP.ghost;
  const shapeClass = shape === "circle" ? "rounded-full" : "rounded-[14px]";

  return (
    <button
      ref={ref}
      type={type}
      aria-label={ariaLabel}
      title={ariaLabel}
      disabled={disabled}
      onClick={handleClick}
      className={cn(
        // HIG Touch Ergonomics: guaranteed 44x44pt target
        "relative inline-flex min-h-[44px] min-w-[44px] h-11 w-11 shrink-0 touch-manipulation items-center justify-center cursor-pointer select-none",
        shapeClass,
        variantClass,
        // Apple spring depression
        "transition-[transform,background-color,border-color,box-shadow,color] duration-150 ease-out active:scale-[0.96]",
        // Active indicator override
        active && "bg-brand text-white ring-0 shadow-sm",
        // Disabled state
        disabled && "opacity-40 cursor-not-allowed pointer-events-none active:scale-100",
        className,
      )}
      {...rest}
    >
      <Icon icon={icon} size={size} variant={active ? "white" : iconVariant} weight={active ? "semibold" : weight} />
    </button>
  );
});

IconButton.displayName = "AirPalIconButton";
