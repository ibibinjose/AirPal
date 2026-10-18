import { useMemo, useState } from "react";
import { Link } from "wouter";
import { ArrowRight, CalendarDays, Check, Plus, Users } from "lucide-react";
import { useEvents } from "@/contexts/EventsContext";
import { useSocial } from "@/contexts/SocialContext";
import { SearchBar } from "@/components/search/SearchBar";
import { cn } from "@/lib/cn";

interface Community {
  key: string;
  name: string;
  handle: string;
  eventIds: string[];
  nextTitle: string;
  nextWhen: string;
}

/**
 * /communities — discover organisers running events near you and follow them.
 * Communities are real hosts grouped from live upcoming events: the event
 * count is real, and Join is a real follow in your social graph.
 */
export function CommunitiesPage() {
  const { calendarEvents } = useEvents();
  const { followedHandles, toggleFollow } = useSocial();
  const [query, setQuery] = useState("");

  const communities = useMemo<Community[]>(() => {
    const now = new Date().toISOString();
    const byKey = new Map<string, Community>();
    for (const e of calendarEvents) {
      if (e.startsAt < now) continue;
      const handle = (e.businessHandle || e.hostHandle || "").trim().replace(/^@+/, "").toLowerCase();
      const name = (e.businessName || e.hostName || "").trim() || (handle ? `@${handle}` : "");
      if (!name) continue;
      const key = handle || `name:${name.toLowerCase()}`;
      const existing = byKey.get(key);
      if (existing) {
        existing.eventIds.push(e.id);
      } else {
        byKey.set(key, {
          key,
          name,
          handle,
          eventIds: [e.id],
          nextTitle: e.title,
          nextWhen: e.startsAt,
        });
      }
    }
    return Array.from(byKey.values()).sort((a, b) => b.eventIds.length - a.eventIds.length);
  }, [calendarEvents]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return communities;
    return communities.filter((c) => c.name.toLowerCase().includes(q) || c.handle.toLowerCase().includes(q));
  }, [communities, query]);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-6 sm:px-6">
      <p className="human-eyebrow">Communities</p>
      <h1 className="human-title mt-2 text-2xl sm:text-3xl">Find your people.</h1>
      <p className="human-lede mt-2 text-sm sm:text-base">
        Follow organisers and crews. Their next events land in your world first.
      </p>

      <div className="mt-4">
        <SearchBar value={query} onChange={setQuery} placeholder="Search organisers…" />
      </div>

      {filtered.length > 0 ? (
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => {
            const following = c.handle ? followedHandles.has(c.handle) : false;
            return (
              <div key={c.key} className="human-card flex flex-col p-5">
                <div className="flex items-center gap-3">
                  <span
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary-container font-display text-lg font-bold text-on-primary-container"
                    aria-hidden="true"
                  >
                    {c.name.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <h2 className="human-section-title truncate text-base">{c.name}</h2>
                    <p className="text-xs text-mute">
                      {c.handle ? `@${c.handle} · ` : ""}
                      {c.eventIds.length} upcoming event{c.eventIds.length === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>
                <p className="mt-3 truncate text-sm text-mute">
                  Next up: <span className="font-semibold text-ink">{c.nextTitle}</span>
                </p>
                <div className="mt-4 flex gap-2">
                  {c.handle ? (
                    <button
                      type="button"
                      onClick={() => toggleFollow(c.handle, c.name)}
                      aria-pressed={following}
                      className={cn(
                        "inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-4 text-sm font-semibold transition active:scale-95",
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
                    href="/events"
                    className="inline-flex min-h-[44px] items-center justify-center gap-1 whitespace-nowrap rounded-full px-4 text-sm font-semibold text-accent ring-1 ring-line transition hover:bg-card active:scale-95"
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
            {query ? "No communities match that search." : "No upcoming organisers yet."}
          </h2>
          <p className="mt-1 text-sm text-mute">
            {query ? "Try a different name." : "Communities appear here as soon as events go live."}
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="inline-flex min-h-[44px] items-center rounded-full bg-brand px-5 text-sm font-semibold text-white transition hover:bg-brand-ink active:scale-95"
              >
                Clear search
              </button>
            ) : (
              <Link
                href="/events"
                className="inline-flex min-h-[44px] items-center gap-1 rounded-full bg-brand px-5 text-sm font-semibold text-white transition hover:bg-brand-ink active:scale-95"
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
