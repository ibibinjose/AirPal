import { useEffect, useRef, useState } from "react";
import { Link, useRoute, useLocation, useSearch } from "wouter";
import { ArrowLeft, Check, Heart, Settings, Share2, Sparkles, Star, Ticket } from "lucide-react";
import { toast } from "sonner";
import { StickyAction } from "@/components/design-system/companions";
import { Button } from "@/components/ui/Button";
import { createBookingForEvent } from "@/components/booking/createBooking";
import { createBookingCheckoutSessionRemote } from "@/lib/functions";
import { useAuth } from "@/contexts/AuthContext";
import { toZonedDateStr } from "@/lib/local-time";
import { useEvents } from "@/contexts/EventsContext";
import { formatRelativeBadge } from "@/lib/calendar-utils";
import { setShareMeta } from "@/lib/share-meta";
import { toPublicUrl } from "@/lib/public-origin";
import { cn } from "@/lib/cn";
import { isEventEnded } from "@/lib/event-status";
import { track } from "@/lib/analytics";
import type { CalendarEvent } from "@shared/event";
import type { NearbyEvent } from "@shared/nearby";
import { recordToCalendarBase } from "@/lib/remote-events";
import { SpeakerRow } from "@/components/event/SpeakerRow";
import { PageLoading } from "@/components/ui/PageLoading";
import { NotFoundPage } from "./NotFoundPage";
import { useLocalNow } from "@/hooks/useLocalNow";
import { HereCheckIn } from "@/components/circle/HereCheckIn";
import { TicketGatePanel } from "@/components/booking/TicketGatePanel";
import { ticketIdFromSearch } from "@shared/booking";

import { EventCoverGlow } from "@/components/event/EventCoverGlow";
import { EventDateCalendarBlock } from "@/components/event/EventDateCalendarBlock";
import { EventHostCard } from "@/components/event/EventHostCard";
import { EventGuestlistAvatars } from "@/components/event/EventGuestlistAvatars";
import { EventInviterPill } from "@/components/event/EventInviterPill";
import { EventLocationCard } from "@/components/event/EventLocationCard";
import { EventRegistrationCard } from "@/components/event/EventRegistrationCard";
import { EventShareModal } from "@/components/event/EventShareModal";
import { EventAgendaSection } from "@/components/event/EventAgendaSection";
import { EventRefundBlock } from "@/components/event/EventRefundBlock";
import { EventNotifyForm } from "@/components/event/EventNotifyForm";
import { EventReportButton } from "@/components/event/EventReportButton";

