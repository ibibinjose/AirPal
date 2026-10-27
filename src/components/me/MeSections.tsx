import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Photo } from "@/components/ui/Photo";

/** Shared /me section system: one borderless neumorphic shell, one header,
 * one row, one empty state — depth comes from twin soft shadows, never
 * rings or hairline borders. */

export function MeSection({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("neu-section p-5 sm:p-7", className)}>{children}</section>;
}

export function MeSectionHeader({
  icon,
  tileClass,
  title,
  sub,
  right,
}: {
  icon: ReactNode;
  tileClass: string;
  title: string;
  sub?: string;
  right?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 mb-5">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className={cn("grid h-9 w-9 place-items-center rounded-2xl shrink-0", tileClass)}>{icon}</span>
        <div className="min-w-0">
          <h2 className="font-display text-lg sm:text-xl font-black text-ink truncate">{title}</h2>
          {sub && <p className="text-xs text-mute font-medium truncate">{sub}</p>}
        </div>
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}

export function RowAvatar({ photo, name }: { photo?: string; name: string }) {
  return (
    <div className="h-11 w-11 overflow-hidden rounded-full neu-avatar bg-paper shrink-0">
      {photo ? (
        <Photo src={photo} className="h-full w-full object-cover rounded-full" />
      ) : (
        <span className="grid h-full w-full place-items-center bg-neutral-900 font-bold text-xs text-white rounded-full">
          {(name || "?")[0]}
        </span>
      )}
    </div>
  );
}

export function RowActions({ children, divided = true }: { children: ReactNode; divided?: boolean }) {
  if (!divided) {
    return <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">{children}</div>;
  }
  return <div className="flex w-full sm:w-auto items-center justify-end gap-2 shrink-0 pt-2.5 sm:pt-0">{children}</div>;
}

export function MeRow({
  visual,
  children,
  actions,
  toneClass = "neu-row",
  roundedClass = "",
  divided = true,
}: {
  visual: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
  toneClass?: string;
  roundedClass?: string;
  divided?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 transition-[box-shadow,transform]",
        roundedClass,
        toneClass,
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        {visual}
        <div className="min-w-0">{children}</div>
      </div>
      {actions && <RowActions divided={divided}>{actions}</RowActions>}
    </div>
  );
}

export function TodaySkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-3" role="status" aria-label="Loading your agenda">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="neu-row p-4 animate-pulse" aria-hidden="true">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-full bg-line/40 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-2/3 rounded-full bg-line/40" />
              <div className="h-2.5 w-1/3 rounded-full bg-line/30" />
            </div>
          </div>
        </div>
      ))}
      <span className="sr-only">Loading your agenda…</span>
    </div>
  );
}

export function MeEmpty({
  icon,
  title,
  body,
  children,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  children?: ReactNode;
}) {
  return (
    <div className="neu-inset p-6 text-center">
      {icon}
      <p className="font-display text-base font-bold text-ink mt-2">{title}</p>
      <p className="text-xs text-mute mt-1 max-w-md mx-auto leading-relaxed">{body}</p>
      {children && <div className="mt-4 flex flex-wrap justify-center gap-2.5">{children}</div>}
    </div>
  );
}
