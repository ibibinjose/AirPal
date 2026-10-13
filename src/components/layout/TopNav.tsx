import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Plus } from "@/components/icons";
import { BrandMark } from "@/components/brand/BrandMark";
import { ProfileMenu } from "@/components/auth/ProfileMenu";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { openGlobalCreate } from "@/components/design-system/CreateFab";
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
          "flex min-h-[40px] touch-manipulation items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold transition-[background-color,color,box-shadow,transform] duration-200 cursor-pointer active:scale-[0.97]",
          isActive
            ? "bg-brand text-white shadow-[0_4px_12px_-4px_rgba(24,5,219,0.35)]"
            : "text-mute hover:bg-paper/80 hover:text-ink",
        )}
      >
        <Icon size={14} className={isActive ? "text-white" : "text-accent"} />
        <span>{pillar.label}</span>
      </button>
    );
  };

  return (
    <motion.header
      className="apple-liquid-glass-nav hidden lg:block transition-[background-color,border-color] duration-300"
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
            <BrandMark />
          </button>
        </div>
        <nav className="flex items-center justify-center gap-1 rounded-full bg-card/80 p-1 ring-1 ring-line/80 shadow-xs">
          {PILLARS.map(renderPillar)}
          <BrowseMenu path={path} isHost={isHost} />
        </nav>
        <div className="flex items-center justify-end gap-2 shrink-0">
          <button
            onClick={() => {
              void triggerHaptic("medium");
              openGlobalCreate();
            }}
            className="flex h-11 min-h-[44px] items-center gap-1.5 shrink-0 rounded-full bg-brand px-4 text-sm font-semibold text-white shadow-[0_6px_16px_-8px_rgba(24,5,219,0.45)] hover:bg-brand-ink transition-[background-color,box-shadow,transform] active:scale-[0.97] cursor-pointer"
            aria-label="Create something new"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>Create</span>
          </button>

          <button
            onClick={() => {
              void triggerHaptic("light");
              nav("/scan");
            }}
            className="hidden xl:inline-flex h-9 shrink-0 items-center rounded-full bg-card px-3.5 text-sm font-semibold text-ink ring-1 ring-line hover:bg-paper hover:text-accent transition active:scale-95 lg:h-10 cursor-pointer"
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
              className="hidden xl:inline-flex h-9 shrink-0 items-center rounded-full bg-card px-4 text-sm font-semibold ring-1 ring-line hover:bg-paper transition lg:h-10 cursor-pointer"
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
              className="hidden xl:inline-flex h-9 shrink-0 items-center rounded-full bg-card px-4 text-sm font-semibold ring-1 ring-line hover:bg-paper transition active:scale-95 lg:h-10 cursor-pointer"
            >
              {NAMES.partnerAccount}
            </button>
          )}
          <NotificationBell />
          <ProfileMenu />
        </div>
      </div>
    </motion.header>
  );
}
