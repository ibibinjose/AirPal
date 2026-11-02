import { useState, useMemo, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { collection, getDocs, query, where } from "firebase/firestore";
import {
  ArrowRight,
  ArrowUpRight,
  AtSign,
  CalendarDays,
  Camera,
  Check,
  Compass,
  Gift,
  MapPin,
  Plus,
  QrCode,
  ScanLine,
  Shirt,
  Sparkles,
  Ticket,
  Users,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useBio } from "@/contexts/BioContext";
import { useEvents } from "@/contexts/EventsContext";
import { useListings } from "@/contexts/ListingsContext";
import { useLocalNow, useOptionalLocalNow } from "@/contexts/LocalNowContext";
import { useSocial } from "@/contexts/SocialContext";
import { useMyBookings } from "@/hooks/useMyBookings";
import { getFirebaseDb } from "@/lib/firebase";
import { Photo } from "@/components/ui/Photo";
import { FALLBACK_EVENT_IMAGE, mediaSrcSet } from "@/lib/media-srcset";
import { EventLiveAttendeePreview } from "@/components/event/EventLiveAttendeePreview";
import { CategoryFilters, type CategoryType } from "@/components/airpal/CategoryFilters";
import { HereCheckIn } from "@/components/circle/HereCheckIn";
import { PlaceCard } from "@/components/discovery/PlaceCard";
import { activePlaces, placesForLocation, placesWithDeals } from "@/lib/catalog";
import { recordToCalendarBase, cityMatches } from "@/lib/remote-events";
import { haversineMeters } from "@/lib/geo";
import { getDailyOutfitRecommendation } from "@/lib/outfit";
import { promoArtFor } from "@/lib/promotions";
import { triggerHaptic } from "@/lib/native";
import { cn } from "@/lib/cn";
import { formatWalk, sortNearbyPlaces } from "@shared/nearby";
import { bioPath } from "@shared/bio";
import type { CalendarEvent } from "@shared/event";
import { type Promotion } from "@shared/promotions";

function matchesHomeCategory(event: CalendarEvent, category: CategoryType): boolean {
  if (category === "All" || category === "Events") return true;
  const hay = [event.title, event.venue, event.category || "", event.description || "", ...(event.tags || [])]
    .join(" ")
    .toLowerCase();

  switch (category) {
    case "Dining & Cafes":
      return (
        hay.includes("dining") ||
        hay.includes("food") ||
        hay.includes("cafe") ||
        hay.includes("coffee") ||
        hay.includes("brunch") ||
        hay.includes("dinner") ||
        hay.includes("tasting") ||
        hay.includes("bar") ||
        hay.includes("eat") ||
        hay.includes("feast")
      );
    case "Outdoors & Walks":
      return (
        hay.includes("outdoor") ||
        hay.includes("walk") ||
        hay.includes("harbour") ||
        hay.includes("park") ||
        hay.includes("market") ||
        hay.includes("run") ||
        hay.includes("tour") ||
        hay.includes("beach") ||
        hay.includes("sunset")
      );
    case "Arts & Culture":
      return (
        hay.includes("cultural") ||
        hay.includes("art") ||
        hay.includes("music") ||
        hay.includes("concert") ||
        hay.includes("festival") ||
        hay.includes("diwali") ||
        hay.includes("dandiya") ||
        hay.includes("holi") ||
        hay.includes("theatre") ||
        hay.includes("gallery") ||
        hay.includes("live") ||
        hay.includes("heritage")
      );
    case "Wellness":
      return (
        hay.includes("wellness") ||
        hay.includes("yoga") ||
        hay.includes("fitness") ||
        hay.includes("mindful") ||
        hay.includes("meditat") ||
        hay.includes("breath") ||
        hay.includes("run") ||
        hay.includes("health")
      );
    case "Local Perks":
      return (
        hay.includes("free") ||
        hay.includes("perk") ||
        hay.includes("deal") ||
        hay.includes("member") ||
        hay.includes("special") ||
        hay.includes("vip") ||
        !event.ticketPriceCents
      );
    default:
      return true;
  }
}

export function HomePage() {
  const { user } = useAuth();
  const { mine } = useBio();
  const { calendarEvents, events, userStates } = useEvents();
  const { version: listingsVersion } = useListings();
  const { city, today, weather } = useLocalNow();
  const local = useOptionalLocalNow();
  const origin = local && local.usingGps ? local.here : undefined;
  const { followedHandles, toggleFollow } = useSocial();
  const { upcomingBookings } = useMyBookings();
  const [, nav] = useLocation();

  const effectiveCity = city && city !== "Choose a city" && city !== "Current location" ? city : "Sydney";

  const [category, setCategory] = useState<CategoryType>("All");
  const [promotions, setPromotions] = useState<Promotion[]>([]);

  const firstName = useMemo(() => {
    const n = (user?.displayName || mine?.name)?.trim().split(/\s+/)[0];
    return n || null;
  }, [user?.displayName, mine?.name]);

  const outfitAdvice = useMemo(() => {
    if (!weather) return null;
    return getDailyOutfitRecommendation(weather.temp, weather.code, weather.isDay);
  }, [weather]);

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

  // Unified live events stream: merges calendarEvents + live remote events, sorted chronologically
  const allLiveEvents = useMemo(() => {
    const seen = new Set<string>();
    const merged: CalendarEvent[] = [];

    const push = (e: CalendarEvent) => {
      if (seen.has(e.id)) return;
      seen.add(e.id);
      merged.push(e);
    };

    for (const e of calendarEvents) {
      push(e);
    }

    for (const r of events) {
      if (r.status !== "live") continue;
      const base = recordToCalendarBase(r);
      const st = userStates[r.id];
      push({
        ...base,
        isGoing: st?.status === "going",
        isInterested: st?.status === "interested",
        isLiked: st?.liked === true,
      });
    }

    const upcomingInCity = merged.filter((e) => e.date >= today && cityMatches(e.city, effectiveCity));
    const pool = upcomingInCity.length > 0 ? upcomingInCity : merged.filter((e) => e.date >= today);
    const activePool = pool.length > 0 ? pool : merged;

    return [...activePool].sort((a, b) => a.date.localeCompare(b.date));
  }, [calendarEvents, events, userStates, today, effectiveCity]);

  const goingCount = useMemo(() => allLiveEvents.filter((e) => e.isGoing).length, [allLiveEvents]);

  // Filter live events by selected category + attach GPS walk times when available
  const filteredEvents = useMemo(() => {
    return allLiveEvents
      .filter((e) => matchesHomeCategory(e, category))
      .map((e) => {
        const meters =
          origin && e.geo && Number.isFinite(e.geo.lat) && Number.isFinite(e.geo.lng)
            ? haversineMeters(origin, e.geo)
            : undefined;
        return {
          ...e,
          walk: meters != null ? formatWalk(meters).walkTime : undefined,
        };
      });
  }, [allLiveEvents, category, origin]);

  // Horizon events: distinct from the top 6 "What's on now" cards whenever more events exist
  const horizonEvents = useMemo(() => {
    if (allLiveEvents.length > 6) {
      return allLiveEvents.slice(6, 9);
    }
    if (category !== "All" && category !== "Events") {
      const topIds = new Set(filteredEvents.slice(0, 6).map((e) => e.id));
      const rest = allLiveEvents.filter((e) => !topIds.has(e.id)).slice(0, 3);
      if (rest.length > 0) return rest;
    }
    return allLiveEvents.slice(0, 3);
  }, [allLiveEvents, category, filteredEvents]);

  // Curated Precinct Places (reactive when Firestore places/listings load)
  const featuredPlaces = useMemo(() => {
    void listingsVersion;
    const all = activePlaces();
    const scoped = local ? placesForLocation(all, local.here, effectiveCity, local.usingGps) : all;
    const pool = scoped.length > 0 ? scoped : all;
    const byCategory =
      category === "Dining & Cafes"
        ? pool.filter((p) => p.category === "eat" || p.category === "coffee")
        : category === "Local Perks"
          ? placesWithDeals(pool)
          : pool;
    const ranked = sortNearbyPlaces(byCategory.length > 0 ? byCategory : pool, origin);
    return ranked.slice(0, 3);
  }, [listingsVersion, local, effectiveCity, category, origin]);

  // Active organiser communities derived from upcoming events
  const activeCommunities = useMemo(() => {
    const byKey = new Map<
      string,
      { key: string; name: string; handle: string; eventCount: number; nextEventId: string; nextTitle: string }
    >();
    for (const e of allLiveEvents) {
      const handle = (e.businessHandle || e.hostHandle || "").trim().replace(/^@+/, "").toLowerCase();
      const name = (e.businessName || e.hostName || "").trim() || (handle ? `@${handle}` : "");
      if (!name) continue;
      const key = handle || `name:${name.toLowerCase()}`;
      const existing = byKey.get(key);
      if (existing) {
        existing.eventCount += 1;
      } else {
        byKey.set(key, {
          key,
          name,
          handle,
          eventCount: 1,
          nextEventId: e.id,
          nextTitle: e.title,
        });
      }
    }
    return Array.from(byKey.values())
      .sort((a, b) => b.eventCount - a.eventCount)
      .slice(0, 3);
  }, [allLiveEvents]);

  const nextPass = upcomingBookings[0] || null;

  return (
    <div className="mx-auto max-w-7xl px-4 pb-[calc(env(safe-area-inset-bottom,0px)+6.5rem)] pt-3 sm:px-6 sm:pt-6">
      {/* Editorial Page Greeting & Live Context */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="human-eyebrow">Life made easy</div>
          <h1 className="human-title mt-2 text-2xl sm:text-3xl">
            {firstName ? `Hey ${firstName}, good to see you ` : "Hey, good to see you "}
            <Sparkles size={22} className="inline text-accent" aria-hidden="true" />
          </h1>
          <p className="human-lede text-sm sm:text-base">
            A whole city of possibilities. Real places, real people, one day at a time.
          </p>
        </div>

        {/* Deterministic Weather & Outfit Pill */}
        {weather && outfitAdvice && (
          <div className="inline-flex items-center gap-2.5 self-start sm:self-auto rounded-2xl bg-card px-3.5 py-2 text-xs ring-1 ring-line/80 shadow-2xs">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-brand/10 text-accent">
              <Shirt size={15} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="font-display font-bold text-ink truncate">
                {weather.temp}°C in {effectiveCity} · {outfitAdvice.vibe}
              </p>
              <p className="text-[11px] text-mute truncate max-w-[260px]">{outfitAdvice.outfit}</p>
            </div>
          </div>
        )}
      </div>

      {/* Hero Banner — Editorial Luma Craft */}
      <section className="relative overflow-hidden rounded-3xl bg-[#121614] text-white shadow-md">
        <div className="absolute inset-0" aria-hidden="true">
          <img
            src="/media/harbour.jpg"
            srcSet={mediaSrcSet("/media/harbour.jpg")}
            sizes="100vw"
            alt=""
            loading="eager"
            decoding="async"
            fetchPriority="high"
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
          <span>{effectiveCity} &amp; A Little Beyond</span>
        </div>
      </section>

      {/* Quick Utility & Companion Action Strip */}
      <section aria-label="Quick Companion Actions" className="mt-4">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 -mx-4 px-4 sm:mx-0 sm:px-0">
          <Link
            href="/pass"
            onClick={() => void triggerHaptic("light")}
            className="neu-btn inline-flex min-h-[44px] shrink-0 items-center gap-1.5 px-3.5 text-xs font-bold text-ink transition active:scale-95 whitespace-nowrap"
          >
            <Ticket size={14} className="text-amber-500 shrink-0" aria-hidden="true" />
            <span>AirPal Pass</span>
          </Link>

          <Link
            href="/me/tickets"
            onClick={() => void triggerHaptic("light")}
            className="neu-btn inline-flex min-h-[44px] shrink-0 items-center gap-1.5 px-3.5 text-xs font-bold text-ink transition active:scale-95 whitespace-nowrap"
          >
            <QrCode size={14} className="text-accent shrink-0" aria-hidden="true" />
            <span>My Wallet</span>
            {upcomingBookings.length > 0 && (
              <span className="rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-extrabold text-white tabular-nums">
                {upcomingBookings.length}
              </span>
            )}
          </Link>

          <Link
            href="/calendar"
            onClick={() => void triggerHaptic("light")}
            className="neu-btn inline-flex min-h-[44px] shrink-0 items-center gap-1.5 px-3.5 text-xs font-bold text-ink transition active:scale-95 whitespace-nowrap"
          >
            <CalendarDays size={14} className="text-emerald-600 shrink-0" aria-hidden="true" />
            <span>My Schedule</span>
            {goingCount > 0 && (
              <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-extrabold text-emerald-700 dark:text-emerald-300 tabular-nums">
                {goingCount}
              </span>
            )}
          </Link>

          <Link
            href={mine?.handle ? bioPath(mine.handle) : "/bio/setup"}
            onClick={() => void triggerHaptic("light")}
            className="neu-btn inline-flex min-h-[44px] shrink-0 items-center gap-1.5 px-3.5 text-xs font-bold text-ink transition active:scale-95 whitespace-nowrap"
          >
            <AtSign size={14} className="text-accent shrink-0" aria-hidden="true" />
            <span>{mine?.handle ? `@${mine.handle}` : "Claim @handle"}</span>
          </Link>

          <Link
            href="/scan"
            onClick={() => void triggerHaptic("light")}
            className="neu-btn inline-flex min-h-[44px] shrink-0 items-center gap-1.5 px-3.5 text-xs font-bold text-ink transition active:scale-95 whitespace-nowrap"
          >
            <ScanLine size={14} className="text-accent shrink-0" aria-hidden="true" />
            <span>Scan QR</span>
          </Link>

          <Link
            href="/me/memories"
            onClick={() => void triggerHaptic("light")}
            className="neu-btn inline-flex min-h-[44px] shrink-0 items-center gap-1.5 px-3.5 text-xs font-bold text-ink transition active:scale-95 whitespace-nowrap"
          >
            <Camera size={14} className="text-rose-500 shrink-0" aria-hidden="true" />
            <span>Memory Wall</span>
          </Link>
        </div>
      </section>

      {/* Signed-In Live Presence & Active Ticket Cockpit */}
      {(user || nextPass) && (
        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
          {user && <HereCheckIn placeName={effectiveCity} />}
          {nextPass && (
            <div className="flex items-center justify-between gap-3 rounded-[20px] bg-amber-500/10 px-4 py-3.5 ring-1 ring-amber-500/30">
              <div className="flex items-center gap-3 min-w-0">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-amber-500 text-neutral-950 shadow-2xs">
                  <Ticket size={18} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                    Next Upcoming Pass
                  </p>
                  <p className="font-display text-sm font-bold text-ink truncate">{nextPass.title}</p>
                  <p className="text-xs text-mute truncate">
                    {[nextPass.date, nextPass.time, nextPass.suburb].filter(Boolean).join(" · ")}
                  </p>
                </div>
              </div>
              <Link
                href={`/ticket/${nextPass.id}`}
                className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-full bg-brand px-4 text-xs font-bold text-white shadow-2xs hover:bg-brand-ink transition active:scale-95 whitespace-nowrap"
              >
                <QrCode size={13} aria-hidden="true" />
                <span>Open QR</span>
              </Link>
            </div>
          )}
        </div>
      )}

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
                  const eventImg = event.heroImage || FALLBACK_EVENT_IMAGE;
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
                            <span className="truncate">
                              {event.venue}
                              {event.walk ? ` · ~${event.walk}` : ""}
                            </span>
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
                    Everything you need to live well in {effectiveCity}.
                  </h3>
                  <p className="mt-1 text-sm text-mute leading-relaxed">
                    Zero fake accounts, zero artificial filler. Discover real events, check in with friends, explore
                    authentic precinct venues, and claim member perks.
                  </p>
                  {category !== "All" && (
                    <button
                      type="button"
                      onClick={() => setCategory("All")}
                      className="mt-3 inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-brand px-4 text-xs font-bold text-white shadow-2xs hover:bg-brand-ink transition active:scale-95 cursor-pointer"
                    >
                      <span>Show all categories</span>
                    </button>
                  )}
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

          {/* Section: Curated Precinct Places (Pillar 2) */}
          {featuredPlaces.length > 0 && (
            <section aria-labelledby="places-spotlight-heading">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Compass size={18} className="text-emerald-600" aria-hidden="true" />
                    <h2 id="places-spotlight-heading" className="human-section-title text-xl">
                      Places worth stepping out for
                    </h2>
                  </div>
                  <p className="mt-0.5 text-sm text-mute">
                    Verified neighbourhood spots, dining rooms, and cafés in {effectiveCity}
                    {origin ? " · ranked by walk time" : ""}.
                  </p>
                </div>

                <Link
                  href="/places"
                  className="inline-flex min-h-[44px] shrink-0 items-center gap-1 text-xs sm:text-sm font-semibold text-accent hover:underline cursor-pointer touch-manipulation"
                >
                  <span>All places</span>
                  <ArrowRight size={14} />
                </Link>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {featuredPlaces.map((entry) => (
                  <PlaceCard key={entry.place.id} place={entry.place} walk={entry.walk?.walkTime} />
                ))}
              </div>
            </section>
          )}

          {/* Section: Member Deals & Perks (Pillar 4) */}
          <section aria-label="Member Deals and Perks" className="space-y-4">
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
                      ? `${promotions.length} active member deals & dining perks in ${effectiveCity}.`
                      : "Local dining perks and friendly member offers near you."}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <Link
                  href="/rewards"
                  className="inline-flex min-h-[44px] flex-1 sm:flex-initial items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-card px-4 text-xs sm:text-sm font-semibold text-ink ring-1 ring-line hover:bg-paper transition active:scale-95 cursor-pointer touch-manipulation"
                >
                  <Gift size={14} className="text-amber-500 shrink-0" />
                  <span>Rewards</span>
                </Link>
                <Link
                  href="/deals"
                  className="inline-flex min-h-[44px] flex-1 sm:flex-initial items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-paper px-5 text-xs sm:text-sm font-semibold text-ink ring-1 ring-line shadow-xs hover:bg-card hover:shadow-clay-hover transition active:scale-95 cursor-pointer touch-manipulation"
                >
                  <span>Explore perks</span>
                  <ArrowRight size={14} className="shrink-0" />
                </Link>
              </div>
            </div>

            {promotions.length > 0 && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {promotions.slice(0, 3).map((deal, idx) => (
                  <Link
                    key={deal.id || idx}
                    href={`/deals/${deal.id}`}
                    className="neu-card group flex items-center justify-between gap-3 p-4 transition active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-paper">
                        <Photo
                          src={promoArtFor(deal.category, deal.heroImage)}
                          className="h-full w-full object-cover"
                          alt={deal.title}
                        />
                      </div>
                      <div className="min-w-0">
                        <span className="inline-block rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                          {deal.prizeValue || "Exclusive Perk"}
                        </span>
                        <p className="font-display text-sm font-bold text-ink mt-0.5 truncate group-hover:text-accent transition-colors">
                          {deal.title}
                        </p>
                        <p className="text-xs text-mute truncate mt-0.5">{deal.sponsorName || deal.locationText}</p>
                      </div>
                    </div>
                    <ArrowRight size={16} className="text-mute group-hover:text-ink shrink-0 mr-1" aria-hidden="true" />
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Section: Good things on the horizon + Active Communities */}
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

            {horizonEvents.length > 0 ? (
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
                {horizonEvents.map((event) => {
                  const eventImg = event.heroImage || FALLBACK_EVENT_IMAGE;
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

            {/* Organiser Communities Spotlight */}
            {activeCommunities.length > 0 && (
              <div className="mt-8">
                <div className="flex items-center justify-between gap-4 mb-3">
                  <div>
                    <h3 className="font-display text-base font-bold text-ink">Organisers &amp; Crews to Follow</h3>
                    <p className="text-xs text-mute">Join a community so their next gathering lands in your Circle.</p>
                  </div>
                  <Link
                    href="/communities"
                    className="inline-flex min-h-[44px] items-center gap-1 text-xs font-semibold text-accent hover:underline"
                  >
                    <span>All communities</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {activeCommunities.map((c) => {
                    const following = c.handle ? followedHandles.has(c.handle) : false;
                    return (
                      <div key={c.key} className="neu-row flex items-center justify-between gap-3 p-3.5">
                        <div className="min-w-0 flex-1">
                          <Link
                            href={c.handle ? bioPath(c.handle) : `/e/${c.nextEventId}`}
                            className="font-display text-sm font-bold text-ink hover:text-accent truncate block"
                          >
                            {c.name}
                          </Link>
                          <p className="text-xs text-mute truncate mt-0.5">
                            {c.eventCount} upcoming · {c.nextTitle}
                          </p>
                        </div>
                        {c.handle ? (
                          <button
                            type="button"
                            onClick={() => {
                              void triggerHaptic("light");
                              toggleFollow(c.handle, c.name);
                            }}
                            aria-pressed={following}
                            className={cn(
                              "inline-flex min-h-[44px] shrink-0 items-center gap-1 rounded-full px-3.5 text-xs font-bold transition active:scale-95 cursor-pointer",
                              following ? "neu-btn text-ink" : "bg-brand text-white shadow-2xs hover:bg-brand-ink",
                            )}
                          >
                            {following ? <Check size={12} /> : <Plus size={12} />}
                            <span>{following ? "Joined" : "Join"}</span>
                          </button>
                        ) : (
                          <Link
                            href={`/e/${c.nextEventId}`}
                            className="neu-btn inline-flex min-h-[44px] shrink-0 items-center px-3 text-xs font-bold text-accent"
                          >
                            View
                          </Link>
                        )}
                      </div>
                    );
                  })}
                </div>
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
