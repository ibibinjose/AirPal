import { Link } from "wouter";
import { Calendar, ChevronRight, Clock, MapPin, Plus, Sparkles, Users } from "lucide-react";
import type { EventRecord } from "@shared/event";
import type { BioProfile } from "@shared/bio";
import { formatEventTimeRange } from "@/lib/calendar-utils";
import { timeZoneForCity } from "@/lib/cities";
import { AddToCalendarMenu } from "@/components/calendar/AddToCalendarMenu";
import { Button } from "@/components/ui/Button";
import { Photo } from "@/components/ui/Photo";
import { triggerHaptic } from "@/lib/native";

const MONTH_NAMES = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

interface BioEventsSectionProps {
  events: EventRecord[];
  bio: BioProfile;
  isOwner: boolean;
  onNavigate: (path: string) => void;
}

export function BioEventsSection({ events, bio, isOwner, onNavigate }: BioEventsSectionProps) {
  const isBiz = bio.kind === "business";

  return (
    <section id="bio-events" className="mt-8 scroll-mt-24" aria-labelledby="bio-events-heading">
      <div className="flex items-center justify-between gap-2 mb-3.5 px-0.5">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-accent flex items-center gap-1.5">
            <Calendar size={13} className="text-accent" aria-hidden="true" />
            <span>{isBiz ? "Events & What’s On" : "Hosted Events"}</span>
          </p>
          <h2 id="bio-events-heading" className="font-display text-lg sm:text-xl font-bold text-ink mt-0.5">
            {isBiz ? `Upcoming at ${bio.name}` : `Events by ${bio.name}`}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {events.length > 0 && (
            <span className="neu-chip px-2.5 py-0.5 text-[10px] font-bold text-accent uppercase tracking-wider">
              {events.length} {events.length === 1 ? "Event" : "Events"}
            </span>
          )}
          {isOwner && (
            <Button
              size="sm"
              variant="ghost"
              className="neu-btn min-h-[38px] text-xs font-semibold gap-1.5 px-3 rounded-full cursor-pointer touch-manipulation"
              onClick={() => {
                void triggerHaptic("light");
                onNavigate(`/event?venue=${encodeURIComponent(bio.name || bio.handle)}&handle=${bio.handle}`);
              }}
              title="Create a new event"
            >
              <Plus size={14} className="text-accent" />
              <span className="hidden sm:inline">Add Event</span>
            </Button>
          )}
        </div>
      </div>

      {events.length === 0 ? (
        <div className="neu-card p-6 sm:p-8 text-center rounded-[28px]">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-brand/10 text-accent mb-3">
            <Calendar size={22} />
          </div>
          <h3 className="font-display text-base font-bold text-ink">No upcoming events scheduled yet</h3>
          <p className="mt-1.5 text-xs sm:text-sm text-mute max-w-md mx-auto leading-relaxed">
            {isBiz
              ? `Follow @${bio.handle} or join the VIP Guestlist to be notified when new live music, table bookings, and gigs drop.`
              : `Check back soon for upcoming gatherings, workshops, and catch-ups hosted by ${bio.name}.`}
          </p>
          {isOwner ? (
            <div className="mt-4 flex justify-center">
              <Button
                size="sm"
                className="gap-2 rounded-full bg-brand px-5 min-h-[44px] text-xs font-bold text-white shadow-xs hover:bg-brand-ink active:scale-95 cursor-pointer touch-manipulation"
                onClick={() => {
                  void triggerHaptic("medium");
                  onNavigate(`/event?venue=${encodeURIComponent(bio.name || bio.handle)}&handle=${bio.handle}`);
                }}
              >
                <Plus size={14} />
                <span>Host Your First Event</span>
              </Button>
            </div>
          ) : (
            <div className="mt-4 flex justify-center">
              <Link
                href="/events"
                onClick={() => void triggerHaptic("light")}
                className="neu-btn inline-flex min-h-[44px] items-center gap-1.5 px-4 text-xs font-semibold text-ink transition active:scale-95"
              >
                <Sparkles size={13} className="text-accent" />
                <span>Explore Sydney Events &amp; Passes</span>
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((ev) => {
            const tz = timeZoneForCity(ev.city);
            const dateObj = new Date(ev.startsAt);
            const validDate = !Number.isNaN(dateObj.getTime());
            const month = validDate ? MONTH_NAMES[dateObj.getMonth()] : "EVENT";
            const dayNum = validDate ? String(dateObj.getDate()) : "·";
            const weekday = validDate ? dateObj.toLocaleDateString("en-AU", { weekday: "short", timeZone: tz }) : "";
            const timeLabel = formatEventTimeRange(ev.startsAt, ev.endsAt, tz);

            const priceText =
              ev.ticketPriceCents && ev.ticketPriceCents > 0
                ? `$${(ev.ticketPriceCents / 100).toFixed(2)}`
                : ev.ticketTiers && ev.ticketTiers.length > 0 && ev.ticketTiers.some((t) => t.priceCents > 0)
                  ? `From $${(Math.min(...ev.ticketTiers.filter((t) => t.priceCents > 0).map((t) => t.priceCents)) / 100).toFixed(2)}`
                  : "Free Entry";

            const calendarPayload = {
              id: ev.id,
              title: ev.name,
              description: ev.description || ev.shortWhy || `Event hosted at ${ev.venue || bio.name}`,
              startsAt: ev.startsAt,
              endsAt: ev.endsAt || ev.startsAt,
              venue: ev.venue || bio.name,
              city: ev.city || bio.city || "Sydney",
              room: ev.room,
              address: ev.address,
            };

            return (
              <article
                key={ev.id}
                className="neu-row group flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 sm:p-5 transition-[box-shadow,ring-color,transform] duration-200 hover:ring-brand/40"
              >
                <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                  {/* Apple Calendar Square Badge */}
                  <div className="flex flex-col items-center justify-between h-14 w-14 sm:h-16 sm:w-16 shrink-0 overflow-hidden rounded-2xl bg-paper ring-1 ring-line select-none shadow-2xs">
                    <div className="w-full bg-rose-600/90 dark:bg-rose-500 py-0.5 text-center text-[10px] sm:text-[11px] font-black tracking-wider text-white uppercase">
                      {month}
                    </div>
                    <div className="flex-1 flex flex-col items-center justify-center">
                      <span className="font-display text-lg sm:text-xl font-black text-ink leading-none tabular-data">
                        {dayNum}
                      </span>
                      {weekday && <span className="text-[9px] font-bold text-mute uppercase">{weekday}</span>}
                    </div>
                  </div>

                  {/* Thumbnail / Hero Photo if present */}
                  {ev.coverImage && (
                    <div className="hidden md:block h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-paper ring-1 ring-line">
                      <Photo src={ev.coverImage} className="h-full w-full object-cover" />
                    </div>
                  )}

                  {/* Event Details */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                      <span className="neu-chip px-2 py-0.5 text-[10px] font-bold text-ink">{priceText}</span>
                      {ev.status === "draft" && (
                        <span className="rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 px-2 py-0.5 text-[10px] font-bold">
                          Draft
                        </span>
                      )}
                      {ev.room && (
                        <span className="rounded-full bg-paper px-2 py-0.5 text-[10px] font-semibold text-mute">
                          {ev.room}
                        </span>
                      )}
                      {Boolean(ev.capacity) && (
                        <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-medium text-mute">
                          <Users size={11} />
                          {ev.capacity} spots
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        void triggerHaptic("light");
                        onNavigate(`/e/${ev.id}`);
                      }}
                      className="text-left font-display text-sm sm:text-base font-bold text-ink hover:text-brand transition-colors truncate block w-full cursor-pointer"
                    >
                      {ev.name}
                    </button>

                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-mute">
                      {timeLabel && (
                        <span className="inline-flex items-center gap-1 text-ink font-medium">
                          <Clock size={12} className="text-accent shrink-0" aria-hidden="true" />
                          <span>{timeLabel}</span>
                        </span>
                      )}
                      {(ev.venue || ev.city) && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin size={11} className="text-mute shrink-0" aria-hidden="true" />
                          <span className="truncate">{ev.venue || ev.city}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions: Sync to Calendar + View/Get Pass */}
                <div className="flex items-center justify-end gap-2 shrink-0 border-t border-line/40 pt-2.5 sm:border-0 sm:pt-0">
                  <AddToCalendarMenu
                    event={calendarPayload}
                    size="sm"
                    variant="ghost"
                    label="Sync"
                    buttonClassName="min-h-[44px] px-3.5 text-xs font-semibold rounded-full border border-line"
                  />
                  <Button
                    size="sm"
                    className="gap-1.5 rounded-full bg-brand px-4 min-h-[44px] text-xs font-bold text-white shadow-xs hover:bg-brand-ink active:scale-95 cursor-pointer touch-manipulation"
                    onClick={() => {
                      void triggerHaptic("light");
                      onNavigate(`/e/${ev.id}`);
                    }}
                  >
                    <span>Get Pass</span>
                    <ChevronRight size={14} className="shrink-0" />
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
