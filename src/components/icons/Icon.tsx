import React from "react";
import { cn } from "@/lib/cn";
import type { AirPalIconProps, IconBadgeSize, IconBadgeVariant } from "./types";
import { BADGE_SIZE_MAP, BADGE_VARIANT_MAP, resolveIconSize, resolveIconVariantClass } from "./utils";

export const Icon = React.forwardRef<SVGSVGElement, AirPalIconProps>(function Icon(
  { icon: LucideComponent, size = "md", variant = "current", strokeWidth = 2, className, title, ...rest },
  ref,
) {
  const numericSize = resolveIconSize(size);
  const variantClass = resolveIconVariantClass(variant);

  return (
    <LucideComponent
      ref={ref}
      size={numericSize}
      strokeWidth={strokeWidth}
      className={cn("shrink-0 transition-colors", variantClass, className)}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      {...rest}
    >
      {title ? <title>{title}</title> : null}
    </LucideComponent>
  );
});

Icon.displayName = "AirPalIcon";

export interface IconBadgeProps extends Omit<AirPalIconProps, "size" | "variant"> {
  badgeVariant?: IconBadgeVariant;
  badgeSize?: IconBadgeSize;
  iconSize?: AirPalIconProps["size"];
  iconVariant?: AirPalIconProps["variant"];
  containerClassName?: string;
}

export function IconBadge({
  icon,
  badgeVariant = "brand",
  badgeSize = "md",
  iconSize,
  iconVariant = "current",
  containerClassName,
  className,
  ...rest
}: IconBadgeProps) {
  const sizeSpec = BADGE_SIZE_MAP[badgeSize] || BADGE_SIZE_MAP.md;
  const variantClasses = BADGE_VARIANT_MAP[badgeVariant] || BADGE_VARIANT_MAP.brand;

  return (
    <span className={cn("grid shrink-0 place-items-center", sizeSpec.container, variantClasses, containerClassName)}>
      <Icon icon={icon} size={iconSize ?? sizeSpec.defaultIcon} variant={iconVariant} className={className} {...rest} />
    </span>
  );
}
