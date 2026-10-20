import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { collection, limit, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { Bell, BellRing, Check, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebaseDb } from "@/lib/firebase";
import {
  deleteNotification,
  enableWebPush,
  listenForegroundPush,
  markAllNotificationsRead,
  markNotificationRead,
  pushPrefEnabled,
} from "@/lib/notifications";
import { isNativeApp, triggerHaptic } from "@/lib/native";
import { cn } from "@/lib/cn";
import type { PromotionNotification } from "@shared/promotions";
import { notificationPresentation } from "@shared/notifications";
import { relativeAgo } from "@shared/time-ago";

/**
 * The one header bell: live inbox notifications for everyone.
 */
export function NotificationBell({ onBrand = false }: { onBrand?: boolean }) {
  const { user } = useAuth();
  const [path] = useLocation();
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState<PromotionNotification[]>([]);
  const [enabling, setEnabling] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
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

  // Realtime subscription for live notifications
  useEffect(() => {
    const db = getFirebaseDb();
    if (!db || !user) {
      setNotes([]);
      return;
    }
    const q = query(
      collection(db, "promotion_notifications"),
      where("uid", "==", user.uid),
      orderBy("at", "desc"),
      limit(15),
    );
    return onSnapshot(
      q,
      (snap) => {
        setNotes(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<PromotionNotification, "id">) })));
      },
      () => setNotes([]),
    );
  }, [user]);

  useEffect(
    () =>
      listenForegroundPush((title, body) => {
        toast.message(title, { description: body });
      }),
    [],
  );

  if (!user) return null;
  const unreadNotes = notes.filter((n) => !n.read);
  const total = unreadNotes.length;

  async function enable() {
    setEnabling(true);
    try {
      const state = await enableWebPush();
      if (state === "granted") toast.success("Notifications on — passes and winners will find you.");
      else if (state === "denied") toast.error("Notifications blocked — allow them in your browser settings.");
      else {
        toast.message(
          isNativeApp()
            ? "Native push configures on first launch."
            : "Push isn't supported here — your inbox still works.",
        );
      }
    } finally {
      setEnabling(false);
    }
  }

  async function markAllRead() {
    const unreadIds = unreadNotes.map((n) => n.id);
    if (unreadIds.length === 0 || markingAll) return;
    setMarkingAll(true);
    void triggerHaptic("light");
    try {
      await markAllNotificationsRead(unreadIds);
      setNotes((cur) => cur.map((n) => ({ ...n, read: true })));
      toast.success("All marked as read");
    } finally {
      setMarkingAll(false);
    }
  }

  async function dismissNote(e: React.MouseEvent, id: string) {
    e.preventDefault();
    e.stopPropagation();
    void triggerHaptic("selection");
    setNotes((cur) => cur.filter((n) => n.id !== id));
    try {
      await deleteNotification(id);
    } catch {
      /* already handled */
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => {
          void triggerHaptic("light");
          setOpen((v) => !v);
        }}
        className={cn(
          "relative grid h-9.5 w-9.5 sm:h-10 sm:w-10 min-h-[38px] min-w-[38px] shrink-0 touch-manipulation place-items-center rounded-full ring-1 transition-transform active:scale-95 after:absolute after:-inset-1.5 after:content-['']",
          onBrand ? "text-white hover:bg-white/15 hover:text-white ring-white/35" : "text-ink hover:bg-card ring-line",
        )}
        aria-label={total ? `${total} unread notifications` : "Notifications"}
        title="Notifications"
      >
        {total > 0 ? (
          <BellRing size={19} className={onBrand ? "text-white" : "text-accent"} />
        ) : (
          <Bell size={19} className={onBrand ? "text-white" : "text-accent"} />
        )}
        {total > 0 && (
          <span
            className={cn(
              "absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px] font-semibold",
              onBrand ? "bg-white text-brand" : "bg-brand text-white",
            )}
          >
            {total > 9 ? "9+" : total}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 max-h-[28rem] w-[23rem] max-w-[calc(100vw-2rem)] overflow-y-auto overscroll-contain rounded-3xl bg-card/95 shadow-2xl ring-1 ring-line/80 backdrop-blur-2xl">
          <div className="flex items-center justify-between border-b border-line/60 px-4 py-3">
            <div className="flex items-center gap-2">
              <p className="text-[14px] font-bold text-ink">Notifications</p>
              {total > 0 && (
                <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-semibold text-accent">
                  {total} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {total > 0 && (
                <button
                  type="button"
                  disabled={markingAll}
                  onClick={() => void markAllRead()}
                  className="inline-flex min-h-[44px] items-center text-[12px] font-semibold text-accent hover:underline disabled:opacity-40"
                >
                  <Check size={13} className="mr-1" />
                  Mark read
                </button>
              )}
              <Link
                href="/me/inbox"
                onClick={() => setOpen(false)}
                className="inline-flex min-h-[44px] items-center text-[12px] font-semibold text-ink/75 hover:text-ink"
              >
                Open inbox →
              </Link>
            </div>
          </div>

          {notes.length === 0 ? (
            <div className="p-6 text-center">
              <span className="mx-auto grid h-10 w-10 place-items-center rounded-2xl bg-paper text-mute ring-1 ring-line">
                <Bell size={18} />
              </span>
              <p className="mt-2 text-[13px] font-medium text-ink/70">No notifications right now.</p>
            </div>
          ) : (
            notes.map((n) => {
              const presentation = notificationPresentation(n.kind);
              const when = relativeAgo(n.at);
              return (
                <Link
                  key={n.id}
                  href={n.href || "/me/inbox"}
                  onClick={() => {
                    if (!n.read) void markNotificationRead(n.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "group relative flex items-start gap-2.5 border-t border-line/50 px-4 py-3 transition-colors hover:bg-paper/60",
                    !n.read && "bg-brand/[0.02]",
                  )}
                >
                  <span
                    className={cn(
                      "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                      n.read ? "bg-transparent" : "bg-brand ring-2 ring-card",
                    )}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-accent">
                        {presentation.label}
                      </span>
                      {when ? (
                        <span className="shrink-0 text-[11px] text-ink/65 dark:text-ink/60 font-medium">{when}</span>
                      ) : null}
                    </div>
                    <p
                      className={cn(
                        "mt-0.5 truncate text-[14px] leading-5",
                        n.read ? "font-normal text-ink" : "font-semibold text-ink",
                      )}
                    >
                      {n.title}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-[12px] leading-relaxed text-ink/70 dark:text-ink/65">
                      {n.body}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => void dismissNote(e, n.id)}
                    title="Dismiss"
                    aria-label="Dismiss notification"
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-ink/60 transition-opacity hover:bg-paper hover:text-ink hover:opacity-100"
                  >
                    <X size={14} />
                  </button>
                </Link>
              );
            })
          )}

          {!pushPrefEnabled() && (
            <div className="border-t border-line/60 p-3">
              <button
                type="button"
                onClick={enable}
                disabled={enabling}
                className="w-full rounded-full bg-brand px-3 py-2.5 text-[13px] font-semibold text-white shadow-sm transition hover:bg-brand/95 disabled:opacity-50"
              >
                {enabling ? "Enabling…" : "Turn on alerts"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
