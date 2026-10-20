import { useEffect, useState, useMemo } from "react";
import { Link } from "wouter";
import { Users, ChevronRight, ShieldCheck, Ticket, Sparkles } from "lucide-react";
import { subscribeGuestlist, type GuestRow } from "@/lib/guestlist";
import { triggerHaptic } from "@/lib/native";
import { cn } from "@/lib/cn";

export interface EventLiveAttendeePreviewProps {
  eventId: string;
  guestCount?: number;
  capacity?: number;
  isGoing?: boolean;
  requireApproval?: boolean;
  variant?: "card" | "compact" | "hero";
  gatePath?: string;
  className?: string;
}

const AVATAR_PALETTES = [
  { bg: "bg-gradient-to-tr from-blue-600 to-sky-500 text-white", label: "A" },
  { bg: "bg-gradient-to-tr from-orange-500 to-rose-500 text-white", label: "M" },
  { bg: "bg-gradient-to-tr from-amber-500 to-orange-500 text-white", label: "S" },
  { bg: "bg-gradient-to-tr from-emerald-500 to-teal-600 text-white", label: "R" },
  { bg: "bg-gradient-to-tr from-rose-500 to-red-600 text-white", label: "K" },
  { bg: "bg-gradient-to-tr from-cyan-500 to-blue-500 text-white", label: "J" },
];

function stringHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function EventLiveAttendeePreview({
  eventId,
  guestCount = 0,
  capacity,
  isGoing = false,
  requireApproval = false,
  variant = "card",
  gatePath,
  className,
}: EventLiveAttendeePreviewProps) {
  const [liveGuests, setLiveGuests] = useState<GuestRow[]>([]);
  const targetHref = gatePath || (eventId ? `/e/${eventId}` : "/events");

  // Attempt to subscribe to real-time door guestlist if available
  useEffect(() => {
    if (!eventId || eventId === "preview-card") return;
    const unsub = subscribeGuestlist(
      "event",
      eventId,
      (rows) => {
        setLiveGuests(rows.filter((r) => r.status === "going" || r.status === "checked-in"));
      },
      () => {
        // Fallback gracefully on permission boundary (non-hosts read public counts mirror)
        setLiveGuests([]);
      },
    );
    return () => unsub();
  }, [eventId]);

  const effectiveCount = useMemo(() => {
    if (liveGuests.length > 0) return liveGuests.length;
    let base = Number(guestCount) || 0;
    if (isGoing && base === 0) base = 1;
    return base;
  }, [liveGuests, guestCount, isGoing]);

  const spotsLeft = useMemo(() => {
    if (!capacity || capacity <= 0) return null;
    const remaining = Math.max(0, capacity - effectiveCount);
    return remaining;
  }, [capacity, effectiveCount]);

  // Generate deterministic preview avatars for social proof if real names aren't in view
  const displayAvatars = useMemo(() => {
    const avatars: Array<{ id: string; label: string; bgClass: string; isYou?: boolean }> = [];

    if (isGoing) {
      avatars.push({
        id: "you",
        label: "You",
        bgClass: "bg-emerald-600 text-white font-extrabold",
        isYou: true,
      });
    }

    if (liveGuests.length > 0) {
      for (const g of liveGuests.slice(0, 4)) {
        if (avatars.length >= 4) break;
        const initial = (g.name || "G").trim().slice(0, 1).toUpperCase();
        const hash = stringHash(g.name || g.id || "guest");
        const palette = AVATAR_PALETTES[hash % AVATAR_PALETTES.length];
        avatars.push({
          id: g.id,
          label: initial,
          bgClass: palette.bg,
        });
      }
    }

    return avatars;
  }, [isGoing, liveGuests]);

  const handleActionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    void triggerHaptic("selection");
  };

  /* -------------------------------------------------------------
   * 1. COMPACT VARIANT: Used inside PassPage grid cards
   * ------------------------------------------------------------- */
  if (variant === "compact") {
    return (
      <Link
        href={targetHref}
        onClick={handleActionClick}
        className={cn(
          "group flex items-center justify-between rounded-2xl bg-paper/70 p-2 sm:px-2.5 sm:py-1.5 ring-1 ring-line/60 transition hover:bg-paper hover:ring-brand/30 active:scale-[0.98] cursor-pointer touch-manipulation",
          className,
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          {displayAvatars.length > 0 ? (
            <div className="flex -space-x-1.5 shrink-0 items-center">
              {displayAvatars.slice(0, 3).map((a) => (
                <span
                  key={a.id}
                  className={cn(
                    "grid h-6 w-6 place-items-center rounded-full text-[10px] font-bold ring-2 ring-card shadow-2xs",
                    a.bgClass,
                  )}
                >
                  {a.isYou ? "✓" : a.label}
                </span>
              ))}
              {effectiveCount > 3 && (
                <span className="grid h-6 min-w-[24px] px-1 place-items-center rounded-full bg-brand/15 text-[9px] font-black text-accent ring-2 ring-card">
                  +{effectiveCount - 3}
                </span>
              )}
            </div>
          ) : (
            <div className="grid h-6 w-6 place-items-center rounded-full bg-brand/10 text-accent ring-1 ring-brand/20 shrink-0">
              <Users size={12} />
            </div>
          )}

          <div className="flex items-center gap-1.5 min-w-0">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="text-[11px] font-bold text-ink truncate group-hover:text-accent transition">
              {isGoing
                ? effectiveCount > 1
                  ? `You + ${effectiveCount - 1} going`
                  : "You're going"
                : effectiveCount > 0
                  ? `${effectiveCount} Going`
                  : "Live Guestlist"}
            </span>
          </div>
        </div>

        <div className="flex items-center text-mute group-hover:text-accent transition shrink-0 pl-1">
          <ChevronRight size={13} />
        </div>
      </Link>
    );
  }

  /* -------------------------------------------------------------
   * 2. HERO VARIANT: Used inside EventLivePreviewCard & EventPage
   * ------------------------------------------------------------- */
  if (variant === "hero") {
    return (
      <div
        className={cn(
          "rounded-3xl bg-card p-4 ring-1 ring-line shadow-clay transition hover:ring-brand/30 space-y-3",
          className,
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-ink flex items-center gap-1.5">
              <Users size={14} className="text-accent" />
              <span>Live Attendee Preview</span>
            </span>
          </div>

          {spotsLeft !== null && (
            <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-extrabold text-amber-800 dark:text-amber-300 ring-1 ring-amber-500/30">
              {spotsLeft === 0 ? "Sold Out" : `${spotsLeft} Spots Left`}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 pt-1 border-t border-line/60">
          <div className="flex items-center gap-3 min-w-0">
            {displayAvatars.length > 0 ? (
              <div className="flex -space-x-2 shrink-0">
                {displayAvatars.map((a) => (
                  <div
                    key={a.id}
                    className={cn(
                      "grid h-8 w-8 place-items-center rounded-full text-xs font-bold ring-2 ring-card shadow-xs",
                      a.bgClass,
                    )}
                  >
                    {a.label}
                  </div>
                ))}
                {effectiveCount > displayAvatars.length && (
                  <div className="grid h-8 min-w-[32px] px-1.5 place-items-center rounded-full bg-brand/15 text-[11px] font-black text-accent ring-2 ring-card">
                    +{effectiveCount - displayAvatars.length}
                  </div>
                )}
              </div>
            ) : (
              <div className="grid h-8 w-8 place-items-center rounded-full bg-brand/10 text-accent ring-1 ring-brand/20 shrink-0">
                <Users size={16} />
              </div>
            )}

            <div className="min-w-0">
              <p className="text-xs font-bold text-ink truncate">
                {isGoing
                  ? effectiveCount > 1
                    ? `You and ${effectiveCount - 1} co-attendees going`
                    : "You are going · Spot confirmed"
                  : effectiveCount > 0
                    ? `${effectiveCount} Attendees Confirmed`
                    : "Guestlist Open · 1-Tap Access"}
              </p>
              <p className="text-[11px] text-mute truncate flex items-center gap-1">
                {requireApproval ? (
                  <>
                    <ShieldCheck size={12} className="text-amber-500 shrink-0" />
                    <span>Host screening &amp; approval required</span>
                  </>
                ) : (
                  <>
                    <Ticket size={12} className="text-accent shrink-0" />
                    <span>Instant Apple Wallet &amp; Google Wallet Pass</span>
                  </>
                )}
              </p>
            </div>
          </div>

          <Link
            href={targetHref}
            onClick={handleActionClick}
            className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-paper px-3 text-xs font-bold text-ink ring-1 ring-line/80 hover:bg-card active:scale-95 transition shrink-0"
          >
            <span>Passbook</span>
            <ChevronRight size={13} className="ml-0.5" />
          </Link>
        </div>
      </div>
    );
  }

  /* -------------------------------------------------------------
   * 3. CARD VARIANT (DEFAULT): Used inside CalendarEventCard & Lists
   * ------------------------------------------------------------- */
  return (
    <Link
      href={targetHref}
      onClick={handleActionClick}
      className={cn(
        "group flex items-center justify-between rounded-2xl bg-paper/85 dark:bg-card/75 p-2.5 sm:px-3 sm:py-2.5 ring-1 ring-line/70 backdrop-blur-md transition hover:bg-paper hover:ring-brand/40 active:scale-[0.99] cursor-pointer touch-manipulation",
        className,
      )}
    >
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        {/* Attendee Avatar Cluster */}
        {displayAvatars.length > 0 ? (
          <div className="flex -space-x-2 shrink-0 items-center">
            {displayAvatars.map((a) => (
              <span
                key={a.id}
                className={cn(
                  "grid h-7 w-7 place-items-center rounded-full text-[11px] font-bold ring-2 ring-card shadow-2xs",
                  a.bgClass,
                )}
              >
                {a.isYou ? "✓" : a.label}
              </span>
            ))}
            {effectiveCount > displayAvatars.length && (
              <span className="grid h-7 min-w-[28px] px-1 place-items-center rounded-full bg-brand/15 text-[10px] font-black text-accent ring-2 ring-card">
                +{effectiveCount - displayAvatars.length}
              </span>
            )}
          </div>
        ) : (
          <div className="grid h-7 w-7 place-items-center rounded-full bg-brand/10 text-accent ring-1 ring-brand/20 shrink-0">
            <Users size={14} />
          </div>
        )}

        {/* Live Status & Social Proof Copy */}
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="text-xs font-bold text-ink truncate group-hover:text-accent transition">
              {isGoing
                ? effectiveCount > 1
                  ? `You + ${effectiveCount - 1} going`
                  : "You're Going"
                : effectiveCount > 0
                  ? `${effectiveCount} Going`
                  : "Live Guestlist Open"}
            </span>

            {spotsLeft !== null && (
              <span className="hidden xs:inline-flex rounded-full bg-amber-500/15 px-2 py-0.2 text-[10px] font-bold text-amber-800 dark:text-amber-300">
                {spotsLeft === 0 ? "Full" : `${spotsLeft} spots left`}
              </span>
            )}
          </div>

          <p className="text-[11px] text-mute truncate group-hover:text-ink/80 transition flex items-center gap-1">
            <Sparkles size={11} className="text-amber-500 shrink-0" />
            <span>
              {isGoing
                ? "Access pass ready in Passbook"
                : effectiveCount > 0
                  ? "Live Attendee Preview · Verified co-attendees"
                  : "Be the first to claim a spot"}
            </span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1 text-xs font-bold text-accent shrink-0 pl-2">
        <span className="hidden sm:inline">View</span>
        <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
      </div>
    </Link>
  );
}
