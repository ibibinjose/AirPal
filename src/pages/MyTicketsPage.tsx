import { useMemo, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, ArrowRight, Calendar, QrCode, RefreshCw, Search, Ticket, WifiOff, X } from "lucide-react";
import { PageLoading } from "@/components/ui/PageLoading";
import { PaymentCanceledNotice } from "@/components/booking/PaymentCanceledNotice";
import { AirPalTicketPass } from "@/components/tickets/AirPalTicketPass";
import { useAuth } from "@/contexts/AuthContext";
import { useMyBookings } from "@/hooks/useMyBookings";
import { triggerHapticSelection } from "@/lib/native";
import { cn } from "@/lib/cn";

type FilterTab = "upcoming" | "past" | "all";

/**
 * AirPal Wallet — every ticket the guest holds, in one place.
 * Powered by unified AirPal account, real-time sync, offline resilient, with calendar export.
 */
export function MyTicketsPage() {
  const { user, authReady } = useAuth();
  const { bookings, upcomingBookings, pastBookings, upcomingSpots, loading, failed, isOfflineCached, refresh } =
    useMyBookings();
  const [tab, setTab] = useState<FilterTab>("upcoming");
  const [query, setQuery] = useState("");

  const baseList = tab === "upcoming" ? upcomingBookings : tab === "past" ? pastBookings : bookings;

  const displayList = useMemo(() => {
    if (!query.trim()) return baseList;
    const q = query.trim().toLowerCase();
    return baseList.filter(
      (b) =>
        (b.title && b.title.toLowerCase().includes(q)) ||
        (b.suburb && b.suburb.toLowerCase().includes(q)) ||
        (b.date && b.date.toLowerCase().includes(q)) ||
        (b.id && b.id.toLowerCase().includes(q)),
    );
  }, [baseList, query]);

  // While auth restores, hold a loader: a bare `!user` flash shows the
  // signed-out card even though a signed-in wallet is about to load.
  if (!authReady || loading) return <PageLoading />;

  return (
    <div className="mx-auto max-w-2xl px-4 pb-[calc(env(safe-area-inset-bottom,0px)+6.5rem)] pt-4 md:px-6 md:pt-6">
      <div className="flex items-center gap-2 mb-3">
        <Link
          href="/pass"
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-card px-3.5 text-xs font-semibold text-mute hover:text-ink ring-1 ring-line hover:bg-paper transition"
        >
          <ArrowLeft size={13} aria-hidden="true" />
          <span>AirPal Pass</span>
        </Link>
        <span className="human-eyebrow">Wallet &amp; Passbook</span>
      </div>

      <PaymentCanceledNotice />

      {/* Header and Live Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="human-title mt-0.5 text-2xl sm:text-3xl font-black">My event passes &amp; tickets</h1>
          <p className="human-lede text-xs sm:text-sm mt-0.5">Ready to scan at the gate — online &amp; offline.</p>
        </div>
        <div className="flex items-center gap-2">
          {user && (
            <button
              type="button"
              onClick={() => {
                void triggerHapticSelection();
                refresh();
              }}
              aria-label="Refresh tickets"
              title="Refresh tickets"
              className="no-print grid h-10 w-10 min-h-[44px] min-w-[44px] shrink-0 place-items-center rounded-full bg-card ring-1 ring-line text-mute hover:text-ink hover:bg-paper transition active:scale-95 cursor-pointer touch-manipulation"
            >
              <RefreshCw size={15} />
            </button>
          )}
          <Link
            href="/calendar"
            className="no-print inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-card px-3.5 text-xs font-semibold text-mute ring-1 ring-line hover:bg-paper hover:text-ink transition cursor-pointer touch-manipulation"
          >
            <Calendar size={13} className="text-accent" />
            <span>Calendar</span>
          </Link>
          <Link
            href="/scan"
            className="no-print inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-card px-3.5 text-xs font-semibold text-mute ring-1 ring-line hover:bg-paper hover:text-ink transition cursor-pointer touch-manipulation"
          >
            <QrCode size={13} className="text-accent" />
            <span>Scanner</span>
          </Link>
        </div>
      </div>

      {/* Quick Summary Pill Bar */}
      {bookings.length > 0 && (
        <div className="grid grid-cols-3 gap-2 p-1.5 rounded-2xl bg-card/60 ring-1 ring-line mb-5">
          <div className="flex flex-col items-center justify-center p-2 text-center rounded-xl bg-paper/60">
            <span className="text-[11px] font-bold uppercase tracking-wider text-mute">Active Passes</span>
            <span className="text-lg font-black text-ink tabular-data">{upcomingSpots || upcomingBookings.length}</span>
          </div>
          <div className="flex flex-col items-center justify-center p-2 text-center rounded-xl bg-paper/60">
            <span className="text-[11px] font-bold uppercase tracking-wider text-mute">Total Held</span>
            <span className="text-lg font-black text-ink tabular-data">{bookings.length}</span>
          </div>
          <div className="flex flex-col items-center justify-center p-2 text-center rounded-xl bg-paper/60">
            <span className="text-[11px] font-bold uppercase tracking-wider text-mute">Wallet Ready</span>
            <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 mt-1">Apple &amp; Google</span>
          </div>
        </div>
      )}

      {isOfflineCached && (
        <div className="mb-4 flex items-center gap-2 rounded-2xl bg-amber-500/10 px-3.5 py-2.5 text-xs font-medium text-amber-900 dark:text-amber-300 ring-1 ring-amber-500/20">
          <WifiOff size={14} className="shrink-0 text-amber-600" />
          <span>Offline — showing cached tickets. Ready to scan at the gate.</span>
        </div>
      )}

      {!user && bookings.length === 0 ? (
        <div className="human-card mt-6 p-8 text-center">
          <Ticket size={28} className="mx-auto text-mute" aria-hidden="true" />
          <p className="human-section-title mt-2 text-lg">Sign in to see your passes</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-mute">One account, tickets everywhere.</p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <Link
              href="/start?tab=signin"
              className="no-print inline-flex min-h-[44px] items-center rounded-full bg-brand px-5 text-sm font-semibold text-white"
            >
              Sign in
            </Link>
            <Link
              href="/pass"
              className="no-print inline-flex min-h-[44px] items-center rounded-full bg-paper px-5 text-sm font-semibold text-ink ring-1 ring-line hover:bg-card"
            >
              Browse events
            </Link>
          </div>
        </div>
      ) : !user && bookings.length > 0 ? (
        <>
          <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-brand/10 p-3.5 text-sm font-semibold text-accent ring-1 ring-brand/20 mb-4">
            <span>Viewing passes saved on this device. Sign in to sync across all your devices.</span>
            <Link href="/start?tab=signin" className="underline shrink-0 font-bold inline-flex items-center gap-1">
              Sign in
              <ArrowRight size={13} className="shrink-0" aria-hidden="true" />
            </Link>
          </div>
          <div className="space-y-4">
            {bookings.map((t) => (
              <AirPalTicketPass key={t.id} booking={t} guestName="Guest Mate" />
            ))}
          </div>
        </>
      ) : failed && bookings.length === 0 ? (
        <div className="human-card mt-6 p-8 text-center">
          <Ticket size={28} className="mx-auto text-mute" aria-hidden="true" />
          <p className="human-section-title mt-2 text-lg">Couldn&apos;t load your tickets</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-mute">
            Check your connection and try again — your passes are safe in your AirPal account.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={refresh}
              className="no-print inline-flex min-h-[44px] cursor-pointer items-center rounded-full bg-brand px-5 text-sm font-semibold text-white"
            >
              Try again
            </button>
            <Link
              href="/pass"
              className="no-print inline-flex min-h-[44px] items-center rounded-full bg-paper px-5 text-sm font-semibold text-ink ring-1 ring-line hover:bg-card"
            >
              Browse events
            </Link>
          </div>
        </div>
      ) : bookings.length === 0 ? (
        <div className="human-card mt-6 p-8 text-center space-y-3">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-brand/10 text-accent">
            <Ticket size={24} aria-hidden="true" />
          </div>
          <p className="human-section-title text-lg font-bold">No tickets or passes yet</p>
          <p className="mx-auto max-w-sm text-xs sm:text-sm text-mute leading-relaxed">
            Passes live here — ready to scan and save to Apple / Google Wallet.
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
            <Link
              href="/pass"
              className="no-print inline-flex min-h-[44px] items-center rounded-full bg-brand px-5 text-sm font-bold text-white shadow-xs"
            >
              Explore AirPal Pass
            </Link>
            <Link
              href="/events"
              className="no-print inline-flex min-h-[44px] items-center rounded-full bg-paper px-4 text-sm font-semibold text-ink ring-1 ring-line hover:bg-card"
            >
              What&apos;s On Feed
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-3.5 text-mute" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search event, venue, or date…"
              aria-label="Search passes by event, venue, or date"
              className="min-h-[46px] h-11 w-full rounded-2xl border border-line bg-card pl-9 pr-12 text-[16px] sm:text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:border-brand touch-manipulation"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-1 top-1/2 -translate-y-1/2 grid h-11 w-11 min-h-[44px] min-w-[44px] place-items-center rounded-full text-mute hover:text-ink cursor-pointer touch-manipulation"
                aria-label="Clear search"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Filter Segmented Tabs */}
          <div
            className="flex items-center gap-1.5 sm:gap-2 rounded-2xl bg-paper p-1 ring-1 ring-line"
            role="tablist"
            aria-label="Filter tickets"
          >
            <button
              type="button"
              role="tab"
              aria-selected={tab === "upcoming"}
              onClick={() => {
                void triggerHapticSelection();
                setTab("upcoming");
              }}
              className={cn(
                "inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl px-2.5 sm:px-3 text-xs sm:text-sm font-semibold transition active:scale-95 whitespace-nowrap cursor-pointer touch-manipulation",
                tab === "upcoming"
                  ? "bg-card text-ink shadow-xs ring-1 ring-line font-bold"
                  : "text-mute hover:text-ink",
              )}
            >
              <span>Upcoming</span>
              <span className="rounded-full bg-brand/10 px-1.5 py-0.5 text-[11px] font-bold text-accent tabular-data">
                {upcomingBookings.length}
              </span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={tab === "past"}
              onClick={() => {
                void triggerHapticSelection();
                setTab("past");
              }}
              className={cn(
                "inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl px-2.5 sm:px-3 text-xs sm:text-sm font-semibold transition active:scale-95 whitespace-nowrap cursor-pointer touch-manipulation",
                tab === "past" ? "bg-card text-ink shadow-xs ring-1 ring-line font-bold" : "text-mute hover:text-ink",
              )}
            >
              <span>Past</span>
              <span className="rounded-full bg-paper px-1.5 py-0.5 text-[11px] font-bold text-mute ring-1 ring-line tabular-data">
                {pastBookings.length}
              </span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={tab === "all"}
              onClick={() => {
                void triggerHapticSelection();
                setTab("all");
              }}
              className={cn(
                "inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl px-2.5 sm:px-3 text-xs sm:text-sm font-semibold transition active:scale-95 whitespace-nowrap cursor-pointer touch-manipulation",
                tab === "all" ? "bg-card text-ink shadow-xs ring-1 ring-line font-bold" : "text-mute hover:text-ink",
              )}
            >
              <span>All</span>
              <span className="rounded-full bg-paper px-1.5 py-0.5 text-[11px] font-bold text-mute ring-1 ring-line tabular-data">
                {bookings.length}
              </span>
            </button>
          </div>

          {displayList.length === 0 ? (
            <div className="human-card p-6 text-center space-y-2">
              <p className="human-section-title text-base font-bold">
                {query
                  ? `No passes match "${query}"`
                  : tab === "upcoming"
                    ? "No upcoming passes"
                    : "No past passes found"}
              </p>
              <p className="text-xs sm:text-sm text-mute">
                {query
                  ? "Try a different keyword or clear the search."
                  : tab === "upcoming"
                    ? "Grab a pass on AirPal Pass."
                    : "Scanned passes stay here."}
              </p>
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="mt-2 inline-flex min-h-[44px] items-center rounded-full bg-card px-4 text-xs font-semibold ring-1 ring-line text-ink hover:bg-paper"
                >
                  Clear search
                </button>
              ) : tab === "upcoming" ? (
                <Link
                  href="/pass"
                  className="no-print mt-3 inline-flex min-h-[44px] items-center rounded-full bg-brand px-4 text-sm font-semibold text-white"
                >
                  Browse AirPal Pass
                </Link>
              ) : null}
            </div>
          ) : (
            <div className="space-y-4">
              {displayList.map((t) => (
                <AirPalTicketPass key={t.id} booking={t} guestName={user?.displayName || undefined} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