export function EventPage() {
  const [, params] = useRoute("/e/:id");
  const id = params?.id || "";
  const search = useSearch();
  const { user } = useAuth();
  // Gate-scan QR landings (?ticket=). Guests never fire it; non-entitled
  // signed-in viewers get a silent denial and the plain event page.
  const ticketId = user ? ticketIdFromSearch(search) : null;
  const {
    getEvent: getExpo,
    calendarEvents,
    remoteNearby,
    remoteLoaded,
    fetchRemoteStalls,
    fetchRemoteEvent,
  } = useEvents();
  const [directEv, setDirectEv] = useState<CalendarEvent | null>(null);
  const [directDone, setDirectDone] = useState(false);

  useEffect(() => {
    if (id) void fetchRemoteStalls(id);
  }, [id, fetchRemoteStalls]);

  const expo = getExpo(id);
  const calEv = calendarEvents.find((e) => e.id === id);
  // Migrated curated events live in Firestore, not in the bundle.
  const near = remoteNearby.find((e) => e.id === id);

  // Direct by-id fallback for deep links the list fetch skipped (demo docs).
  // Renders the exact same detail view as live content.
  useEffect(() => {
    setDirectEv(null);
    setDirectDone(false);
    if (!id || expo || calEv || near || !remoteLoaded) return;
    let alive = true;
    void fetchRemoteEvent(id).then((base) => {
      if (!alive) return;
      if (base) setDirectEv(base);
      setDirectDone(true);
    });
    return () => {
      alive = false;
    };
  }, [id, expo, calEv, near, remoteLoaded, fetchRemoteEvent]);

  // A context_view with loadStatus "ok" already fired for /e/:id — pair it
  // with context_load_failed when nothing resolves, or the miss reads as a hit.
  const loadFailed = useRef("");
  useEffect(() => {
    if (!remoteLoaded || !directDone || expo || calEv || near || directEv || !id || loadFailed.current === id) return;
    loadFailed.current = id;
    void track("context_load_failed", { contextType: "event", contextId: id, errorClass: "not_found" });
  }, [remoteLoaded, directDone, expo, calEv, near, directEv, id]);

  if (!remoteLoaded || (!expo && !calEv && !near && !directEv && !directDone)) {
    return <PageLoading />;
  }

  const mappedExpo = expo
    ? ({ ...recordToCalendarBase(expo), isGoing: false, isInterested: false, isLiked: false } as CalendarEvent)
    : null;
  const targetCalEv = calEv || mappedExpo || directEv;
  const body = targetCalEv ? (
    <CalendarEventDetailView event={targetCalEv} />
  ) : near ? (
    <NearbyEventDetailView event={near} />
  ) : (
    <NotFoundPage />
  );
  return (
    <>
      {ticketId && (
        <div className="mx-auto max-w-lg px-4 pt-4">
          <TicketGatePanel ticketId={ticketId} />
        </div>
      )}
      {body}
    </>
  );
}

