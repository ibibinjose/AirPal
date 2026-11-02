import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Bell,
  Cake,
  Calendar,
  Check,
  ChevronRight,
  Copy,
  Download,
  ExternalLink,
  Gift,
  KeyRound,
  LogOut,
  Mail,
  MapPin,
  Monitor,
  Moon,
  Palette,
  QrCode,
  Scale,
  ShieldCheck,
  Sparkles,
  Sun,
  Ticket,
  Trash2,
  UserCheck,
  UserRound,
  Users,
  Briefcase,
} from "lucide-react";
import { authErrorMessage } from "@shared/auth-email";
import {
  BIRTHDAY_MONTHS,
  BIRTHDAY_REGIONS,
  isBirthdayRegionCode,
  type BirthdayRegionCode,
} from "@shared/birthday-freebies";
import { Button } from "@/components/ui/Button";
import { PageLoading } from "@/components/ui/PageLoading";
import { MeAvatar } from "@/components/auth/MeAvatar";
import { AccountContacts } from "@/components/auth/AccountContacts";
import { BiometricEnrollCard } from "@/components/auth/BiometricEnrollCard";
import { VerifyEmailBanner } from "@/components/auth/VerifyEmailBanner";
import { useAuth } from "@/contexts/AuthContext";
import { useBio } from "@/contexts/BioContext";
import { useLocalNow } from "@/contexts/LocalNowContext";
import { ChangeDisplayNameForm } from "@/components/bio/ChangeDisplayNameForm";
import { ChangeHandleForm } from "@/components/bio/ChangeHandleForm";
import { partnerAccountPath } from "@/lib/partner-account";
import { friendlyBirthdayError, setBirthdayAlertPrefsRemote } from "@/lib/birthday-freebies";
import { enableWebPush, pushPrefEnabled } from "@/lib/notifications";
import { stopHereRemote } from "@/lib/here";
import { NAMES } from "@shared/names";
import { syncNativeChrome, triggerHaptic } from "@/lib/native";
import { getThemePreference, setThemePreference, type ThemeMode } from "@/lib/theme";
import { CITY_OPTIONS } from "@/lib/cities";
import { cn } from "@/lib/cn";
import { safeGetItem, safeSetItem } from "@/lib/safe-storage";
import { getBuildInfo } from "@/lib/build-info";
import { bioPath } from "@shared/bio";

