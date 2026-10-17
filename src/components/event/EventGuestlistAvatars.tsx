import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Users, ChevronRight } from "lucide-react";
import { subscribeGuestlist, type GuestRow } from "@/lib/guestlist";
import { cn } from "@/lib/cn";

export interface EventGuestlistAvatarsProps {
  eventId: string;
  className?: string;
}

export function EventGuestlistAvatars({ eventId, className }: EventGuestlistAvatarsProps) {
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
        setLoading(false);
      },
    );
    return () => unsub();
  }, [eventId]);

  const activeGuests = guests.filter((g) => g.status === "going" || g.status === "checked-in");
  const count = activeGuests.length;

  // Formatting attendee summary string (e.g. "Cheryl, Rayn and 10 others going")
  const summaryText =
    count === 0
      ? "Be the first to join the guestlist"
      : count === 1
        ? `${activeGuests[0]?.name || "1 person"} is going`
        : count === 2
          ? `${activeGuests[0]?.name} and ${activeGuests[1]?.name} are going`
          : `${activeGuests[0]?.name}, ${activeGuests[1]?.name} and ${count - 2} others going`;

  if (loading) {
    return (
      <div
        className={cn(
          "flex items-center gap-3 rounded-[24px] bg-card/60 p-4 ring-1 ring-line/50 backdrop-blur-md animate-pulse",
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
      className={cn(
        "group flex items-center justify-between rounded-3xl bg-card p-4 ring-1 ring-line transition hover:ring-brand/30 active:scale-[0.99] cursor-pointer touch-manipulation",
        className,
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        {/* Avatar Stack — real guests only; an honest empty tile when none */}
        <div className="flex -space-x-2 shrink-0">
          {count > 0 ? (
            activeGuests.slice(0, 4).map((g, i) => (
              <div
                key={g.id || i}
                className="grid h-8 w-8 place-items-center rounded-full bg-paper text-[11px] font-bold text-ink ring-2 ring-card shadow-xs overflow-hidden"
              >
                {g.name.slice(0, 1).toUpperCase()}
              </div>
            ))
          ) : (
            <div className="grid h-8 w-8 place-items-center rounded-full bg-brand/10 text-accent ring-2 ring-card shadow-xs">
              <Users size={14} aria-hidden="true" />
            </div>
          )}
          {count > 4 && (
            <div className="grid h-8 w-8 place-items-center rounded-full bg-brand/15 text-[11px] font-black text-accent ring-2 ring-card">
              +{count - 4}
            </div>
          )}
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-bold text-ink">
            <Users size={13} className="text-accent" />
            <span>{count > 0 ? `${count} Going` : "Guestlist"}</span>
          </div>
          <p className="text-[11px] font-medium text-mute truncate group-hover:text-ink transition">{summaryText}</p>
        </div>
      </div>

      <div className="flex items-center gap-1 text-xs font-semibold text-mute group-hover:text-accent transition pl-2">
        <span className="hidden sm:inline">Roster</span>
        <ChevronRight size={14} />
      </div>
    </Link>
  );
}