function CalendarEventDetailView({ event }: { event: CalendarEvent }) {
  const [, nav] = useLocation();
  const { user, requireUser } = useAuth();
  const { toggleGoing, toggleInterested, toggleLiked, getEvent } = useEvents();
  const [buying, setBuying] = useState(false);
  const [tier, setTier] = useState<string>("standard");
  const [spots, setSpots] = useState<number>(1);
  const namedTiers = event.ticketTiers && event.ticketTiers.length > 0 ? event.ticketTiers : null;
  // Named tiers replace the legacy standard/vip/group set — never mix them.
  useEffect(() => {
    if (namedTiers && !namedTiers.some((t) => t.id === tier)) setTier(namedTiers[0]!.id);
    if (!namedTiers && tier !== "standard" && tier !== "vip" && tier !== "group") setTier("standard");
  }, [namedTiers, tier]);

  const [shareOpen, setShareOpen] = useState(false);

  const paidCents = event.ticketPriceCents || 0;
  const isPaid = paidCents > 0;

  const effectiveSpots = tier === "group" ? 4 : spots;
  const unitPriceCents =
    tier === "vip" ? Math.round(paidCents * 1.5) : tier === "group" ? Math.round(paidCents * 0.9) : paidCents;
  const effectivePriceCents = isPaid
    ? tier === "group"
      ? Math.round(paidCents * 4 * 0.9)
      : unitPriceCents * spots
    : 0;

  async function handleRegisterOrBuy(coupon?: string, finalPriceCents?: number, tierId?: string) {
    if (!isPaid) {
      const applied = toggleGoing(event.id);
      if (applied && !event.isGoing) {
        toast.success(`You're registered for "${event.title}"! Added to your AirPal Pass.`);
      }
      return;
    }

    if (!requireUser("Sign in to get tickets.")) return;
    if (!user) return;
    const record = getEvent(event.id);
    const providerUid =
      event.organiserUid || (record && "organiserUid" in record ? record.organiserUid : undefined) || "";
    if (!providerUid) {
      toast.error("Tickets aren't on sale for this event yet.");
      return;
    }
    const providerName =
      event.hostName ||
      (record && "hostName" in record && record.hostName) ||
      (record && "businessName" in record && record.businessName) ||
      "Event organiser";
    const at = new Date(event.startsAt);
    const date = Number.isNaN(at.getTime()) ? event.date : toZonedDateStr(at);
    const time = Number.isNaN(at.getTime())
      ? ""
      : `${String(at.getHours()).padStart(2, "0")}:${String(at.getMinutes()).padStart(2, "0")}`;
    setBuying(true);
    const priceToCharge = typeof finalPriceCents === "number" ? finalPriceCents : effectivePriceCents;
    const couponTitleSuffix = coupon ? ` · Coupon ${coupon}` : "";
    const activeTierName = namedTiers?.find((t) => t.id === (tierId || tier))?.name;
    const tierTitleSuffix = activeTierName
      ? ` (${activeTierName})`
      : tier === "vip"
        ? " (VIP Pass)"
        : tier === "group"
          ? " (Group Pass · 4 Tickets)"
          : "";
    try {
      const bookingId = await createBookingForEvent({
        eventId: event.id,
        providerUid,
        providerName: String(providerName),
        title: `${event.title}${tierTitleSuffix}${couponTitleSuffix}`,
        suburb: event.city,
        date,
        time,
        priceCents: priceToCharge,
        customerUid: user.uid,
        spots: effectiveSpots,
        tierId: tierId || (namedTiers ? tier : undefined),
        couponCode: coupon,
      });
      const res = await createBookingCheckoutSessionRemote({ bookingId });
      if (res.checkoutUrl) {
        window.location.href = res.checkoutUrl;
        return;
      }
      toast.success("Ticket reserved — added to your AirPal Pass wallet");
      nav(`/ticket/${bookingId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't start checkout.");
    } finally {
      setBuying(false);
    }
  }

  useEffect(() => {
    setShareMeta({
      title: `${event.title} · AirPal`,
      description: `${event.title} in ${event.city} on ${event.timeLabel} — find it on AirPal.Me.`.slice(0, 160),
      image: event.heroImage || undefined,
      url: toPublicUrl(`/e/${event.id}`),
    });
  }, [event.id, event.title, event.city, event.timeLabel, event.heroImage]);

  const { today } = useLocalNow();
  const relative = formatRelativeBadge(event.date, today);
  const ended = isEventEnded(event.date, today);
  const closed = ended || event.registrationClosed === true;

  const handleShare = () => {
    setShareOpen(true);
  };

  return (
    <div className="min-h-screen pb-44 lg:pb-24">
      {/* Top Glass Navigation Bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-line/60 bg-card/80 px-4 py-2.5 backdrop-blur-xl transition">
        <button
          type="button"
          onClick={() => {
            if (window.history.length > 1) {
              window.history.back();
            } else {
              nav("/pass");
            }
          }}
          className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 text-xs font-semibold text-mute hover:text-ink transition cursor-pointer whitespace-nowrap"
        >
          <ArrowLeft size={15} className="shrink-0" />
          <span>All events</span>
        </button>

        <div className="hidden min-[380px]:inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-800 dark:text-amber-300 ring-1 ring-amber-400/30 whitespace-nowrap">
          <Ticket size={13} className="shrink-0" />
          <span>AirPal Pass</span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href={`/e/${event.id}/manage`}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 px-3.5 py-1 text-xs font-bold transition hover:opacity-90 shadow-xs active:scale-95 whitespace-nowrap"
            title="Manage Event"
          >
            <Settings size={13} className="shrink-0" />
            <span>Manage</span>
          </Link>

          <button
            type="button"
            onClick={handleShare}
            aria-label="Share event"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-card ring-1 ring-line text-mute hover:text-ink transition cursor-pointer active:scale-95 shadow-xs"
            title="Share"
          >
            <Share2 size={15} />
          </button>
        </div>
      </div>

      {/* Main Responsive Grid Layout (Luma 2-Column Desktop Architecture) */}
      <div className="mx-auto max-w-5xl px-4 pt-5 sm:pt-8">
        <div className="lg:grid lg:grid-cols-12 lg:gap-8 lg:items-start">
          {/* LEFT COLUMN (Desktop 5-col sticky sidebar / Mobile top stack) */}
          <div className="lg:col-span-5 space-y-5">
            {/* Luma-style Cover Image with Ambient Specular Glow */}
            <EventCoverGlow
              src={event.heroImage}
              alt={event.title}
              themeColor={event.themeColor}
              aspectRatio="square"
            />

            {/* Host Card with Digital Bio Link, Extra Hosts and Sponsors */}
            <EventHostCard
              hostName={event.hostName}
              hostHandle={event.hostHandle}
              hostType={event.hostType}
              collaboratorHandles={event.collaboratorHandles}
              sponsorHandles={event.sponsorHandles}
              showActions
            />

            {/* Social Proof Attendee Avatar Pile */}
            <EventGuestlistAvatars
              eventId={event.id}
              guestCount={event.guestCounts?.goingHeads}
              capacity={event.capacity}
              isGoing={event.isGoing}
              requireApproval={event.requireApproval}
            />

            {/* Report this event to the trust team */}
            <div className="flex justify-end">
              <EventReportButton eventId={event.id} eventTitle={event.title} />
            </div>

            {/* Secondary Action Buttons (Save, Like, Add to Trip) */}
            <div className="rounded-3xl bg-card p-3 ring-1 ring-line">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (toggleInterested(event.id) && !event.isInterested)
                      toast.success(`Saved "${event.title}" to Interested`);
                  }}
                  className={cn(
                    "inline-flex h-11 min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-full text-sm font-bold transition active:scale-[0.98] cursor-pointer",
                    event.isInterested
                      ? "bg-ink text-paper shadow-xs"
                      : "bg-paper text-mute ring-1 ring-line hover:text-ink",
                  )}
                >
                  <Star
                    size={14}
                    className={event.isInterested ? "fill-white" : ""}
                    strokeWidth={event.isInterested ? 2.5 : 2}
                  />
                  <span>{event.isInterested ? "Saved" : "Save"}</span>
                </button>

                <button
                  type="button"
                  aria-pressed={event.isLiked}
                  aria-label={event.isLiked ? "Liked" : "Like this event"}
                  onClick={() => {
                    if (toggleLiked(event.id) && !event.isLiked) toast.success(`Liked "${event.title}"`);
                  }}
                  className={cn(
                    "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition active:scale-95 cursor-pointer ring-1 ring-line",
                    event.isLiked ? "bg-rose-500 text-white ring-rose-500" : "bg-paper text-mute hover:text-ink",
                  )}
                >
                  <Heart size={16} className={event.isLiked ? "fill-white" : ""} strokeWidth={2} />
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN (Desktop 7-col primary content / Mobile bottom stack) */}
          <div className="mt-6 lg:mt-0 lg:col-span-7 space-y-5">
            {/* Viral Referral / Inviter Badge (if ref is present) */}
            <EventInviterPill />

            {/* Event Category & Schedule Pill Badge */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-card px-2.5 py-0.5 text-xs font-bold text-ink ring-1 ring-line shadow-2xs">
                {event.categoryLabel}
              </span>
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-xs font-bold ring-1",
                  relative.highlight
                    ? "bg-amber-100 text-amber-900 ring-amber-300 dark:bg-amber-950 dark:text-amber-200"
                    : "bg-card text-mute ring-line",
                )}
              >
                {relative.label}
              </span>
              {event.isLocal && (
                <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-bold text-accent">
                  <Sparkles size={11} aria-hidden="true" /> Local Event
                </span>
              )}
            </div>

            {/* Topic tags — tap to explore more like this */}
            {event.tags && event.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5" aria-label="Event topics">
                {event.tags.slice(0, 6).map((tag) => (
                  <Link
                    key={tag}
                    href={`/events?q=${encodeURIComponent(tag)}`}
                    className="inline-flex min-h-[44px] items-center rounded-full bg-paper px-3.5 text-xs font-semibold text-mute ring-1 ring-line hover:text-accent hover:ring-brand/30 transition touch-manipulation"
                  >
                    #{tag}
                  </Link>
                ))}
              </div>
            )}

            {/* Event Title & Highlight */}
            <div>
              <h1 className="human-title text-3xl sm:text-4xl text-balance">{event.title}</h1>
              {event.shortWhy && <p className="human-lede mt-1.5 text-sm sm:text-base font-medium">{event.shortWhy}</p>}
            </div>

            {/* Apple Calendar Date & Time Block */}
            <EventDateCalendarBlock event={event} />

            {/* Google Maps Location & Venue Card */}
            <EventLocationCard
              venue={event.venue}
              room={event.room}
              address={event.address}
              city={event.city}
              geo={event.geo}
              locationType={event.locationType}
              virtualUrl={event.virtualUrl}
              directions={event.directions}
            />

            {/* Luma-style Registration & Ticket Tier Card — closed once past or host-closed */}
            {closed ? (
              <div className="rounded-3xl bg-paper p-5 sm:p-6 ring-1 ring-line text-center space-y-4">
                <div>
                  <p className="human-eyebrow">Registration Closed</p>
                  <p className="human-section-title mt-1 text-lg text-balance">
                    {ended ? "This event has ended" : "Registration is closed"}
                  </p>
                  <p className="mx-auto mt-1 max-w-sm text-sm text-mute">
                    {ended
                      ? "This event is not currently taking registrations. Contact the host above or explore what else is on."
                      : "The host has closed registrations for this event. Leave your details and we'll notify you if spots open or it runs again."}
                  </p>
                </div>
                <EventNotifyForm eventId={event.id} eventTitle={event.title} />
                {event.refundPolicy && (
                  <p className="mx-auto max-w-sm text-xs leading-relaxed text-mute">
                    <span className="font-bold">Refunds & transfers: </span>
                    {event.refundPolicy}
                  </p>
                )}
                <Link
                  href="/events"
                  className="inline-flex min-h-[44px] items-center rounded-full bg-brand px-5 text-sm font-bold text-white touch-manipulation"
                >
                  Browse Events
                </Link>
              </div>
            ) : (
              <>
                <EventRegistrationCard
                  eventId={event.id}
                  paidCents={paidCents}
                  capacity={event.capacity}
                  requireApproval={event.requireApproval}
                  isGoing={event.isGoing}
                  buying={buying}
                  tier={tier}
                  tiers={namedTiers || undefined}
                  spots={spots}
                  onTierChange={setTier}
                  onSpotsChange={setSpots}
                  onSubmit={handleRegisterOrBuy}
                />
                <EventRefundBlock policy={event.refundPolicy} />
              </>
            )}

            {/* About Event Description Card */}
            <div className="human-card p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-line/50 pb-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-ink">About This Experience</h3>
                <span className="text-xs text-mute font-medium">Verified by AirPal</span>
              </div>
              <p className="text-sm sm:text-[15px] leading-relaxed text-ink/90 whitespace-pre-line font-normal">
                {event.description}
              </p>

              {/* In-Person Presence Check-in */}
              <div className="pt-2">
                <HereCheckIn placeName={event.venue} eventId={event.id} />
              </div>

              {/* Off-platform registration link fallback */}
              {event.registrationUrl && (
                <div className="pt-2">
                  <Button
                    variant="tonal"
                    className="w-full text-xs font-bold min-h-[44px]"
                    onClick={() => window.open(event.registrationUrl, "_blank", "noopener,noreferrer")}
                  >
                    Official External Registration
                  </Button>
                </div>
              )}
            </div>

            {/* Timed run-sheet */}
            <EventAgendaSection agenda={event.agenda} />

            {/* Program Lineup & Speakers */}
            {event.speakers && event.speakers.length > 0 && (
              <div className="rounded-3xl bg-card p-5 ring-1 ring-line space-y-3">
                <h3 className="human-eyebrow">Speakers, Artists &amp; Lineup</h3>
                <SpeakerRow speakers={event.speakers} />
              </div>
            )}
          </div>
        </div>
      </div>

      <EventShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        eventId={event.id}
        title={event.title}
        venue={event.venue}
        date={event.date}
        heroImage={event.heroImage}
      />

      {/* Floating Mobile Sticky Registration Button — hidden once closed */}
      {!closed && (
        <StickyAction
          primary={
            <button
              type="button"
              onClick={() => void handleRegisterOrBuy()}
              disabled={buying}
              className={cn(
                "flex h-12 w-full cursor-pointer touch-manipulation items-center justify-center gap-2 rounded-full text-[15px] font-bold shadow-md transition active:scale-[0.99] disabled:opacity-60",
                event.isGoing ? "bg-emerald-600 text-white" : isPaid ? "bg-brand text-white" : "bg-brand text-white",
              )}
            >
              <span className="inline-flex items-center gap-1.5">
                {event.isGoing && !buying && <Check size={16} className="shrink-0" aria-hidden="true" />}
                <span>
                  {buying
                    ? "Starting checkout…"
                    : event.isGoing
                      ? "You're going"
                      : isPaid
                        ? `Get ${effectiveSpots > 1 ? `${effectiveSpots} tickets` : "ticket"} · $${(effectivePriceCents / 100).toFixed(2)}`
                        : "Register Free Pass · I'm going"}
                </span>
              </span>
            </button>
          }
        />
      )}
    </div>
  );
}

function NearbyEventDetailView({ event: ev }: { event: NearbyEvent }) {
  const [, nav] = useLocation();

  useEffect(() => {
    setShareMeta({
      title: `${ev.title} · AirPal`,
      description: `${ev.title} — ${ev.insiderTip || ev.detail || "find it on AirPal.Me."}`.slice(0, 160),
      image: ev.heroImage || undefined,
      url: toPublicUrl(`/e/${ev.id}`),
    });
  }, [ev.id, ev.title, ev.insiderTip, ev.detail, ev.heroImage]);

  return (
    <div className="page-wrap pt-5 sm:pt-6">
      <div className="lg:grid lg:grid-cols-12 lg:gap-8 lg:items-start">
        <div className="lg:col-span-5">
          <EventCoverGlow src={ev.heroImage} alt={ev.title} />
        </div>

        <div className="mt-6 lg:mt-0 lg:col-span-7 space-y-5">
          <div className="flex items-center gap-2">
            <span className="human-eyebrow">{ev.when}</span>
            {ev.ticketPrice && (
              <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-bold text-amber-800 dark:text-amber-300 ring-1 ring-amber-400/30">
                {ev.ticketPrice}
              </span>
            )}
          </div>

          <h1 className="human-title text-3xl sm:text-4xl text-balance">{ev.title}</h1>

          <p className="text-[15px] leading-relaxed text-ink/90 whitespace-pre-line">{ev.insiderTip || ev.detail}</p>

          <EventLocationCard venue={ev.venueName || ev.title} city="Sydney" />

          {ev.isEnded ? (
            <div className="rounded-3xl bg-paper p-5 ring-1 ring-line text-center">
              <p className="human-eyebrow">Registration Closed</p>
              <p className="human-section-title mt-1 text-lg text-balance">This event has ended</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-mute">
                This event is not currently taking registrations. Explore what else is on.
              </p>
              <Link
                href="/events"
                className="mt-4 inline-flex min-h-[44px] items-center rounded-full bg-brand px-5 text-sm font-bold text-white touch-manipulation"
              >
                Browse Events
              </Link>
            </div>
          ) : (
            <div className="flex flex-col min-[380px]:flex-row gap-2.5 pt-2">
              {ev.ticketUrl && (
                <Button
                  className="flex-1 min-h-[44px] font-bold whitespace-nowrap"
                  onClick={() => window.open(ev.ticketUrl, "_blank", "noopener,noreferrer")}
                >
                  Official Tickets
                </Button>
              )}
              <Button
                variant="ghost"
                className="flex-1 min-h-[44px] ring-1 ring-line font-bold whitespace-nowrap"
                onClick={() => nav("/calendar")}
              >
                Calendar Schedule
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
