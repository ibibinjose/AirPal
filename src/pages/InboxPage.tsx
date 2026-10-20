import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { collection, limit, onSnapshot, orderBy, query, where } from "firebase/firestore";
import {
  Bell,
  CalendarCheck,
  CheckCheck,
  Hand,
  Mail,
  Radio,
  ShieldAlert,
  Sparkles,
  Ticket,
  Trash2,
  Trophy,
  Users,
} from "lucide-react";
import { TabPills } from "@/components/ui/TabPills";
import { PingsPanel } from "@/components/social/PingsPanel";
import { AuthGate } from "@/components/auth/AuthGate";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebaseDb } from "@/lib/firebase";
import {
  deleteAllNotifications,
  deleteNotification,
  enableWebPush,
  markAllNotificationsRead,
  markNotificationRead,
  markNotificationUnread,
  pushPrefEnabled,
} from "@/lib/notifications";
import { isNativeApp, triggerHaptic } from "@/lib/native";
import { cn } from "@/lib/cn";
import { isUpdateNoteKind, type PromotionNotification } from "@shared/promotions";
import { notificationPresentation } from "@shared/notifications";
import { relativeAgo } from "@shared/time-ago";
import { toast } from "sonner";
import { EmptyState } from "@/components/ui/EmptyState";

function NotificationKindIcon({ kind }: { kind: string }) {
  switch (kind) {
    case "ticket_confirmed":
      return <Ticket size={16} className="text-brand" />;
    case "event_rsvp":
      return <CalendarCheck size={16} className="text-emerald-500" />;
    case "security_alert":
      return <ShieldAlert size={16} className="text-amber-500" />;
    case "welcome":
      return <Sparkles size={16} className="text-brand" />;
    case "catchup_proposed":
    case "catchup_scheduled":
      return <Users size={16} className="text-sky-500" />;
    case "here":
      return <Radio size={16} className="text-brand" />;
    case "wave":
      return <Hand size={16} className="text-rose-500" />;
    case "winner_selected":
    case "prize_available":
    case "winner_verification":
      return <Trophy size={16} className="text-amber-500" />;
    default:
      return <Sparkles size={16} className="text-brand/80" />;
  }
}

