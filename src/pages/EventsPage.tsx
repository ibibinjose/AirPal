import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import {
  ArrowLeft,
  CalendarDays,
  ChevronDown,
  LayoutGrid,
  MapPin,
  Martini,
  Music,
  Plus,
  Search,
  Sparkles,
  Ticket,
  Tent,
  X,
} from "lucide-react";
import { useEvents } from "@/contexts/EventsContext";
import { useLocalNow } from "@/contexts/LocalNowContext";
import type { CalendarEvent } from "@shared/event";
import { recordToCalendarBase, cityMatches } from "@/lib/remote-events";
import { CalendarEventCard } from "@/components/calendar/CalendarEventCard";
import { CalendarDragProvider } from "@/components/calendar/CalendarDragContext";
import { FilterChips } from "@/components/ui/FilterChips";
import { triggerHaptic, triggerHapticSelection } from "@/lib/native";
import { CITY_OPTIONS } from "@/lib/cities";
import { toZonedDateStr } from "@/lib/local-time";
import { cn } from "@/lib/cn";
import { buildEventsJsonLd } from "@/lib/events-meta";

type EventCategory = "all" | "cultural" | "music" | "festivals" | "nightlife" | "community";
type DateRange = "all" | "today" | "weekend" | "week" | "month";

const CATEGORIES: { id: EventCategory; label: string; icon: typeof Ticket }[] = [
  { id: "all", label: "All Access", icon: Ticket },
  { id: "cultural", label: "Cultural", icon: Sparkles },
  { id: "music", label: "Concerts & Gigs", icon: Music },
  { id: "festivals", label: "Festivals & Melas", icon: Tent },
  { id: "nightlife", label: "Nightlife", icon: Martini },
  { id: "community", label: "Community", icon: LayoutGrid },
];

const DATE_RANGES: { id: DateRange; label: string }[] = [
  { id: "all", label: "All Dates" },
  { id: "today", label: "Today" },
  { id: "weekend", label: "This Weekend" },
  { id: "week", label: "Next 7 Days" },
  { id: "month", label: "Next 30 Days" },
];

function matchesCategory(event: CalendarEvent, cat: EventCategory): boolean {
  if (cat === "all") return true;
  const titleLower = (event.title || "").toLowerCase();
  const catLower = (event.category || "").toLowerCase();
  if (cat === "cultural") {
    return (
      catLower.includes("cultural") ||
      titleLower.includes("diwali") ||
      titleLower.includes("dandiya") ||
      titleLower.includes("bollywood") ||
      titleLower.includes("holi") ||
      titleLower.includes("india") ||
      titleLower.includes("garba") ||
      titleLower.includes("bhangra") ||
      titleLower.includes("desi")
    );
  }
  if (cat === "music") {
    return (
      catLower.includes("music") ||
      catLower.includes("concert") ||
      catLower.includes("gig") ||
      titleLower.includes("live") ||
      titleLower.includes("band") ||
      titleLower.includes("dj") ||
      titleLower.includes("concert")
    );
  }
  if (cat === "festivals") {
    return (
      catLower.includes("festival") ||
      catLower.includes("mela") ||
      catLower.includes("fair") ||
      titleLower.includes("festival") ||
      titleLower.includes("mela") ||
      titleLower.includes("carnival") ||
      titleLower.includes("expo")
    );
  }
  if (cat === "nightlife") {
    return (
      catLower.includes("club") ||
      catLower.includes("nightlife") ||
      catLower.includes("bar") ||
      titleLower.includes("night") ||
      titleLower.includes("party") ||
      titleLower.includes("club")
    );
  }
  if (cat === "community") {
    return (
      catLower.includes("community") ||
      catLower.includes("market") ||
      catLower.includes("expo") ||
      titleLower.includes("meetup") ||
      titleLower.includes("market")
    );
  }
  return true;
}

