import { useEffect, useState, useMemo } from "react";
import { Link } from "wouter";
import { Users, ChevronRight, ShieldCheck, Ticket } from "lucide-react";
import { subscribeGuestlist, type GuestRow } from "@/lib/guestlist";
import { triggerHaptic } from "@/lib/native";
import { cn } from "@/lib/cn";

export interface EventGuestlistAvatarsProps {
  eventId: string;
  guestCount?: number;
  capacity?: number;
  isGoing?: boolean;
  requireApproval?: boolean;
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

export function EventGuestlistAvatars({
  eventId,
  guestCount = 0,
  capacity,
  isGoing = false,
  requireApproval = false,
  className,
}: EventGuestlistAvatarsProps) {
  const [guests, setGuests] = useState<GuestRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!eventId) return;
    const unsub = subscribeGuestlist(
      "event",
      eventId,
      (rows) => {
        setGuests(rows);
        setLoading(false);
      },
      () => {
        // Fallback gracefully on permission boundary for attendees
        setLoading(false);
      },
    );
    return () => unsub();
  }, [eventId]);

  const activeGuests = guests.filter((g) => g.status === "going" || g.status === "checked-in");

  const effectiveCount = useMemo(() => {
    if (activeGuests.length > 0) return activeGuests.length;
    let base = Number(guestCount) || 0;
    if (isGoing && base === 0) base = 1;
    return base;
  }, [activeGuests, guestCount, isGoing]);

  const spotsLeft = useMemo(() => {
    if (!capacity || capacity <= 0) return null;
    return Math.max(0, capacity - effectiveCount);
  }, [capacity, effectiveCount]);

  // Formatting attendee summary string
  const summaryText = useMemo(() => {
    if (isGoing) {
      return effectiveCount > 1 ? `You and ${effectiveCount - 1} co-attendees going` : "You are going · Spot confirmed";
    }
    if (activeGuests.length >= 2) {
      return `${activeGuests[0]?.name}, ${activeGuests[1]?.name}${effectiveCount > 2 ? ` and ${effectiveCount - 2} others` : ""} going`;
    }
    if (activeGuests.length === 1) {
      return `${activeGuests[0]?.name} is going`;
    }
    if (effectiveCount > 0) {
      return `${effectiveCount} verified attendees going`;
    }
    return requireApproval ? "Guestlist open · Host screening applies" : "Be the first to join the live guestlist";
  }, [isGoing, activeGuests, effectiveCount, requireApproval]);

  // Display avatars
  const avatarList = useMemo(() => {
    const list: Array<{ id: string; label: string; bgClass: string; isYou?: boolean }> = [];

    if (isGoing) {
      list.push({
        id: "you",
        label: "You",
        bgClass: "bg-emerald-600 text-white font-extrabold",
        isYou: true,
      });
    }

    if (activeGuests.length > 0) {
      for (const g of activeGuests.slice(0, 4)) {
        if (list.length >= 4) break;
        const initial = (g.name || "G").trim().slice(0, 1).toUpperCase();
        const hash = stringHash(g.name || g.id);
        const palette = AVATAR_PALETTES[hash % AVATAR_PALETTES.length];
        list.push({
          id: g.id,
          label: initial,
          bgClass: palette.bg,
        });
      }
    }

    return list;
  }, [isGoing, activeGuests]);

  if (loading) {
    return (
      <div
        className={cn(
          "flex items-center gap-3 rounded-[28px] bg-card/60 p-4 ring-1 ring-line/50 backdrop-blur-md animate-pulse",
          className,
        )}
      >
        <div className="flex -space-x-2 shrink-0">
          <div className="h-8 w-8 rounded-full bg-paper ring-2 ring-card" />
          <div className="h-8 w-8 rounded-full bg-paper ring-2 ring-card" />
        </div>
        <div className="h-3 w-32 rounded bg-paper" />
      </div>
    );
  }

  return (
    <Link
      href={`/e/${eventId}/guests`}
      onClick={() => void triggerHaptic("selection")}
      className={cn(
        "group flex items-center justify-between rounded-3xl bg-card p-4 ring-1 ring-line/80 shadow-clay hover:shadow-clay-hover transition-[box-shadow,border-color] hover:ring-brand/30 active:scale-[0.99] cursor-pointer touch-manipulation",
        className,
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        {/* Avatar Stack */}
        {avatarList.length > 0 ? (
          <div className="flex -space-x-2 shrink-0 items-center">
            {avatarList.map((a) => (
              <div
                key={a.id}
                className={cn(
                  "grid h-8 w-8 place-items-center rounded-full text-xs font-bold ring-2 ring-card shadow-xs",
                  a.bgClass,
                )}
              >
                {a.isYou ? "✓" : a.label}
              </div>
            ))}
            {effectiveCount > avatarList.length && (
              <div className="grid h-8 min-w-[32px] px-1.5 place-items-center rounded-full bg-brand/15 text-[11px] font-black text-accent ring-2 ring-card">
                +{effectiveCount - avatarList.length}
              </div>
            )}
          </div>
        ) : (
          <div className="grid h-8 w-8 place-items-center rounded-full bg-brand/10 text-accent ring-1 ring-brand/20 shrink-0">
            <Users size={16} />
          </div>
        )}

        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-bold text-ink">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <Users size={13} className="text-accent shrink-0" />
            <span className="truncate">
              {isGoing
                ? "You're on the Guestlist"
                : effectiveCount > 0
                  ? `${effectiveCount} Going`
                  : "Live Attendee Guestlist"}
            </span>
            {spotsLeft !== null && (
              <span className="hidden xs:inline-flex rounded-full bg-amber-500/15 px-2 py-0.2 text-[10px] font-bold text-amber-800 dark:text-amber-300">
                {spotsLeft === 0 ? "Full" : `${spotsLeft} left`}
              </span>
            )}
          </div>
          <p className="text-[11px] font-medium text-mute truncate group-hover:text-ink transition flex items-center gap-1 mt-0.5">
            {requireApproval ? (
              <>
                <ShieldCheck size={11} className="text-amber-500 shrink-0" />
                <span>Screened Guestlist · Host approval</span>
              </>
            ) : (
              <>
                <Ticket size={11} className="text-accent shrink-0" />
                <span>{summaryText}</span>
              </>
            )}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1 text-xs font-bold text-accent group-hover:translate-x-0.5 transition-transform pl-2 shrink-0">
        <span className="hidden sm:inline">Roster</span>
        <ChevronRight size={15} />
      </div>
    </Link>
  );
}