function NotificationRows({
  rows,
  onOpen,
  onToggleRead,
  onDelete,
}: {
  rows: PromotionNotification[];
  onOpen: (n: PromotionNotification) => void;
  onToggleRead: (n: PromotionNotification) => void;
  onDelete: (n: PromotionNotification) => void;
}) {
  return (
    <ul className="mt-4 overflow-hidden rounded-[24px] bg-card ring-1 ring-line/80 shadow-clay">
      {rows.map((n, i) => {
        const when = relativeAgo(n.at);
        const presentation = notificationPresentation(n.kind);
        return (
          <li
            key={n.id}
            className={cn(
              "group relative flex items-center justify-between transition-colors hover:bg-paper/50",
              i > 0 && "border-t border-line/70",
              !n.read && "bg-brand/[0.02]",
            )}
          >
            <button
              type="button"
              onClick={() => void onOpen(n)}
              className="flex min-h-[56px] min-w-0 flex-1 cursor-pointer items-start gap-3 px-4 py-3.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand"
            >
              <div className="relative mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-paper ring-1 ring-line/70">
                <NotificationKindIcon kind={n.kind} />
                {!n.read && (
                  <span
                    className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-brand ring-2 ring-card"
                    aria-hidden
                  />
                )}
              </div>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="block text-[11px] font-bold uppercase tracking-[0.14em] text-accent">
                    {presentation.label}
                  </span>
                  {when ? <span className="text-[11px] font-medium text-mute/80">• {when}</span> : null}
                </span>
                <span
                  className={cn(
                    "mt-0.5 block text-[15px] leading-5",
                    n.read ? "font-medium text-ink" : "font-bold text-ink",
                  )}
                >
                  {n.title}
                </span>
                <span className="mt-0.5 line-clamp-2 block text-[13px] leading-relaxed text-mute">{n.body}</span>
              </span>
            </button>

            {/* Row action buttons */}
            <div className="flex shrink-0 items-center gap-0.5 pr-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleRead(n);
                }}
                title={n.read ? "Mark as unread" : "Mark as read"}
                aria-label={n.read ? "Mark as unread" : "Mark as read"}
                className="grid h-11 w-11 place-items-center rounded-full text-mute transition-colors hover:bg-paper hover:text-ink active:scale-90"
              >
                {n.read ? <Mail size={16} /> : <CheckCheck size={16} className="text-brand" />}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(n);
                }}
                title="Dismiss notification"
                aria-label="Dismiss notification"
                className="grid h-11 w-11 place-items-center rounded-full text-mute transition-colors hover:bg-rose-500/10 hover:text-rose-500 active:scale-90"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function InboxPage() {
  const { user, authReady } = useAuth();
  const [, nav] = useLocation();
  const [notes, setNotes] = useState<PromotionNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [retryToken, setRetryToken] = useState(0);
  const [segment, setSegment] = useState<"updates" | "pings" | "activity">("updates");
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [markingAll, setMarkingAll] = useState(false);
  const [clearing, setClearing] = useState(false);

  // All hooks stay above the early returns — anything below breaks hook order
  // between the loading render and the loaded render.
  const updateNotes = useMemo(() => notes.filter((n) => isUpdateNoteKind(n.kind)), [notes]);
  const activityNotes = useMemo(() => notes.filter((n) => !isUpdateNoteKind(n.kind)), [notes]);

  useEffect(() => {
    const db = getFirebaseDb();
    if (!db || !user) {
      setNotes([]);
      setLoading(false);
      return;
    }
    setLoadError(false);
    setLoading(true);
    const q = query(
      collection(db, "promotion_notifications"),
      where("uid", "==", user.uid),
      orderBy("at", "desc"),
      limit(50),
    );
    return onSnapshot(
      q,
      (snap) => {
        setNotes(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<PromotionNotification, "id">) })));
        setLoadError(false);
        setLoading(false);
      },
      () => {
        setNotes([]);
        setLoadError(true);
        setLoading(false);
      },
    );
  }, [user, retryToken]);

  if (!authReady || loading) {
    return (
      <div className="mx-auto max-w-md space-y-3 px-4 py-8" aria-label="Loading inbox">
        <div className="h-8 w-32 motion-safe:animate-pulse rounded-xl bg-card ring-1 ring-line" />
        <div className="h-11 motion-safe:animate-pulse rounded-full bg-card ring-1 ring-line" />
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 rounded-3xl bg-card p-4 ring-1 ring-line">
            <div className="h-10 w-10 shrink-0 motion-safe:animate-pulse rounded-2xl bg-paper" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-3.5 w-3/4 motion-safe:animate-pulse rounded bg-paper" />
              <div className="h-3 w-1/2 motion-safe:animate-pulse rounded bg-paper" />
            </div>
          </div>
        ))}
      </div>
    );
  }
  if (loadError) {
    return (
      <div className="mx-auto max-w-md px-4 py-8">
        <EmptyState
          icon={<Bell size={28} className="text-mute" />}
          title="Couldn't load your inbox"
          body="Check your connection and try again — your notifications are safe."
          action={() => setRetryToken((t) => t + 1)}
          actionLabel="Try again"
        />
      </div>
    );
  }
  if (!user) {
    return (
      <AuthGate
        next="/me/inbox"
        kicker="Notifications"
        title="Your inbox"
        lede="Announcements from Circles you follow and results — in one quiet list."
      />
    );
  }

  const unreadUpdates = updateNotes.filter((n) => !n.read).length;
  const unreadActivity = activityNotes.filter((n) => !n.read).length;
  const totalUnread = unreadUpdates + unreadActivity;

  async function openNote(n: PromotionNotification) {
    if (!n.read) {
      await markNotificationRead(n.id);
      setNotes((rows) => rows.map((row) => (row.id === n.id ? { ...row, read: true } : row)));
    }
    nav(n.href || "/");
  }

  async function toggleRead(n: PromotionNotification) {
    void triggerHaptic("selection");
    if (n.read) {
      await markNotificationUnread(n.id);
      setNotes((rows) => rows.map((row) => (row.id === n.id ? { ...row, read: false } : row)));
      toast.success("Marked as unread");
    } else {
      await markNotificationRead(n.id);
      setNotes((rows) => rows.map((row) => (row.id === n.id ? { ...row, read: true } : row)));
      toast.success("Marked as read");
    }
  }

  async function deleteNote(n: PromotionNotification) {
    void triggerHaptic("medium");
    setNotes((rows) => rows.filter((row) => row.id !== n.id));
    try {
      await deleteNotification(n.id);
      toast.success("Notification dismissed");
    } catch {
      toast.error("Couldn't delete notification");
    }
  }

  async function markSegmentRead(rows: PromotionNotification[]) {
    const unreadIds = rows.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length === 0 || markingAll) return;
    setMarkingAll(true);
    void triggerHaptic("light");
    try {
      await markAllNotificationsRead(unreadIds);
      const done = new Set(unreadIds);
      setNotes((cur) => cur.map((row) => (done.has(row.id) ? { ...row, read: true } : row)));
      toast.success("All marked as read");
    } finally {
      setMarkingAll(false);
    }
  }

  async function clearReadNotifications(rows: PromotionNotification[]) {
    const readIds = rows.filter((n) => n.read).map((n) => n.id);
    if (readIds.length === 0 || clearing) return;
    setClearing(true);
    void triggerHaptic("medium");
    const idSet = new Set(readIds);
    setNotes((cur) => cur.filter((row) => !idSet.has(row.id)));
    try {
      await deleteAllNotifications(readIds);
      toast.success(`Cleared ${readIds.length} read notification${readIds.length > 1 ? "s" : ""}`);
    } catch {
      toast.error("Couldn't clear read notifications");
    } finally {
      setClearing(false);
    }
  }

  async function enablePush() {
    const state = await enableWebPush();
    if (state === "granted") toast.success("Notifications on");
    else if (state === "denied") toast.error("Allow notifications in your browser settings.");
    else {
      toast.message(
        isNativeApp()
          ? "Native push configures on first launch."
          : "Push isn't supported here — your inbox still works.",
      );
    }
  }

  // Filtered lists for the active segment
  const activeList = segment === "updates" ? updateNotes : activityNotes;
  const filteredList = filter === "unread" ? activeList.filter((n) => !n.read) : activeList;
  const currentUnreadCount = activeList.filter((n) => !n.read).length;
  const currentReadCount = activeList.filter((n) => n.read).length;

  return (
    <div className="mx-auto max-w-lg px-4 pb-[max(6rem,calc(env(safe-area-inset-bottom,0px)+5rem))]">
      <div className="flex items-center justify-between pt-6">
        <div>
          <h1 className="human-title text-[28px] text-balance">Inbox</h1>
          <p className="mt-1 text-sm sm:text-base text-mute tabular-data">
            {totalUnread ? `${totalUnread} unread` : "Updates & notifications"}
          </p>
        </div>
      </div>

      <div className="mt-4">
        <TabPills
          ariaLabel="Inbox sections"
          layout="contained"
          active={segment}
          onChange={setSegment}
          items={[
            { id: "updates", label: "Updates", badge: unreadUpdates ? String(unreadUpdates) : undefined },
            { id: "pings", label: "Pings" },
            { id: "activity", label: "Activity", badge: unreadActivity ? String(unreadActivity) : undefined },
          ]}
        />
      </div>

      {segment === "pings" ? (
        <PingsPanel />
      ) : (
        <>
          {/* Subheader with Filter + Bulk Actions */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  void triggerHaptic("selection");
                  setFilter("all");
                }}
                className={cn(
                  "inline-flex min-h-[44px] items-center rounded-full px-3 text-[12px] font-semibold transition-colors",
                  filter === "all"
                    ? "bg-accent text-card shadow-sm"
                    : "bg-paper text-mute hover:bg-paper/80 hover:text-ink ring-1 ring-line/60",
                )}
              >
                All ({activeList.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  void triggerHaptic("selection");
                  setFilter("unread");
                }}
                className={cn(
                  "inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-3 text-[12px] font-semibold transition-colors",
                  filter === "unread"
                    ? "bg-accent text-card shadow-sm"
                    : "bg-paper text-mute hover:bg-paper/80 hover:text-ink ring-1 ring-line/60",
                )}
              >
                Unread
                {currentUnreadCount > 0 && (
                  <span
                    className={cn(
                      "grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px] font-bold",
                      filter === "unread" ? "bg-card text-accent" : "bg-brand text-white",
                    )}
                  >
                    {currentUnreadCount}
                  </span>
                )}
              </button>
            </div>

            <div className="flex items-center gap-3">
              {currentUnreadCount > 0 && (
                <button
                  type="button"
                  disabled={markingAll}
                  onClick={() => void markSegmentRead(activeList)}
                  className="inline-flex min-h-[44px] items-center text-[12px] font-bold text-accent disabled:opacity-40 hover:underline"
                >
                  {markingAll ? "Marking…" : "Mark all read"}
                </button>
              )}
              {currentReadCount > 0 && (
                <button
                  type="button"
                  disabled={clearing}
                  onClick={() => void clearReadNotifications(activeList)}
                  className="inline-flex min-h-[44px] items-center text-[12px] font-bold text-rose-500/90 disabled:opacity-40 hover:underline"
                >
                  {clearing ? "Clearing…" : "Clear read"}
                </button>
              )}
            </div>
          </div>

          {!pushPrefEnabled() && segment === "activity" && (
            <button
              type="button"
              onClick={() => void enablePush()}
              className="mt-3 w-full rounded-[20px] bg-brand/10 px-4 py-3.5 text-left ring-1 ring-brand/20 transition hover:bg-brand/15 active:scale-95"
            >
              <span className="block text-[15px] font-semibold text-accent">Turn on alerts</span>
              <span className="block text-[13px] text-mute">Giveaways, rewards, passes, and messages.</span>
            </button>
          )}

          {filteredList.length === 0 ? (
            filter === "unread" && activeList.length > 0 ? (
              <div className="mt-10 text-center">
                <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-500 ring-1 ring-emerald-500/20">
                  <CheckCheck size={24} />
                </span>
                <p className="font-display mt-4 text-xl font-bold text-ink">All caught up</p>
                <p className="mx-auto mt-1 max-w-xs text-[14px] leading-relaxed text-mute">
                  No unread notifications here. Switch to &ldquo;All&rdquo; to view past activity.
                </p>
              </div>
            ) : segment === "activity" ? (
              <div className="mt-10 text-center">
                <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-paper text-mute ring-1 ring-line">
                  <Bell size={22} className="text-accent" />
                </span>
                <p className="font-display mt-4 text-xl font-bold text-ink">Nothing yet</p>
                <p className="mx-auto mt-1 max-w-xs text-[14px] leading-relaxed text-mute">
                  Catch-ups, meetings, passes, waves, and deals land here as they happen.
                </p>
                <Link
                  href="/deals"
                  className="mt-5 inline-flex min-h-[44px] items-center text-[14px] font-bold text-accent hover:underline"
                >
                  Browse deals
                </Link>
              </div>
            ) : (
              <div className="mt-10 text-center">
                <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-paper text-mute ring-1 ring-line">
                  <Sparkles size={22} className="text-accent" />
                </span>
                <p className="font-display mt-4 text-xl font-bold text-ink">No updates yet</p>
                <p className="mx-auto mt-1 max-w-xs text-[14px] leading-relaxed text-mute">
                  News from AirPal — features, safety notices, city launches — lands here.
                </p>
                <Link
                  href="/events"
                  className="mt-4 inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-brand px-5 text-xs font-bold text-white shadow-xs hover:bg-brand-ink transition active:scale-95"
                >
                  Explore events
                </Link>
              </div>
            )
          ) : (
            <NotificationRows rows={filteredList} onOpen={openNote} onToggleRead={toggleRead} onDelete={deleteNote} />
          )}
        </>
      )}
    </div>
  );
}