function matchesDateRange(date: string, range: DateRange, today: string): boolean {
  if (range === "all") return date >= today;
  if (range === "today") return date === today;
  if (range === "weekend") {
    const todayDate = new Date(today);
    const dayOfWeek = todayDate.getDay();
    const daysUntilSat = (6 - dayOfWeek + 7) % 7;
    const sat = new Date(todayDate);
    sat.setDate(todayDate.getDate() + daysUntilSat);
    const sun = new Date(sat);
    sun.setDate(sat.getDate() + 1);
    const satStr = toZonedDateStr(sat);
    const sunStr = toZonedDateStr(sun);
    return date === satStr || date === sunStr;
  }
  if (range === "week") {
    const todayDate = new Date(today);
    const in7 = new Date(todayDate);
    in7.setDate(todayDate.getDate() + 7);
    const in7Str = toZonedDateStr(in7);
    return date >= today && date <= in7Str;
  }
  if (range === "month") {
    const todayDate = new Date(today);
    const in30 = new Date(todayDate);
    in30.setDate(todayDate.getDate() + 30);
    const in30Str = toZonedDateStr(in30);
    return date >= today && date <= in30Str;
  }
  return date >= today;
}

/**
 * /events — Comprehensive directory of all live events with category filters
 * (Cultural, Concerts, Festivals & Melas, Nightlife, Community), city picker,
 * and date ranges. Feeds into EventPage.
 */
