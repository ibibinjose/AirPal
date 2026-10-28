import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  ArrowRight,
  Bell,
  Building2,
  Calendar,
  Camera,
  Check,
  ChevronRight,
  Clock,
  Coffee,
  Contact,
  Copy,
  Edit3,
  ExternalLink,
  Flame,
  HeartHandshake,
  Images,
  LogOut,
  MapPin,
  MessageSquare,
  PhoneCall,
  Plus,
  QrCode,
  Settings,
  Share2,
  ShieldCheck,
  Shirt,
  Sparkles,
  Store,
  Sun,
  Ticket,
  Trash2,
  UserRound,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useBio } from "@/contexts/BioContext";
import { useLocalNow } from "@/contexts/LocalNowContext";
import { useMyBookings } from "@/hooks/useMyBookings";
import {
  listCatchUps,
  subscribeCatchUpsForOwner,
  subscribeMyCatchUps,
  updateCatchUpStatus,
  type CatchUpItem,
} from "@/lib/catchup";
import { getDailyOutfitRecommendation } from "@/lib/outfit";
import { AddToCalendarMenu } from "@/components/calendar/AddToCalendarMenu";
import { CalendarRescheduleModal } from "@/components/calendar/CalendarRescheduleModal";
import { PersonalScheduleModal } from "@/components/calendar/PersonalScheduleModal";
import { AuthGate } from "@/components/auth/AuthGate";
import { PageLoading } from "@/components/ui/PageLoading";
import { VerifyEmailBanner } from "@/components/auth/VerifyEmailBanner";
import { Button } from "@/components/ui/Button";
import { Photo } from "@/components/ui/Photo";
import { BioKindBadge, BioKindIcon } from "@/components/bio/BioKindBadge";
import { DigitalBioPassCard } from "@/components/bio/DigitalBioPassCard";
import { BioShareModal } from "@/components/bio/BioShareModal";
import { BioSiteModal } from "@/components/bio/BioSiteView";
import { InvitePanel } from "@/components/invite/InvitePanel";
import { ChangeHandleForm } from "@/components/bio/ChangeHandleForm";
import { AppleWalletButton } from "@/components/ui/AppleWalletButton";
import { GoogleWalletButton } from "@/components/ui/GoogleWalletButton";
import { TabPills } from "@/components/ui/TabPills";
import { MeEmpty, MeRow, MeSection, MeSectionHeader, RowAvatar, TodaySkeleton } from "@/components/me/MeSections";
import { MeOverview, type OverviewGlanceItem } from "@/components/me/MeOverview";
import { googleWalletTicketUrl, openAppleWalletPass, openGoogleWalletPass, ticketWalletPassUrl } from "@/lib/wallet";
import { makeQrDataUrl } from "@/lib/qr";
import { bioSiteDisplayOrigin, bioSiteUrl } from "@/lib/biosite";
import { triggerHaptic, triggerHapticSelection } from "@/lib/native";
import { toPublicUrl } from "@/lib/public-origin";
import { bioPath } from "@shared/bio";
import { partnerAccountPath } from "@/lib/partner-account";
import { NAMES } from "@shared/names";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import { useEvents } from "@/contexts/EventsContext";
import {
  pendingAppointments as selectPendingAppointments,
  todayAppointments as selectTodayAppointments,
  todayPersonalPlans as selectTodayPersonalPlans,
  todayTickets as selectTodayTickets,
  upcomingScheduledAppointments as selectUpcomingScheduled,
  upcomingTickets as selectUpcomingTickets,
} from "@/lib/me-day";
import type { CalendarEvent } from "@shared/event";

import type { RouteComponentProps } from "wouter";

type MeTab = "today" | "all" | "appointments" | "tickets" | "pass";

export interface MePageProps extends Partial<RouteComponentProps> {
  defaultTab?: MeTab;
}

