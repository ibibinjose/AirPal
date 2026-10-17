import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { collection, limit, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { Bell, Sparkles } from "lucide-react";
import { SegmentedControl } from "@/components/design-system/companions";
import { PingsPanel } from "@/components/social/PingsPanel";
import { AuthGate } from "@/components/auth/AuthGate";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebaseDb } from "@/lib/firebase";
import { enableWebPush, markAllNotificationsRead, markNotificationRead, pushPrefEnabled } from "@/lib/notifications";
import { cn } from "@/lib/cn";
import { isUpdateNoteKind, type PromotionNotification } from "@shared/promotions";
import { notificationPresentation } from "@shared/notifications";
import { relativeAgo } from "@shared/time-ago";
import { toast } from "sonner";
import { EmptyState } from "@/components/ui/EmptyState";

function NotificationRows({
  rows,
  onOpen,
}: {
  rows: PromotionNotification[];
  onOpen: (n: PromotionNotification) => void;
}) {
  return (
    <ul className="mt-4 overflow-hidden rounded-[24px] bg-card ring-1 ring-line/80 shadow-clay">
      {rows.map((n, i) => {
        const when = relativeAgo(n.at);
        const presentation = notificationPresentation(n.kind);
        return (
          <li key={n.id} className={cn(i > 0 && "border-t border-line/70")}>
            <button
              type="button"
              onClick={() => void onOpen(n)}
              className="flex min-h-[44px] w-full cursor-pointer gap-3 px-4 py-3.5 text-left transition-colors hover:bg-paper/60 active:bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand"
            >
              <span
                className={cn("mt-2 h-2 w-2 shrink-0 rounded-full", n.read ? "bg-transparent" : "bg-brand")}
                aria-hidden
              />
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-accent">
                  {presentation.label}
                </span>
                <span className={cn("mt-0.5 block text-[15px] leading-5", n.read ? "text-ink" : "font-bold text-ink")}>
                  {n.title}
                </span>
                <span className="mt-0.5 line-clamp-2 block text-[13px] leading-5 text-mute">{n.body}</span>
              </span>
              {when ? <span className="shrink-0 pt-0.5 text-[11px] font-medium text-mute">{when}</span> : null}
            </button>
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
  const [markingAll, setMarkingAll] = useState(false);

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
      limit(40),
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

  async function markSegmentRead(rows: PromotionNotification[]) {
    const unreadIds = rows.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length === 0 || markingAll) return;
    setMarkingAll(true);
    try {
      await markAllNotificationsRead(unreadIds);
      const done = new Set(unreadIds);
      setNotes((cur) => cur.map((row) => (done.has(row.id) ? { ...row, read: true } : row)));
    } finally {
      setMarkingAll(false);
    }
  }

  async function enablePush() {
    const state = await enableWebPush();
    if (state === "granted") toast.success("Notifications on");
    else if (state === "denied") toast.error("Allow notifications in your browser settings.");
  }

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
        <SegmentedControl
          label="Inbox sections"
          value={segment}
          onChange={setSegment}
          options={[
            { id: "updates", label: unreadUpdates ? `Updates (${unreadUpdates})` : "Updates" },
            { id: "pings", label: "Pings" },
            { id: "activity", label: unreadActivity ? `Activity (${unreadActivity})` : "Activity" },
          ]}
        />
      </div>

      {segment === "pings" ? (
        <PingsPanel />
      ) : segment === "activity" ? (
        <>
          <div className="mt-4 flex items-center justify-between">
            <p className="text-[13px] font-semibold text-mute">Activity</p>
            {activityNotes.length > 0 && (
              <button
                type="button"
                disabled={markingAll || unreadActivity === 0}
                onClick={() => void markSegmentRead(activityNotes)}
                className="-my-3 inline-flex min-h-[44px] items-center text-[13px] font-bold text-accent disabled:opacity-40"
              >
                {markingAll ? "Marking…" : "Mark All Read"}
              </button>
            )}
          </div>

          {!pushPrefEnabled() && (
            <button
              type="button"
              onClick={() => void enablePush()}
              className="mt-3 w-full rounded-[20px] bg-brand/10 px-4 py-3.5 text-left ring-1 ring-brand/20 transition hover:bg-brand/15 active:scale-95"
            >
              <span className="block text-[15px] font-semibold text-accent">Turn on alerts</span>
              <span className="block text-[13px] text-mute">Giveaways, rewards, and messages.</span>
            </button>
          )}

          {activityNotes.length === 0 ? (
            <div className="mt-10 text-center">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-paper text-mute ring-1 ring-line">
                <Bell size={22} className="text-accent" />
              </span>
              <p className="font-display mt-4 text-xl font-bold text-ink">Nothing yet</p>
              <p className="mx-auto mt-1 max-w-xs text-[14px] leading-relaxed text-mute">
                Catch-ups, meetings, waves, and deals land here as they happen.
              </p>
              <Link
                href="/deals"
                className="mt-5 inline-flex min-h-[44px] items-center text-[14px] font-bold text-accent hover:underline"
              >
                Browse deals
              </Link>
            </div>
          ) : (
            <NotificationRows rows={activityNotes} onOpen={openNote} />
          )}
        </>
      ) : (
        <>
          <div className="mt-4 flex items-center justify-between">
            <p className="text-[13px] font-semibold text-mute">Updates from AirPal</p>
            {updateNotes.length > 0 && (
              <button
                type="button"
                disabled={markingAll || unreadUpdates === 0}
                onClick={() => void markSegmentRead(updateNotes)}
                className="-my-3 inline-flex min-h-[44px] items-center text-[13px] font-bold text-accent disabled:opacity-40"
              >
                {markingAll ? "Marking…" : "Mark All Read"}
              </button>
            )}
          </div>

          {updateNotes.length === 0 ? (
            <div className="mt-10 text-center">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-paper text-mute ring-1 ring-line">
                <Sparkles size={22} className="text-accent" />
              </span>
              <p className="font-display mt-4 text-xl font-bold text-ink">No updates yet</p>
              <p className="mx-auto mt-1 max-w-xs text-[14px] leading-relaxed text-mute">
                News from AirPal — features, safety notices, city launches — lands here.
              </p>
            </div>
          ) : (
            <NotificationRows rows={updateNotes} onOpen={openNote} />
          )}
        </>
      )}
    </div>
  );
}