export function EventsPage() {
  const [, nav] = useLocation();
  const { calendarEvents, events, userStates } = useEvents();
  const { city, today, chooseLocation } = useLocalNow();
  const effectiveCity = city && city !== "Choose a city" && city !== "Current location" ? city : "Sydney";

  const searchString = useSearch();
  const searchParam = useMemo(() => {
    try {
      return new URLSearchParams(searchString).get("q")?.trim() || "";
    } catch {
      return "";
    }
  }, [searchString]);

  const [category, setCategory] = useState<EventCategory>("all");
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [query, setQuery] = useState(() => searchParam);
  const [cityMenuOpen, setCityMenuOpen] = useState(false);

  useEffect(() => {
    if (searchParam) {
      setQuery(searchParam);
    }
  }, [searchParam]);

  // All upcoming events for the selected city
  const cityEvents = useMemo(() => {
    const seen = new Set<string>();
    const rows: CalendarEvent[] = [];
    const push = (e: CalendarEvent) => {
      if (seen.has(e.id)) return;
      seen.add(e.id);
      rows.push(e);
    };

    for (const e of calendarEvents) {
      if (e.date < today) continue;
      if (!cityMatches(e.city, effectiveCity)) continue;
      push(e);
    }

    for (const r of events) {
      if (r.status !== "live") continue;
      const base = recordToCalendarBase(r);
      if (base.date < today) continue;
      if (!cityMatches(base.city, effectiveCity)) continue;
      const st = userStates[r.id];
      push({
        ...base,
        isGoing: st?.status === "going",
        isInterested: st?.status === "interested",
        isLiked: st?.liked === true,
      });
    }

    rows.sort((a, b) => a.date.localeCompare(b.date));
    return rows;
  }, [calendarEvents, events, userStates, today, effectiveCity]);

  // Dynamic counts per category
  const categoryCounts = useMemo(() => {
    const counts: Record<EventCategory, number> = {
      all: cityEvents.length,
      cultural: 0,
      music: 0,
      festivals: 0,
      nightlife: 0,
      community: 0,
    };
    for (const ev of cityEvents) {
      if (matchesCategory(ev, "cultural")) counts.cultural += 1;
      if (matchesCategory(ev, "music")) counts.music += 1;
      if (matchesCategory(ev, "festivals")) counts.festivals += 1;
      if (matchesCategory(ev, "nightlife")) counts.nightlife += 1;
      if (matchesCategory(ev, "community")) counts.community += 1;
    }
    return counts;
  }, [cityEvents]);

  // Filtered visible events
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return cityEvents.filter((ev) => {
      if (!matchesCategory(ev, category)) return false;
      if (!matchesDateRange(ev.date, dateRange, today)) return false;
      if (q) {
        const titleMatch = (ev.title || "").toLowerCase().includes(q);
        const venueMatch = (ev.venue || "").toLowerCase().includes(q);
        const descMatch = (ev.description || "").toLowerCase().includes(q);
        if (!titleMatch && !venueMatch && !descMatch) return false;
      }
      return true;
    });
  }, [cityEvents, category, dateRange, today, query]);

  return (
    <div className="mx-auto max-w-5xl px-4 pb-[calc(env(safe-area-inset-bottom,0px)+6.5rem)] md:px-6">
      {buildEventsJsonLd().map((block, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(block).replace(/</g, "\\u003c") }}
        />
      ))}
      {/* Top Navigation & Header */}
      <header className="pt-4 sm:pt-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href="/pass"
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-paper px-3.5 text-xs font-bold uppercase tracking-wider text-accent ring-1 ring-line hover:bg-card transition"
            >
              <ArrowLeft size={13} aria-hidden="true" /> AirPal Pass
            </Link>
            <span className="human-eyebrow">Events &amp; Tickets</span>
          </div>

          <div className="mt-2 flex items-center gap-2.5 flex-wrap">
            <h1 className="human-title text-3xl md:text-4xl">Events in</h1>

            {/* City Picker Trigger */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  void triggerHaptic("light");
                  setCityMenuOpen((v) => !v);
                }}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-2xl bg-card px-3.5 py-1.5 text-2xl font-display font-extrabold text-brand ring-1 ring-line hover:bg-paper transition shadow-2xs"
                aria-expanded={cityMenuOpen}
                aria-label="Select city"
              >
                <MapPin size={18} className="text-amber-500 shrink-0" />
                <span>{effectiveCity}</span>
                <ChevronDown size={16} className={cn("text-mute transition-transform", cityMenuOpen && "rotate-180")} />
              </button>

              {/* City Dropdown Menu */}
              {cityMenuOpen && (
                <>
                  <button
                    type="button"
                    aria-label="Close city menu"
                    onClick={() => setCityMenuOpen(false)}
                    className="fixed inset-0 z-20 cursor-default"
                  />
                  <div
                    className="absolute left-0 top-full z-30 mt-2 w-64 rounded-3xl bg-card/95 p-2 shadow-2xl ring-1 ring-line/80 backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-150"
                    role="menu"
                    onKeyDown={(e) => {
                      if (e.key === "Escape") setCityMenuOpen(false);
                    }}
                  >
                    <p className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-ink/70 dark:text-ink/65">
                      Choose Destination
                    </p>
                    <div className="max-h-60 overflow-y-auto space-y-1">
                      {CITY_OPTIONS.map((c) => {
                        const selected = cityMatches(c.label, effectiveCity);
                        return (
                          <button
                            key={c.id}
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              void triggerHapticSelection();
                              chooseLocation({ mode: "city", city: c.label, lat: c.lat, lng: c.lng });
                              setCityMenuOpen(false);
                            }}
                            className={cn(
                              "flex w-full min-h-[44px] items-center justify-between rounded-xl px-3 py-2 text-xs transition active:scale-[0.98] cursor-pointer",
                              selected
                                ? "bg-brand text-white font-bold shadow-xs"
                                : "text-ink font-semibold hover:bg-paper/80",
                            )}
                          >
                            <span className="flex items-center gap-2">
                              <MapPin size={13} className="shrink-0" aria-hidden />
                              <span>{c.label}</span>
                            </span>
                            <span
                              className={cn(
                                "text-[10px] font-medium",
                                selected ? "text-white/90" : "text-ink/65 dark:text-ink/60",
                              )}
                            >
                              {c.region}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-mute">
            Live directory of cultural festivals, concerts, gigs &amp; nightlife in {effectiveCity}.
          </p>
        </div>

        {/* Primary Header Action: Host Event */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Link
            href="/calendar"
            className="inline-flex min-h-[44px] flex-1 sm:flex-initial items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-card px-4 py-2 text-xs font-bold text-ink ring-1 ring-line hover:bg-paper transition active:scale-95 shadow-xs"
          >
            <CalendarDays size={14} className="shrink-0 text-accent" />
            <span>Calendar</span>
          </Link>
          <Link
            href="/event"
            className="inline-flex min-h-[44px] flex-1 sm:flex-initial items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-brand px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-brand/90 transition active:scale-95"
          >
            <Plus size={15} className="shrink-0" />
            <span>Host Event</span>
          </Link>
        </div>
      </header>

      {/* Category Pills Strip */}
      <FilterChips
        ariaLabel="Event Categories"
        className="mt-6"
        options={CATEGORIES.map((cat) => ({
          id: cat.id,
          label: cat.label,
          icon: cat.icon,
          count: categoryCounts[cat.id] > 0 ? categoryCounts[cat.id] : undefined,
        }))}
        value={category}
        onChange={setCategory}
      />

      {/* Search Bar */}
      <div className="relative mt-4">
        <Search
          size={16}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-mute"
          aria-hidden="true"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search events, venues in ${effectiveCity}…`}
          aria-label="Search events"
          enterKeyHint="search"
          className="min-h-[44px] w-full rounded-full bg-card py-2.5 pl-11 pr-11 text-sm text-ink shadow-xs ring-1 ring-line placeholder:text-mute focus:outline-none focus:ring-2 focus:ring-brand"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Clear search"
            className="absolute right-1 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full text-mute transition hover:bg-paper hover:text-ink"
          >
            <X size={15} aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Secondary Filter Bar */}
      <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Date Ranges */}
        <FilterChips ariaLabel="Date ranges" options={DATE_RANGES} value={dateRange} onChange={setDateRange} />
      </div>

      {/* Result count */}
      {visible.length > 0 && (
        <p className="mt-4 text-xs font-semibold text-mute" role="status" aria-live="polite">
          {visible.length} {visible.length === 1 ? "event" : "events"}
          {query.trim() && (
            <>
              {" "}
              for <span className="text-ink">“{query.trim()}”</span>
            </>
          )}
          {category !== "all" && <> · {CATEGORIES.find((c) => c.id === category)?.label}</>}
          {dateRange !== "all" && <> · {DATE_RANGES.find((d) => d.id === dateRange)?.label}</>}
        </p>
      )}

      {/* Event Results Section */}
      {visible.length === 0 ? (
        <div className="human-card mt-6 p-10 text-center">
          <Ticket size={36} className="mx-auto text-mute" aria-hidden="true" />
          <p className="human-section-title mt-3 text-lg">
            {query.trim() ? `No results for “${query.trim()}”` : "No events match these filters"}
          </p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-mute">
            Nothing live in {effectiveCity} for this combination yet. Try a different search or reset the filters — or
            host your own gathering.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                setCategory("all");
                setDateRange("all");
                setQuery("");
              }}
              className="inline-flex min-h-[44px] items-center rounded-full bg-paper px-4 text-sm font-bold text-ink ring-1 ring-line hover:bg-card transition"
            >
              Reset Filters
            </button>
            <Link
              href="/event"
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-brand px-5 text-sm font-bold text-white shadow-xs transition hover:bg-brand/90"
            >
              <Plus size={14} aria-hidden="true" /> Host an Event
            </Link>
          </div>
        </div>
      ) : (
        <CalendarDragProvider>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {visible.map((event) => (
              <CalendarEventCard
                key={event.id}
                event={event}
                onSelect={(selected) => nav(selected.gatePath || `/e/${selected.id}`)}
              />
            ))}
          </div>
        </CalendarDragProvider>
      )}
    </div>
  );
}
