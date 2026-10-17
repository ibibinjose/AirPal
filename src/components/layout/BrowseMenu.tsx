import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { useLocation } from "wouter";
import { ChevronDown } from "lucide-react";
import { BROWSE_LINKS, BROWSE_SECTIONS, HOST_LINKS, type BrowseLink } from "@/lib/browse-menu";
import { cn } from "@/lib/cn";
import { triggerHaptic } from "@/lib/native";

function MenuLink({ link, active, onGo }: { link: BrowseLink; active: boolean; onGo: (href: string) => void }) {
  const Icon = link.icon;
  return (
    <button
      type="button"
      role="menuitem"
      aria-current={active ? "page" : undefined}
      onClick={() => onGo(link.href)}
      className={cn(
        "flex min-h-[44px] w-full touch-manipulation items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition",
        active ? "bg-brand text-white shadow-xs" : "text-ink hover:bg-paper",
      )}
    >
      <span
        className={cn(
          "grid h-8 w-8 shrink-0 place-items-center rounded-lg",
          active ? "bg-brand" : "bg-brand/10 text-accent",
        )}
      >
        <Icon size={16} />
      </span>
      {link.label}
    </button>
  );
}

/** Desktop Browse dropdown for the top bar: full grouped sitemap. */
export function BrowseMenu({ path, isHost }: { path: string; isHost: boolean }) {
  const [, nav] = useLocation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const sections = BROWSE_SECTIONS.filter((section) => !section.hostsOnly || isHost);
  // The pill lights up only in discovery context — not on account/help pages
  // that the sitemap also lists.
  const active = [...BROWSE_LINKS, ...HOST_LINKS].some((link) => link.match(path));

  useEffect(() => {
    if (!open) return;
    const onDown = (event: PointerEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [path]);

  const go = (href: string) => {
    void triggerHaptic("light");
    setOpen(false);
    nav(href);
  };

  function onMenuKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    const items = Array.from(ref.current?.querySelectorAll<HTMLButtonElement>("[role='menuitem']") || []);
    if (items.length === 0) return;
    const active = document.activeElement as HTMLElement | null;
    const idx = items.findIndex((el) => el === active);
    if (event.key === "ArrowDown") {
      event.preventDefault();
      items[idx < 0 ? 0 : (idx + 1) % items.length]?.focus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      items[idx < 0 ? items.length - 1 : (idx - 1 + items.length) % items.length]?.focus();
    } else if (event.key === "Home") {
      event.preventDefault();
      items[0]?.focus();
    } else if (event.key === "End") {
      event.preventDefault();
      items[items.length - 1]?.focus();
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => {
          void triggerHaptic("light");
          setOpen((was) => !was);
        }}
        className={cn(
          "flex h-8.5 touch-manipulation cursor-pointer items-center gap-1 rounded-full px-3.5 text-sm font-semibold transition-all duration-200",
          active || open
            ? "bg-white text-[#2F00FF] shadow-[0_4px_12px_-4px_rgba(0,0,0,0.35)]"
            : "text-white/75 hover:bg-white/10 hover:text-white",
        )}
      >
        Browse
        <ChevronDown size={14} className={cn("transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div
          role="menu"
          aria-label="Browse AirPal"
          onKeyDown={onMenuKeyDown}
          className="absolute left-1/2 top-full z-50 mt-2 max-h-[70vh] w-72 -translate-x-1/2 overflow-y-auto overscroll-contain rounded-2xl bg-card p-2 shadow-xl ring-1 ring-line"
        >
          {sections.map((section, index) => (
            <div key={section.title}>
              {index > 0 && <div className="mx-2 my-2 border-t border-line" />}
              <p className="px-3 pb-1 pt-2 text-[10px] font-black uppercase tracking-wider text-mute">
                {section.title}
              </p>
              {section.links.map((link) => (
                <MenuLink key={link.href} link={link} active={link.match(path)} onGo={go} />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
