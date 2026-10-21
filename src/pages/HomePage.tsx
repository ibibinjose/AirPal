import { useState, useMemo, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { collection, getDocs, query, where } from "firebase/firestore";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Compass,
  Gift,
  MapPin,
  Plus,
  QrCode,
  Sparkles,
  Ticket,
  Users,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEvents } from "@/contexts/EventsContext";
import { useLocalNow } from "@/contexts/LocalNowContext";
import { getFirebaseDb } from "@/lib/firebase";
import { Photo } from "@/components/ui/Photo";
import { mediaSrcSet } from "@/lib/media-srcset";
import { EventLiveAttendeePreview } from "@/components/event/EventLiveAttendeePreview";
import { CategoryFilters, type CategoryType } from "@/components/airpal/CategoryFilters";
import { type Promotion } from "@shared/promotions";

export function HomePage() {
  const { user } = useAuth();
  const { calendarEvents } = useEvents();
  const { city } = useLocalNow();
  const [, nav] = useLocation();

  const [category, setCategory] = useState<CategoryType>("All");
  const [promotions, setPromotions] = useState<Promotion[]>([]);

  const firstName = useMemo(() => {
    const n = user?.displayName?.trim().split(/\s+/)[0];
    return n || null;
  }, [user]);

  // Load live verified promotions from Firestore
  useEffect(() => {
    const db = getFirebaseDb();
    if (!db) return;
    let cancelled = false;
    void getDocs(query(collection(db, "promotions"), where("status", "in", ["live", "approved"])))
      .then((snap) => {
        if (!cancelled) {
          const list = snap.docs
            .map((d) => ({ id: d.id, ...(d.data() as Omit<Promotion, "id">) }))
            .filter((d) => d.kind === "promotion" || d.kind === "giveaway");
          setPromotions(list);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  // Filter live events by selected category
  const filteredEvents = useMemo(() => {
    if (category === "All" || category === "Events") return calendarEvents;
    const catLower = category.toLowerCase();
    return calendarEvents.filter((e) => {
      const matchTag = e.tags?.some((t) => t.toLowerCase().includes(catLower));
      const matchTitle = e.title.toLowerCase().includes(catLower);
      const matchVenue = e.venue.toLowerCase().includes(catLower);
      return matchTag || matchTitle || matchVenue;
    });
  }, [calendarEvents, category]);

  const upcomingEvents = useMemo(() => {
    return calendarEvents.slice(0, 3);
  }, [calendarEvents]);

  return (
    <div className="mx-auto max-w-7xl px-4 pb-[calc(env(safe-area-inset-bottom,0px)+6.5rem)] pt-3 sm:px-6 sm:pt-6">
      {/* Editorial Page Greeting */}
      <div className="mb-6">
        <div className="human-eyebrow">Life made easy</div>
        <h1 className="human-title mt-2 text-2xl sm:text-3xl">
          {firstName ? `Hey ${firstName}, good to see you ` : "Hey, good to see you "}
          <Sparkles size={22} className="inline text-accent" aria-hidden="true" />
        </h1>
        <p className="human-lede text-sm sm:text-base">
          A whole city of possibilities. Real places, real people, one day at a time.
        </p>
      </div>

      {/* Hero Banner — Editorial Luma Craft */}
      <section className="relative overflow-hidden rounded-3xl bg-[#121614] text-white shadow-md">
        <div className="absolute inset-0" aria-hidden="true">
          <img
            src="/media/harbour.jpg"
            alt=""
            loading="eager"
            decoding="async"
            className="h-full w-full object-cover object-center opacity-70"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/60 to-black/30" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 px-5 py-8 sm:px-10 sm:py-14 max-w-2xl">
          <div className="flex items-center gap-2 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-white/90">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>A LITTLE SPONTANEITY LOOKS GOOD ON YOU</span>
          </div>

          <h2 className="mt-3 font-display text-3xl sm:text-5xl font-extrabold leading-[1.08] tracking-tight text-white text-balance">
            Less scrolling. <br />
            More <span className="font-serif italic font-normal text-amber-300">living.</span>
          </h2>

          <p className="mt-3 max-w-lg text-sm sm:text-base text-white/85 leading-relaxed">
            Find your kind of places and people. Everyone is welcome here.
          </p>

          <div className="mt-6 flex flex-col items-stretch gap-2.5 min-[380px]:flex-row min-[380px]:items-center sm:flex-wrap sm:gap-3">
            <Link
              href="/events"
              className="inline-flex min-h-[48px] flex-1 sm:flex-initial items-center justify-center gap-2 whitespace-nowrap rounded-full bg-brand px-5 sm:px-6 text-xs sm:text-sm font-semibold text-white shadow-sm transition hover:bg-brand-ink active:scale-95 cursor-pointer touch-manipulation"
            >
              <span>What's on</span>
              <ArrowUpRight size={16} className="shrink-0" />
            </Link>

            <Link
              href="/circle"
              className="inline-flex min-h-[48px] flex-1 sm:flex-initial items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-white/15 px-5 text-xs sm:text-sm font-semibold text-white ring-1 ring-white/30 backdrop-blur-md hover:bg-white/25 transition active:scale-95 cursor-pointer touch-manipulation"
            >
              <Users size={16} className="shrink-0" />
              <span>Find your circle</span>
            </Link>
          </div>
        </div>

        {/* Location Tag */}
        <div className="absolute bottom-4 right-5 hidden sm:flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1 text-[10px] font-bold tracking-widest uppercase text-white/80 backdrop-blur-md">
          <MapPin size={11} className="text-amber-300" aria-hidden="true" />
          <span>{city || "Sydney"} &amp; A Little Beyond</span>
        </div>
      </section>

      {/* Category Pills Bar */}
      <div className="mt-6">
        <CategoryFilters value={category} onChange={setCategory} />
      </div>

      {/* Main Stream */}
      <div className="mt-8">
        <div className="flex flex-col gap-10">
          {/* Section: Live Events from Backend */}
          <section aria-labelledby="what-now-heading">
            <div>
              <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-2">
                  <Sparkles size={18} className="text-accent" aria-hidden="true" />
                  <h2 id="what-now-heading" className="human-section-title min-w-0 text-xl">
                    What's on now
                  </h2>
                </div>

                {filteredEvents.length > 0 && (
                  <Link
                    href="/events"
                    className="inline-flex min-h-[44px] shrink-0 items-center gap-1 text-xs font-semibold text-accent hover:underline cursor-pointer touch-manipulation sm:text-sm"
                  >
                    <span>See all</span>
                    <ArrowRight size={14} />
                  </Link>
                )}
              </div>
              <p className="mt-0.5 text-sm text-mute">
                Live experiences, concerts, and gatherings from verified organisers.
              </p>
            </div>

            {filteredEvents.length > 0 ? (
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
                {filteredEvents.slice(0, 6).map((event) => {
                  const eventImg = event.heroImage || "/media/live-music.jpg";
                  const priceLabel =
                    event.ticketPrice ||
                    (event.ticketPriceCents ? `$${Math.round(event.ticketPriceCents / 100)}` : "Free Pass");
                  return (
                    <article
                      key={event.id}
                      onClick={() => nav(`/e/${event.id}`)}
                      className="group relative flex flex-col justify-between overflow-hidden rounded-[28px] bg-card ring-1 ring-line/80 shadow-clay transition-[box-shadow,border-color] duration-200 hover:ring-brand/40 hover:shadow-clay-hover active:scale-[0.99] cursor-pointer"
                    >
                      <div>
                        <div className="relative aspect-[16/10] w-full overflow-hidden bg-paper">
                          <Photo
                            src={eventImg}
                            srcSet={mediaSrcSet(eventImg)}
                            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                            className="h-full w-full object-cover transition-opacity duration-200 group-hover:opacity-95"
                            alt={event.title}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-60" />

                          <div className="absolute left-3 top-3">
                            <span className="inline-flex items-center gap-1 rounded-full bg-neutral-950/80 px-2.5 py-1 text-xs font-bold text-white backdrop-blur-md ring-1 ring-white/20">
                              <CalendarDays size={12} className="text-amber-400" aria-hidden="true" />
                              {event.date} {event.timeLabel ? `· ${event.timeLabel}` : ""}
                            </span>
                          </div>

                          <div className="absolute right-3 top-3">
                            <span className="inline-flex items-center rounded-full bg-amber-500 px-2.5 py-1 text-xs font-extrabold text-neutral-950 shadow-xs">
                              {priceLabel}
                            </span>
                          </div>
                        </div>

                        <div className="p-4 pb-2">
                          <h3 className="font-display text-base font-bold text-ink leading-snug group-hover:text-accent transition-colors line-clamp-1">
                            {event.title}
                          </h3>
                          <p className="mt-1 flex items-center gap-1.5 text-sm text-mute line-clamp-1">
                            <MapPin size={13} className="shrink-0 text-accent/80" aria-hidden="true" />
                            <span>{event.venue}</span>
                          </p>
                        </div>
                      </div>

                      <div className="p-4 pt-1">
                        <EventLiveAttendeePreview
                          eventId={event.id}
                          guestCount={event.guestCounts?.goingHeads}
                          capacity={event.capacity}
                          isGoing={event.isGoing}
                          variant="compact"
                          gatePath={`/e/${event.id}`}
                        />
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              /* Out-of-the-Box Fresh Ecosystem Experience */
              <div className="mt-4 rounded-3xl bg-card p-6 sm:p-8 ring-1 ring-line shadow-clay">
                <div className="max-w-2xl">
                  <div className="inline-flex items-center gap-2 rounded-full bg-brand/10 px-3 py-1 text-xs font-bold text-accent ring-1 ring-brand/20">
                    <Sparkles size={13} />
                    <span>AirPal Ecosystem · Live Server Architecture</span>
                  </div>
                  <h3 className="mt-3 font-display text-xl sm:text-2xl font-bold text-ink">
                    Everything you need to live well in {city || "Sydney"}.
                  </h3>
                  <p className="mt-1 text-sm text-mute leading-relaxed">
                    Zero fake accounts, zero artificial filler. Discover real events, check in with friends, explore
                    authentic precinct venues, and claim member perks.
                  </p>
                </div>

                {/* 5 Core Pillars Grid */}
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  <Link
                    href="/events"
                    className="flex flex-col justify-between rounded-2xl bg-paper p-4 ring-1 ring-line/80 hover:bg-card hover:ring-brand/40 transition active:scale-[0.98] cursor-pointer"
                  >
                    <div>
                      <div className="grid h-9 w-9 place-items-center rounded-xl bg-amber-500/15 text-amber-800 dark:text-amber-300 mb-2.5">
                        <Ticket size={18} />
                      </div>
                      <h4 className="font-display text-sm font-bold text-ink">1. Events &amp; Passes</h4>
                      <p className="mt-1 text-xs text-mute leading-relaxed">
                        Concerts, festivals, Apple &amp; Google Wallet passes, and door scanning.
                      </p>
                    </div>
                    <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-accent">
                      Explore events <ArrowRight size={13} />
                    </span>
                  </Link>

                  <Link
                    href="/circle"
                    className="flex flex-col justify-between rounded-2xl bg-paper p-4 ring-1 ring-line/80 hover:bg-card hover:ring-brand/40 transition active:scale-[0.98] cursor-pointer"
                  >
                    <div>
                      <div className="grid h-9 w-9 place-items-center rounded-xl bg-blue-500/15 text-blue-700 dark:text-blue-300 mb-2.5">
                        <Users size={18} />
                      </div>
                      <h4 className="font-display text-sm font-bold text-ink">2. Networking Circle</h4>
                      <p className="mt-1 text-xs text-mute leading-relaxed">
                        Live venue check-in, mutual contacts, and verified friends.
                      </p>
                    </div>
                    <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-accent">
                      Open circle <ArrowRight size={13} />
                    </span>
                  </Link>

                  <Link
                    href="/places"
                    className="flex flex-col justify-between rounded-2xl bg-paper p-4 ring-1 ring-line/80 hover:bg-card hover:ring-brand/40 transition active:scale-[0.98] cursor-pointer"
                  >
                    <div>
                      <div className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 mb-2.5">
                        <Compass size={18} />
                      </div>
                      <h4 className="font-display text-sm font-bold text-ink">3. Precinct Places</h4>
                      <p className="mt-1 text-xs text-mute leading-relaxed">
                        Curated rooftop bars, coffee roasters, and neighbourhood spots.
                      </p>
                    </div>
                    <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-accent">
                      Browse places <ArrowRight size={13} />
                    </span>
                  </Link>

                  <Link
                    href="/deals"
                    className="flex flex-col justify-between rounded-2xl bg-paper p-4 ring-1 ring-line/80 hover:bg-card hover:ring-brand/40 transition active:scale-[0.98] cursor-pointer"
                  >
                    <div>
                      <div className="grid h-9 w-9 place-items-center rounded-xl bg-rose-500/15 text-rose-700 dark:text-rose-400 mb-2.5">
                        <Gift size={18} />
                      </div>
                      <h4 className="font-display text-sm font-bold text-ink">4. Deals &amp; Business</h4>
                      <p className="mt-1 text-xs text-mute leading-relaxed">
                        Member dining perks and unified self-service merchant studio.
                      </p>
                    </div>
                    <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-accent">
                      View deals <ArrowRight size={13} />
                    </span>
                  </Link>

                  <Link
                    href={user ? "/bio/edit" : "/bio/setup"}
                    className="flex flex-col justify-between rounded-2xl bg-paper p-4 ring-1 ring-line/80 hover:bg-card hover:ring-brand/40 transition active:scale-[0.98] cursor-pointer"
                  >
                    <div>
                      <div className="grid h-9 w-9 place-items-center rounded-xl bg-rose-500/15 text-rose-700 dark:text-rose-300 mb-2.5">
                        <QrCode size={18} />
                      </div>
                      <h4 className="font-display text-sm font-bold text-ink">5. Digital Bio &amp; Pass</h4>
                      <p className="mt-1 text-xs text-mute leading-relaxed">
                        Claim your unique @handle, share a vCard 3.0 contact, and save your QR profile to Wallet.
                      </p>
                    </div>
                    <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-accent">
                      {user ? "Edit bio" : "Claim @handle"} <ArrowRight size={13} />
                    </span>
                  </Link>

                  <Link
                    href="/event"
                    className="flex flex-col justify-between rounded-2xl bg-paper p-4 ring-1 ring-line/80 hover:bg-card hover:ring-brand/40 transition active:scale-[0.98] cursor-pointer"
                  >
                    <div>
                      <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand/15 text-accent mb-2.5">
                        <Plus size={18} />
                      </div>
                      <h4 className="font-display text-sm font-bold text-ink">Host on AirPal</h4>
                      <p className="mt-1 text-xs text-mute leading-relaxed">
                        Create an event in 60 seconds with Stripe payouts &amp; QR check-in.
                      </p>
                    </div>
                    <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-accent">
                      Create event <ArrowRight size={13} />
                    </span>
                  </Link>
                </div>
              </div>
            )}
          </section>

          {/* Banner: Member Deals & Perks */}
          <div className="human-card flex flex-wrap items-center justify-between gap-4 p-5">
            <div className="flex items-center gap-3.5">
              <div
                className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-human-blush text-human-clay"
                aria-hidden="true"
              >
                <Sparkles size={22} />
              </div>
              <div>
                <h3 className="human-section-title text-sm">A little perk goes a long way.</h3>
                <p className="text-sm text-mute mt-0.5">
                  {promotions.length > 0
                    ? `${promotions.length} active member deals & dining perks in ${city || "Sydney"}.`
                    : "Local dining perks and friendly member offers near you."}
                </p>
              </div>
            </div>

            <Link
              href="/deals"
              className="inline-flex min-h-[44px] w-full sm:w-auto items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-paper px-5 text-xs sm:text-sm font-semibold text-ink ring-1 ring-line shadow-xs hover:bg-card hover:shadow-clay-hover transition active:scale-95 cursor-pointer touch-manipulation"
            >
              <span>Explore perks</span>
              <ArrowRight size={14} className="shrink-0" />
            </Link>
          </div>

          {/* Section: Good things on the horizon */}
          <section aria-labelledby="horizon-heading">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 id="horizon-heading" className="human-section-title text-xl">
                  Good things on the horizon
                </h2>
                <p className="mt-0.5 text-sm text-mute">Make a little space for something memorable.</p>
              </div>

              <Link
                href="/events"
                className="inline-flex min-h-[44px] items-center gap-1 text-xs sm:text-sm font-semibold text-accent hover:underline cursor-pointer touch-manipulation"
              >
                <span>All events</span>
                <ArrowRight size={14} />
              </Link>
            </div>

            {upcomingEvents.length > 0 ? (
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
                {upcomingEvents.map((event) => {
                  const eventImg = event.heroImage || "/media/live-music.jpg";
                  const priceLabel =
                    event.ticketPrice ||
                    (event.ticketPriceCents ? `$${Math.round(event.ticketPriceCents / 100)}` : "Free Pass");
                  return (
                    <article
                      key={event.id}
                      onClick={() => nav(`/e/${event.id}`)}
                      className="group relative flex flex-col justify-between overflow-hidden rounded-[28px] bg-card ring-1 ring-line/80 shadow-clay transition-[box-shadow,border-color] duration-200 hover:ring-brand/40 hover:shadow-clay-hover active:scale-[0.99] cursor-pointer"
                    >
                      <div>
                        <div className="relative aspect-[16/10] w-full overflow-hidden bg-paper">
                          <Photo
                            src={eventImg}
                            srcSet={mediaSrcSet(eventImg)}
                            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                            className="h-full w-full object-cover transition-opacity duration-200 group-hover:opacity-95"
                            alt={event.title}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-60" />

                          <div className="absolute left-3 top-3">
                            <span className="inline-flex items-center gap-1 rounded-full bg-neutral-950/80 px-2.5 py-1 text-xs font-bold text-white backdrop-blur-md ring-1 ring-white/20">
                              <CalendarDays size={12} className="text-amber-400" aria-hidden="true" />
                              {event.date}
                            </span>
                          </div>

                          <div className="absolute right-3 top-3">
                            <span className="inline-flex items-center rounded-full bg-amber-500 px-2.5 py-1 text-xs font-extrabold text-neutral-950 shadow-xs">
                              {priceLabel}
                            </span>
                          </div>
                        </div>

                        <div className="p-4 pb-2">
                          <h3 className="font-display text-base font-bold text-ink leading-snug group-hover:text-accent transition-colors line-clamp-1">
                            {event.title}
                          </h3>
                          <p className="mt-1 flex items-center gap-1.5 text-sm text-mute line-clamp-1">
                            <MapPin size={13} className="shrink-0 text-accent/80" aria-hidden="true" />
                            <span>{event.venue}</span>
                          </p>
                        </div>
                      </div>

                      <div className="p-4 pt-1">
                        <EventLiveAttendeePreview
                          eventId={event.id}
                          guestCount={event.guestCounts?.goingHeads}
                          capacity={event.capacity}
                          isGoing={event.isGoing}
                          variant="compact"
                          gatePath={`/e/${event.id}`}
                        />
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-3xl bg-card p-6 ring-1 ring-line shadow-clay">
                <div>
                  <h3 className="font-display text-base font-bold text-ink">Bring your community together</h3>
                  <p className="mt-0.5 text-xs text-mute max-w-md">
                    Host a concert, cultural celebration, or weekend meetup. Sell tickets or take free RSVPs with zero
                    fuss.
                  </p>
                </div>
                <Link
                  href="/event"
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-brand px-5 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-brand/90 transition active:scale-95 shrink-0"
                >
                  <Plus size={15} />
                  <span>Create an Event</span>
                </Link>
              </div>
            )}
          </section>

          {/* Page sign-off */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6 text-sm text-mute">
            <span>Made for every human, every day.</span>
            <span>airpal.me</span>
          </div>
        </div>
      </div>
    </div>
  );
}