export function SettingsPage() {
  const [, nav] = useLocation();
  const { user, authReady, logout, deleteAccount, sendVerificationEmail, requestPasswordReset, refreshUser } =
    useAuth();
  const { mine, business, updateProfile } = useBio();
  const { city, usingGps, geoBlocked, chooseLocation, shareLocation, setShareLocation } = useLocalNow();
  const buildInfo = getBuildInfo();

  const [resetBusy, setResetBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [showDeleteZone, setShowDeleteZone] = useState(false);
  const [copiedBio, setCopiedBio] = useState(false);
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [alertsRegion, setAlertsRegion] = useState<BirthdayRegionCode>("au");
  const [birthdayMonth, setBirthdayMonth] = useState<number | null>(user?.birthdayMonth ?? null);
  const [alertsBusy, setAlertsBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    setAlertsEnabled(user.birthdayAlertsEnabled !== false);
    const region = String(user.birthdayAlertsRegion || "au").toLowerCase();
    setAlertsRegion(isBirthdayRegionCode(region) ? region : "au");
    setBirthdayMonth(user.birthdayMonth ?? null);
  }, [user]);

  async function saveAlertPrefs(next: { enabled?: boolean; region?: BirthdayRegionCode; month?: number | null }) {
    if (!user) return;
    const enabled = next.enabled ?? alertsEnabled;
    const region = next.region ?? alertsRegion;
    const month = next.month !== undefined ? next.month : birthdayMonth;
    setAlertsBusy(true);
    try {
      await setBirthdayAlertPrefsRemote({
        birthdayAlertsEnabled: enabled,
        birthdayAlertsRegion: region,
        birthdayMonth: month,
      });
      setAlertsEnabled(enabled);
      setAlertsRegion(region);
      setBirthdayMonth(month);
      await refreshUser?.();
      void triggerHaptic("light");
      toast.success("Birthday preferences saved 🎂");
    } catch (err) {
      toast.error(friendlyBirthdayError(err));
    } finally {
      setAlertsBusy(false);
    }
  }

  const [theme, setTheme] = useState<ThemeMode>(() => getThemePreference());
  const [notifDeals, setNotifDeals] = useState(() => safeGetItem("airpal_notif_deals") !== "false");
  const [pushStatus, setPushStatus] = useState<string>(() => (pushPrefEnabled() ? "granted" : "default"));
  const [searchIndexing, setSearchIndexing] = useState(() => safeGetItem("airpal_privacy_search_indexing") !== "false");
  const [circlePresence, setCirclePresence] = useState(
    () => shareLocation && safeGetItem("airpal_privacy_circle_presence") !== "false",
  );

  useEffect(() => {
    if (mine?.visibility) {
      const indexed = mine.visibility !== "private";
      setSearchIndexing(indexed);
      safeSetItem("airpal_privacy_search_indexing", String(indexed));
    }
  }, [mine?.visibility]);

  useEffect(() => {
    setCirclePresence(shareLocation);
  }, [shareLocation]);

  const handleSearchIndexingToggle = () => {
    void triggerHaptic("light");
    const next = !searchIndexing;
    setSearchIndexing(next);
    safeSetItem("airpal_privacy_search_indexing", String(next));
    if (mine?.handle) {
      void updateProfile({ handle: mine.handle, visibility: next ? "public" : "private" });
    }
    toast.success(next ? "Profile directory indexing enabled" : "Profile hidden from search indexing");
  };

  const handleCirclePresenceToggle = () => {
    void triggerHaptic("light");
    const next = !circlePresence;
    setCirclePresence(next);
    setShareLocation(next);
    safeSetItem("airpal_privacy_circle_presence", String(next));
    if (!next) {
      void stopHereRemote().catch(() => undefined);
    }
    toast.success(next ? "Live presence check-ins visible to Circle" : "Circle presence set to private");
  };

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPushStatus(Notification.permission);
    }
  }, []);

  const handleThemeChange = (mode: ThemeMode) => {
    void triggerHaptic("light");
    setTheme(mode);
    setThemePreference(mode);
    void syncNativeChrome();
    toast.success(
      `Theme set to ${mode === "dark" ? "Night (OLED Black)" : mode === "light" ? "Day (Parchment)" : "System"}`,
    );
  };

  const handleDealsToggle = () => {
    void triggerHaptic("light");
    setNotifDeals((prev) => {
      const nextVal = !prev;
      safeSetItem("airpal_notif_deals", String(nextVal));
      toast.success(nextVal ? "Event drops & deal alerts enabled" : "Deal alerts muted");
      return nextVal;
    });
  };

  const requestPush = async () => {
    void triggerHaptic("medium");
    try {
      const perm = await enableWebPush();
      setPushStatus(perm === "granted" ? "granted" : perm === "denied" ? "denied" : "default");
      if (perm === "granted") {
        toast.success("Push notifications enabled");
      } else if (perm === "denied") {
        toast.message("Push notifications blocked in browser settings");
      } else {
        toast.message("Push notifications are not supported on this browser");
      }
    } catch {
      toast.error("Could not request notification permission");
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 pb-[max(7.5rem,calc(env(safe-area-inset-bottom,0px)+6.5rem))] pt-4">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <button
          type="button"
          onClick={() => {
            void triggerHaptic("light");
            if (window.history.length > 1) {
              window.history.back();
            } else {
              nav("/me");
            }
          }}
          className="inline-flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-card ring-1 ring-line text-ink transition hover:bg-paper active:scale-95 cursor-pointer touch-manipulation"
          aria-label="Go back"
        >
          <ArrowLeft size={18} />
        </button>

        <div className="text-center min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-mute">AirPal Account</p>
          <h1 className="font-display text-lg sm:text-xl font-bold text-ink truncate">Settings &amp; Preferences</h1>
        </div>

        <Link
          href="/me"
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-card px-3.5 text-xs font-bold text-ink ring-1 ring-line transition hover:bg-paper active:scale-95 shrink-0"
          title="My Hub"
        >
          <UserRound size={14} className="text-accent" />
          <span className="hidden sm:inline">My Hub</span>
        </Link>
      </div>

      {/* Quick Section Jump Bar */}
      <nav
        aria-label="Settings sections"
        className="sticky top-[max(0.5rem,env(safe-area-inset-top,0px))] z-20 mb-6 flex items-center gap-1.5 overflow-x-auto rounded-full bg-card/90 p-1.5 ring-1 ring-line backdrop-blur-md no-scrollbar shadow-2xs"
      >
        {[
          { id: "settings-account", label: "Account" },
          { id: "settings-appearance", label: "Display" },
          { id: "settings-alerts", label: "Alerts" },
          { id: "settings-location", label: "Location" },
          { id: "settings-privacy", label: "Privacy" },
          { id: "settings-workspaces", label: "Studios" },
          ...(user ? [{ id: "settings-security", label: "Security" }] : []),
          { id: "settings-legal", label: "Legal & Help" },
        ].map((sec) => (
          <button
            key={sec.id}
            type="button"
            onClick={() => {
              void triggerHaptic("light");
              document.getElementById(sec.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            className="inline-flex min-h-[44px] shrink-0 items-center rounded-full px-3.5 text-xs font-semibold text-mute hover:bg-paper hover:text-ink active:scale-95 transition cursor-pointer"
          >
            {sec.label}
          </button>
        ))}
      </nav>

      {/* Account Overview Header. While auth restores, hold a loader: a bare
          `!user` flash shows the signed-out card even though cached bios list
          the account (intermittent finding). */}
      <div id="settings-account" className="scroll-mt-20">
        {!authReady ? (
          <PageLoading />
        ) : user ? (
          <div className="rounded-3xl bg-card p-5 sm:p-6 ring-1 ring-line shadow-clay">
            <div className="flex items-center gap-4">
              <MeAvatar faceClassName="h-16 w-16 text-xl ring-2 ring-brand/40 shadow-sm" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-lg sm:text-xl font-bold text-ink truncate">
                    {mine?.name || user.displayName || "AirPal Member"}
                  </h2>
                  {user.emailVerified && (
                    <span
                      className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/20"
                      title="Verified Account"
                    >
                      <UserCheck size={11} /> Verified
                    </span>
                  )}
                </div>
                <p className="truncate text-xs sm:text-sm text-mute mt-0.5">
                  {user.email || user.phone || "Signed In"}
                </p>
                {mine?.handle ? (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Link
                      href={bioPath(mine.handle)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline"
                    >
                      <span>airpal.me/@{mine.handle}</span>
                      <ExternalLink size={12} />
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        void triggerHaptic("light");
                        const url = `${window.location.origin}/@${mine.handle}`;
                        void navigator.clipboard?.writeText(url).then(() => {
                          setCopiedBio(true);
                          toast.success("Bio link copied");
                          setTimeout(() => setCopiedBio(false), 2000);
                        });
                      }}
                      className="inline-flex items-center gap-1 rounded-full bg-paper px-2.5 py-0.5 text-[11px] font-semibold text-mute ring-1 ring-line hover:text-ink cursor-pointer"
                    >
                      {copiedBio ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                      <span>{copiedBio ? "Copied" : "Copy link"}</span>
                    </button>
                  </div>
                ) : (
                  <div className="mt-2">
                    <Link
                      href="/bio/setup"
                      className="inline-flex items-center gap-1 text-xs font-bold text-accent hover:underline"
                    >
                      <Sparkles size={12} />
                      <span>Claim your public @handle</span>
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Action Navigation Pills */}
            <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2 border-t border-line/70 pt-4">
              <button
                type="button"
                onClick={() => {
                  void triggerHaptic("light");
                  nav("/me");
                }}
                className="flex min-h-[48px] flex-col items-center justify-center rounded-2xl bg-paper px-2 py-2 text-center text-xs font-semibold text-ink ring-1 ring-line hover:bg-card transition active:scale-95 cursor-pointer"
              >
                <Sparkles size={15} className="text-accent mb-1" />
                <span>My Hub</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  void triggerHaptic("light");
                  nav(mine ? "/bio/edit" : "/bio/setup");
                }}
                className="flex min-h-[48px] flex-col items-center justify-center rounded-2xl bg-paper px-2 py-2 text-center text-xs font-semibold text-ink ring-1 ring-line hover:bg-card transition active:scale-95 cursor-pointer"
              >
                <UserRound size={15} className="text-accent mb-1" />
                <span>{mine ? "Edit Bio" : "Setup Bio"}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  void triggerHaptic("light");
                  nav("/me/inbox");
                }}
                className="flex min-h-[48px] flex-col items-center justify-center rounded-2xl bg-paper px-2 py-2 text-center text-xs font-semibold text-ink ring-1 ring-line hover:bg-card transition active:scale-95 cursor-pointer"
              >
                <Bell size={15} className="text-accent mb-1" />
                <span>Inbox</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  void triggerHaptic("light");
                  nav("/me/tickets");
                }}
                className="flex min-h-[48px] flex-col items-center justify-center rounded-2xl bg-paper px-2 py-2 text-center text-xs font-semibold text-ink ring-1 ring-line hover:bg-card transition active:scale-95 cursor-pointer"
              >
                <Ticket size={15} className="text-accent mb-1" />
                <span>Wallet</span>
              </button>
            </div>

            {user.email && user.emailVerified === false && (
              <div className="mt-4">
                <VerifyEmailBanner email={user.email} onSend={sendVerificationEmail} />
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-3xl bg-card p-6 text-center ring-1 ring-line shadow-clay">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 text-brand">
              <UserRound size={26} />
            </div>
            <h2 className="font-display mt-3 text-lg font-bold text-ink">Sign in to AirPal</h2>
            <p className="mt-1 text-xs sm:text-sm text-mute max-w-sm mx-auto leading-relaxed">
              Connect your universal account to sync personal tickets, Apple &amp; Google Wallet passes, and manage your
              digital bio.
            </p>
            <div className="mt-5 flex items-center justify-center gap-3">
              <Button onClick={() => nav("/start")} className="min-w-[120px] rounded-full">
                Join AirPal
              </Button>
              <Button variant="ghost" onClick={() => nav("/start?tab=signin")} className="min-w-[120px] rounded-full">
                Sign In
              </Button>
            </div>
          </div>
        )}

        {/* Profile Details Edit Group (When signed in) */}
        {user && (
          <div className="mt-4 space-y-4">
            <div className="rounded-3xl bg-card p-5 ring-1 ring-line shadow-xs">
              <ChangeDisplayNameForm currentName={mine?.name || user.displayName} />
            </div>

            {mine ? (
              <div className="rounded-3xl bg-card p-5 ring-1 ring-line shadow-xs">
                <ChangeHandleForm current={mine.handle} profileId={mine.id} />
              </div>
            ) : (
              <div className="rounded-3xl bg-card p-5 ring-1 ring-line shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-accent">Public @handle</p>
                  <p className="text-xs sm:text-sm text-mute mt-1 leading-relaxed">
                    Claim your personal @handle to unlock your digital bio, QR pass, and Wallet card.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => nav("/bio/setup")}
                  className="min-h-[44px] shrink-0 rounded-full px-5 text-xs font-bold"
                >
                  Claim @handle
                </Button>
              </div>
            )}

            <div className="rounded-3xl bg-card p-5 ring-1 ring-line shadow-xs">
              <p className="text-xs font-bold uppercase tracking-wider text-accent mb-3">Linked Email &amp; Mobile</p>
              <AccountContacts compact />
            </div>
          </div>
        )}
      </div>

      {/* Appearance & Themes */}
      <section id="settings-appearance" className="mt-8 scroll-mt-20">
        <div className="flex items-center gap-2 mb-1">
          <Palette size={16} className="text-accent" />
          <h2 className="font-display text-base sm:text-lg font-bold text-ink">Appearance</h2>
        </div>
        <p className="text-xs text-mute mb-3">Choose how AirPal displays on this screen.</p>
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { id: "system" as const, label: "System", sub: "Auto OS match", icon: Monitor },
            { id: "light" as const, label: "Day", sub: "Warm parchment", icon: Sun },
            { id: "dark" as const, label: "Night", sub: "True OLED black", icon: Moon },
          ].map((opt) => {
            const Icon = opt.icon;
            const active = theme === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleThemeChange(opt.id)}
                className={cn(
                  "flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-2xl p-3 text-center transition-[background-color,color,box-shadow,transform] duration-200 active:scale-95 cursor-pointer ring-1",
                  active
                    ? "bg-brand text-white ring-brand shadow-clay"
                    : "bg-card text-ink ring-line hover:bg-paper hover:ring-line/90 shadow-2xs",
                )}
              >
                <Icon size={18} />
                <span className="text-xs font-bold">{opt.label}</span>
                <span className={cn("text-[10px] leading-tight", active ? "text-white/85" : "text-mute")}>
                  {opt.sub}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Notifications & Alerts */}
      <section id="settings-alerts" className="mt-8 scroll-mt-20">
        <div className="flex items-center gap-2 mb-1">
          <Bell size={16} className="text-accent" />
          <h2 className="font-display text-base sm:text-lg font-bold text-ink">Notifications &amp; Alerts</h2>
        </div>
        <p className="text-xs text-mute mb-3">Control push notifications, event drops, and local perks.</p>

        <div className="divide-y divide-line/70 rounded-3xl bg-card ring-1 ring-line shadow-xs overflow-hidden">
          {/* Push Notifications Row */}
          <div className="flex min-h-[56px] items-center justify-between p-4 sm:p-5">
            <div className="min-w-0 pr-3">
              <span className="block text-sm font-semibold text-ink">Push Notifications</span>
              <span className="block text-xs text-mute mt-0.5">
                {pushStatus === "granted"
                  ? "Active and receiving updates"
                  : pushStatus === "denied"
                    ? "Blocked in browser permissions"
                    : "Not enabled yet on this device"}
              </span>
            </div>
            {pushStatus !== "granted" ? (
              <button
                type="button"
                onClick={requestPush}
                className="inline-flex min-h-[44px] items-center rounded-full bg-brand px-4 text-xs font-bold text-white shadow-xs hover:bg-brand/90 transition active:scale-95 cursor-pointer"
              >
                Enable
              </button>
            ) : (
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Check size={16} />
              </span>
            )}
          </div>

          {/* Event Drops & Dining Perks Row */}
          <div className="flex min-h-[56px] items-center justify-between p-4 sm:p-5">
            <div className="min-w-0 pr-3">
              <span className="block text-sm font-semibold text-ink">Event Drops &amp; Dining Deals</span>
              <span className="block text-xs text-mute mt-0.5">
                Alerts when nearby partner venues post limited perks
              </span>
            </div>
            <button
              type="button"
              onClick={handleDealsToggle}
              className={cn(
                "relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
                notifDeals ? "bg-brand" : "bg-line",
              )}
              role="switch"
              aria-checked={notifDeals}
              aria-label="Toggle Event Drops alerts"
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out mt-1 ml-1",
                  notifDeals ? "translate-x-5" : "translate-x-0",
                )}
              />
            </button>
          </div>

          {/* In-App Notifications Inbox Link */}
          {user && (
            <Link
              href="/me/inbox"
              className="flex min-h-[56px] items-center justify-between p-4 sm:p-5 hover:bg-paper transition cursor-pointer"
            >
              <div className="min-w-0 pr-3">
                <span className="block text-sm font-semibold text-ink">In-App Notifications Inbox</span>
                <span className="block text-xs text-mute mt-0.5">
                  Review catch-up updates, ticket passes, and system alerts
                </span>
              </div>
              <ChevronRight size={18} className="text-mute shrink-0" />
            </Link>
          )}

          {/* Email Guestlist & Unsubscribe Link */}
          <Link
            href={user?.email ? `/unsubscribe?email=${encodeURIComponent(user.email)}` : "/unsubscribe"}
            className="flex min-h-[56px] items-center justify-between p-4 sm:p-5 hover:bg-paper transition cursor-pointer"
          >
            <div className="min-w-0 pr-3">
              <span className="block text-sm font-semibold text-ink">Email Guestlist &amp; Invites</span>
              <span className="block text-xs text-mute mt-0.5">
                Manage or opt out of event invite emails in one click
              </span>
            </div>
            <ChevronRight size={18} className="text-mute shrink-0" />
          </Link>

          {/* Birthday Freebies Alert Section (When signed in) */}
          {user && (
            <div className="p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                    <Gift size={15} className="text-amber-500" />
                    <span>Birthday Month Perks</span>
                  </span>
                  <span className="block text-xs text-mute mt-0.5">
                    Receive a notification when your annual freebies are ready to claim
                  </span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={alertsEnabled}
                  aria-label="Birthday month alerts"
                  disabled={alertsBusy}
                  onClick={() => void saveAlertPrefs({ enabled: !alertsEnabled })}
                  className={cn(
                    "relative h-7 w-12 shrink-0 rounded-full transition-[background-color] cursor-pointer disabled:opacity-50",
                    alertsEnabled ? "bg-brand" : "bg-line",
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-[left,transform]",
                      alertsEnabled ? "left-[22px]" : "left-0.5",
                    )}
                  />
                </button>
              </div>

              <div className="mt-3.5 border-t border-line/60 pt-3 space-y-3">
                <div>
                  <label htmlFor="user-birthday-month" className="block text-xs font-semibold text-mute mb-1">
                    Your Birthday Month
                  </label>
                  <select
                    id="user-birthday-month"
                    className="w-full min-h-[44px] rounded-2xl border border-line bg-paper px-3 py-2 text-[16px] sm:text-sm font-medium text-ink focus:outline-none focus:ring-2 focus:ring-brand disabled:opacity-50 cursor-pointer"
                    value={birthdayMonth ?? ""}
                    disabled={alertsBusy}
                    onChange={(e) => {
                      const val = e.target.value ? Number(e.target.value) : null;
                      void saveAlertPrefs({ month: val });
                    }}
                  >
                    <option value="">Select your birthday month...</option>
                    {BIRTHDAY_MONTHS.map((m) => (
                      <option key={m.value} value={m.value}>
                        🎂 {m.label} ({m.short})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="freebies-region" className="block text-xs font-semibold text-mute mb-1">
                    Freebies Country / Region
                  </label>
                  <select
                    id="freebies-region"
                    className="w-full min-h-[44px] rounded-2xl border border-line bg-paper px-3 py-2 text-[16px] sm:text-sm font-medium text-ink focus:outline-none focus:ring-2 focus:ring-brand disabled:opacity-50 cursor-pointer"
                    value={alertsRegion}
                    disabled={alertsBusy}
                    onChange={(e) => {
                      const region = e.target.value as BirthdayRegionCode;
                      void saveAlertPrefs({ region });
                    }}
                  >
                    {BIRTHDAY_REGIONS.map((r) => (
                      <option key={r.code} value={r.code}>
                        {r.flagEmoji ? `${r.flagEmoji} ` : ""}
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-mute">
                  <span className="flex items-center gap-1.5 font-medium text-ink">
                    {birthdayMonth ? (
                      <>
                        <Cake size={13} className="shrink-0 text-amber-600" aria-hidden="true" />
                        <span>
                          Birthday set to:{" "}
                          <strong className="text-ink">
                            {BIRTHDAY_MONTHS.find((m) => m.value === birthdayMonth)?.label}
                          </strong>
                        </span>
                      </>
                    ) : (
                      <span className="text-amber-500 font-medium inline-flex items-center gap-1">
                        <AlertTriangle size={12} className="shrink-0" aria-hidden="true" />
                        <span>Select your birth month to unlock annual alerts</span>
                      </span>
                    )}
                  </span>
                  <Link
                    href={`/birthday-freebies/${alertsRegion}`}
                    className="font-semibold text-accent hover:underline flex items-center gap-1"
                  >
                    <span>Browse Freebies</span>
                    <ArrowRight size={12} className="shrink-0" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Location & Precinct Preferences */}
      <section id="settings-location" className="mt-8 scroll-mt-20">
        <div className="flex items-center gap-2 mb-1">
          <MapPin size={16} className="text-accent" />
          <h2 className="font-display text-base sm:text-lg font-bold text-ink">Location &amp; Precinct</h2>
        </div>
        <p className="text-xs text-mute mb-3">Configure your anchor city for local recommendations.</p>

        <div className="divide-y divide-line/70 rounded-3xl bg-card ring-1 ring-line shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-ink">Default Discovery City</span>
              <span className="rounded-full bg-paper px-2.5 py-0.5 text-[11px] font-bold text-mute ring-1 ring-line">
                {usingGps ? "Live GPS" : "Fixed City"}
              </span>
            </div>
            <select
              id="city-select"
              value={usingGps ? "gps" : city.toLowerCase()}
              onChange={(e) => {
                const val = e.target.value;
                void triggerHaptic("light");
                if (val === "gps") {
                  chooseLocation({ mode: "gps" });
                  toast.success("Switched to live GPS");
                } else {
                  const found = CITY_OPTIONS.find((c) => c.label.toLowerCase() === val.toLowerCase());
                  if (found) {
                    chooseLocation({ mode: "city", city: found.label, lat: found.lat, lng: found.lng });
                    toast.success(`Location set to ${found.label}`);
                  }
                }
              }}
              className="w-full min-h-[44px] rounded-2xl bg-paper px-3 py-2 text-[16px] sm:text-sm font-medium text-ink ring-1 ring-line focus:outline-none focus:ring-2 focus:ring-brand cursor-pointer"
            >
              <option value="gps">📍 Current device location (GPS)</option>
              {CITY_OPTIONS.map((c) => (
                <option key={c.id} value={c.label.toLowerCase()}>
                  {c.label} ({c.region})
                </option>
              ))}
            </select>
            {geoBlocked && (
              <p className="mt-2 text-xs text-mute">
                Location is blocked in this browser, so GPS can&apos;t engage. Tap the tune icon by the address bar,
                allow Location, then reload.
              </p>
            )}
          </div>

          <div className="flex min-h-[56px] items-center justify-between p-4 sm:p-5">
            <div className="min-w-0 pr-3">
              <span className="block text-sm font-semibold text-ink">Share Live Location with Circle</span>
              <span className="block text-xs text-mute mt-0.5">
                Allows accepted mutuals in active hangouts to view your approximate check-in
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                void triggerHaptic("light");
                const next = !shareLocation;
                setShareLocation(next);
                setCirclePresence(next);
                safeSetItem("airpal_privacy_circle_presence", String(next));
                if (!next) {
                  void stopHereRemote().catch(() => undefined);
                }
              }}
              className={cn(
                "relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
                shareLocation ? "bg-brand" : "bg-line",
              )}
              role="switch"
              aria-checked={shareLocation}
              aria-label="Toggle location sharing"
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out mt-1 ml-1",
                  shareLocation ? "translate-x-5" : "translate-x-0",
                )}
              />
            </button>
          </div>
        </div>
      </section>

      {/* Privacy & Trust Controls */}
      <section id="settings-privacy" className="mt-8 scroll-mt-20">
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck size={16} className="text-accent" />
          <h2 className="font-display text-base sm:text-lg font-bold text-ink">Privacy &amp; Visibility</h2>
        </div>
        <p className="text-xs text-mute mb-3">Control your discoverability across search and Circle.</p>

        <div className="divide-y divide-line/70 rounded-3xl bg-card ring-1 ring-line shadow-xs overflow-hidden">
          <div className="flex min-h-[56px] items-center justify-between p-4 sm:p-5">
            <div className="min-w-0 pr-3">
              <span className="block text-sm font-semibold text-ink">Search & Directory Indexing</span>
              <span className="block text-xs text-mute mt-0.5">
                Allow your @handle digital bio to appear in Google and AirPal searches
              </span>
            </div>
            <button
              type="button"
              onClick={handleSearchIndexingToggle}
              className={cn(
                "relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
                searchIndexing ? "bg-brand" : "bg-line",
              )}
              role="switch"
              aria-checked={searchIndexing}
              aria-label="Toggle search indexing"
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out mt-1 ml-1",
                  searchIndexing ? "translate-x-5" : "translate-x-0",
                )}
              />
            </button>
          </div>

          <div className="flex min-h-[56px] items-center justify-between p-4 sm:p-5">
            <div className="min-w-0 pr-3">
              <span className="block text-sm font-semibold text-ink">Circle Presence & Live Check-in</span>
              <span className="block text-xs text-mute mt-0.5">
                Broadcast your active presence to mutual friends attending the same events
              </span>
            </div>
            <button
              type="button"
              onClick={handleCirclePresenceToggle}
              className={cn(
                "relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
                circlePresence ? "bg-brand" : "bg-line",
              )}
              role="switch"
              aria-checked={circlePresence}
              aria-label="Toggle circle presence"
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out mt-1 ml-1",
                  circlePresence ? "translate-x-5" : "translate-x-0",
                )}
              />
            </button>
          </div>

          {user && (
            <div className="p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="block text-sm font-semibold text-ink">Download My Data (GDPR)</span>
                  <span className="block text-xs text-mute mt-0.5">
                    Export your complete profile, preferences, and account metadata in JSON format
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    void triggerHaptic("selection");
                    const exportData = {
                      version: 1,
                      exportedAt: new Date().toISOString(),
                      user: {
                        uid: user.uid,
                        email: user.email,
                        displayName: user.displayName,
                        handle: mine?.handle ?? null,
                        phone: user.phone ?? null,
                        role: user.role,
                        birthdayMonth: user.birthdayMonth,
                        birthdayAlertsEnabled: user.birthdayAlertsEnabled,
                        birthdayAlertsRegion: user.birthdayAlertsRegion,
                      },
                      bio: mine ?? null,
                      business: business ?? null,
                      preferences: {
                        city,
                        usingGps,
                        theme,
                        notifDeals,
                        searchIndexing,
                        circlePresence,
                      },
                    };
                    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `airpal-data-export-${new Date().toISOString().slice(0, 10)}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                    toast.success("Account data export downloaded.");
                  }}
                  className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-full bg-paper px-3.5 text-xs font-bold text-accent ring-1 ring-line hover:bg-card active:scale-95 transition cursor-pointer"
                >
                  <Download size={14} />
                  <span>Export</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Connected Calendars & Schedules */}
      <section className="mt-8">
        <div className="flex items-center gap-2 mb-1">
          <Calendar size={16} className="text-accent" />
          <h2 className="font-display text-base sm:text-lg font-bold text-ink">Connected Schedules & Sync</h2>
        </div>
        <p className="text-xs text-mute mb-3">Sync your tickets and catch-ups to your phone calendar.</p>
        <Link
          href="/calendar"
          className="flex min-h-[60px] items-center justify-between rounded-3xl bg-card p-4 sm:p-5 ring-1 ring-line shadow-xs hover:bg-paper active:scale-[0.99] transition cursor-pointer"
        >
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand/10 text-brand">
              <Calendar size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold text-ink">External Calendar &amp; ICS Feed</p>
              <p className="text-xs text-mute mt-0.5">Sync with Apple Calendar, Google Calendar &amp; Outlook</p>
            </div>
          </div>
          <ChevronRight size={18} className="text-mute shrink-0" />
        </Link>
      </section>

      {/* Workspaces & Studios */}
      <section id="settings-workspaces" className="mt-8 scroll-mt-20">
        <div className="flex items-center gap-2 mb-1">
          <Briefcase size={16} className="text-accent" />
          <h2 className="font-display text-base sm:text-lg font-bold text-ink">Workspaces &amp; Studios</h2>
        </div>
        <p className="text-xs text-mute mb-3">Jump into your creator, merchant, and organizer dashboards.</p>

        <div className="divide-y divide-line/70 rounded-3xl bg-card ring-1 ring-line shadow-xs overflow-hidden">
          <button
            type="button"
            className="flex min-h-[60px] w-full cursor-pointer items-center justify-between p-4 sm:p-5 text-left transition hover:bg-paper active:scale-[0.99]"
            onClick={() => nav("/me")}
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-brand/10 text-accent">
                <UserRound size={18} />
              </span>
              <div className="min-w-0">
                <span className="block text-xs font-semibold text-mute">Personal Life &amp; Identity</span>
                <span className="font-bold text-sm text-ink truncate block">
                  {mine ? `@${mine.handle}` : "Digital Bio Dashboard"}
                </span>
              </div>
            </div>
            <ChevronRight size={18} className="text-mute shrink-0" />
          </button>

          <button
            type="button"
            className="flex min-h-[60px] w-full cursor-pointer items-center justify-between p-4 sm:p-5 text-left transition hover:bg-paper active:scale-[0.99]"
            onClick={() => nav("/circle")}
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-sky-500/10 text-sky-600">
                <Users size={18} />
              </span>
              <div className="min-w-0">
                <span className="block text-xs font-semibold text-mute">Friends &amp; Networking Circle</span>
                <span className="font-bold text-sm text-ink truncate block">
                  Live check-in, mutuals &amp; 1-on-1 catch-ups
                </span>
              </div>
            </div>
            <ChevronRight size={18} className="text-mute shrink-0" />
          </button>

          <button
            type="button"
            className="flex min-h-[60px] w-full cursor-pointer items-center justify-between p-4 sm:p-5 text-left transition hover:bg-paper active:scale-[0.99]"
            onClick={() => nav(partnerAccountPath({ signedIn: Boolean(user), hasPlace: Boolean(business) }))}
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-amber-500/10 text-amber-600">
                <Briefcase size={18} />
              </span>
              <div className="min-w-0">
                <span className="block text-xs font-semibold text-mute">{NAMES.partnerAccount}</span>
                <span className="font-bold text-sm text-ink truncate block">
                  {business ? `@${business.handle}` : "Local venue, dining perks & counter QR"}
                </span>
              </div>
            </div>
            <ChevronRight size={18} className="text-mute shrink-0" />
          </button>

          <button
            type="button"
            className="flex min-h-[60px] w-full cursor-pointer items-center justify-between p-4 sm:p-5 text-left transition hover:bg-paper active:scale-[0.99]"
            onClick={() => nav("/event")}
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-600">
                <Ticket size={18} />
              </span>
              <div className="min-w-0">
                <span className="block text-xs font-semibold text-mute">Event Organiser Studio</span>
                <span className="font-bold text-sm text-ink truncate block">
                  Concert, festival &amp; guestlist console
                </span>
              </div>
            </div>
            <ChevronRight size={18} className="text-mute shrink-0" />
          </button>

          <button
            type="button"
            className="flex min-h-[60px] w-full cursor-pointer items-center justify-between p-4 sm:p-5 text-left transition hover:bg-paper active:scale-[0.99]"
            onClick={() => nav("/scan")}
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-brand/10 text-accent">
                <QrCode size={18} />
              </span>
              <div className="min-w-0">
                <span className="block text-xs font-semibold text-mute">Door Check-In &amp; QR Scanner</span>
                <span className="font-bold text-sm text-ink truncate block">
                  Verify passes, tickets &amp; member vouchers
                </span>
              </div>
            </div>
            <ChevronRight size={18} className="text-mute shrink-0" />
          </button>
        </div>
      </section>

      {/* Security & Authentication */}
      {user && (
        <section id="settings-security" className="mt-8 scroll-mt-20">
          <div className="flex items-center gap-2 mb-1">
            <KeyRound size={16} className="text-accent" />
            <h2 className="font-display text-base sm:text-lg font-bold text-ink">Security &amp; Biometrics</h2>
          </div>
          <p className="text-xs text-mute mb-3">Manage Face ID, Touch ID, and password credentials.</p>

          <div className="space-y-3">
            <BiometricEnrollCard />

            {user.email && (
              <button
                type="button"
                className="flex min-h-[56px] w-full cursor-pointer items-center justify-between rounded-3xl bg-card p-4 sm:p-5 text-left ring-1 ring-line hover:bg-paper active:scale-[0.99] transition disabled:opacity-50"
                disabled={resetBusy}
                onClick={() => {
                  if (!user.email) {
                    toast.message("Add an email to reset a password.");
                    return;
                  }
                  setResetBusy(true);
                  void requestPasswordReset(user.email)
                    .then(() => toast.success("Password reset link sent to your email"))
                    .catch((err) => toast.error(authErrorMessage(err, "Could not send reset email")))
                    .finally(() => setResetBusy(false));
                }}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-brand/10 text-accent">
                    <Mail size={18} />
                  </span>
                  <div className="min-w-0">
                    <span className="block text-sm font-semibold text-ink">Password Reset</span>
                    <span className="block text-xs text-mute mt-0.5 truncate">
                      Send a secure reset link to {user.email}
                    </span>
                  </div>
                </div>
                <span className="rounded-full bg-paper px-3.5 py-1.5 text-xs font-bold text-accent ring-1 ring-line shrink-0">
                  {resetBusy ? "Sending…" : "Send Link"}
                </span>
              </button>
            )}
          </div>
        </section>
      )}

      {/* Legal & Trust Links */}
      <section id="settings-legal" className="mt-8 scroll-mt-20">
        <div className="flex items-center gap-2 mb-1">
          <Scale size={16} className="text-accent" />
          <h2 className="font-display text-base sm:text-lg font-bold text-ink">Legal, Trust &amp; Support</h2>
        </div>
        <p className="text-xs text-mute mb-3">Our commitment to zero tracker bloat, privacy, and human support.</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {[
            { href: "/help", label: "Help Center", sub: "Guides & FAQs" },
            { href: "/contact", label: "Contact Us", sub: "Human support" },
            { href: "/trust", label: "Trust & Safety", sub: "Company facts" },
            { href: "/bio/recover", label: "Handle Recovery", sub: "Reclaim @handle" },
            { href: "/privacy", label: "Privacy Policy", sub: "GDPR & data" },
            { href: "/terms", label: "Terms of Service", sub: "Platform rules" },
            { href: "/cookies", label: "Cookie Policy", sub: "Zero ad pixels" },
            {
              href: user?.email ? `/unsubscribe?email=${encodeURIComponent(user.email)}` : "/unsubscribe",
              label: "Email Opt-Out",
              sub: "Leave guestlist",
            },
          ].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="flex min-h-[60px] flex-col justify-center rounded-2xl bg-card px-3.5 py-2.5 ring-1 ring-line hover:bg-paper active:scale-95 transition shadow-2xs"
            >
              <span className="text-xs font-bold text-ink truncate">{l.label}</span>
              <span className="text-[11px] text-mute truncate mt-0.5">{l.sub}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Account Termination & Sign Out */}
      {user && (
        <section className="mt-10 pt-6 border-t border-line/70">
          <button
            type="button"
            className="flex min-h-[50px] w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-card px-4 text-sm font-bold text-ink ring-1 ring-line hover:bg-paper active:scale-95 transition shadow-xs"
            onClick={() => void logout().then(() => nav("/"))}
          >
            <LogOut size={16} />
            <span>Sign Out of AirPal</span>
          </button>

          {/* Danger Zone */}
          <div className="mt-8 rounded-3xl border border-rose-500/30 bg-rose-500/5 p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                <Trash2 size={16} />
                <span className="font-bold text-sm">Danger Zone</span>
              </div>
              <button
                type="button"
                onClick={() => setShowDeleteZone(!showDeleteZone)}
                className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
              >
                {showDeleteZone ? "Hide Options" : "Delete Account"}
              </button>
            </div>

            {showDeleteZone && (
              <div className="mt-4 pt-4 border-t border-rose-500/20">
                <p className="text-xs text-mute leading-relaxed">
                  Permanently deletes your universal profile, bio data, and active logins. We retain an audit marker for
                  30 days to finish clearing open ticket passes and reservations.
                </p>
                <div className="mt-3">
                  <label
                    htmlFor="delete-confirm-input"
                    className="block text-[11px] font-bold uppercase tracking-wider text-mute mb-1"
                  >
                    Type DELETE to confirm
                  </label>
                  <input
                    id="delete-confirm-input"
                    value={deleteConfirm}
                    onChange={(e) => setDeleteConfirm(e.target.value)}
                    placeholder="Type DELETE"
                    autoComplete="off"
                    className="w-full rounded-2xl border border-line bg-card px-4 py-3 text-sm text-ink outline-none focus:ring-2 focus:ring-rose-500"
                  />
                  <button
                    type="button"
                    disabled={deleteBusy || deleteConfirm !== "DELETE"}
                    className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center rounded-full bg-rose-600 px-4 text-sm font-bold text-white transition hover:bg-rose-700 disabled:opacity-40 active:scale-95 cursor-pointer shadow-sm"
                    onClick={() => {
                      void triggerHaptic("error");
                      setDeleteBusy(true);
                      void deleteAccount()
                        .then(() => {
                          toast.success("Account deleted");
                          nav("/");
                        })
                        .catch((err) => toast.error(authErrorMessage(err, "Could not delete account")))
                        .finally(() => setDeleteBusy(false));
                    }}
                  >
                    {deleteBusy ? "Deleting account…" : "Permanently Delete My Account"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* App Build Version Footer */}
      <div className="mt-12 text-center text-xs text-mute">
        <p className="font-semibold text-ink">AirPal · Life Made Easy</p>
        <p className="mt-0.5 font-mono text-[11px]">
          v{buildInfo.versionName} ({buildInfo.versionCode}) · {buildInfo.environment}
        </p>
      </div>
    </div>
  );
}