export function MePage({ defaultTab }: MePageProps = {}) {
  const [, nav] = useLocation();
  const { user, authReady, logout, sendVerificationEmail, isHost } = useAuth();
  const { mine, business, biosReady, updateProfile } = useBio();
  const { today, weather, city, day } = useLocalNow();
  const { upcomingBookings, loading: bookingsLoading } = useMyBookings();
  const { myEvent, calendarEvents, upsertEvent, setEventStatus } = useEvents();

  const [catchUpsList, setCatchUpsList] = useState<CatchUpItem[]>(() => listCatchUps());
  // True once the owner inbox has synced at least once — until then an empty
  // agenda means "still loading", never "an open day".
  const [catchupsSynced, setCatchupsSynced] = useState(() => listCatchUps().length > 0);
  const [myReminders, setMyReminders] = useState<CatchUpItem[]>(() =>
    listCatchUps().filter((item) => item.isReminderOnly && item.status !== "dismissed"),
  );
  const [bioQrData, setBioQrData] = useState<string>("");
  const [copiedBioLink, setCopiedBioLink] = useState(false);
  const [activeTab, setActiveTab] = useState<MeTab>(() => {
    if (defaultTab) return defaultTab;
    if (typeof window !== "undefined" && window.location?.search) {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab") as MeTab | null;
      if (tabParam && ["today", "all", "appointments", "tickets", "pass"].includes(tabParam)) {
        return tabParam;
      }
    }
    return "today";
  });
  const [showShareModal, setShowShareModal] = useState(false);
  const [showBioSite, setShowBioSite] = useState(false);
  const [bioSiteQr, setBioSiteQr] = useState("");
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [rescheduleTarget, setRescheduleTarget] = useState<CalendarEvent | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Subscribe to live catch-up proposals & appointments
  useEffect(() => {
    if (!user?.uid) {
      setCatchupsSynced(true);
      return;
    }
    return subscribeCatchUpsForOwner(user.uid, (items) => {
      setCatchUpsList(items);
      setCatchupsSynced(true);
    });
  }, [user?.uid]);

  // Subscribe to my saved catch-up reminders (bookmark flags I set on bios)
  useEffect(() => {
    if (!user?.uid) {
      setMyReminders([]);
      setCatchupsSynced(true);
      return;
    }
    return subscribeMyCatchUps(user.uid, (items) => {
      setMyReminders(items.filter((item) => item.isReminderOnly));
      setCatchupsSynced(true);
    });
  }, [user?.uid]);

  // Generate bio QR data url
  useEffect(() => {
    if (!mine?.handle) return;
    let live = true;
    void makeQrDataUrl(toPublicUrl(bioPath(mine.handle)), 320).then((url) => {
      if (live) setBioQrData(url);
    });
    return () => {
      live = false;
    };
  }, [mine?.handle]);

  // Generate BioSite QR on demand (points at the display origin, not airpal.me)
  useEffect(() => {
    if (!showBioSite || !mine?.handle) return;
    let live = true;
    void makeQrDataUrl(bioSiteUrl(mine.handle, bioSiteDisplayOrigin()), 320).then((url) => {
      if (live) setBioSiteQr(url);
    });
    return () => {
      live = false;
    };
  }, [showBioSite, mine?.handle]);

  const outfitAdvice = useMemo(() => {
    if (!weather) return null;
    return getDailyOutfitRecommendation(weather.temp, weather.code, weather.isDay);
  }, [weather]);

  const formattedToday = useMemo(() => {
    try {
      const parts = today.split("-");
      if (parts.length === 3) {
        const [y, m, d] = parts.map(Number);
        const dt = new Date(y, m - 1, d);
        return dt.toLocaleDateString(undefined, {
          weekday: "short",
          day: "numeric",
          month: "short",
          year: "numeric",
        });
      }
    } catch {
      // fallback
    }
    return day || today;
  }, [today, day]);

  // TODAY'S ITEMS — three sources, one agenda:
  // 1. catch-ups: 1-on-1s other people proposed to me (requesterName/venue shown per row)
  // 2. personal plans: my own Going commitments from /calendar (title/venue shown per row)
  // 3. tickets: live bookings for today (event title/suburb shown per row)
  const todayAppointments = useMemo(() => selectTodayAppointments(catchUpsList, today), [catchUpsList, today]);

  const todayPlans = useMemo(() => selectTodayPersonalPlans(calendarEvents, today), [calendarEvents, today]);

  const todayTickets = useMemo(() => selectTodayTickets(upcomingBookings, today), [upcomingBookings, today]);

  const todayTotalCount = todayAppointments.length + todayPlans.length + todayTickets.length;

  // While bookings or the inbox are still syncing, empty means "loading".
  const agendaLoading = bookingsLoading || !catchupsSynced;

  // OVERVIEW GLANCE LISTS (condensed, read-only; full CRUD lives in each tab)
  const glanceToday = useMemo<OverviewGlanceItem[]>(() => {
    const items: OverviewGlanceItem[] = [
      ...todayAppointments.slice(0, 2).map((item) => ({
        id: item.id,
        title: item.requesterName,
        sub: `${item.type === "meeting" ? "Meeting" : item.type === "nightout" ? "Hangout" : "Coffee"}${item.time ? ` · ${item.time}` : ""}${item.venue ? ` @ ${item.venue}` : ""}`,
        kind: "catchup" as const,
      })),
      ...todayPlans.slice(0, 2).map((plan) => ({
        id: plan.id,
        title: plan.title,
        sub: `${plan.timeLabel || plan.startsAt.slice(11, 16)}${plan.venue ? ` @ ${plan.venue}` : ""}`,
        kind: "plan" as const,
      })),
      ...todayTickets.slice(0, 2).map((ticket) => ({
        id: ticket.id,
        title: ticket.title,
        sub: `Pass (${ticket.spots || 1}x)${ticket.suburb ? ` · ${ticket.suburb}` : ""}`,
        kind: "ticket" as const,
      })),
    ];
    return items.slice(0, 5);
  }, [todayAppointments, todayPlans, todayTickets]);

  // UPCOMING ITEMS
  const pendingAppointments = useMemo(() => selectPendingAppointments(catchUpsList), [catchUpsList]);

  const upcomingScheduledAppointments = useMemo(
    () => selectUpcomingScheduled(catchUpsList, today),
    [catchUpsList, today],
  );

  const upcomingTickets = useMemo(() => selectUpcomingTickets(upcomingBookings, today), [upcomingBookings, today]);

  const glanceUpcoming = useMemo<OverviewGlanceItem[]>(() => {
    const items: OverviewGlanceItem[] = [
      ...upcomingScheduledAppointments.slice(0, 3).map((item) => ({
        id: item.id,
        title: item.requesterName,
        sub: `${item.date || "Upcoming"}${item.time ? ` · ${item.time}` : ""}${item.venue ? ` @ ${item.venue}` : ""}`,
        kind: "catchup" as const,
      })),
      ...upcomingTickets.slice(0, 2).map((ticket) => ({
        id: ticket.id,
        title: ticket.title,
        sub: `${ticket.date || "Anytime"}${ticket.suburb ? ` · ${ticket.suburb}` : ""}`,
        kind: "ticket" as const,
      })),
    ];
    return items.slice(0, 5);
  }, [upcomingScheduledAppointments, upcomingTickets]);

  const handleCopyBioLink = async () => {
    if (!mine?.handle) {
      nav("/bio/setup");
      return;
    }
    void triggerHaptic("light");
    const link = toPublicUrl(bioPath(mine.handle));
    try {
      await navigator.clipboard.writeText(link);
      setCopiedBioLink(true);
      toast.success("Public Bio link copied to clipboard!");
      setTimeout(() => setCopiedBioLink(false), 2000);
    } catch {
      toast.message(link);
    }
  };

  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!mine) {
      nav("/bio/setup");
      return;
    }
    try {
      const { readFileAsImage, storeMedia } = await import("@/lib/image-store");
      const img = await readFileAsImage(file);
      const canvas = document.createElement("canvas");
      canvas.width = 400;
      canvas.height = 400;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img.image, 0, 0, 400, 400);
        canvas.toBlob(
          async (blob) => {
            if (blob) {
              const src = await storeMedia(blob, { folder: "bios", kind: "avatar" });
              await updateProfile({ handle: mine.handle, avatar: src });
              toast.success("Profile photo updated");
            }
          },
          "image/webp",
          0.9,
        );
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload photo");
    }
  };

  if (!authReady) {
    return <PageLoading message="Loading your AirPal Me…" />;
  }

  if (!user) {
    return (
      <AuthGate
        next="/me"
        kicker="AirPal Me"
        title="Your AirPal Me account"
        lede="Sign in or create an account to access your AirPal Me home, tickets, and appointments."
      />
    );
  }

  const handleTabChange = (tab: MeTab) => {
    void triggerHapticSelection();
    setActiveTab(tab);
    // Keep the active pill visible: five tabs overflow a 390px screen, so
    // glide it into view like a native segmented control.
    if (typeof document !== "undefined" && typeof requestAnimationFrame !== "undefined") {
      const reduce =
        typeof window !== "undefined" &&
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      requestAnimationFrame(() => {
        document
          .querySelector('[aria-label="Me sections"] [aria-pressed="true"]')
          ?.scrollIntoView({ inline: "center", block: "nearest", behavior: reduce ? "auto" : "smooth" });
      });
    }
  };

  const handleAcceptCatchUp = async (id: string, name: string) => {
    try {
      await updateCatchUpStatus(id, "accepted");
      toast.success(`Accepted catch up with ${name}!`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't accept this request.");
    }
  };

  const handleDismissCatchUp = async (id: string) => {
    try {
      await updateCatchUpStatus(id, "dismissed");
      setConfirmRemoveId(null);
      toast.info("Catch-up removed from your agenda.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't remove this catch-up.");
    }
  };

  const handleRemovePlan = async (id: string, title: string) => {
    try {
      await setEventStatus(id, null);
      setConfirmRemoveId(null);
      toast.info(`"${title}" removed from your schedule.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't remove this plan.");
    }
  };

  // Each tab owns its full section; "all" is the Overview dashboard, not a stack.
  const showSection = (tab: MeTab) => activeTab === tab;

  return (
    <div
      data-theme="light"
      className="mx-auto max-w-5xl bg-paper px-4 sm:px-6 lg:px-8 pb-[max(6.5rem,calc(env(safe-area-inset-bottom,0px)+5.5rem))] pt-[max(1rem,env(safe-area-inset-top,0px))]"
    >
      {/* 🧭 1. TOP OF PAGE NAVIGATION TABS */}
      <div className="sticky top-[max(0.5rem,env(safe-area-inset-top,0px))] z-30 mb-8">
        <TabPills
          layout="contained"
          ariaLabel="Me sections"
          className="neu-tabs scroll-smooth"
          items={[
            {
              id: "today" as const,
              label: "Today",
              icon: Sun,
              badge: todayTotalCount > 0 ? String(todayTotalCount) : undefined,
            },
            { id: "all" as const, label: "Overview", icon: Sparkles },
            {
              id: "appointments" as const,
              label: "Catch-ups",
              icon: Coffee,
              badge:
                upcomingScheduledAppointments.length + pendingAppointments.length > 0
                  ? String(upcomingScheduledAppointments.length + pendingAppointments.length)
                  : undefined,
            },
            {
              id: "tickets" as const,
              label: "Tickets",
              icon: Ticket,
              badge: upcomingTickets.length > 0 ? String(upcomingTickets.length) : undefined,
            },
            { id: "pass" as const, label: "Pass", icon: QrCode, ariaLabel: "Bio & QR Pass" },
          ]}
          active={activeTab}
          onChange={handleTabChange}
        />
      </div>

      {/* 🌟 2. APPLE HIG NATIVE HERO PROFILE CARD */}
      {activeTab === "all" && (
        <div className="relative overflow-hidden neu-section mb-8">
          {/* Ambient Top Glow & Pattern */}
          <div className="relative h-28 sm:h-32 bg-gradient-to-r from-brand-ink via-[#0d173f] to-[#0a0d1e] overflow-hidden">
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#ffffff_1.2px,transparent_1.2px)] [background-size:18px_18px]" />
            <div className="absolute inset-0 bg-gradient-to-t from-card via-card/30 to-transparent" />

            {/* Top Quick Utility Deck */}
            <div className="absolute top-3.5 inset-x-3.5 sm:top-4 sm:inset-x-6 flex items-center justify-between gap-2 z-10">
              {/* Master Brand & Presence Pill */}
              <div className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-black/40 px-3.5 text-xs font-bold text-white backdrop-blur-xl">
                <Sparkles size={13} className="text-accent" />
                <span>AirPal Me</span>
                {city && <span className="opacity-75 font-normal hidden min-[400px]:inline">· {city}</span>}
                {weather && <span className="opacity-75 font-normal">· {weather.temp}°C</span>}
              </div>

              {/* Quick Utility Actions */}
              <div className="flex items-center gap-2">
                {mine && (
                  <button
                    type="button"
                    onClick={() => {
                      void triggerHaptic("light");
                      setShowShareModal(true);
                    }}
                    className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-black/40 px-3 text-xs font-bold text-white backdrop-blur-xl transition-[background-color,transform] hover:bg-black/60 active:scale-95 cursor-pointer"
                    title="Show QR Pass"
                  >
                    <QrCode size={13} className="text-sky-300" />
                    <span className="hidden min-[480px]:inline">Pass QR</span>
                  </button>
                )}

                <Link
                  href="/pass"
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-black/40 px-3 text-xs font-bold text-white backdrop-blur-xl transition-[background-color,transform] hover:bg-black/60 active:scale-95"
                  title="AirPal Passbook"
                >
                  <Ticket size={13} className="text-amber-400" />
                  <span className="hidden min-[520px]:inline">AirPal Pass</span>
                  {upcomingTickets.length > 0 && (
                    <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-black text-black">
                      {upcomingTickets.length}
                    </span>
                  )}
                </Link>

                <Link
                  href="/settings"
                  className="grid h-11 w-11 min-h-[44px] min-w-[44px] place-items-center rounded-full bg-black/40 text-white backdrop-blur-xl transition-[background-color,transform] hover:bg-black/60 active:scale-95"
                  title="Settings"
                  aria-label="Settings"
                >
                  <Settings size={14} />
                </Link>
              </div>
            </div>
          </div>

          {/* Profile Info & Action Controls */}
          <div className="px-5 sm:px-7 pb-6 pt-0">
            <div className="flex flex-col gap-4 -mt-10 lg:-mt-12 mb-4">
              {/* Avatar & Identifiers Row */}
              <div className="flex flex-col sm:flex-row sm:items-end gap-4 min-w-0 flex-1">
                {/* Perfectly Centered Circular Profile Avatar with Camera Trigger */}
                <div className="relative group shrink-0 self-start lg:self-auto">
                  <div className="relative h-20 w-20 sm:h-24 sm:w-24 overflow-hidden rounded-full bg-paper ring-4 ring-card shadow-xl">
                    {mine?.avatar ? (
                      <Photo src={mine.avatar} className="h-full w-full object-cover rounded-full" />
                    ) : (
                      <span className="grid h-full w-full place-items-center bg-gradient-to-br from-neutral-900 to-neutral-800 font-display text-3xl sm:text-4xl font-extrabold text-white select-none">
                        {(user.displayName || mine?.name || "U")[0].toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* Upload Photo Trigger Button */}
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    className="absolute bottom-0 right-0 z-20 grid h-8 w-8 place-items-center rounded-full bg-brand text-white shadow-md ring-2 ring-card hover:bg-brand-ink transition-[background-color,transform] active:scale-95 cursor-pointer after:absolute after:-inset-2 after:content-['']"
                    title="Upload profile photo"
                    aria-label="Upload profile photo"
                  >
                    <Camera size={14} />
                  </button>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarFile}
                  />

                  {/* Profile Kind indicator icon */}
                  {mine && (
                    <span className="absolute top-0 right-0 z-20">
                      <BioKindIcon kind={mine.kind} />
                    </span>
                  )}
                </div>

                {/* Name, Handle & Status */}
                <div className="min-w-0 pb-1 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-accent bg-brand/10 rounded-full px-2.5 py-0.5">
                      <Sparkles size={11} aria-hidden="true" />
                      <span>Me</span>
                    </span>
                    {mine && <BioKindBadge kind={mine.kind} />}
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-500/15 rounded-full px-2.5 py-0.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Active
                    </span>
                  </div>

                  <h1 className="font-display text-xl sm:text-2xl font-black tracking-tight text-ink leading-tight truncate">
                    {user.displayName || mine?.name || "AirPal Member"}
                  </h1>

                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={handleCopyBioLink}
                      className="group inline-flex min-h-[44px] items-center gap-1.5 neu-chip px-2.5 py-1 text-xs font-semibold text-ink transition-[box-shadow,transform] cursor-pointer active:scale-95"
                    >
                      <span className="text-accent group-hover:underline">
                        {mine ? `@${mine.handle}` : "Claim your @handle"}
                      </span>
                      {copiedBioLink ? (
                        <Check size={12} className="text-emerald-600" />
                      ) : (
                        <Copy size={11} className="text-mute group-hover:text-ink" />
                      )}
                    </button>
                    {mine?.shortWhy && (
                      <span className="text-xs text-mute truncate max-w-xs hidden md:inline">· {mine.shortWhy}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Header Action Buttons — own full-width row so labels never collide with the handle */}
              <div className="grid min-w-0 grid-cols-2 sm:grid-cols-4 items-center gap-2 w-full mt-1">
                <Button
                  variant="primary"
                  className="min-h-[44px] min-w-0 justify-center overflow-hidden rounded-full bg-brand px-3.5 sm:px-4 text-xs font-bold text-white shadow-xs hover:bg-brand-ink transition-[background-color,transform] active:scale-95"
                  onClick={() => nav(mine ? bioPath(mine.handle) : "/bio/setup")}
                >
                  <UserRound size={14} className="mr-1.5 shrink-0" />
                  <span className="truncate">{mine ? `@${mine.handle} Bio` : "Claim @handle"}</span>
                  <ExternalLink size={12} className="ml-1 shrink-0 opacity-70" />
                </Button>

                <Button
                  variant="ghost"
                  className="neu-btn min-h-[44px] min-w-0 justify-center overflow-hidden px-3.5 text-xs font-bold text-ink transition-[box-shadow,transform] active:scale-95"
                  onClick={() => {
                    void triggerHaptic("light");
                    setShowShareModal(true);
                  }}
                >
                  <Share2 size={14} className="text-accent mr-1.5 shrink-0" />
                  <span className="truncate">Share Pass</span>
                </Button>

                <Button
                  variant="ghost"
                  className="neu-btn min-h-[44px] min-w-0 justify-center overflow-hidden px-3.5 text-xs font-bold text-ink transition-[box-shadow,transform] active:scale-95"
                  onClick={() => nav("/circle")}
                >
                  <Users size={14} className="text-accent mr-1.5 shrink-0" />
                  <span className="truncate">My Circle</span>
                </Button>

                <Button
                  variant="ghost"
                  className="neu-btn min-h-[44px] min-w-0 justify-center overflow-hidden px-3.5 text-xs font-semibold text-ink transition-[box-shadow,transform] active:scale-95"
                  onClick={() => nav(mine ? "/bio/edit" : "/bio/setup")}
                  title="Edit Bio"
                >
                  <Edit3 size={13} className="text-mute mr-1 shrink-0" />
                  <span className="truncate">Edit Bio</span>
                </Button>
              </div>
            </div>

            {/* Stat Strip — jumps to each tab */}
            <div role="group" aria-label="Jump to section" className="grid grid-cols-3 gap-1 neu-inset mt-4 p-1">
              {[
                {
                  id: "today" as const,
                  label: "Today",
                  sublabel: todayTotalCount > 0 ? `${todayTotalCount} scheduled` : "Clear day",
                  value: todayTotalCount > 0 ? `${todayTotalCount}` : "Open",
                  icon: Sun,
                  iconClass: "text-amber-500",
                },
                {
                  id: "appointments" as const,
                  label: "Catch-ups",
                  sublabel: pendingAppointments.length > 0 ? `${pendingAppointments.length} pending` : "1-on-1 syncs",
                  value: `${upcomingScheduledAppointments.length + pendingAppointments.length}`,
                  icon: Coffee,
                  iconClass: "text-sky-500",
                },
                {
                  id: "tickets" as const,
                  label: "Tickets",
                  sublabel: upcomingTickets.length > 0 ? `${upcomingTickets.length} active` : "Passbook",
                  value: `${upcomingTickets.length}`,
                  icon: Ticket,
                  iconClass: "text-brand",
                },
              ].map((stat) => {
                const selected = (activeTab as MeTab) === stat.id;
                const IconComp = stat.icon;
                return (
                  <button
                    key={stat.id}
                    type="button"
                    onClick={() => handleTabChange(stat.id)}
                    aria-current={selected ? "true" : undefined}
                    className={cn(
                      "flex min-h-[64px] flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-2.5 text-center transition-[background-color,transform] cursor-pointer active:scale-[0.98]",
                      selected ? "bg-brand/10 font-bold" : "hover:bg-paper/60",
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      <IconComp size={13} className={stat.iconClass} />
                      <span className="font-display text-lg font-black text-ink tabular-nums leading-none">
                        {stat.value}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-mute leading-none mt-0.5">
                      {stat.label}
                    </span>
                    <span className="text-[9px] text-mute/80 hidden sm:inline leading-none mt-0.5 font-medium">
                      {stat.sublabel}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 🔔 PRIORITY ACTION BANNER: PENDING CATCH-UP PROPOSALS */}
      {(activeTab === "all" || activeTab === "appointments") && pendingAppointments.length > 0 && (
        <div className="mb-6 neu-card neu-tint-gold p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3.5 min-w-0">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-amber-500/20 text-amber-700 dark:text-amber-300 shrink-0">
              <HeartHandshake size={20} />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-200">
                  Catch-up Proposal ({pendingAppointments.length})
                </span>
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              </div>
              <p className="text-sm font-bold text-ink truncate mt-0.5">
                {pendingAppointments[0].requesterName} wants to connect
                {pendingAppointments[0].date && ` · ${pendingAppointments[0].date}`}
                {pendingAppointments[0].time && ` @ ${pendingAppointments[0].time}`}
                {pendingAppointments[0].venue && ` · ${pendingAppointments[0].venue}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <Button
              size="sm"
              className="min-h-[44px] rounded-full bg-emerald-600 px-4 text-xs font-bold text-white hover:bg-emerald-700 transition-[background-color,transform] active:scale-95 shadow-xs"
              onClick={async () => {
                try {
                  await updateCatchUpStatus(pendingAppointments[0].id, "accepted");
                  toast.success(`Accepted catch up with ${pendingAppointments[0].requesterName}!`);
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Couldn't accept this request.");
                }
              }}
            >
              <Check size={13} className="mr-1 shrink-0" />
              Accept
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="neu-btn min-h-[44px] px-3.5 text-xs font-semibold text-ink transition-[box-shadow,transform] active:scale-95"
              onClick={() => handleTabChange("appointments")}
            >
              View Proposals
            </Button>
          </div>
        </div>
      )}

      {/* 🌟 3. OVERVIEW DASHBOARD (replaces the stacked sections on "all") */}
      {activeTab === "all" && (
        <div className="space-y-8 mb-8">
          <MeOverview
            todayItems={glanceToday}
            todayTotalCount={todayTotalCount}
            agendaLoading={agendaLoading}
            upcomingItems={glanceUpcoming}
            upcomingCatchupsCount={upcomingScheduledAppointments.length + pendingAppointments.length}
            upcomingTicketsCount={upcomingTickets.length}
            hasPass={Boolean(mine)}
            passHandle={mine?.handle}
            hostEvent={
              myEvent
                ? {
                    id: myEvent.id,
                    name: myEvent.name,
                    detail: [myEvent.venue, myEvent.city].filter(Boolean).join(" · "),
                    status: myEvent.status,
                  }
                : null
            }
            onGoTab={handleTabChange}
            onAddPlan={() => {
              setConfirmRemoveId(null);
              setScheduleOpen(true);
            }}
          />
        </div>
      )}

      {/* 🌟 4. MAIN ME SECTIONS (one per tab) */}
      <div className="space-y-8">
        {/* SECTION: TODAY — a cool window on the day */}
        {showSection("today") && (
          <section aria-label="Today" className="neu-section overflow-hidden">
            {/* Window chrome */}
            <div className="flex items-center gap-3 px-4 py-2.5 sm:px-5">
              <span aria-hidden="true" className="flex shrink-0 items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
              </span>
              <p className="min-w-0 flex-1 truncate text-center text-xs font-bold text-mute">
                Today · {formattedToday}
              </p>
              {weather ? (
                <span className="shrink-0 text-xs font-black text-ink tabular-nums">{weather.temp}°C</span>
              ) : (
                <span className="w-7 shrink-0" aria-hidden="true" />
              )}
            </div>
            <div className="h-px bg-line/40" aria-hidden="true" />

            {/* Window view: the day at a glance */}
            <div className="p-5 sm:p-7">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div className="min-w-0">
                  <p className="human-eyebrow">Today&apos;s agenda</p>
                  <h2 className="font-display mt-1 text-2xl font-extrabold tracking-tight text-ink text-balance sm:text-3xl">
                    {formattedToday}
                  </h2>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-mute">
                    <MapPin size={13} className="shrink-0 text-accent" aria-hidden="true" />
                    <span className="truncate">{city || "Sydney"}</span>
                    {todayTotalCount > 0 ? (
                      <span className="shrink-0 tabular-nums">· {todayTotalCount} scheduled</span>
                    ) : agendaLoading ? (
                      <span className="shrink-0">· Checking your day…</span>
                    ) : null}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    void triggerHaptic("light");
                    setConfirmRemoveId(null);
                    setScheduleOpen(true);
                  }}
                  className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-full bg-brand px-4 text-xs font-bold text-white shadow-xs hover:bg-brand-ink transition-[background-color,transform] active:scale-95 cursor-pointer"
                  aria-label="Add a personal plan for today"
                  title="Add a personal plan for today"
                >
                  <Plus size={14} className="shrink-0" />
                  <span className="hidden min-[420px]:inline">Add plan</span>
                </button>
              </div>

              {/* Weather & Deterministic Outfit Widget */}
              {weather && outfitAdvice && (
                <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 neu-inset p-4">
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-2xl bg-amber-500/15 text-amber-600 shrink-0">
                      <Shirt size={18} />
                    </span>
                    <div>
                      <p className="text-xs font-bold text-ink leading-snug">
                        Outfit Recommendation: {outfitAdvice.outfit}
                      </p>
                      <p className="text-[11px] font-medium text-accent leading-snug mt-0.5">
                        {outfitAdvice.accessory}
                      </p>
                    </div>
                  </div>
                  <div className="text-left sm:text-right shrink-0 pt-2 sm:pt-0">
                    <span className="font-display text-base font-black text-ink tabular-nums">{weather.temp}°C</span>
                    <span className="block text-[10px] text-mute">
                      {weather.isDay ? "Daytime" : "Evening"} local forecast
                    </span>
                  </div>
                </div>
              )}

              {todayTotalCount > 0 ? (
                <div className="space-y-3">
                  {/* Row colour map (matches the source tabs): catch-ups with other
                    people stay neutral paper; my own plans carry the brand tint;
                    passes keep the Pass gold/amber. Pending state always pairs
                    the amber ring with a "Pending" text chip, never colour alone. */}
                  {/* Today's 1-on-1 Catch-ups (proposed by others) */}
                  {todayAppointments.length > 0 && (
                    <p className="text-[11px] font-bold uppercase tracking-wider text-mute">Catch-ups today</p>
                  )}
                  {todayAppointments.map((item) => {
                    const isPending = item.status === "pending";
                    const confirming = confirmRemoveId === item.id;
                    return (
                      <MeRow
                        key={item.id}
                        toneClass={isPending ? "neu-row neu-tint-gold" : "neu-row"}
                        visual={<RowAvatar photo={item.requesterPhoto} name={item.requesterName} />}
                        actions={
                          isPending ? (
                            <>
                              <Button
                                size="sm"
                                className="min-h-[44px] flex-1 sm:flex-initial justify-center rounded-full bg-emerald-600 px-3.5 text-xs font-bold text-white hover:bg-emerald-700 active:scale-95"
                                onClick={() => void handleAcceptCatchUp(item.id, item.requesterName)}
                              >
                                <Check size={13} className="mr-1 shrink-0" />
                                Accept
                              </Button>
                              {confirming ? (
                                <Button
                                  size="sm"
                                  className="min-h-[44px] flex-1 sm:flex-initial justify-center rounded-full bg-red-600 px-3.5 text-xs font-bold text-white hover:bg-red-700 active:scale-95"
                                  onClick={() => void handleDismissCatchUp(item.id)}
                                  aria-label={`Confirm declining catch-up with ${item.requesterName}`}
                                >
                                  Confirm decline
                                </Button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    void triggerHaptic("light");
                                    setConfirmRemoveId(item.id);
                                  }}
                                  className="neu-btn inline-flex min-h-[44px] flex-1 sm:flex-initial items-center justify-center px-3 text-xs font-semibold text-mute hover:text-ink transition-[box-shadow,color,transform] active:scale-95 cursor-pointer"
                                  aria-label={`Dismiss catch-up with ${item.requesterName}`}
                                >
                                  Dismiss
                                </button>
                              )}
                            </>
                          ) : (
                            <>
                              {item.meetingLink && (
                                <a
                                  href={item.meetingLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={() => void triggerHaptic("light")}
                                  className="inline-flex min-h-[44px] items-center gap-1.5 whitespace-nowrap rounded-full bg-emerald-500/15 px-4 text-xs font-bold text-emerald-800 hover:bg-emerald-500/25 transition-[background-color,transform] active:scale-95"
                                >
                                  <PhoneCall size={13} className="shrink-0 text-emerald-700" />
                                  <span>Join Call</span>
                                </a>
                              )}
                              <AddToCalendarMenu
                                event={{
                                  title: `Catch Up: ${item.requesterName}`,
                                  description: item.notes || `AirPal with ${item.requesterName}`,
                                  startsAt: `${item.date}T${item.time || "12:00"}:00`,
                                  venue: item.venue,
                                }}
                                size="sm"
                                variant="ghost"
                                label="Calendar"
                                buttonClassName="neu-btn min-h-[44px] px-3.5 text-xs font-bold"
                              />
                              {confirming ? (
                                <Button
                                  size="sm"
                                  className="min-h-[44px] rounded-full bg-red-600 px-3.5 text-xs font-bold text-white hover:bg-red-700 active:scale-95"
                                  onClick={() => void handleDismissCatchUp(item.id)}
                                  aria-label={`Confirm cancelling catch-up with ${item.requesterName}`}
                                >
                                  Confirm cancel
                                </Button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    void triggerHaptic("light");
                                    setConfirmRemoveId(item.id);
                                  }}
                                  className="neu-btn inline-flex min-h-[44px] items-center gap-1.5 px-3 text-xs font-semibold text-mute hover:text-ink transition-[box-shadow,color,transform] active:scale-95 cursor-pointer"
                                  aria-label={`Cancel catch-up with ${item.requesterName}`}
                                >
                                  <X size={13} />
                                  <span>Cancel</span>
                                </button>
                              )}
                            </>
                          )
                        }
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-ink truncate">{item.requesterName}</span>
                          <span className="text-[10px] font-bold rounded-full bg-brand/10 text-accent px-2 py-0.5">
                            {item.type === "meeting" ? "Meeting" : item.type === "nightout" ? "Hangout" : "Coffee"}
                          </span>
                          {isPending && (
                            <span className="text-[10px] font-bold uppercase rounded-full bg-amber-500/25 px-2 py-0.5 text-amber-950 dark:text-amber-100">
                              Pending
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-mute mt-1 flex items-center gap-1.5 truncate">
                          <Clock size={12} className="text-mute shrink-0" />
                          <span>Today {item.time ? `@ ${item.time}` : ""}</span>
                          {item.venue && <span>· {item.venue}</span>}
                        </p>
                      </MeRow>
                    );
                  })}

                  {/* Today's Personal Plans (my own Going commitments from /calendar) */}
                  {todayPlans.length > 0 && (
                    <p className="text-[11px] font-bold uppercase tracking-wider text-mute pt-1">My plans today</p>
                  )}
                  {todayPlans.map((plan) => {
                    const confirming = confirmRemoveId === plan.id;
                    return (
                      <MeRow
                        key={plan.id}
                        toneClass="neu-row neu-tint-brand"
                        visual={
                          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand/10 text-accent shrink-0">
                            <Calendar size={20} />
                          </span>
                        }
                        actions={
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="neu-btn min-h-[44px] px-3.5 text-xs font-bold text-ink active:scale-95"
                              onClick={() => {
                                void triggerHaptic("light");
                                setConfirmRemoveId(null);
                                setRescheduleTarget(plan);
                              }}
                              aria-label={`Reschedule ${plan.title}`}
                            >
                              <Clock size={13} className="mr-1 shrink-0" />
                              Reschedule
                            </Button>
                            <AddToCalendarMenu
                              event={{
                                title: plan.title,
                                description: plan.description || plan.categoryLabel,
                                startsAt: plan.startsAt,
                                venue: plan.venue,
                              }}
                              size="sm"
                              variant="ghost"
                              label="Calendar"
                              buttonClassName="neu-btn min-h-[44px] px-3.5 text-xs font-bold"
                            />
                            {confirming ? (
                              <Button
                                size="sm"
                                className="min-h-[44px] rounded-full bg-red-600 px-3.5 text-xs font-bold text-white hover:bg-red-700 active:scale-95"
                                onClick={() => void handleRemovePlan(plan.id, plan.title)}
                                aria-label={`Confirm removing ${plan.title} from your schedule`}
                              >
                                <Trash2 size={13} className="mr-1 shrink-0" />
                                Confirm
                              </Button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  void triggerHaptic("light");
                                  setConfirmRemoveId(plan.id);
                                }}
                                className="neu-btn grid h-11 w-11 min-h-[44px] min-w-[44px] place-items-center text-mute transition-[box-shadow,color,transform] hover:text-red-600 active:scale-95 cursor-pointer touch-manipulation"
                                aria-label={`Remove ${plan.title} from your schedule`}
                                title="Remove from schedule"
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
                          </>
                        }
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-ink truncate">{plan.title}</span>
                          {plan.isRescheduled && (
                            <span className="text-[10px] font-bold uppercase rounded-full bg-brand/10 text-accent px-2 py-0.5">
                              Moved
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-mute mt-1 flex items-center gap-1.5 truncate">
                          <Clock size={12} className="text-mute shrink-0" />
                          <span>Today @ {plan.timeLabel || plan.startsAt.slice(11, 16)}</span>
                          {plan.venue && <span>· {plan.venue}</span>}
                        </p>
                      </MeRow>
                    );
                  })}

                  {/* Today's Tickets */}
                  {todayTickets.length > 0 && (
                    <p className="text-[11px] font-bold uppercase tracking-wider text-mute pt-1">Passes today</p>
                  )}
                  {todayTickets.map((ticket) => (
                    <MeRow
                      key={ticket.id}
                      toneClass="neu-row neu-tint-gold"
                      divided={false}
                      visual={
                        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-amber-500/20 text-amber-700 dark:text-amber-400 shrink-0">
                          <Ticket size={22} />
                        </span>
                      }
                      actions={
                        <Button
                          size="sm"
                          className="min-h-[44px] rounded-full bg-amber-600 px-4 text-xs font-bold text-white shadow-2xs hover:bg-amber-700 transition-[background-color,transform] active:scale-95"
                          onClick={() => nav(`/ticket/${ticket.id}`)}
                        >
                          <QrCode size={14} className="mr-1.5" />
                          Open Pass
                        </Button>
                      }
                    >
                      <span className="font-bold text-sm text-ink truncate block">{ticket.title}</span>
                      <p className="text-xs text-mute mt-1 flex items-center gap-1.5 truncate">
                        <Flame size={12} className="text-amber-600 shrink-0" />
                        <span>
                          Pass ({ticket.spots || 1}x) {ticket.time ? `· Doors ${ticket.time}` : ""}
                        </span>
                        <span>· {ticket.suburb || "Venue"}</span>
                      </p>
                    </MeRow>
                  ))}
                </div>
              ) : agendaLoading ? (
                <TodaySkeleton />
              ) : (
                <div className="px-1 py-6 text-center sm:py-8">
                  <p className="human-eyebrow">Open day</p>
                  <h3 className="font-display mx-auto mt-2 max-w-md text-2xl font-extrabold tracking-tight text-ink text-balance sm:text-3xl">
                    Today is wide open.
                  </h3>
                  <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-mute">
                    Nothing today — a perfect day to start something.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      void triggerHaptic("light");
                      setConfirmRemoveId(null);
                      setScheduleOpen(true);
                    }}
                    className="mt-4 inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-full bg-brand px-5 text-xs font-bold text-white shadow-xs hover:bg-brand-ink transition-[background-color,transform] active:scale-95 cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>Add a plan for today</span>
                  </button>

                  {/* 🌟 Rich Full Journey Cards */}
                  <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
                    {/* Card 1: Meet People */}
                    <div className="flex flex-col justify-between neu-card neu-tint-brand p-4 transition-[box-shadow,transform]">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="grid h-8 w-8 place-items-center rounded-xl bg-brand/10 text-accent">
                            <Users size={15} />
                          </span>
                          <h4 className="font-display text-xs font-bold text-ink">Meet People</h4>
                        </div>
                        <p className="text-[11px] text-mute leading-relaxed">
                          Catch up with mutuals or check in nearby.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          void triggerHaptic("light");
                          nav("/circle");
                        }}
                        className="neu-btn mt-3.5 inline-flex min-h-[44px] items-center justify-center gap-1.5 px-3.5 text-xs font-bold text-ink transition-[box-shadow,transform] active:scale-95 cursor-pointer"
                      >
                        <Users size={13} className="text-accent" />
                        <span>Meet people</span>
                      </button>
                    </div>

                    {/* Card 2: Discover Passes */}
                    <div className="flex flex-col justify-between neu-card neu-tint-gold p-4 transition-[box-shadow,transform]">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="grid h-8 w-8 place-items-center rounded-xl bg-amber-500/15 text-amber-600">
                            <Ticket size={15} />
                          </span>
                          <h4 className="font-display text-xs font-bold text-ink">Events &amp; Deals</h4>
                        </div>
                        <p className="text-[11px] text-mute leading-relaxed">
                          Concerts, festivals, and member perks near you.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          void triggerHaptic("light");
                          nav("/pass");
                        }}
                        className="neu-btn mt-3.5 inline-flex min-h-[44px] items-center justify-center gap-1.5 px-3.5 text-xs font-bold text-ink transition-[box-shadow,transform] active:scale-95 cursor-pointer"
                      >
                        <Ticket size={13} className="text-amber-600" />
                        <span>Discover Passes</span>
                      </button>
                    </div>

                    {/* Card 3: Curated Places */}
                    <div className="flex flex-col justify-between neu-card neu-tint-sky p-4 transition-[box-shadow,transform]">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="grid h-8 w-8 place-items-center rounded-xl bg-sky-500/10 text-sky-600">
                            <MapPin size={15} />
                          </span>
                          <h4 className="font-display text-xs font-bold text-ink">Curated Places</h4>
                        </div>
                        <p className="text-[11px] text-mute leading-relaxed">
                          Handpicked cafes, scenic spots, and local hubs.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => nav("/places")}
                        className="neu-btn mt-3.5 inline-flex min-h-[44px] items-center justify-center gap-1.5 px-3.5 text-xs font-bold text-ink transition-[box-shadow,transform] active:scale-95 cursor-pointer"
                      >
                        <MapPin size={13} className="text-sky-600" />
                        <span>Explore Places</span>
                      </button>
                    </div>
                  </div>

                  {/* Footer Planning Bridge */}
                  <div className="mt-5 pt-1 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-mute">
                    <span>Planning ahead for the rest of the week?</span>
                    <button
                      type="button"
                      onClick={() => {
                        void triggerHaptic("light");
                        nav("/calendar");
                      }}
                      className="inline-flex min-h-[44px] items-center gap-1.5 font-bold text-accent hover:text-brand transition-colors cursor-pointer"
                    >
                      <Calendar size={13} />
                      <span>Open Personal Calendar</span>
                      <ArrowRight size={12} className="shrink-0" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* SECTION: APPOINTMENTS & CATCH-UPS */}
        {showSection("appointments") && (
          <MeSection>
            <MeSectionHeader
              icon={<Coffee size={18} />}
              tileClass="bg-sky-500/10 text-sky-600"
              title="Appointments & Catch-ups"
              sub={`1-on-1 catch-ups (${upcomingScheduledAppointments.length + pendingAppointments.length})`}
              right={
                <button
                  type="button"
                  onClick={handleCopyBioLink}
                  className="neu-btn inline-flex min-h-[44px] items-center gap-1.5 px-4 text-xs font-bold text-ink transition-[box-shadow,transform] active:scale-95 cursor-pointer"
                  title="Copy your bio link"
                >
                  {copiedBioLink ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                  <span>{copiedBioLink ? "Copied" : "Share My Bio"}</span>
                </button>
              }
            />

            {/* Pending Requests */}
            {pendingAppointments.length > 0 && (
              <div className="mb-5 neu-card neu-tint-gold p-4 sm:p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-200">
                    <HeartHandshake size={15} className="text-amber-700 dark:text-amber-400" />
                    <span>Requests awaiting your response ({pendingAppointments.length})</span>
                  </div>
                  <span className="text-[10px] font-bold uppercase rounded-full bg-amber-500/25 px-2.5 py-0.5 text-amber-950 dark:text-amber-100">
                    Action Needed
                  </span>
                </div>

                <div className="space-y-2.5">
                  {pendingAppointments.map((item) => (
                    <MeRow
                      key={item.id}
                      toneClass="neu-row"
                      visual={<RowAvatar photo={item.requesterPhoto} name={item.requesterName} />}
                      actions={
                        <>
                          <Button
                            size="sm"
                            className="min-h-[44px] flex-1 sm:flex-initial justify-center rounded-full bg-emerald-600 px-3.5 text-xs font-bold text-white hover:bg-emerald-700 active:scale-95"
                            onClick={async () => {
                              try {
                                await updateCatchUpStatus(item.id, "accepted");
                                toast.success(`Accepted catch up with ${item.requesterName}!`);
                              } catch (error) {
                                toast.error(error instanceof Error ? error.message : "Couldn't accept this request.");
                              }
                            }}
                          >
                            <Check size={13} className="mr-1 shrink-0" />
                            Accept
                          </Button>
                          {confirmRemoveId === item.id ? (
                            <Button
                              size="sm"
                              className="min-h-[44px] flex-1 sm:flex-initial justify-center rounded-full bg-red-600 px-3.5 text-xs font-bold text-white hover:bg-red-700 active:scale-95"
                              onClick={async () => {
                                try {
                                  await updateCatchUpStatus(item.id, "dismissed");
                                  setConfirmRemoveId(null);
                                  toast.info("Request dismissed");
                                } catch (error) {
                                  toast.error(error instanceof Error ? error.message : "Couldn't dismiss request.");
                                }
                              }}
                              aria-label={`Confirm declining catch-up with ${item.requesterName}`}
                            >
                              Confirm decline
                            </Button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                void triggerHaptic("light");
                                setConfirmRemoveId(item.id);
                              }}
                              className="neu-btn inline-flex min-h-[44px] flex-1 sm:flex-initial items-center justify-center px-3 text-xs font-semibold text-mute hover:text-ink transition-[box-shadow,color,transform] active:scale-95 cursor-pointer"
                              aria-label={`Dismiss catch-up with ${item.requesterName}`}
                            >
                              Dismiss
                            </button>
                          )}
                        </>
                      }
                    >
                      <p className="font-bold text-sm text-ink truncate">{item.requesterName}</p>
                      <p className="text-xs text-mute truncate mt-0.5 flex items-center gap-1">
                        {item.type === "meeting" ? (
                          <>
                            <Calendar size={11} className="shrink-0" aria-hidden="true" />
                            <span>Meeting</span>
                          </>
                        ) : item.type === "nightout" ? (
                          <>
                            <Users size={11} className="shrink-0" aria-hidden="true" />
                            <span>Hangout</span>
                          </>
                        ) : (
                          <>
                            <Coffee size={11} className="shrink-0" aria-hidden="true" />
                            <span>Coffee</span>
                          </>
                        )}
                        {item.date && ` · ${item.date}`}
                        {item.time && ` @ ${item.time}`}
                        {item.venue && ` · ${item.venue}`}
                      </p>
                    </MeRow>
                  ))}
                </div>
              </div>
            )}

            {/* Saved Reminders: people I flagged for a future catch-up */}
            {myReminders.length > 0 && (
              <div className="mb-5 neu-card neu-tint-brand p-4 sm:p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-ink">
                    <Bell size={15} className="text-accent" />
                    <span>People to catch up with ({myReminders.length})</span>
                  </div>
                  <span className="text-[10px] font-bold uppercase rounded-full bg-brand/10 px-2.5 py-0.5 text-accent">
                    Reminders
                  </span>
                </div>

                <div className="space-y-2.5">
                  {myReminders.map((item) => {
                    const displayName = item.requesterName || `@${item.targetHandle}`;
                    return (
                      <MeRow
                        key={item.id}
                        toneClass="neu-row"
                        visual={<RowAvatar photo={item.requesterPhoto} name={displayName} />}
                        actions={
                          <>
                            <Button
                              size="sm"
                              className="min-h-[44px] flex-1 sm:flex-initial justify-center rounded-full bg-brand px-3.5 text-xs font-bold text-white hover:bg-brand-ink active:scale-95"
                              onClick={() => {
                                void triggerHaptic("light");
                                nav(bioPath(item.targetHandle));
                              }}
                            >
                              <Coffee size={13} className="mr-1 shrink-0" />
                              Catch up
                            </Button>
                            <button
                              type="button"
                              onClick={async () => {
                                void triggerHaptic("light");
                                try {
                                  await updateCatchUpStatus(item.id, "dismissed");
                                  setMyReminders((prev) => prev.filter((r) => r.id !== item.id));
                                  toast.info(`Removed reminder for ${displayName}`);
                                } catch (error) {
                                  toast.error(error instanceof Error ? error.message : "Couldn't remove reminder.");
                                }
                              }}
                              className="neu-btn grid h-11 w-11 min-h-[44px] min-w-[44px] place-items-center text-mute transition-[box-shadow,color,transform] hover:text-ink active:scale-95 cursor-pointer touch-manipulation"
                              aria-label={`Remove reminder for ${displayName}`}
                              title="Remove reminder"
                            >
                              <X size={15} />
                            </button>
                          </>
                        }
                      >
                        <p className="font-bold text-sm text-ink truncate">{displayName}</p>
                        <p className="text-xs text-mute truncate mt-0.5">
                          @{item.targetHandle}
                          {item.venue && ` · ${item.venue}`}
                        </p>
                      </MeRow>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Upcoming Scheduled Syncs */}
            {upcomingScheduledAppointments.length > 0 ? (
              <div className="space-y-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-mute">Upcoming</p>
                {upcomingScheduledAppointments.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 neu-row p-4"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="h-11 w-11 overflow-hidden rounded-full neu-avatar bg-paper shrink-0">
                        {item.requesterPhoto ? (
                          <Photo src={item.requesterPhoto} className="h-full w-full object-cover rounded-full" />
                        ) : (
                          <span className="grid h-full w-full place-items-center bg-neutral-900 font-bold text-xs text-white rounded-full">
                            {item.requesterName[0]}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-sm text-ink truncate">{item.requesterName}</p>
                          {item.requesterHandle && (
                            <Link
                              href={`/@${item.requesterHandle}`}
                              className="text-xs text-mute hover:text-accent truncate"
                            >
                              @{item.requesterHandle}
                            </Link>
                          )}
                        </div>
                        <p className="text-xs text-mute truncate mt-0.5">
                          {item.date || "Upcoming"} {item.time ? `@ ${item.time}` : ""}{" "}
                          {item.venue ? `· ${item.venue}` : ""}
                        </p>
                      </div>
                    </div>

                    <div className="flex w-full sm:w-auto items-center justify-end gap-2 shrink-0 pt-2.5 sm:pt-0">
                      {item.meetingLink && (
                        <a
                          href={item.meetingLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex min-h-[44px] items-center gap-1.5 whitespace-nowrap rounded-full bg-emerald-500/15 px-3.5 text-xs font-bold text-emerald-800 hover:bg-emerald-500/25 transition-[background-color,transform] active:scale-95"
                        >
                          <PhoneCall size={13} className="shrink-0" />
                          <span>Join Call</span>
                        </a>
                      )}
                      <AddToCalendarMenu
                        event={{
                          title: `Catch Up: ${item.requesterName}`,
                          description: item.notes || `AirPal with ${item.requesterName}`,
                          startsAt: `${item.date || today}T${item.time || "12:00"}:00`,
                          venue: item.venue,
                        }}
                        size="sm"
                        variant="ghost"
                        label="Calendar"
                        buttonClassName="neu-btn min-h-[44px] px-3.5 text-xs font-bold"
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : pendingAppointments.length === 0 && myReminders.length === 0 && !agendaLoading ? (
              <div className="neu-inset p-6 text-center">
                <Coffee size={24} className="mx-auto text-mute/80 mb-1.5" />
                <p className="text-xs text-mute font-medium">No upcoming appointments or catch-ups.</p>
                <button
                  type="button"
                  onClick={() => nav("/circle")}
                  className="mt-2 inline-flex min-h-[44px] items-center gap-1.5 text-xs font-bold text-accent underline cursor-pointer hover:text-brand transition-colors"
                >
                  Find someone to meet
                  <ArrowRight size={12} className="shrink-0" aria-hidden="true" />
                </button>
              </div>
            ) : agendaLoading ? (
              <TodaySkeleton lines={2} />
            ) : null}
          </MeSection>
        )}

        {/* SECTION: TICKETS & PASSES */}
        {showSection("tickets") && (
          <MeSection>
            <MeSectionHeader
              icon={<Ticket size={18} />}
              tileClass="bg-amber-500/10 text-amber-600"
              title="AirPal Pass · Digital Wallet"
              sub={`My Tickets & Event Passes (${upcomingTickets.length})`}
              right={
                <Link
                  href="/me/tickets"
                  className="neu-btn inline-flex min-h-[44px] items-center gap-1.5 whitespace-nowrap px-4 text-xs font-bold text-ink transition-[box-shadow,transform] active:scale-95"
                >
                  <span>Full Wallet</span>
                  <ChevronRight size={14} />
                </Link>
              }
            />

            {upcomingTickets.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {upcomingTickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="relative overflow-hidden neu-card neu-tint-gold p-5 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-3 py-1 text-[10px] font-black text-amber-700 dark:text-amber-400">
                          <Ticket size={12} />
                          <span>Pass</span>
                        </span>
                        <span className="text-[11px] font-mono font-bold text-mute">{ticket.spots || 1}x Tickets</span>
                      </div>

                      <h3 className="font-display font-bold text-base text-ink leading-snug">{ticket.title}</h3>
                      <p className="text-xs text-mute mt-1 flex items-center gap-1.5">
                        <Clock size={12} className="text-mute shrink-0" />
                        <span>
                          {ticket.date || "Anytime"} {ticket.time ? `@ ${ticket.time}` : ""}
                        </span>
                      </p>
                      {ticket.suburb && (
                        <p className="text-xs text-mute mt-0.5 flex items-center gap-1.5">
                          <MapPin size={12} className="text-mute shrink-0" />
                          <span>{ticket.suburb}</span>
                        </p>
                      )}
                    </div>

                    <div className="mt-5 pt-1 flex flex-col gap-2">
                      <Button
                        size="sm"
                        className="min-h-[44px] w-full justify-center rounded-full bg-brand px-4 text-xs font-bold text-white shadow-2xs hover:bg-brand-ink active:scale-95"
                        onClick={() => nav(`/ticket/${ticket.id}`)}
                      >
                        <QrCode size={14} className="mr-1.5 shrink-0" />
                        Open Pass
                      </Button>
                      <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-2 w-full">
                        <AppleWalletButton
                          variant="compact"
                          className="w-full"
                          onClick={() => {
                            const passUrl = ticketWalletPassUrl(ticket.id);
                            void openAppleWalletPass(passUrl, "AirPal-Ticket-" + ticket.title);
                          }}
                        />
                        <GoogleWalletButton
                          variant="compact"
                          className="w-full"
                          onClick={() => {
                            const gUrl = googleWalletTicketUrl(ticket.id);
                            openGoogleWalletPass(gUrl);
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : agendaLoading ? (
              <TodaySkeleton lines={2} />
            ) : (
              <MeEmpty
                icon={<Ticket size={28} className="mx-auto text-mute/80" />}
                title="No active tickets or passes"
                body="Festival access, concert passes, and member dining perks live in your AirPal Passbook."
              >
                <Button
                  size="sm"
                  className="rounded-full bg-brand px-5 text-xs font-bold text-white active:scale-95 shadow-xs transition-transform"
                  onClick={() => nav("/pass")}
                >
                  Browse AirPal Pass
                  <ArrowRight size={13} className="shrink-0" aria-hidden="true" />
                </Button>
              </MeEmpty>
            )}
          </MeSection>
        )}

        {/* SECTION: HOSTING — events I run (full studio links live in Today; Overview shows a teaser) */}
        {activeTab === "today" && myEvent && (
          <MeSection>
            <MeSectionHeader
              icon={<Calendar size={18} />}
              tileClass="bg-brand/10 text-accent"
              title="Hosting"
              sub="My event, live from the studio"
              right={
                <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  {myEvent.status}
                </span>
              }
            />
            <div className="px-1 pt-1">
              <h3 className="font-display font-bold text-base text-ink leading-snug">{myEvent.name}</h3>
              <p className="text-xs text-mute mt-1">{[myEvent.venue, myEvent.city].filter(Boolean).join(" · ")}</p>
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <Link
                  href="/event"
                  className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-brand px-4 text-xs font-bold text-white transition-[background-color,transform] hover:bg-brand-ink active:scale-95"
                >
                  Open studio
                </Link>
                <Link
                  href={`/e/${myEvent.id}/manage`}
                  className="neu-btn inline-flex min-h-[44px] items-center justify-center px-4 text-xs font-bold text-ink transition-[box-shadow,transform] active:scale-95"
                >
                  Manage
                </Link>
                <Link
                  href={`/e/${myEvent.id}/guests`}
                  className="neu-btn inline-flex min-h-[44px] items-center justify-center px-4 text-xs font-bold text-ink transition-[box-shadow,transform] active:scale-95"
                >
                  Guestlist
                </Link>
              </div>
            </div>
          </MeSection>
        )}

        {/* SECTION: DIGITAL BIO PASS & QR CARD */}
        {showSection("pass") &&
          (mine ? (
            <div className="space-y-8">
              {/* Elevated Passbook Showcase Header on dedicated pass tab */}
              {activeTab === "pass" && (
                <div className="relative overflow-hidden neu-section p-5 sm:p-7">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/15 px-3 py-1 text-xs font-bold text-accent">
                          <Sparkles size={12} aria-hidden="true" />
                          <span>Universal Digital Pass</span>
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                          <ShieldCheck size={12} aria-hidden="true" />
                          <span>NFC &amp; Wallet Ready</span>
                        </span>
                      </div>
                      <h2 className="font-display text-xl sm:text-2xl font-black text-ink tracking-tight">
                        AirPal Passbook &amp; Identity Pass
                      </h2>
                      <p className="text-xs sm:text-sm text-mute max-w-xl leading-relaxed font-medium">
                        One pass for contact exchange, Wallet, and door check-ins.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-start md:self-center shrink-0">
                      <Button
                        variant="primary"
                        className="min-h-[44px] rounded-full bg-brand px-4 text-xs font-bold text-white shadow-xs hover:bg-brand-ink transition-[background-color,transform] active:scale-95"
                        onClick={() => {
                          void triggerHaptic("light");
                          setShowShareModal(true);
                        }}
                      >
                        <Share2 size={14} className="mr-1.5" />
                        <span>Share Pass</span>
                      </Button>
                      <Button
                        variant="ghost"
                        className="neu-btn min-h-[44px] px-4 text-xs font-bold text-ink transition-[box-shadow,transform] active:scale-95"
                        onClick={() => nav(bioPath(mine.handle))}
                      >
                        <ExternalLink size={14} className="mr-1.5 text-mute" />
                        <span>View Bio</span>
                      </Button>
                      <Button
                        variant="ghost"
                        className="neu-btn min-h-[44px] px-4 text-xs font-bold text-ink transition-[box-shadow,transform] active:scale-95"
                        onClick={() => {
                          void triggerHaptic("light");
                          setShowBioSite(true);
                        }}
                      >
                        <QrCode size={14} className="mr-1.5 text-accent" />
                        <span>Preview site</span>
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* The Master Pass Card */}
              <DigitalBioPassCard
                handle={mine.handle}
                name={mine.name || user.displayName || `@${mine.handle}`}
                kind={mine.kind}
                avatar={mine.avatar}
                city={mine.city || city}
                headline={mine.shortWhy}
                phone={mine.phone}
                email={user.email || undefined}
                qrDataUrl={bioQrData || undefined}
                title="My Digital Bio Pass"
                subtitle="Universal Contact Pass · Apple & Google Wallet"
                showViewBioLink
                showEditBioLink
              >
                <ChangeHandleForm current={mine.handle} profileId={mine.id} />
              </DigitalBioPassCard>

              {/* Features Deck on dedicated Pass tab */}
              {activeTab === "pass" && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div className="neu-card neu-tint-sky p-5 flex flex-col justify-between">
                    <div>
                      <span className="grid h-10 w-10 place-items-center rounded-2xl bg-sky-500/10 text-sky-600 mb-3">
                        <Wallet size={18} />
                      </span>
                      <h4 className="font-display font-bold text-sm text-ink">Apple &amp; Google Wallet</h4>
                      <p className="text-xs text-mute mt-1 leading-relaxed">
                        Lockscreen access and contactless NFC taps.
                      </p>
                    </div>
                  </div>

                  <div className="neu-card neu-tint-emerald p-5 flex flex-col justify-between">
                    <div>
                      <span className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-600 mb-3">
                        <QrCode size={18} />
                      </span>
                      <h4 className="font-display font-bold text-sm text-ink">Scannable Anywhere</h4>
                      <p className="text-xs text-mute mt-1 leading-relaxed">
                        Offline scannable with any camera. No app needed to scan.
                      </p>
                    </div>
                  </div>

                  <div className="neu-card neu-tint-brand p-5 flex flex-col justify-between">
                    <div>
                      <span className="grid h-10 w-10 place-items-center rounded-2xl bg-brand/10 text-accent mb-3">
                        <Contact size={18} />
                      </span>
                      <h4 className="font-display font-bold text-sm text-ink">Instant vCard Contacts</h4>
                      <p className="text-xs text-mute mt-1 leading-relaxed">
                        Saves full contact cards straight into phone contacts.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="neu-section p-6 sm:p-8 text-center max-w-xl mx-auto">
              <span className="grid h-16 w-16 place-items-center rounded-3xl bg-brand/10 text-accent mx-auto mb-4">
                <QrCode size={32} />
              </span>
              <h3 className="font-display text-xl font-bold text-ink">Claim your Digital Pass</h3>
              <p className="text-xs sm:text-sm text-mute mt-2 leading-relaxed">
                Choose your @handle to generate your pass, wallet credential, and bio page.
              </p>
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button
                  variant="primary"
                  className="min-h-[44px] w-full sm:w-auto rounded-full bg-brand px-6 text-xs font-bold text-white shadow-xs hover:bg-brand-ink transition-[background-color,transform] active:scale-95"
                  onClick={() => nav("/bio/setup")}
                >
                  <Sparkles size={14} className="mr-1.5" />
                  <span>Claim @handle &amp; Activate Pass</span>
                </Button>
              </div>
            </div>
          ))}

        {/* 🛠 4. TOOLS, WORKSPACES & ECOSYSTEM SHORTCUTS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Invite Mates Card */}
          <div className="neu-section p-5 sm:p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-brand/10 text-accent">
                  <Share2 size={15} />
                </span>
                <h3 className="font-display text-base font-bold text-ink">Invite mates to AirPal</h3>
              </div>
              <p className="text-xs text-mute mb-4 leading-relaxed">
                Earn Stars when friends claim their handle or join your circle.
              </p>
            </div>
            <InvitePanel handle={mine?.handle} loading={!biosReady} />
          </div>

          {/* Quick Shortcuts */}
          <div className="neu-section p-5 sm:p-6 flex flex-col justify-between">
            <div>
              <h3 className="font-display text-base font-bold text-ink mb-3.5">Workspaces &amp; Tools</h3>
              <div className="grid grid-cols-2 gap-2.5">
                <Link
                  href="/me/inbox"
                  className="neu-chip flex min-h-[44px] items-center gap-2.5 p-3 text-xs font-bold text-ink transition-[box-shadow,transform] active:scale-95"
                >
                  <MessageSquare size={15} className="text-accent" />
                  <span>Inbox</span>
                </Link>
                <Link
                  href="/calendar"
                  className="neu-chip flex min-h-[44px] items-center gap-2.5 p-3 text-xs font-bold text-ink transition-[box-shadow,transform] active:scale-95"
                >
                  <Calendar size={15} className="text-sky-600" />
                  <span>Calendar</span>
                </Link>
                <Link
                  href="/me/memories"
                  className="neu-chip flex min-h-[44px] items-center gap-2.5 p-3 text-xs font-bold text-ink transition-[box-shadow,transform] active:scale-95"
                >
                  <Images size={15} className="text-accent" />
                  <span>Memories</span>
                </Link>
                <Link
                  href="/settings"
                  className="neu-chip flex min-h-[44px] items-center gap-2.5 p-3 text-xs font-bold text-ink transition-[box-shadow,transform] active:scale-95"
                >
                  <Settings size={15} className="text-mute" />
                  <span>Settings</span>
                </Link>
                {isHost ? (
                  <Link
                    href="/event"
                    className="neu-chip flex min-h-[44px] items-center gap-2.5 p-3 text-xs font-bold text-ink transition-[box-shadow,transform] active:scale-95"
                  >
                    <Building2 size={15} className="text-emerald-600" />
                    <span>Host Tools</span>
                  </Link>
                ) : (
                  <Link
                    href="/business"
                    className="neu-chip flex min-h-[44px] items-center gap-2.5 p-3 text-xs font-bold text-ink transition-[box-shadow,transform] active:scale-95"
                  >
                    <Building2 size={15} className="text-emerald-600" />
                    <span>Business Hub</span>
                  </Link>
                )}
                {business ? (
                  <Link
                    href="/business"
                    className="neu-chip flex min-h-[44px] items-center gap-2.5 p-3 text-xs font-bold text-ink transition-[box-shadow,transform] active:scale-95"
                  >
                    <Store size={15} className="text-amber-600" />
                    <span>Business Place</span>
                  </Link>
                ) : (
                  <Link
                    href={partnerAccountPath({ signedIn: true, hasPlace: false })}
                    className="neu-chip flex min-h-[44px] items-center gap-2.5 p-3 text-xs font-bold text-ink transition-[box-shadow,transform] active:scale-95"
                  >
                    <Store size={15} className="text-amber-600" />
                    <span>{NAMES.partnerAccount}</span>
                  </Link>
                )}
              </div>
            </div>

            <div className="mt-5 pt-1 flex items-center justify-between">
              <span className="text-[11px] text-mute font-medium truncate max-w-[200px]">
                {user.email || user.displayName}
              </span>
              <button
                type="button"
                onClick={() => void logout().then(() => nav("/"))}
                className="inline-flex min-h-[44px] items-center gap-1.5 px-2 text-xs font-bold text-red-600 hover:text-red-700 transition-colors cursor-pointer active:scale-95"
              >
                <LogOut size={13} />
                <span>Sign out</span>
              </button>
            </div>
          </div>
        </div>

        {user.email && user.emailVerified === false && (
          <VerifyEmailBanner email={user.email} onSend={sendVerificationEmail} />
        )}
      </div>

      {/* 📱 DIGITAL BIO PASS & QR CODE MODAL */}
      {mine && (
        <BioShareModal
          open={showShareModal}
          onClose={() => setShowShareModal(false)}
          handle={mine.handle}
          name={mine.name || user.displayName || `@${mine.handle}`}
          url={toPublicUrl(bioPath(mine.handle))}
          avatar={mine.avatar}
          city={mine.city || city}
          headline={mine.shortWhy}
          kind={mine.kind}
          phone={mine.phone}
        />
      )}

      {/* 🌐 BIOSITE PREVIEW MODAL */}
      {mine && (
        <BioSiteModal
          open={showBioSite}
          onClose={() => setShowBioSite(false)}
          profile={mine}
          siteUrl={bioSiteUrl(mine.handle, bioSiteDisplayOrigin())}
          qrDataUrl={bioSiteQr || undefined}
          onOpenFullBio={() => {
            setShowBioSite(false);
            nav(bioPath(mine.handle));
          }}
        />
      )}

      {/* 📅 TODAY CRUD MODALS: create a personal plan, reschedule a Going plan */}
      <PersonalScheduleModal
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        defaultDate={today}
        city={city}
        upsertEvent={upsertEvent}
        setEventStatus={setEventStatus}
      />
      <CalendarRescheduleModal event={rescheduleTarget} onClose={() => setRescheduleTarget(null)} />
    </div>
  );
}
