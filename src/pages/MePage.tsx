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
  QrCode,
  Settings,
  Share2,
  Shirt,
  Sparkles,
  Store,
  Sun,
  Ticket,
  UserRound,
  Users,
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
import { AuthGate } from "@/components/auth/AuthGate";
import { VerifyEmailBanner } from "@/components/auth/VerifyEmailBanner";
import { Button } from "@/components/ui/Button";
import { Photo } from "@/components/ui/Photo";
import { BioKindBadge, BioKindIcon } from "@/components/bio/BioKindBadge";
import { DigitalBioPassCard } from "@/components/bio/DigitalBioPassCard";
import { InvitePanel } from "@/components/invite/InvitePanel";
import { ChangeHandleForm } from "@/components/bio/ChangeHandleForm";
import { AppleWalletButton } from "@/components/ui/AppleWalletButton";
import { GoogleWalletButton } from "@/components/ui/GoogleWalletButton";
import { TabPills } from "@/components/ui/TabPills";
import { googleWalletTicketUrl, openAppleWalletPass, openGoogleWalletPass, ticketWalletPassUrl } from "@/lib/wallet";
import { makeQrDataUrl } from "@/lib/qr";
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
  todayTickets as selectTodayTickets,
  upcomingScheduledAppointments as selectUpcomingScheduled,
  upcomingTickets as selectUpcomingTickets,
} from "@/lib/me-day";

type MeTab = "all" | "today" | "appointments" | "tickets" | "pass";

