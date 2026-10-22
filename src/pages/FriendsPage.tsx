import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { ArrowRight, Check, HeartHandshake, Plus, Ticket, Users } from "lucide-react";
import { useBio } from "@/contexts/BioContext";
import { useSocial } from "@/contexts/SocialContext";
import { useMyBookings } from "@/hooks/useMyBookings";
import { listPeople } from "@/lib/people";
import { bioPath } from "@shared/bio";
import { cn } from "@/lib/cn";

interface Friend {
  handle: string;
  name: string;
  city?: string;
  following: boolean;
  follower: boolean;
}

/**
 * /friends — the people you follow, the people who follow you, and the
 * events you are going to together. Every row is real graph state; attendance
 * is only ever claimed from your own wallet bookings.
 */
export function FriendsPage() {
  const [peopleRevision, setPeopleRevision] = useState(0);
  const { mine, profiles } = useBio();
  const { followedHandles, followerHandles, toggleFollow } = useSocial();
  const { upcomingBookings } = useMyBookings();

  useEffect(() => {
    const refreshPeople = () => setPeopleRevision((revision) => revision + 1);
    window.addEventListener("airpal:device-data-updated", refreshPeople);
    return () => window.removeEventListener("airpal:device-data-updated", refreshPeople);
  }, []);

  const friends = useMemo<Friend[]>(() => {
    const myHandle = (mine?.handle || "").toLowerCase();
    const map = new Map<string, Friend>();
    const ensure = (handle: string, fallbackName?: string) => {
      const h = handle.toLowerCase();
      if (!h || h === myHandle || map.has(h)) return;
      const bio = profiles.find((p) => p.handle.toLowerCase() === h);
      if (bio && bio.kind === "business") return;
      map.set(h, {
        handle: h,
        name: bio?.name || fallbackName || `@${h}`,
        city: bio?.city,
        following: followedHandles.has(h),
        follower: followerHandles.has(h),
      });
    };
    for (const p of listPeople()) {
      if (p.handle) ensure(p.handle, p.name);
    }
    followedHandles.forEach((h) => ensure(h));
    followerHandles.forEach((h) => ensure(h));
    return Array.from(map.values()).sort((a, b) => {
      const rank = (f: Friend) => (f.following && f.follower ? 0 : f.follower ? 1 : 2);
      return rank(a) - rank(b) || a.name.localeCompare(b.name);
    });
  }, [mine?.handle, profiles, followedHandles, followerHandles, peopleRevision]);

  const mutuals = friends.filter((f) => f.following && f.follower).length;

  const goingTogether = useMemo(() => {
    if (!upcomingBookings) return [];
    const today = new Date().toISOString().slice(0, 10);
    return upcomingBookings.filter((b) => !b.date || b.date >= today).slice(0, 3);
  }, [upcomingBookings]);

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-6 sm:px-6">
      <p className="human-eyebrow">Friends</p>
      <h1 className="human-title mt-2 text-2xl sm:text-3xl">Never go alone.</h1>
      <p className="human-lede mt-2 text-sm sm:text-base">
        {friends.length > 0
          ? `${friends.length} in your circle${mutuals > 0 ? ` · ${mutuals} mutual` : ""}.`
          : "Follow people you meet. Mutuals rise to the top."}
      </p>

      {friends.length > 0 ? (
        <ul className="mt-5 space-y-2">
          {friends.map((f) => (
            <li key={f.handle} className="human-card flex items-center gap-3 p-3.5">
              <span
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary-container font-display text-base font-bold text-on-primary-container"
                aria-hidden="true"
              >
                {f.name.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-ink">{f.name}</p>
                <p className="truncate text-xs text-mute">
                  @{f.handle}
                  {f.following && f.follower ? " · Mutual" : f.follower ? " · Follows you" : ""}
                  {f.city ? ` · ${f.city}` : ""}
                </p>
              </div>
              <Link
                href={bioPath(f.handle)}
                className="inline-flex min-h-[44px] shrink-0 items-center whitespace-nowrap rounded-full px-3 text-xs font-semibold text-accent ring-1 ring-line transition hover:bg-card active:scale-95"
              >
                Bio
              </Link>
              <button
                type="button"
                onClick={() => toggleFollow(f.handle, f.name)}
                aria-pressed={f.following}
                className={cn(
                  "inline-flex min-h-[44px] shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-3.5 text-xs font-bold transition active:scale-95",
                  f.following
                    ? "bg-paper text-ink ring-1 ring-line hover:bg-card"
                    : "bg-brand text-white hover:bg-brand-ink",
                )}
              >
                {f.following ? <Check size={13} className="shrink-0" /> : <Plus size={13} className="shrink-0" />}
                <span>{f.following ? "On" : f.follower ? "Back" : "Add"}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="human-card mt-5 p-8 text-center">
          <HeartHandshake size={28} className="mx-auto text-mute" aria-hidden="true" />
          <h2 className="human-section-title mt-3 text-base">No friends yet.</h2>
          <p className="mt-1 text-sm text-mute">Meet people at events, or find organisers to follow.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Link
              href="/communities"
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-brand px-5 text-sm font-semibold text-white transition hover:bg-brand-ink active:scale-95"
            >
              <Users size={15} />
              <span>Find communities</span>
            </Link>
            <Link
              href="/circle"
              className="inline-flex min-h-[44px] items-center rounded-full px-5 text-sm font-semibold text-ink ring-1 ring-line transition hover:bg-card active:scale-95"
            >
              Open full Circle
            </Link>
          </div>
        </div>
      )}

      {goingTogether.length > 0 ? (
        <section aria-label="Going together" className="mt-6">
          <h2 className="human-section-title text-lg">Going together</h2>
          <p className="mt-0.5 text-sm text-mute">Your upcoming passes — send the link, bring a friend.</p>
          <div className="mt-3 space-y-2">
            {goingTogether.map((b) => (
              <Link
                key={b.id}
                href={`/ticket/${b.id}`}
                className="human-card group flex items-center gap-3 p-3.5 transition hover:shadow-clay-hover"
              >
                <span
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary-container text-on-primary-container"
                  aria-hidden="true"
                >
                  <Ticket size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-ink">{b.title}</span>
                  <span className="block truncate text-xs text-mute">
                    {b.date || "Anytime"}
                    {b.time ? ` @ ${b.time}` : ""}
                  </span>
                </span>
                <ArrowRight
                  size={15}
                  className="shrink-0 text-mute transition group-hover:translate-x-0.5 group-hover:text-ink"
                  aria-hidden="true"
                />
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
