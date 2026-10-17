import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { collection, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { Bell, BellRing } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebaseDb } from "@/lib/firebase";
import { enableWebPush, listenForegroundPush, markNotificationRead, pushPrefEnabled } from "@/lib/notifications";
import { isNativeApp, triggerHaptic } from "@/lib/native";
import { cn } from "@/lib/cn";
import type { PromotionNotification } from "@shared/promotions";
import { relativeAgo } from "@shared/time-ago";

/**
 * The one header bell: inbox notifications for everyone.
 */
export function NotificationBell({ onBrand = false }: { onBrand?: boolean }) {
  const { user } = useAuth();
  const [path] = useLocation();
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState<PromotionNotification[]>([]);
  const [enabling, setEnabling] = useState(false);
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

  useEffect(() => {
    const db = getFirebaseDb();
    if (!db || !user) {
      setNotes([]);
      return;
    }
    void getDocs(
      query(collection(db, "promotion_notifications"), where("uid", "==", user.uid), orderBy("at", "desc"), limit(10)),
    )
      .then((snap) =>
        setNotes(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<PromotionNotification, "id">) }))),
      )
      .catch(() => setNotes([]));
  }, [user]);

  useEffect(
    () =>
      listenForegroundPush((title, body) => {
        toast.message(title, { description: body });
      }),
    [],
  );

  if (!user) return null;
  const unread = notes.filter((n) => !n.read).length;
  const total = unread;

  async function enable() {
    setEnabling(true);
    try {
      const state = await enableWebPush();
      if (state === "granted") toast.success("Notifications on — results and winners will find you.");
      else if (state === "denied") toast.error("Notifications blocked — allow them in your browser settings.");
      else
        toast.message(
          isNativeApp()
            ? "Native push configures on first install."
            : "Push isn't supported here — your inbox still works.",
        );
    } finally {
      setEnabling(false);
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
          "relative grid h-9 w-9 touch-manipulation place-items-center rounded-full ring-1 transition-transform active:scale-95 after:absolute after:-inset-1.5 after:content-['']",
          onBrand
            ? "text-white/85 hover:bg-white/10 hover:text-white ring-white/25"
            : "text-accent hover:bg-card ring-line",
        )}
        aria-label={total ? `${total} unread notifications` : "Notifications"}
        title="Notifications"
      >
        {total > 0 ? (
          <BellRing size={16} className={onBrand ? "text-white" : "text-accent"} />
        ) : (
          <Bell size={16} className={onBrand ? "text-white" : "text-accent"} />
        )}
        {total > 0 && (
          <span
            className={cn(
              "absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px] font-semibold",
              onBrand ? "bg-white text-[#2F00FF]" : "bg-brand text-white",
            )}
          >
            {total > 9 ? "9+" : total}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 max-h-96 w-[22rem] max-w-[calc(100vw-2rem)] overflow-y-auto overscroll-contain rounded-3xl bg-card/95 shadow-2xl ring-1 ring-line/80 backdrop-blur-2xl">
          <div className="flex items-center justify-between px-4 py-3">
            <p className="text-[13px] font-semibold">Notifications</p>
            <Link href="/me/inbox" onClick={() => setOpen(false)} className="text-[13px] font-semibold text-accent">
              Inbox
            </Link>
          </div>
          {notes.length === 0 && (
            <p className="px-4 pb-4 text-[13px] text-mute">Circle announcements and event updates land here.</p>
          )}
          {notes.map((n) => (
            <Link
              key={n.id}
              href={n.href || "/me/inbox"}
              onClick={() => {
                if (!n.read) void markNotificationRead(n.id);
                setOpen(false);
              }}
              className="block border-t border-line/60 px-4 py-2.5"
            >
              <span className="flex items-baseline justify-between gap-2">
                <p
                  className={cn("min-w-0 flex-1 truncate text-[14px] leading-5", n.read ? "text-ink" : "font-semibold")}
                >
                  {n.title}
                </p>
                {relativeAgo(n.at) ? <span className="shrink-0 text-[11px] text-mute">{relativeAgo(n.at)}</span> : null}
              </span>
              <p className="mt-0.5 line-clamp-2 text-[12px] text-mute">{n.body}</p>
            </Link>
          ))}
          {!pushPrefEnabled() && (
            <div className="border-t border-line/60 p-3">
              <button
                type="button"
                onClick={enable}
                disabled={enabling}
                className="w-full rounded-full bg-brand px-3 py-2.5 text-[13px] font-semibold text-white disabled:opacity-50"
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
