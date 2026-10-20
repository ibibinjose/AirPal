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
          "flex h-8 sm:h-8.5 min-h-[32px] sm:min-h-[34px] shrink-0 whitespace-nowrap touch-manipulation items-center gap-1.5 rounded-full px-3 text-xs sm:text-[13px] font-semibold transition-[background-color,color,box-shadow,transform] duration-200 cursor-pointer active:scale-[0.97]",
          isActive
            ? "bg-white text-brand shadow-[0_4px_12px_-4px_rgba(0,0,0,0.35)]"
            : "text-white hover:bg-white/15 hover:text-white",
        )}
      >
        <Icon size={14} className={isActive ? "text-brand" : "text-white"} />
        <span>{pillar.label}</span>
      </button>
    );
  };

  return (
    <motion.header
      className="hidden bg-brand border-b border-white/15 lg:block transition-[background-color,border-color] duration-300"
      initial={enter ? { opacity: 0, y: -12 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: enterEase, delay: 0.12 }}
    >
      <div className="mx-auto flex h-12 max-w-7xl items-center justify-between gap-3 sm:gap-4 app-page-gutter md:px-6">
        <div className="flex flex-1 items-center justify-start min-w-[180px] shrink-0">
          <button
            onClick={() => {
              void triggerHaptic("light");
              nav("/");
            }}
            className="flex items-center shrink-0 text-left transition hover:opacity-95 active:scale-[0.98] cursor-pointer"
            aria-label="AirPal Home"
          >
            <BrandMark invert />
          </button>
        </div>
        <nav className="flex items-center justify-center gap-1 rounded-full bg-white/15 p-0.5 ring-1 ring-white/25 shadow-xs shrink-0">
          {PILLARS.map(renderPillar)}
          <BrowseMenu path={path} isHost={isHost} />
        </nav>
        <div className="flex flex-1 items-center justify-end gap-2 sm:gap-2.5 min-w-[180px] shrink-0">
          <button
            type="button"
            onClick={() => openGlobalSearch()}
            aria-label="Search AirPal (⌘K)"
            title="Search (⌘K)"
            className="relative grid h-8.5 w-8.5 sm:h-9 sm:w-9 min-h-[34px] min-w-[34px] shrink-0 touch-manipulation place-items-center rounded-full text-white bg-white/15 hover:bg-white/25 ring-1 ring-white/35 transition-transform active:scale-95 cursor-pointer after:absolute after:-inset-1.5 after:content-['']"
          >
            <Search size={17} strokeWidth={2.2} className="text-white shrink-0" />
          </button>

          <button
            type="button"
            onClick={() => {
              void triggerHaptic("medium");
              openGlobalCreate();
            }}
            aria-label="Create something new (+)"
            title="Create (+)"
            className="relative grid h-8.5 w-8.5 sm:h-9 sm:w-9 min-h-[34px] min-w-[34px] shrink-0 touch-manipulation place-items-center rounded-full bg-white text-[#004eff] hover:bg-white/95 shadow-[0_3px_10px_-2px_rgba(0,0,0,0.35)] ring-1 ring-white/60 transition-transform active:scale-95 cursor-pointer after:absolute after:-inset-1.5 after:content-['']"
          >
            <Plus size={18} strokeWidth={2.85} className="text-[#004eff] shrink-0" />
          </button>

          <button
            onClick={() => {
              void triggerHaptic("light");
              nav("/scan");
            }}
            className="hidden xl:inline-flex h-8 sm:h-8.5 min-h-[32px] sm:min-h-[34px] shrink-0 whitespace-nowrap items-center rounded-full bg-white/15 px-3 text-xs sm:text-[13px] font-semibold text-white ring-1 ring-white/35 hover:bg-white/25 transition active:scale-95 cursor-pointer"
            title="Scan QR"
          >
            Scan
          </button>
          {isHost ? (
            <button
              onClick={() => {
                void triggerHaptic("light");
                nav("/event");
              }}
              className="hidden xl:inline-flex h-8 sm:h-8.5 min-h-[32px] sm:min-h-[34px] shrink-0 whitespace-nowrap items-center rounded-full bg-white/15 px-3 text-xs sm:text-[13px] font-semibold text-white ring-1 ring-white/35 hover:bg-white/25 transition active:scale-95 cursor-pointer"
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
              className="hidden xl:inline-flex h-8 sm:h-8.5 min-h-[32px] sm:min-h-[34px] shrink-0 whitespace-nowrap items-center rounded-full bg-white/15 px-3 text-xs sm:text-[13px] font-semibold text-white ring-1 ring-white/35 hover:bg-white/25 transition active:scale-95 cursor-pointer"
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
