import { Suspense, lazy, useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { motion, useReducedMotion } from "framer-motion";
import { Plus, Search } from "lucide-react";
import { TabBar } from "./TabBar";
import { TopNav } from "./TopNav";
import { isWorkspacePath } from "@/lib/workspace";
import { LocalNowBar } from "./LocalNowBar";
import { NetworkStatusToast } from "./NetworkStatusToast";
import { applyRouteMeta } from "@/lib/share-meta";
import { isPassApp } from "@/lib/app-flavor";
import { OPEN_SEARCH_EVENT, SEARCH_READY_EVENT, openGlobalSearch } from "@/components/search/openSearch";
import { onIdle } from "@/lib/on-idle";

// Search modal stays out of the boot bundle: mount on first open request
const GlobalSearchModal = lazy(() =>
  import("@/components/search/GlobalSearchModal").then((m) => ({ default: m.GlobalSearchModal })),
);
import { trackPageView } from "@/lib/analytics";
import { forceUnlockBodyScroll } from "@/hooks/useScrollLock";
import { BrandMark } from "@/components/brand/BrandMark";
import { ProfileMenu } from "@/components/auth/ProfileMenu";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { NotificationPopup } from "@/components/notifications/NotificationPopup";
import { PresencePublisher } from "@/components/layout/PresencePublisher";
import { DeviceMirror } from "@/components/layout/DeviceMirror";
import { cn } from "@/lib/cn";
import { enterEase, takeShellEnter } from "@/lib/motion";
import { parseAtHandle } from "@shared/bio";
import { shouldShowFooter } from "@/lib/footer-rules";
import { isNativeApp, triggerHaptic } from "@/lib/native";
import { SiteFooter } from "./SiteFooter";
import { CreateFab, openGlobalCreate } from "@/components/design-system/CreateFab";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { useDataReload } from "@/hooks/useDataReload";
import { PullToRefreshContainer } from "./PullToRefreshContainer";

export function AppShell({ children }: { children: ReactNode }) {
  const [path] = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    trackPageView(path);
    applyRouteMeta(path);
    forceUnlockBodyScroll();
  }, [path]);
  const workspace = isWorkspacePath(path);
  const homePath = isPassApp() || path.startsWith("/pass") ? "/pass" : "/";
  const showFooter = !isNativeApp() && shouldShowFooter(path);
  const bare = Boolean(parseAtHandle(path));
  const reduce = useReducedMotion();
  const [play] = useState(() => !reduce && takeShellEnter());
  const { reloadAllData } = useDataReload();
  const pullToRefresh = usePullToRefresh({
    onRefresh: reloadAllData,
    threshold: 68,
    maxPull: 110,
    disabled: bare,
  });

  const [searchArmed, setSearchArmed] = useState(false);
  const armedRef = useRef(false);
  const pendingSearch = useRef<{ detail: unknown } | null>(null);
  const flushingSearch = useRef(false);
  useEffect(() => {
    const queueOpen = (detail: unknown) => {
      if (armedRef.current) return;
      armedRef.current = true;
      pendingSearch.current = { detail };
      setSearchArmed(true);
    };
    const arm = (e: Event) => {
      if (flushingSearch.current) return;
      queueOpen((e as CustomEvent).detail);
    };
    const armOnKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k" && !armedRef.current) {
        e.preventDefault();
        queueOpen(undefined);
      }
    };
    const flush = () => {
      const pending = pendingSearch.current;
      if (!pending) return;
      pendingSearch.current = null;
      flushingSearch.current = true;
      window.dispatchEvent(new CustomEvent(OPEN_SEARCH_EVENT, { detail: pending.detail }));
      flushingSearch.current = false;
    };
    window.addEventListener(OPEN_SEARCH_EVENT, arm);
    window.addEventListener("keydown", armOnKey);
    window.addEventListener(SEARCH_READY_EVENT, flush);
    const cancelPreload = onIdle(() => {
      void import("@/components/search/GlobalSearchModal");
    });
    return () => {
      window.removeEventListener(OPEN_SEARCH_EVENT, arm);
      window.removeEventListener("keydown", armOnKey);
      window.removeEventListener(SEARCH_READY_EVENT, flush);
      cancelPreload();
    };
  }, []);

  const chrome = play
    ? {
        initial: { opacity: 0, y: -12 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.55, ease: enterEase, delay: 0.12 },
      }
    : {};

  return (
    <div className="flex min-h-[var(--visual-viewport-height,100dvh)] flex-col bg-paper">
      {bare ? (
        <main id="main-content" className="flex-1">
          {children}
        </main>
      ) : (
        <>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-[100] focus:rounded-full focus:bg-brand focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
          >
            Skip to content
          </a>
          <div className="fixed-element sticky top-0 z-40 bg-paper/95 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
            <LocalNowBar />
            {workspace ? (
              <header className="overflow-visible border-b border-black/25 bg-brand shadow-[inset_0_1px_0_rgba(255,255,255,0.25),inset_0_-2px_0_rgba(0,0,0,0.25)]">
                <div className="mx-auto flex h-10 max-w-6xl items-center justify-between app-page-gutter md:px-6">
                  <div className="flex items-center gap-2 min-w-0 shrink-0">
                    <Link href={homePath} className="flex items-center min-w-0 py-1">
                      <BrandMark compact={false} invert />
                    </Link>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        void triggerHaptic("medium");
                        openGlobalCreate();
                      }}
                      className="relative grid h-8.5 w-8.5 sm:h-9 sm:w-9 min-h-[34px] min-w-[34px] shrink-0 touch-manipulation place-items-center rounded-full bg-white text-[#004eff] hover:bg-white/95 ring-1 ring-white/60 shadow-[0_3px_10px_-2px_rgba(0,0,0,0.35)] transition-transform active:scale-95 cursor-pointer after:absolute after:-inset-1.5 after:content-['']"
                      aria-label="Create something new"
                      title="Create (+)"
                    >
                      <Plus size={18} strokeWidth={2.85} className="text-[#004eff] shrink-0" />
                    </button>
                    <Link
                      href="/"
                      aria-current={path === "/" ? "page" : undefined}
                      className={cn(
                        "hidden md:inline-flex min-h-0 touch-manipulation items-center rounded-full px-3.5 py-0 text-xs sm:text-sm font-semibold leading-none",
                        path === "/" ? "bg-white text-brand" : "text-white/80 hover:bg-white/15 hover:text-white",
                      )}
                    >
                      Home
                    </Link>
                    <NotificationBell onBrand />
                    <ProfileMenu />
                  </div>
                </div>
              </header>
            ) : (
              <>
                <TopNav path={path} enter={play} />
                <motion.div
                  {...chrome}
                  className="flex h-11 items-center justify-between bg-brand app-page-gutter lg:hidden transition-colors border-b border-black/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.25),inset_0_-2px_0_rgba(0,0,0,0.25)]"
                >
                  <div className="flex items-center gap-2 min-w-0 shrink-0">
                    <Link href={homePath} className="flex items-center min-w-0 py-1" aria-label="AirPal Home">
                      <BrandMark compact={false} invert />
                    </Link>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        void triggerHaptic("medium");
                        openGlobalCreate();
                      }}
                      className="relative grid h-8.5 w-8.5 sm:h-9 sm:w-9 min-h-[34px] min-w-[34px] shrink-0 touch-manipulation place-items-center rounded-full bg-white text-[#004eff] hover:bg-white/95 ring-1 ring-white/60 shadow-[0_3px_10px_-2px_rgba(0,0,0,0.35)] transition-transform active:scale-95 cursor-pointer after:absolute after:-inset-1.5 after:content-['']"
                      aria-label="Create something new"
                      title="Create (+)"
                    >
                      <Plus size={18} strokeWidth={2.85} className="text-[#004eff] shrink-0" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        void triggerHaptic("medium");
                        openGlobalSearch();
                      }}
                      className="relative grid h-8.5 w-8.5 sm:h-9 sm:w-9 min-h-[34px] min-w-[34px] shrink-0 touch-manipulation place-items-center rounded-full text-white bg-white/15 hover:bg-white/25 ring-1 ring-white/35 transition-transform active:scale-95 cursor-pointer after:absolute after:-inset-1.5 after:content-['']"
                      aria-label="Search"
                      title="Search AirPal (⌘K)"
                    >
                      <Search size={17} strokeWidth={2.2} className="text-white shrink-0" />
                    </button>
                    <NotificationBell onBrand />
                    <ProfileMenu />
                  </div>
                </motion.div>
              </>
            )}
          </div>
          <main id="main-content" className="flex-1 flex flex-col min-w-0" tabIndex={-1}>
            <PullToRefreshContainer state={pullToRefresh}>
              <div className={cn("flex-1", !showFooter && !workspace && "app-bottom-clearance lg:pb-8")}>
                {children}
              </div>
              {showFooter && <SiteFooter hasTabBar={!workspace} />}
            </PullToRefreshContainer>
          </main>
          {!workspace && <TabBar path={path} enter={play} />}
          <CreateFab showFab={false} />
          <PresencePublisher />
          <DeviceMirror />
          {searchArmed && (
            <Suspense fallback={null}>
              <GlobalSearchModal />
            </Suspense>
          )}
          <NetworkStatusToast />
          <NotificationPopup />
        </>
      )}
    </div>
  );
}