export function MePage() {
  const [, nav] = useLocation();
  const { user, logout, sendVerificationEmail, isHost } = useAuth();
  const { mine, business, biosReady, updateProfile } = useBio();
  const { today, weather, city, day } = useLocalNow();
  const { upcomingBookings } = useMyBookings();
  const { myEvent } = useEvents();

  const [catchUpsList, setCatchUpsList] = useState<CatchUpItem[]>(() => listCatchUps());
  const [myReminders, setMyReminders] = useState<CatchUpItem[]>(() =>
    listCatchUps().filter((item) => item.isReminderOnly && item.status !== "dismissed"),
  );
  const [bioQrData, setBioQrData] = useState<string>("");
  const [copiedBioLink, setCopiedBioLink] = useState(false);
  const [activeTab, setActiveTab] = useState<MeTab>("all");
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Subscribe to live catch-up proposals & appointments
  useEffect(() => {
    if (!user?.uid) return;
    return subscribeCatchUpsForOwner(user.uid, (items) => {
      setCatchUpsList(items);
    });
  }, [user?.uid]);

  // Subscribe to my saved catch-up reminders (bookmark flags I set on bios)
  useEffect(() => {
    if (!user?.uid) {
      setMyReminders([]);
      return;
    }
    return subscribeMyCatchUps(user.uid, (items) => {
      setMyReminders(items.filter((item) => item.isReminderOnly));
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

  const outfitAdvice = useMemo(() => {
    if (!weather) return null;
    return getDailyOutfitRecommendation(weather.temp, weather.code, weather.isDay);
  }, [weather]);

  // TODAY'S ITEMS
  const todayAppointments = useMemo(() => selectTodayAppointments(catchUpsList, today), [catchUpsList, today]);

  const todayTickets = useMemo(() => selectTodayTickets(upcomingBookings, today), [upcomingBookings, today]);

  const todayTotalCount = todayAppointments.length + todayTickets.length;

  // UPCOMING ITEMS
  const pendingAppointments = useMemo(() => selectPendingAppointments(catchUpsList), [catchUpsList]);

  const upcomingScheduledAppointments = useMemo(
    () => selectUpcomingScheduled(catchUpsList, today),
    [catchUpsList, today],
  );

  const upcomingTickets = useMemo(() => selectUpcomingTickets(upcomingBookings, today), [upcomingBookings, today]);

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
  };

  const showSection = (tab: MeTab) => activeTab === "all" || activeTab === tab;

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pb-[max(6.5rem,calc(env(safe-area-inset-bottom,0px)+5.5rem))] pt-[max(1rem,env(safe-area-inset-top,0px))]">
      {/* 🌟 1. APPLE HIG NATIVE HERO PROFILE CARD */}
      <div className="relative overflow-hidden rounded-[36px] bg-card ring-1 ring-line/80 shadow-clay mb-6 transition-all">
        {/* Ambient Top Glow & Pattern */}
        <div className="relative h-32 sm:h-44 bg-gradient-to-r from-brand-ink via-[#0d173f] to-[#0a0d1e] overflow-hidden">
          <div className="absolute inset-0 opacity-25 bg-[radial-gradient(#ffffff_1.2px,transparent_1.2px)] [background-size:18px_18px]" />
          <Photo
            src="/media/harbour.jpg"
            className="absolute inset-0 h-full w-full object-cover opacity-40 mix-blend-overlay"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent" />

          {/* Top Quick Status Pill */}
          <div className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 flex items-center gap-2">
            <Link
              href="/pass"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-black/40 px-3.5 py-1.5 text-xs font-bold text-white ring-1 ring-white/20 backdrop-blur-xl transition hover:bg-black/60 active:scale-95"
            >
              <Ticket size={13} className="text-amber-400" />
              <span>AirPal Pass</span>
              {upcomingTickets.length > 0 && (
                <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-black text-black">
                  {upcomingTickets.length}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Profile Info & Action Controls */}
        <div className="px-5 sm:px-7 pb-6 pt-0">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 -mt-12 sm:-mt-16 mb-5">
            {/* Avatar & Identifiers Row */}
            <div className="flex flex-col sm:flex-row sm:items-end gap-4 min-w-0">
              {/* Perfectly Centered Circular Profile Avatar with Camera Trigger */}
              <div className="relative group shrink-0 self-start sm:self-auto">
                <div className="relative h-24 w-24 sm:h-28 sm:w-28 overflow-hidden rounded-full bg-paper ring-4 ring-card shadow-xl transition-transform">
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
                  className="absolute bottom-0 right-0 z-20 grid h-8 w-8 place-items-center rounded-full bg-brand text-white shadow-md ring-2 ring-card hover:bg-brand-ink transition active:scale-95 cursor-pointer"
                  title="Upload profile photo"
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
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-accent bg-brand/10 ring-1 ring-brand/20 rounded-full px-2.5 py-0.5">
                    <Sparkles size={11} aria-hidden="true" />
                    <span>Me</span>
                  </span>
                  {mine && <BioKindBadge kind={mine.kind} />}
                </div>

                <h1 className="font-display text-xl sm:text-2xl font-black tracking-tight text-ink leading-tight truncate">
                  {user.displayName || mine?.name || "AirPal Member"}
                </h1>

                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={handleCopyBioLink}
                    className="group inline-flex items-center gap-1.5 rounded-full bg-paper px-2.5 py-1 text-xs font-semibold text-ink ring-1 ring-line/80 hover:ring-brand/50 transition cursor-pointer active:scale-95"
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

                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-500/15 rounded-full px-2.5 py-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Active
                  </span>
                </div>
              </div>
            </div>

            {/* Header Action Buttons */}
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap lg:flex-nowrap items-center gap-2 w-full sm:w-auto shrink-0 mt-3 sm:mt-0">
              <Button
                variant="primary"
                className="min-h-[44px] justify-center rounded-full bg-brand px-3.5 sm:px-4 text-xs font-bold text-white shadow-xs hover:bg-brand-ink active:scale-95"
                onClick={() => nav(mine ? bioPath(mine.handle) : "/bio/setup")}
              >
                <UserRound size={14} className="mr-1.5 shrink-0" />
                <span className="truncate">{mine ? `@${mine.handle} Bio` : "Claim @handle"}</span>
                <ExternalLink size={12} className="ml-1 shrink-0 opacity-70" />
              </Button>

              <Button
                variant="ghost"
                className="min-h-[44px] justify-center rounded-full border border-line bg-card px-3.5 text-xs font-bold text-ink hover:bg-paper active:scale-95 shadow-2xs"
                onClick={() => nav("/circle")}
              >
                <Users size={14} className="text-accent mr-1.5 shrink-0" />
                <span>My Circle</span>
              </Button>

              <Button
                variant="ghost"
                className="min-h-[44px] justify-center rounded-full border border-line bg-card px-3.5 text-xs font-semibold text-ink hover:bg-paper active:scale-95 shadow-2xs"
                onClick={() => nav(mine ? "/bio/edit" : "/bio/setup")}
                title="Edit Bio"
              >
                <Edit3 size={13} className="text-mute mr-1 shrink-0" />
                <span>Edit Bio</span>
              </Button>

              <Button
                variant="ghost"
                className="min-h-[44px] justify-center rounded-full border border-line bg-card px-3.5 text-xs font-semibold text-ink hover:bg-paper active:scale-95 shadow-2xs"
                onClick={() => nav("/settings")}
                title="Settings"
              >
                <Settings size={14} className="text-mute mr-1 shrink-0" />
                <span>Settings</span>
              </Button>
            </div>
          </div>

          {/* Quick Metrics Strip */}
          <div className="grid grid-cols-2 gap-2 pt-4 mt-2 border-t border-line/60 sm:grid-cols-3 sm:gap-2.5">
            <button
              type="button"
              onClick={() => handleTabChange("today")}
              className={cn(
                "group col-span-2 flex min-h-[68px] items-center gap-2.5 rounded-2xl p-3 text-left transition cursor-pointer ring-1 sm:col-span-1 sm:gap-3",
                activeTab === "today"
                  ? "bg-brand/10 ring-brand/40 shadow-xs"
                  : "bg-paper/60 ring-line/60 hover:bg-paper hover:ring-line",
              )}
            >
              <span className="grid h-9 w-9 place-items-center rounded-2xl bg-brand/10 text-accent group-hover:scale-105 transition shrink-0 sm:h-10 sm:w-10">
                <Sun size={17} />
              </span>
              <div className="min-w-0">
                <span className="text-[11px] font-bold uppercase tracking-wider text-mute block leading-tight">
                  Today
                </span>
                <span className="font-display text-base font-black text-ink tabular-nums leading-tight">
                  {todayTotalCount > 0 ? `${todayTotalCount} items` : "Open"}
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange("appointments")}
              className={cn(
                "group flex min-h-[68px] min-w-0 items-center gap-2 rounded-2xl p-2.5 text-left transition cursor-pointer ring-1 sm:gap-3 sm:p-3",
                activeTab === "appointments"
                  ? "bg-sky-500/10 ring-sky-500/40 shadow-xs"
                  : "bg-paper/60 ring-line/60 hover:bg-paper hover:ring-line",
              )}
            >
              <span className="grid h-9 w-9 place-items-center rounded-2xl bg-sky-500/10 text-sky-600 group-hover:scale-105 transition shrink-0 sm:h-10 sm:w-10">
                <Coffee size={17} />
              </span>
              <div className="min-w-0">
                <span className="block text-[10px] font-bold uppercase tracking-wide text-mute leading-tight sm:text-[11px] sm:tracking-wider">
                  Catch-ups
                </span>
                <span className="font-display text-base font-black text-ink tabular-nums leading-tight">
                  {upcomingScheduledAppointments.length + pendingAppointments.length}
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange("tickets")}
              className={cn(
                "group flex min-h-[68px] min-w-0 items-center gap-2 rounded-2xl p-2.5 text-left transition cursor-pointer ring-1 sm:gap-3 sm:p-3",
                activeTab === "tickets"
                  ? "bg-amber-500/10 ring-amber-500/40 shadow-xs"
                  : "bg-paper/60 ring-line/60 hover:bg-paper hover:ring-line",
              )}
            >
              <span className="grid h-9 w-9 place-items-center rounded-2xl bg-amber-500/10 text-amber-600 group-hover:scale-105 transition shrink-0 sm:h-10 sm:w-10">
                <Ticket size={17} />
              </span>
              <div className="min-w-0">
                <span className="text-[11px] font-bold uppercase tracking-wider text-mute block leading-tight">
                  Tickets
                </span>
                <span className="font-display text-base font-black text-ink tabular-nums leading-tight">
                  {upcomingTickets.length}
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* 🧭 2. APPLE-INSPIRED SEGMENTED TAB BAR */}
      <div className="sticky top-2 z-20 mb-6">
        <TabPills
          layout="contained"
          ariaLabel="Me sections"
          items={[
            { id: "all" as const, label: "All", icon: Sparkles },
            {
              id: "today" as const,
              label: "Today",
              icon: Sun,
              badge: todayTotalCount > 0 ? String(todayTotalCount) : undefined,
            },
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
            { id: "pass" as const, label: "Bio & QR Pass", icon: QrCode },
          ]}
          active={activeTab}
          onChange={handleTabChange}
        />
      </div>

      {/* 🌟 3. MAIN ME SECTIONS */}
      <div className="space-y-6">
        {/* SECTION: TODAY'S AGENDA */}
        {showSection("today") && (
          <section className="overflow-hidden rounded-[36px] bg-card p-5 sm:p-7 ring-1 ring-line/80 shadow-clay">
            <div className="flex items-center justify-between gap-3 mb-5">
              <div className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-2xl bg-brand/10 text-accent">
                  <Sun size={18} />
                </span>
                <div>
                  <h2 className="font-display text-lg sm:text-xl font-black text-ink">Today&apos;s Agenda</h2>
                  <p className="text-xs text-mute font-medium">
                    {day}, {today} · {city || "Sydney"}
                  </p>
                </div>
              </div>

              <span
                className={cn(
                  "text-[10px] font-bold rounded-full px-3 py-1 ring-1",
                  todayTotalCount > 0
                    ? "bg-brand text-white ring-brand"
                    : "bg-emerald-500/15 text-emerald-600 ring-emerald-500/30",
                )}
              >
                {todayTotalCount > 0 ? `${todayTotalCount} scheduled today` : "Clear schedule"}
              </span>
            </div>

            {/* Weather & Deterministic Outfit Widget */}
            {weather && outfitAdvice && (
              <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 rounded-2xl bg-paper/70 p-4 ring-1 ring-line/70">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-2xl bg-amber-500/15 text-amber-600 shrink-0">
                    <Shirt size={18} />
                  </span>
                  <div>
                    <p className="text-xs font-bold text-ink leading-snug">
                      Outfit Recommendation: {outfitAdvice.outfit}
                    </p>
                    <p className="text-[11px] font-medium text-accent leading-snug mt-0.5">{outfitAdvice.accessory}</p>
                  </div>
                </div>
                <div className="text-left sm:text-right shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-line/40">
                  <span className="font-display text-base font-black text-ink tabular-nums">{weather.temp}°C</span>
                  <span className="block text-[10px] text-mute">
                    {weather.isDay ? "Daytime" : "Evening"} local forecast
                  </span>
                </div>
              </div>
            )}

            {todayTotalCount > 0 ? (
              <div className="space-y-3">
                {/* Today's Appointments */}
                {todayAppointments.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 rounded-2xl bg-paper/60 p-4 ring-1 ring-line/80 shadow-2xs hover:ring-brand/30 transition"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="h-12 w-12 overflow-hidden rounded-full ring-2 ring-line/80 bg-paper shrink-0">
                        {item.requesterPhoto ? (
                          <Photo src={item.requesterPhoto} className="h-full w-full object-cover rounded-full" />
                        ) : (
                          <span className="grid h-full w-full place-items-center bg-neutral-900 font-bold text-sm text-white rounded-full">
                            {item.requesterName[0]}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-ink truncate">{item.requesterName}</span>
                          <span className="text-[10px] font-bold rounded-full bg-brand/10 text-accent px-2 py-0.5">
                            {item.type === "meeting" ? "Meeting" : item.type === "nightout" ? "Hangout" : "Coffee"}
                          </span>
                        </div>
                        <p className="text-xs text-mute mt-1 flex items-center gap-1.5 truncate">
                          <Clock size={12} className="text-mute shrink-0" />
                          <span>Today {item.time ? `@ ${item.time}` : ""}</span>
                          {item.venue && <span>· {item.venue}</span>}
                        </p>
                      </div>
                    </div>

                    <div className="flex w-full sm:w-auto items-center justify-end gap-2 shrink-0 border-t border-line/40 pt-2.5 sm:border-0 sm:pt-0">
                      {item.meetingLink && (
                        <a
                          href={item.meetingLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => void triggerHaptic("light")}
                          className="inline-flex min-h-[44px] items-center gap-1.5 whitespace-nowrap rounded-full bg-emerald-500/15 px-4 text-xs font-bold text-emerald-800 ring-1 ring-emerald-500/30 hover:bg-emerald-500/25 transition active:scale-95"
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
                        buttonClassName="min-h-[44px] px-3.5 text-xs rounded-full border border-line/80 font-bold"
                      />
                    </div>
                  </div>
                ))}

                {/* Today's Tickets */}
                {todayTickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 rounded-2xl bg-amber-500/10 p-4 ring-1 ring-amber-500/30 shadow-2xs"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-500/20 text-amber-700 dark:text-amber-400 shrink-0">
                        <Ticket size={22} />
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-sm text-ink truncate block">{ticket.title}</span>
                        <p className="text-xs text-mute mt-1 flex items-center gap-1.5 truncate">
                          <Flame size={12} className="text-amber-600 shrink-0" />
                          <span>
                            Pass ({ticket.spots || 1}x) {ticket.time ? `· Doors ${ticket.time}` : ""}
                          </span>
                          <span>· {ticket.suburb || "Venue"}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <Button
                        size="sm"
                        className="min-h-[44px] rounded-full bg-amber-600 px-4 text-xs font-bold text-white shadow-2xs hover:bg-amber-700 active:scale-95"
                        onClick={() => nav(`/ticket/${ticket.id}`)}
                      >
                        <QrCode size={14} className="mr-1.5" />
                        Open Pass
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-line/80 p-6 text-center bg-paper/40">
                <Sun size={26} className="mx-auto text-mute/80 mb-2" />
                <p className="font-display text-base font-bold text-ink">Your day is open</p>
                <p className="text-xs text-mute mt-1 max-w-md mx-auto leading-relaxed">
                  No appointments or tickets scheduled for today. Turn free time into an experience!
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      void triggerHaptic("light");
                      nav("/circle");
                    }}
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-brand px-4 text-xs font-bold text-white shadow-xs hover:bg-brand-ink transition active:scale-95 cursor-pointer"
                  >
                    <Users size={14} />
                    <span>Meet people</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => nav("/pass")}
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-amber-500/10 px-4 text-xs font-bold text-amber-700 dark:text-amber-400 ring-1 ring-amber-500/20 hover:bg-amber-500/20 transition active:scale-95 cursor-pointer"
                  >
                    <Ticket size={14} />
                    <span>Discover Passes</span>
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {/* SECTION: APPOINTMENTS & CATCH-UPS */}
        {showSection("appointments") && (
          <section className="rounded-[36px] ring-1 ring-line/80 bg-card p-5 sm:p-7 shadow-clay">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <div className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-2xl bg-sky-500/10 text-sky-600">
                  <Coffee size={18} />
                </span>
                <div>
                  <h2 className="font-display text-lg sm:text-xl font-black text-ink">Appointments &amp; Catch-ups</h2>
                  <p className="text-xs text-mute font-medium">
                    1-on-1 catch-ups ({upcomingScheduledAppointments.length + pendingAppointments.length})
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyBioLink}
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-paper px-4 text-xs font-bold text-ink ring-1 ring-line hover:bg-card transition active:scale-95 cursor-pointer"
                  title="Copy your bio link"
                >
                  {copiedBioLink ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                  <span>{copiedBioLink ? "Copied" : "Share My Bio"}</span>
                </button>
              </div>
            </div>

            {/* Pending Requests */}
            {pendingAppointments.length > 0 && (
              <div className="mb-5 rounded-2xl bg-amber-500/10 p-4 sm:p-5 ring-1 ring-amber-500/30">
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
                    <div
                      key={item.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl bg-card p-4 ring-1 ring-line/80 shadow-2xs"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="h-11 w-11 overflow-hidden rounded-full ring-2 ring-line bg-paper shrink-0">
                          {item.requesterPhoto ? (
                            <Photo src={item.requesterPhoto} className="h-full w-full object-cover rounded-full" />
                          ) : (
                            <span className="grid h-full w-full place-items-center bg-neutral-900 font-bold text-xs text-white rounded-full">
                              {item.requesterName[0]}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
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
                        </div>
                      </div>

                      <div className="flex w-full sm:w-auto items-center justify-end gap-2 shrink-0 border-t border-line/40 pt-2.5 sm:border-0 sm:pt-0">
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
                        <Button
                          size="sm"
                          variant="ghost"
                          className="min-h-[44px] flex-1 sm:flex-initial justify-center rounded-full border border-line px-3 text-xs font-medium text-mute hover:text-ink"
                          onClick={async () => {
                            try {
                              await updateCatchUpStatus(item.id, "dismissed");
                              toast.info("Request dismissed");
                            } catch (error) {
                              toast.error(error instanceof Error ? error.message : "Couldn't dismiss request.");
                            }
                          }}
                        >
                          Dismiss
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Saved Reminders: people I flagged for a future catch-up */}
            {myReminders.length > 0 && (
              <div className="mb-5 rounded-2xl bg-brand/5 p-4 sm:p-5 ring-1 ring-brand/20">
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
                      <div
                        key={item.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl bg-card p-4 ring-1 ring-line/80 shadow-2xs"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="h-11 w-11 overflow-hidden rounded-full ring-2 ring-line bg-paper shrink-0">
                            {item.requesterPhoto ? (
                              <Photo src={item.requesterPhoto} className="h-full w-full object-cover rounded-full" />
                            ) : (
                              <span className="grid h-full w-full place-items-center bg-neutral-900 font-bold text-xs text-white rounded-full">
                                {(item.requesterName || item.targetHandle)[0]}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-sm text-ink truncate">{displayName}</p>
                            <p className="text-xs text-mute truncate mt-0.5">
                              @{item.targetHandle}
                              {item.venue && ` · ${item.venue}`}
                            </p>
                          </div>
                        </div>

                        <div className="flex w-full sm:w-auto items-center justify-end gap-2 shrink-0 border-t border-line/40 pt-2.5 sm:border-0 sm:pt-0">
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
                            className="grid h-11 w-11 min-h-[44px] min-w-[44px] place-items-center rounded-full text-mute ring-1 ring-line transition hover:text-ink hover:bg-black/5 active:scale-95 cursor-pointer touch-manipulation"
                            aria-label={`Remove reminder for ${displayName}`}
                            title="Remove reminder"
                          >
                            <X size={15} />
                          </button>
                        </div>
                      </div>
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
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 rounded-2xl bg-paper/60 p-4 ring-1 ring-line/70 shadow-2xs hover:ring-brand/30 transition"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="h-11 w-11 overflow-hidden rounded-full ring-2 ring-line bg-paper shrink-0">
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

                    <div className="flex w-full sm:w-auto items-center justify-end gap-2 shrink-0 border-t border-line/40 pt-2.5 sm:border-0 sm:pt-0">
                      {item.meetingLink && (
                        <a
                          href={item.meetingLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex min-h-[44px] items-center gap-1.5 whitespace-nowrap rounded-full bg-emerald-500/15 px-3.5 text-xs font-bold text-emerald-800 ring-1 ring-emerald-500/30 hover:bg-emerald-500/25 transition active:scale-95"
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
                        buttonClassName="min-h-[44px] px-3.5 text-xs rounded-full border border-line font-bold"
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : pendingAppointments.length === 0 && myReminders.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-line/80 p-5 text-center bg-paper/40">
                <Coffee size={24} className="mx-auto text-mute/80 mb-1.5" />
                <p className="text-xs text-mute font-medium">No upcoming appointments or catch-ups.</p>
                <button
                  type="button"
                  onClick={() => nav("/circle")}
                  className="mt-2 inline-flex min-h-[44px] items-center gap-1.5 text-xs font-bold text-accent underline cursor-pointer hover:text-brand transition"
                >
                  Find someone to meet
                  <ArrowRight size={12} className="shrink-0" aria-hidden="true" />
                </button>
              </div>
            ) : null}
          </section>
        )}

        {/* SECTION: TICKETS & PASSES */}
        {showSection("tickets") && (
          <section className="rounded-[36px] ring-1 ring-line/80 bg-card p-5 sm:p-7 shadow-clay">
            <div className="flex items-center justify-between gap-3 mb-5">
              <div className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-2xl bg-amber-500/10 text-amber-600">
                  <Ticket size={18} />
                </span>
                <div>
                  <h2 className="font-display text-lg sm:text-xl font-black text-ink">AirPal Pass · Digital Wallet</h2>
                  <p className="text-xs text-mute font-medium">
                    My Tickets &amp; Event Passes ({upcomingTickets.length})
                  </p>
                </div>
              </div>

              <Link
                href="/me/tickets"
                className="inline-flex min-h-[44px] items-center gap-1.5 whitespace-nowrap rounded-full bg-paper px-4 text-xs font-bold text-ink ring-1 ring-line hover:bg-card transition active:scale-95"
              >
                <span>Full Wallet</span>
                <ChevronRight size={14} />
              </Link>
            </div>

            {upcomingTickets.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {upcomingTickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="relative overflow-hidden rounded-3xl bg-paper/60 p-5 ring-1 ring-line/80 shadow-2xs flex flex-col justify-between hover:ring-amber-500/40 transition"
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

                    <div className="mt-5 pt-3.5 border-t border-line/70 flex flex-col gap-2">
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
            ) : (
              <div className="rounded-3xl border border-dashed border-line/80 p-6 text-center bg-paper/40">
                <Ticket size={28} className="mx-auto text-mute/80" />
                <p className="font-display text-sm font-bold text-ink mt-2">No active tickets or passes</p>
                <p className="text-xs text-mute mt-1 max-w-md mx-auto leading-relaxed">
                  Festival access, concert passes, and member dining perks live in your AirPal Passbook.
                </p>
                <Button
                  size="sm"
                  className="mt-4 rounded-full bg-brand px-5 text-xs font-bold text-white active:scale-95 shadow-xs"
                  onClick={() => nav("/pass")}
                >
                  Browse AirPal Pass
                  <ArrowRight size={13} className="shrink-0" aria-hidden="true" />
                </Button>
              </div>
            )}
          </section>
        )}

        {/* SECTION: HOSTING — events I run */}
        {(activeTab === "all" || activeTab === "today") && myEvent && (
          <section className="rounded-[36px] ring-1 ring-line/80 bg-card p-5 sm:p-7 shadow-clay">
            <div className="flex items-center justify-between gap-3 mb-5">
              <div className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-2xl bg-brand/10 text-accent">
                  <Calendar size={18} />
                </span>
                <div>
                  <h2 className="font-display text-lg sm:text-xl font-black text-ink">Hosting</h2>
                  <p className="text-xs text-mute font-medium">My event, live from the studio</p>
                </div>
              </div>
              <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 ring-1 ring-emerald-500/20">
                {myEvent.status}
              </span>
            </div>
            <div className="rounded-3xl bg-paper/60 p-5 ring-1 ring-line/80">
              <h3 className="font-display font-bold text-base text-ink leading-snug">{myEvent.name}</h3>
              <p className="text-xs text-mute mt-1">{[myEvent.venue, myEvent.city].filter(Boolean).join(" · ")}</p>
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <Link
                  href="/event"
                  className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-brand px-4 text-xs font-bold text-white transition hover:bg-brand-ink active:scale-95"
                >
                  Open studio
                </Link>
                <Link
                  href={`/e/${myEvent.id}/manage`}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-full px-4 text-xs font-bold text-ink ring-1 ring-line transition hover:bg-card active:scale-95"
                >
                  Manage
                </Link>
                <Link
                  href={`/e/${myEvent.id}/guests`}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-full px-4 text-xs font-bold text-ink ring-1 ring-line transition hover:bg-card active:scale-95"
                >
                  Guestlist
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* SECTION: DIGITAL BIO PASS & QR CARD */}
        {showSection("pass") && mine && (
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
        )}

        {/* 🛠 4. TOOLS, WORKSPACES & ECOSYSTEM SHORTCUTS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Invite Mates Card */}
          <div className="rounded-[32px] ring-1 ring-line/80 bg-card p-5 sm:p-6 shadow-clay flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-brand/10 text-accent">
                  <Share2 size={15} />
                </span>
                <h3 className="font-display text-base font-bold text-ink">Invite mates to AirPal</h3>
              </div>
              <p className="text-xs text-mute mb-4 leading-relaxed">
                Earn Stars when friends claim their bio handle or join your circle.
              </p>
            </div>
            <InvitePanel handle={mine?.handle} loading={!biosReady} />
          </div>

          {/* Quick Shortcuts */}
          <div className="rounded-[32px] ring-1 ring-line/80 bg-card p-5 sm:p-6 shadow-clay flex flex-col justify-between">
            <div>
              <h3 className="font-display text-base font-bold text-ink mb-3.5">Workspaces &amp; Tools</h3>
              <div className="grid grid-cols-2 gap-2.5">
                <Link
                  href="/me/inbox"
                  className="flex items-center gap-2.5 p-3 rounded-2xl bg-paper/60 ring-1 ring-line/60 hover:bg-paper hover:ring-line transition text-xs font-bold text-ink active:scale-95"
                >
                  <MessageSquare size={15} className="text-accent" />
                  <span>Inbox</span>
                </Link>
                <Link
                  href="/calendar"
                  className="flex items-center gap-2.5 p-3 rounded-2xl bg-paper/60 ring-1 ring-line/60 hover:bg-paper hover:ring-line transition text-xs font-bold text-ink active:scale-95"
                >
                  <Calendar size={15} className="text-sky-600" />
                  <span>Calendar</span>
                </Link>
                <Link
                  href="/me/memories"
                  className="flex items-center gap-2.5 p-3 rounded-2xl bg-paper/60 ring-1 ring-line/60 hover:bg-paper hover:ring-line transition text-xs font-bold text-ink active:scale-95"
                >
                  <Images size={15} className="text-accent" />
                  <span>Memories</span>
                </Link>
                <Link
                  href="/settings"
                  className="flex items-center gap-2.5 p-3 rounded-2xl bg-paper/60 ring-1 ring-line/60 hover:bg-paper hover:ring-line transition text-xs font-bold text-ink active:scale-95"
                >
                  <Settings size={15} className="text-mute" />
                  <span>Settings</span>
                </Link>
                {isHost ? (
                  <Link
                    href="/event"
                    className="flex items-center gap-2.5 p-3 rounded-2xl bg-paper/60 ring-1 ring-line/60 hover:bg-paper hover:ring-line transition text-xs font-bold text-ink active:scale-95"
                  >
                    <Building2 size={15} className="text-emerald-600" />
                    <span>Host Tools</span>
                  </Link>
                ) : (
                  <Link
                    href="/business"
                    className="flex items-center gap-2.5 p-3 rounded-2xl bg-paper/60 ring-1 ring-line/60 hover:bg-paper hover:ring-line transition text-xs font-bold text-ink active:scale-95"
                  >
                    <Building2 size={15} className="text-emerald-600" />
                    <span>Business Hub</span>
                  </Link>
                )}
                {business ? (
                  <Link
                    href="/business"
                    className="flex items-center gap-2.5 p-3 rounded-2xl bg-paper/60 ring-1 ring-line/60 hover:bg-paper hover:ring-line transition text-xs font-bold text-ink active:scale-95"
                  >
                    <Store size={15} className="text-amber-600" />
                    <span>Business Place</span>
                  </Link>
                ) : (
                  <Link
                    href={partnerAccountPath({ signedIn: true, hasPlace: false })}
                    className="flex items-center gap-2.5 p-3 rounded-2xl bg-paper/60 ring-1 ring-line/60 hover:bg-paper hover:ring-line transition text-xs font-bold text-ink active:scale-95"
                  >
                    <Store size={15} className="text-amber-600" />
                    <span>{NAMES.partnerAccount}</span>
                  </Link>
                )}
              </div>
            </div>

            <div className="mt-5 pt-3.5 border-t border-line/60 flex items-center justify-between">
              <span className="text-[11px] text-mute font-medium truncate max-w-[200px]">
                {user.email || user.displayName}
              </span>
              <button
                type="button"
                onClick={() => void logout().then(() => nav("/"))}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-red-600 hover:text-red-700 transition cursor-pointer active:scale-95"
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
    </div>
  );
}
