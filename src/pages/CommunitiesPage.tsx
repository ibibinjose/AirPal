import { useMemo, useState } from "react";
import { Link } from "wouter";
import { ArrowRight, CalendarDays, Check, Plus, Sparkles, UserCheck, Users } from "lucide-react";
import { useEvents } from "@/contexts/EventsContext";
import { useSocial } from "@/contexts/SocialContext";
import { recordToCalendarBase } from "@/lib/remote-events";
import { bioPath } from "@shared/bio";
import { SearchBar } from "@/components/search/SearchBar";
import { FilterChips } from "@/components/ui/FilterChips";
import { triggerHaptic } from "@/lib/native";
import { cn } from "@/lib/cn";

interface Community {
  key: string;
  name: string;
  handle: string;
  eventIds: string[];
  nextEventId: string;
  nextTitle: string;
  nextDate: string;
  nextWhen: string;
  city?: string;
}

type CommunityFilter = "all" | "joined";

/**
 * /communities — discover organisers running events near you and follow them.
 * Communities are real hosts grouped from live upcoming events: the event
 * count is real, and Join is a real follow in your social graph.
 */
export function CommunitiesPage() {
  const { calendarEvents, events } = useEvents();
  const { followedHandles, toggleFollow } = useSocial();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<CommunityFilter>("all");

  const communities = useMemo<Community[]>(() => {
    const now = new Date().toISOString();
    const today = now.slice(0, 10);
    const byKey = new Map<string, Community>();
    const seenEventIds = new Set<string>();

    const allEvents = [
      ...calendarEvents,
      ...events.filter((r) => r.status === "live").map((r) => recordToCalendarBase(r)),
    ];

    for (const e of allEvents) {
      if (seenEventIds.has(e.id)) continue;
      seenEventIds.add(e.id);
      if (e.startsAt < now && e.date < today) continue;
      const handle = (e.businessHandle || e.hostHandle || "").trim().replace(/^@+/, "").toLowerCase();
      const name = (e.businessName || e.hostName || "").trim() || (handle ? `@${handle}` : "");
      if (!name) continue;
      const key = handle || `name:${name.toLowerCase()}`;
      const existing = byKey.get(key);
      if (existing) {
        existing.eventIds.push(e.id);
        if (e.date < existing.nextDate) {
          existing.nextEventId = e.id;
          existing.nextTitle = e.title;
          existing.nextDate = e.date;
          existing.nextWhen = e.startsAt;
        }
      } else {
        byKey.set(key, {
          key,
          name,
          handle,
          eventIds: [e.id],
          nextEventId: e.id,
          nextTitle: e.title,
          nextDate: e.date,
          nextWhen: e.startsAt,
          city: e.city,
        });
      }
    }
    return Array.from(byKey.values()).sort((a, b) => b.eventIds.length - a.eventIds.length);
  }, [calendarEvents, events]);

  const joinedCount = useMemo(
    () => communities.filter((c) => c.handle && followedHandles.has(c.handle)).length,
    [communities, followedHandles],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return communities.filter((c) => {
      if (filter === "joined" && (!c.handle || !followedHandles.has(c.handle))) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.handle.toLowerCase().includes(q) ||
        c.nextTitle.toLowerCase().includes(q) ||
        (c.city || "").toLowerCase().includes(q)
      );
    });
  }, [communities, query, filter, followedHandles]);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-6 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="human-eyebrow">Communities</p>
          <h1 className="human-title mt-2 text-2xl sm:text-3xl">Find your people.</h1>
          <p className="human-lede mt-2 text-sm sm:text-base">
            Follow organisers and crews. Their next events land in your world first.
          </p>
        </div>

        <Link
          href="/event"
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-brand px-4 text-xs font-bold text-white shadow-2xs transition hover:bg-brand-ink active:scale-95"
        >
          <Plus size={14} className="shrink-0" aria-hidden="true" />
          <span>Host &amp; Start a Crew</span>
        </Link>
      </div>

      <div className="mt-4">
        <SearchBar value={query} onChange={setQuery} placeholder="Search organisers, crews, or upcoming events…" />
      </div>

      {communities.length > 0 && (
        <FilterChips
          ariaLabel="Community filters"
          className="mt-4"
          options={[
            {
              id: "all" as const,
              label: "All Organisers",
              icon: Sparkles,
              count: communities.length > 0 ? communities.length : undefined,
            },
            {
              id: "joined" as const,
              label: "Joined",
              icon: UserCheck,
              count: joinedCount > 0 ? joinedCount : undefined,
            },
          ]}
          value={filter}
          onChange={setFilter}
        />
      )}

      {filtered.length > 0 ? (
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => {
            const following = c.handle ? followedHandles.has(c.handle) : false;
            return (
              <div key={c.key} className="human-card flex flex-col justify-between p-5">
                <div>
                  <div className="flex items-center gap-3">
                    {c.handle ? (
                      <Link
                        href={bioPath(c.handle)}
                        className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary-container font-display text-lg font-bold text-on-primary-container transition hover:ring-2 hover:ring-brand/40"
                        aria-label={`Open @${c.handle} bio`}
                      >
                        {c.name.charAt(0).toUpperCase()}
                      </Link>
                    ) : (
                      <span
                        className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary-container font-display text-lg font-bold text-on-primary-container"
                        aria-hidden="true"
                      >
                        {c.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      {c.handle ? (
                        <Link
                          href={bioPath(c.handle)}
                          className="human-section-title truncate text-base block hover:text-accent transition-colors"
                        >
                          {c.name}
                        </Link>
                      ) : (
                        <h2 className="human-section-title truncate text-base">{c.name}</h2>
                      )}
                      <p className="text-xs text-mute truncate">
                        {c.handle ? `@${c.handle} · ` : ""}
                        {c.eventIds.length} upcoming event{c.eventIds.length === 1 ? "" : "s"}
                        {c.city ? ` · ${c.city}` : ""}
                      </p>
                    </div>
                  </div>

                  <Link
                    href={`/e/${c.nextEventId}`}
                    className="mt-3.5 flex items-center justify-between gap-2 rounded-2xl bg-paper px-3.5 py-2.5 text-xs ring-1 ring-line/70 transition hover:bg-card hover:ring-brand/40"
                  >
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-accent block">
                        Next up · {c.nextDate}
                      </span>
                      <span className="font-semibold text-ink truncate block mt-0.5">{c.nextTitle}</span>
                    </div>
                    <ArrowRight size={14} className="shrink-0 text-mute" aria-hidden="true" />
                  </Link>
                </div>

                <div className="mt-4 flex gap-2">
                  {c.handle ? (
                    <button
                      type="button"
                      onClick={() => {
                        void triggerHaptic("light");
                        toggleFollow(c.handle, c.name);
                      }}
                      aria-pressed={following}
                      className={cn(
                        "inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-4 text-sm font-semibold transition-[background-color,color,transform] active:scale-95 cursor-pointer",
                        following
                          ? "bg-paper text-ink ring-1 ring-line hover:bg-card"
                          : "bg-brand text-white hover:bg-brand-ink",
                      )}
                    >
                      {following ? <Check size={15} className="shrink-0" /> : <Plus size={15} className="shrink-0" />}
                      <span>{following ? "Joined" : "Join"}</span>
                    </button>
                  ) : null}
                  <Link
                    href={`/events?q=${encodeURIComponent(c.name)}`}
                    className="inline-flex min-h-[44px] items-center justify-center gap-1 whitespace-nowrap rounded-full px-4 text-sm font-semibold text-accent ring-1 ring-line transition-[background-color,transform] hover:bg-card active:scale-95"
                  >
                    <CalendarDays size={15} className="shrink-0" />
                    <span>Events</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="human-card mt-5 p-8 text-center">
          <Users size={28} className="mx-auto text-mute" aria-hidden="true" />
          <h2 className="human-section-title mt-3 text-base">
            {query || filter !== "all" ? "No communities match that filter." : "No upcoming organisers yet."}
          </h2>
          <p className="mt-1 text-sm text-mute">
            {query || filter !== "all"
              ? "Try clearing your search or switching back to all organisers."
              : "Communities appear here as soon as events go live."}
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {query || filter !== "all" ? (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setFilter("all");
                }}
                className="inline-flex min-h-[44px] items-center rounded-full bg-brand px-5 text-sm font-semibold text-white transition-[background-color,transform] hover:bg-brand-ink active:scale-95"
              >
                Reset filters
              </button>
            ) : (
              <Link
                href="/events"
                className="inline-flex min-h-[44px] items-center gap-1 rounded-full bg-brand px-5 text-sm font-semibold text-white transition-[background-color,transform] hover:bg-brand-ink active:scale-95"
              >
                <span>Browse events</span>
                <ArrowRight size={14} />
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
