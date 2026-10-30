import { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { triggerHaptic } from "@/lib/native";

interface AppleWalletButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string;
  variant?: "standard" | "compact";
}

/**
 * Official style "Add to Apple Wallet" badge button following Apple HIG.
 */
export function AppleWalletButton({ className, variant = "standard", onClick, ...props }: AppleWalletButtonProps) {
  return (
    <button
      type="button"
      aria-label={props["aria-label"] || "Add to Apple Wallet"}
      onClick={(e) => {
        void triggerHaptic("medium");
        onClick?.(e);
      }}
      className={cn(
        "group relative inline-flex touch-manipulation items-center justify-center whitespace-nowrap rounded-xl bg-black text-white shadow-md transition-[background-color,transform,box-shadow] duration-200 hover:bg-neutral-900 active:scale-[0.98] ring-1 ring-white/25 select-none cursor-pointer",
        variant === "standard" ? "min-h-[48px] px-4 py-2 gap-3" : "min-h-[44px] px-3 py-1.5 gap-2.5",
        className,
      )}
      {...props}
    >
      {/* Official Apple Wallet Passbook Icon */}
      <svg
        className={variant === "standard" ? "h-7 w-9 shrink-0" : "h-6 w-7.5 shrink-0"}
        viewBox="0 0 40 30"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Outer beige wallet housing */}
        <rect x="0.5" y="0.5" width="39" height="29" rx="4.5" fill="#DEDBD3" stroke="#C5C1B7" strokeWidth="1" />
        {/* Inner recessed card slot */}
        <rect x="2.5" y="2.5" width="35" height="16" rx="2.5" fill="#3B3A38" />
        {/* Card 1: Blue (top) */}
        <rect x="3" y="2.5" width="34" height="8" rx="2" fill="#3697F3" />
        {/* Card 2: Yellow */}
        <rect x="3" y="5.5" width="34" height="8" rx="2" fill="#F6B91D" />
        {/* Card 3: Green */}
        <rect x="3" y="8.5" width="34" height="8" rx="2" fill="#5FC343" />
        {/* Card 4: Coral Red (front with thumb circle) */}
        <rect x="3" y="11.5" width="34" height="10" rx="2" fill="#F26758" />
        {/* Front beige wallet pocket with center thumb notch */}
        <path
          d="M1 14.5H13.5C15 14.5 16 15.2 16.8 16.5C17.6 17.8 18.7 18.8 20 18.8C21.3 18.8 22.4 17.8 23.2 16.5C24 15.2 25 14.5 26.5 14.5H39V25C39 27.2091 37.2091 29 35 29H5C2.79086 29 1 27.2091 1 25V14.5Z"
          fill="#DEDBD3"
        />
        <path
          d="M1 14.5H13.5C15 14.5 16 15.2 16.8 16.5C17.6 17.8 18.7 18.8 20 18.8C21.3 18.8 22.4 17.8 23.2 16.5C24 15.2 25 14.5 26.5 14.5H39"
          stroke="#B5B1A7"
          strokeWidth="0.75"
        />
      </svg>
      <span className="flex flex-col items-start text-left leading-none">
        <span
          className={cn(
            "font-normal text-white/90 tracking-tight",
            variant === "standard" ? "text-[10px]" : "text-[9px]",
          )}
        >
          Add to
        </span>
        <span
          className={cn(
            "font-semibold text-white tracking-tight mt-0.5",
            variant === "standard" ? "text-[15px]" : "text-[13px]",
          )}
        >
          Apple Wallet
        </span>
      </span>
    </button>
  );
}
