import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { triggerHaptic } from "@/lib/native";

interface GoogleWalletButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string;
  variant?: "standard" | "compact";
}

/**
 * "Save to Google Wallet" button. Opens the signed Google save link minted
 * by /api/wallet/google/* — same passes as Apple Wallet, Google flavored.
 */
export function GoogleWalletButton({ className, variant = "standard", onClick, ...props }: GoogleWalletButtonProps) {
  return (
    <button
      type="button"
      onClick={(e) => {
        void triggerHaptic("medium");
        onClick?.(e);
      }}
      className={cn(
        "group relative inline-flex touch-manipulation select-none items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-card font-medium text-ink shadow-md ring-1 ring-line transition-[background-color,transform] duration-200 hover:bg-paper active:scale-[0.98] cursor-pointer",
        variant === "standard" ? "min-h-[44px] px-4 py-2.5 text-xs tracking-tight" : "min-h-[44px] px-3 py-1.5 text-xs",
        className,
      )}
      {...props}
    >
      {/* Google Wallet Multi-Color Pass Icon */}
      <svg
        className={variant === "standard" ? "h-5 w-5 shrink-0" : "h-4 w-4 shrink-0"}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <rect x="2" y="5" width="28" height="22" rx="5" fill="#FFFFFF" stroke="#E4E7EE" strokeWidth="1.2" />
        <path d="M5 10.5C5 9.11929 6.11929 8 7.5 8H24.5C25.8807 8 27 9.11929 27 10.5V13H5V10.5Z" fill="#4285F4" />
        <path d="M5 12.5H27V16.5H5V12.5Z" fill="#34A853" />
        <path d="M5 15.5H27V19.5H5V15.5Z" fill="#FBBC04" />
        <path
          d="M5 18.5H21.5C22.8807 18.5 24 19.6193 24 21V23.5H7.5C6.11929 23.5 5 22.3807 5 21V18.5Z"
          fill="#EA4335"
        />
        <circle cx="24.5" cy="21" r="2" fill="#4285F4" />
      </svg>
      <span className="whitespace-nowrap font-semibold text-ink/90 group-hover:text-ink">
        Save to <span className="font-bold">Google Wallet</span>
      </span>
    </button>
  );
}
