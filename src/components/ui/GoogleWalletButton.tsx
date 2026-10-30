import { type ButtonHTMLAttributes, useId } from "react";
import { cn } from "@/lib/cn";
import { triggerHaptic } from "@/lib/native";

interface GoogleWalletButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string;
  variant?: "standard" | "compact";
}

/**
 * Official style "Add to Google Wallet" pill badge button following Google Wallet Brand Guidelines.
 * Opens the signed Google save link minted by /api/wallet/google/* — same passes as Apple Wallet, Google flavored.
 */
export function GoogleWalletButton({ className, variant = "standard", onClick, ...props }: GoogleWalletButtonProps) {
  const clipId = useId();
  return (
    <button
      type="button"
      aria-label={props["aria-label"] || "Add to Google Wallet"}
      onClick={(e) => {
        void triggerHaptic("medium");
        onClick?.(e);
      }}
      className={cn(
        "group relative inline-flex touch-manipulation select-none items-center justify-center whitespace-nowrap rounded-full bg-[#1F1F1F] text-white shadow-md ring-1 ring-white/20 transition-[background-color,transform,box-shadow] duration-200 hover:bg-[#2B2B2B] active:scale-[0.98] cursor-pointer",
        variant === "standard" ? "min-h-[48px] px-5 py-2 gap-3" : "min-h-[44px] px-3.5 py-1.5 gap-2.5",
        className,
      )}
      {...props}
    >
      {/* Official Google Wallet Multi-Color Folded Card Icon */}
      <svg
        className={variant === "standard" ? "h-7 w-8 shrink-0" : "h-6 w-7 shrink-0"}
        viewBox="0 0 36 30"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <clipPath id={clipId}>
            <rect x="1" y="1" width="34" height="28" rx="6.5" />
          </clipPath>
        </defs>
        <g clipPath={`url(#${clipId})`}>
          {/* Green top card */}
          <rect x="1" y="1" width="34" height="14" rx="5" fill="#34A853" />
          {/* Yellow second card */}
          <rect x="1" y="5.5" width="34" height="14" rx="5" fill="#FBBC04" />
          {/* Red third card */}
          <rect x="1" y="10" width="34" height="14" rx="5" fill="#EA4335" />
          {/* Blue front pocket with asymmetric wave */}
          <path
            d="M1 12.5C1 12.5 5 15.2 12.5 16.5C20 17.8 23.5 18.8 27 18.5C30.5 18.2 35 15 35 15V29H1V12.5Z"
            fill="#4285F4"
          />
        </g>
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
          Google Wallet
        </span>
      </span>
    </button>
  );
}
