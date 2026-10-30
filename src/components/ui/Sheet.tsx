import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useScrollLock } from "@/hooks/useScrollLock";
import { dismissKeyboard } from "@/lib/keyboard";
import { cn } from "@/lib/cn";

export function Sheet({
  open,
  onClose,
  title,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const prevFocus = useRef<HTMLElement | null>(null);
  useScrollLock(open);

  const handleClose = () => {
    void dismissKeyboard();
    onClose();
  };

  // Escape to close, initial focus into the sheet, Tab trapped inside,
  // and focus restored to the opener on close.
  useEffect(() => {
    if (!open) return;
    prevFocus.current = document.activeElement as HTMLElement | null;
    panelRef.current?.focus({ preventScroll: true });
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        handleClose();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusables = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      prevFocus.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="visual-viewport-modal z-[100] flex items-end justify-center sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-xs"
        aria-label={`Close ${title || "dialog"}`}
        onClick={handleClose}
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        className={cn(
          "scroll-container safe-bottom relative z-10 max-h-[min(88dvh,calc(var(--visual-viewport-height,100dvh)-1.5rem))] w-full rounded-t-3xl bg-card p-5 shadow-2xl sm:max-w-md sm:rounded-3xl transition-[transform,opacity] duration-200",
          className,
        )}
      >
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-line/80 sm:hidden" />
        <div className="mb-4 flex items-center justify-between gap-3">
          {title ? (
            <h2 id={titleId} className="font-display text-xl font-semibold text-ink">
              {title}
            </h2>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={handleClose}
            aria-label={`Close ${title || "dialog"}`}
            className="grid h-10 w-10 min-h-[44px] min-w-[44px] place-items-center rounded-full text-mute transition hover:bg-paper hover:text-ink active:scale-95 cursor-pointer"
          >
            <X size={18} aria-hidden="true" />
            <span className="sr-only">Close {title || "dialog"}</span>
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
