import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Plus, Search } from "@/components/icons";
import { BrandMark } from "@/components/brand/BrandMark";
import { ProfileMenu } from "@/components/auth/ProfileMenu";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { openGlobalCreate } from "@/components/design-system/CreateFab";
import { openGlobalSearch } from "@/components/search/openSearch";
import { cn } from "@/lib/cn";
import { enterEase } from "@/lib/motion";
import { triggerHaptic, triggerHapticSelection } from "@/lib/native";

import { useAuth } from "@/contexts/AuthContext";
import { useBio } from "@/contexts/BioContext";
import { partnerAccountPath } from "@/lib/partner-account";
import { BrowseMenu } from "@/components/layout/BrowseMenu";
import { PILLARS, type PillarItem } from "@/lib/pillars";
import { NAMES } from "@shared/names";

export function TopNav({ path, enter = false }: { path: string; enter?: boolean }) {
  const [, nav] = useLocation();
  const { user, isHost } = useAuth();
  const { business } = useBio();

  const renderPillar = (pillar: PillarItem) => {
    const isActive = pillar.match(path);
    const Icon = pillar.icon;
    return (
      <button
        key={pillar.href}
        onClick={() => {
          void triggerHapticSelection();
          nav(pillar.href);
        }}
        aria-current={isActive ? "page" : undefined}
        className={cn(
          "flex min-h-[44px] touch-manipulation items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold transition-[background-color,color,box-shadow,transform] duration-200 cursor-pointer active:scale-[0.97]",
          isActive
            ? "bg-white text-[#2F00FF] shadow-[0_4px_12px_-4px_rgba(0,0,0,0.35)]"
            : "text-white/75 hover:bg-white/10 hover:text-white",
        )}
      >
        <Icon size={14} className={isActive ? "text-[#2F00FF]" : "text-white/70"} />
        <span>{pillar.label}</span>
      </button>
    );
  };

  return (
    <motion.header
      className="hidden bg-[#2F00FF] border-b border-white/10 lg:block transition-[background-color,border-color] duration-300"
      initial={enter ? { opacity: 0, y: -12 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: enterEase, delay: 0.12 }}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 md:px-6">
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => {
              void triggerHaptic("light");
              nav("/");
            }}
            className="shrink-0 text-left transition hover:opacity-90 cursor-pointer"
            aria-label="AirPal Home"
          >
            <BrandMark invert />
          </button>
        </div>
        <nav className="flex items-center justify-center gap-1 rounded-full bg-white/10 p-1 ring-1 ring-white/25 shadow-xs">
          {PILLARS.map(renderPillar)}
          <BrowseMenu path={path} isHost={isHost} />
        </nav>
        <div className="flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              void triggerHaptic("medium");
              openGlobalSearch();
            }}
            className="flex h-11 w-11 touch-manipulation place-items-center justify-center rounded-full text-white/85 hover:bg-white/10 hover:text-white ring-1 ring-white/25 transition-transform active:scale-95 cursor-pointer"
            aria-label="Search"
            title="Search AirPal (⌘K)"
          >
            <Search size={16} />
          </button>

          <button
            type="button"
            onClick={() => {
              void triggerHaptic("medium");
              openGlobalCreate();
            }}
            className="flex h-11 w-11 min-h-[44px] min-w-[44px] touch-manipulation place-items-center justify-center shrink-0 rounded-full bg-white text-[#2F00FF] shadow-[0_6px_16px_-8px_rgba(0,0,0,0.45)] hover:bg-white/90 transition-[background-color,box-shadow,transform] active:scale-[0.97] cursor-pointer"
            aria-label="Create something new"
            title="Create (+)"
          >
            <Plus size={18} strokeWidth={2.5} />
          </button>

          <button
            onClick={() => {
              void triggerHaptic("light");
              nav("/scan");
            }}
            className="hidden xl:inline-flex h-9 shrink-0 items-center rounded-full bg-white/10 px-3.5 text-sm font-semibold text-white ring-1 ring-white/25 hover:bg-white/20 transition active:scale-95 lg:h-10 cursor-pointer"
            title="Scan QR / Room"
          >
            Scan
          </button>
          {isHost ? (
            <button
              onClick={() => {
                void triggerHaptic("light");
                nav("/event");
              }}
              className="hidden xl:inline-flex h-9 shrink-0 items-center rounded-full bg-white/10 px-4 text-sm font-semibold text-white ring-1 ring-white/25 hover:bg-white/20 transition lg:h-10 cursor-pointer"
            >
              Host
            </button>
          ) : (
            <button
              onClick={() => {
                void triggerHaptic("light");
                nav(partnerAccountPath({ signedIn: Boolean(user), hasPlace: Boolean(business) }));
              }}
              aria-label={NAMES.partnerAccount}
              className="hidden xl:inline-flex h-9 shrink-0 items-center rounded-full bg-white/10 px-4 text-sm font-semibold text-white ring-1 ring-white/25 hover:bg-white/20 transition active:scale-95 lg:h-10 cursor-pointer"
            >
              {NAMES.partnerAccount}
            </button>
          )}
          <NotificationBell onBrand />
          <ProfileMenu />
        </div>
      </div>
    </motion.header>
  );
}
