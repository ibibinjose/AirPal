import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  ArrowRight,
  Camera,
  Check,
  Coffee,
  Handshake,
  HeartHandshake,
  Plus,
  QrCode,
  Search,
  Sparkles,
  Ticket,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useBio } from "@/contexts/BioContext";
import { useSocial } from "@/contexts/SocialContext";
import { useMyBookings } from "@/hooks/useMyBookings";
import { HereCheckIn } from "@/components/circle/HereCheckIn";
import { BioCatchUpModal } from "@/components/bio/BioCatchUpModal";
import { BioShareModal } from "@/components/bio/BioShareModal";
import { FilterChips } from "@/components/ui/FilterChips";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { fieldInput } from "@/components/forms/ValidField";
import { listPeople, upsertPerson } from "@/lib/people";
import { toPublicUrl } from "@/lib/public-origin";
import { triggerHaptic } from "@/lib/native";
import { bioPath } from "@shared/bio";
import { cn } from "@/lib/cn";

interface Friend {
  handle: string;
  name: string;
  avatar?: string;
  city?: string;
  whereMet?: string;
  following: boolean;
  follower: boolean;
  metIrl: boolean;
}

type FriendFilter = "all" | "mutual" | "incoming" | "met";

/**
 * /friends — the people you follow, the people who follow you, people you met
 * IRL, and the events you are going to together. Every row is real graph state;
 * attendance is only ever claimed from your own wallet bookings.
 */
export function FriendsPage() {
  const [, nav] = useLocation();
  const { user } = useAuth();
  const [peopleRevision, setPeopleRevision] = useState(0);
  const { mine, profiles } = useBio();
  const { followedHandles, followerHandles, toggleFollow } = useSocial();
  const { upcomingBookings } = useMyBookings();

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FriendFilter>("all");
  const [catchUpTarget, setCatchUpTarget] = useState<{
    handle: string;
    name: string;
    city?: string;
    avatar?: string;
  } | null>(null);
  const [qrOpen, setQrOpen] = useState(false);
  const [logMetOpen, setLogMetOpen] = useState(false);
  const [metName, setMetName] = useState("");
  const [metHandle, setMetHandle] = useState("");
  const [metWhere, setMetWhere] = useState("");
  const [metAlsoFollow, setMetAlsoFollow] = useState(true);

  useEffect(() => {
    const refreshPeople = () => setPeopleRevision((revision) => revision + 1);
    window.addEventListener("airpal:device-data-updated", refreshPeople);
    return () => window.removeEventListener("airpal:device-data-updated", refreshPeople);
  }, []);

  const friends = useMemo<Friend[]>(() => {
    void peopleRevision;
    const myHandle = (mine?.handle || "").toLowerCase();
    const map = new Map<string, Friend>();
    const peopleMet = listPeople();
    const metByHandle = new Map(
      peopleMet.filter((p) => Boolean(p.handle)).map((p) => [p.handle!.toLowerCase(), p] as const),
    );

    const ensure = (handle: string, fallbackName?: string, whereMet?: string, photo?: string) => {
      const h = handle.toLowerCase();
      if (!h || h === myHandle || map.has(h)) return;
      const bio = profiles.find((p) => p.handle.toLowerCase() === h);
      if (bio && bio.kind === "business") return;
      const metRecord = metByHandle.get(h);
      map.set(h, {
        handle: h,
        name: bio?.name || fallbackName || metRecord?.name || `@${h}`,
        avatar: bio?.avatar || photo || metRecord?.photo,
        city: bio?.city,
        whereMet: whereMet || metRecord?.whereMet,
        following: followedHandles.has(h),
        follower: followerHandles.has(h),
        metIrl: Boolean(metRecord || whereMet),
      });
    };

    for (const p of peopleMet) {
      if (p.handle) ensure(p.handle, p.name, p.whereMet, p.photo);
    }
    followedHandles.forEach((h) => ensure(h));
    followerHandles.forEach((h) => ensure(h));

    return Array.from(map.values()).sort((a, b) => {
      const rank = (f: Friend) => (f.following && f.follower ? 0 : f.follower ? 1 : f.metIrl ? 2 : 3);
      return rank(a) - rank(b) || a.name.localeCompare(b.name);
    });
  }, [mine?.handle, profiles, followedHandles, followerHandles, peopleRevision]);

  const counts = useMemo(() => {
    return {
      all: friends.length,
      mutual: friends.filter((f) => f.following && f.follower).length,
      incoming: friends.filter((f) => f.follower && !f.following).length,
      met: friends.filter((f) => f.metIrl).length,
    };
  }, [friends]);

  const filteredFriends = useMemo(() => {
    const q = query.trim().toLowerCase();
    return friends.filter((f) => {
      if (filter === "mutual" && !(f.following && f.follower)) return false;
      if (filter === "incoming" && !(f.follower && !f.following)) return false;
      if (filter === "met" && !f.metIrl) return false;
      if (!q) return true;
      return (
        f.name.toLowerCase().includes(q) ||
        f.handle.toLowerCase().includes(q) ||
        (f.city || "").toLowerCase().includes(q) ||
        (f.whereMet || "").toLowerCase().includes(q)
      );
    });
  }, [friends, query, filter]);

  const goingTogether = useMemo(() => {
    if (!upcomingBookings) return [];
    const today = new Date().toISOString().slice(0, 10);
    return upcomingBookings.filter((b) => !b.date || b.date >= today).slice(0, 3);
  }, [upcomingBookings]);

  const handleSaveMetPerson = async () => {
    const cleanName = metName.trim();
    if (cleanName.length < 2) {
      toast.message("Enter the name of the person you met.");
      return;
    }
    const cleanHandle = metHandle.trim().replace(/^@+/, "").toLowerCase();
    try {
      const saved = await upsertPerson({
        name: cleanName,
        handle: cleanHandle || undefined,
        whereMet: metWhere.trim() || undefined,
      });
      setPeopleRevision((r) => r + 1);
      if (cleanHandle && metAlsoFollow && !followedHandles.has(cleanHandle)) {
        toggleFollow(cleanHandle, saved.name);
      }
      void triggerHaptic("success");
      toast.success(`Added ${saved.name} to your Friends`);
      setMetName("");
      setMetHandle("");
      setMetWhere("");
      setLogMetOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save this person.");
    }
  };

  return (
    <div className="page-wrap-narrow space-y-6 pb-[calc(env(safe-area-inset-bottom,0px)+6.5rem)] pt-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="human-eyebrow">Friends</p>
          <h1 className="human-title mt-2 text-2xl sm:text-3xl">Never go alone.</h1>
          <p className="human-lede mt-2 text-sm sm:text-base">
            {friends.length > 0
              ? `${friends.length} in your circle${counts.mutual > 0 ? ` · ${counts.mutual} mutual` : ""}.`
              : "Follow people you meet. Mutuals rise to the top."}
          </p>
        </div>

        {/* Quick In-Person Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              void triggerHaptic("light");
              setLogMetOpen(true);
            }}
            className="neu-btn inline-flex min-h-[44px] items-center gap-1.5 px-3.5 text-xs font-bold text-ink transition active:scale-95 cursor-pointer"
          >
            <Handshake size={14} className="text-accent shrink-0" aria-hidden="true" />
            <span>Log Met IRL</span>
          </button>

          <button
            type="button"
            onClick={() => {
              void triggerHaptic("light");
              if (mine?.handle) setQrOpen(true);
              else nav("/bio/setup");
            }}
            className="neu-btn inline-flex min-h-[44px] items-center gap-1.5 px-3.5 text-xs font-bold text-ink transition active:scale-95 cursor-pointer"
          >
            <QrCode size={14} className="text-accent shrink-0" aria-hidden="true" />
            <span>My QR</span>
          </button>

          <Link
            href="/me/memories"
            className="neu-btn inline-flex min-h-[44px] items-center gap-1.5 px-3.5 text-xs font-bold text-ink transition active:scale-95"
          >
            <Camera size={14} className="text-rose-500 shrink-0" aria-hidden="true" />
            <span>Memories</span>
          </Link>
        </div>
      </div>

      {/* Live Presence Check-In */}
      {user && <HereCheckIn placeName={mine?.city || "Nearby"} />}

      {/* Search & Relationship Filters */}
      {friends.length > 0 && (
        <div className="space-y-3">
          <FilterChips
            ariaLabel="Friend relationship filters"
            options={[
              {
                id: "all" as const,
                label: "All Friends",
                icon: Sparkles,
                count: counts.all > 0 ? counts.all : undefined,
              },
              {
                id: "mutual" as const,
                label: "Mutuals",
                icon: HeartHandshake,
                count: counts.mutual > 0 ? counts.mutual : undefined,
              },
              {
                id: "incoming" as const,
                label: "Follows You",
                icon: UserCheck,
                count: counts.incoming > 0 ? counts.incoming : undefined,
              },
              {
                id: "met" as const,
                label: "Met IRL",
                icon: Handshake,
                count: counts.met > 0 ? counts.met : undefined,
              },
            ]}
            value={filter}
            onChange={setFilter}
          />

          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mute pointer-events-none" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search friends by name, @handle, or where you met…"
              aria-label="Search friends"
              className="neu-inset min-h-[44px] w-full rounded-2xl pl-10 pr-10 text-base sm:text-sm text-ink placeholder:text-mute focus:outline-none focus:ring-2 focus:ring-brand/40"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-1 top-1/2 grid min-h-[44px] min-w-[44px] -translate-y-1/2 place-items-center text-mute hover:text-ink cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      )}

      {filteredFriends.length > 0 ? (
        <ul className="space-y-2.5">
          {filteredFriends.map((f) => (
            <li key={f.handle} className="neu-row flex flex-wrap items-center justify-between gap-3 p-3.5">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {f.avatar ? (
                  <img
                    src={f.avatar}
                    alt={f.name}
                    className="h-11 w-11 shrink-0 rounded-full object-cover ring-1 ring-line"
                    loading="lazy"
                  />
                ) : (
                  <span
                    className="neu-avatar grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary-container font-display text-base font-bold text-on-primary-container"
                    aria-hidden="true"
                  >
                    {f.name.charAt(0).toUpperCase()}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <Link
                    href={bioPath(f.handle)}
                    className="truncate text-sm font-bold text-ink hover:text-accent block transition-colors"
                  >
                    {f.name}
                  </Link>
                  <p className="truncate text-xs text-mute">
                    @{f.handle}
                    {f.following && f.follower ? " · Mutual" : f.follower ? " · Follows you" : ""}
                    {f.city ? ` · ${f.city}` : ""}
                    {f.whereMet ? ` · Met at ${f.whereMet}` : ""}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    void triggerHaptic("light");
                    setCatchUpTarget({ handle: f.handle, name: f.name, city: f.city, avatar: f.avatar });
                  }}
                  className="neu-btn inline-flex min-h-[44px] items-center gap-1 whitespace-nowrap px-3 text-xs font-bold text-ink transition active:scale-95 cursor-pointer"
                  title={`Propose a catch-up with ${f.name}`}
                >
                  <Coffee size={13} className="text-sky-600 shrink-0" aria-hidden="true" />
                  <span>Catch up</span>
                </button>

                <Link
                  href={bioPath(f.handle)}
                  className="neu-btn inline-flex min-h-[44px] shrink-0 items-center whitespace-nowrap px-3 text-xs font-semibold text-accent transition-[box-shadow,transform] active:scale-95"
                >
                  Bio
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    void triggerHaptic("light");
                    toggleFollow(f.handle, f.name);
                  }}
                  aria-pressed={f.following}
                  className={cn(
                    "inline-flex min-h-[44px] shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-3.5 text-xs font-bold transition-[box-shadow,background-color,color,transform] active:scale-95 cursor-pointer",
                    f.following ? "neu-btn text-ink" : "bg-brand text-white shadow-xs hover:bg-brand-ink",
                  )}
                >
                  {f.following ? <Check size={13} className="shrink-0" /> : <Plus size={13} className="shrink-0" />}
                  <span>{f.following ? "On" : f.follower ? "Back" : "Add"}</span>
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : friends.length > 0 ? (
        <div className="neu-section p-8 text-center">
          <Users size={28} className="mx-auto text-mute" aria-hidden="true" />
          <h2 className="human-section-title mt-3 text-base">No friends match that filter.</h2>
          <p className="mt-1 text-sm text-mute">Try clearing your search or switching back to All Friends.</p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setFilter("all");
            }}
            className="mt-4 inline-flex min-h-[44px] items-center rounded-full bg-brand px-5 text-sm font-semibold text-white transition hover:bg-brand-ink active:scale-95 cursor-pointer"
          >
            Reset filters
          </button>
        </div>
      ) : (
        <div className="neu-section p-8 text-center">
          <HeartHandshake size={28} className="mx-auto text-mute" aria-hidden="true" />
          <h2 className="human-section-title mt-3 text-base">No friends yet.</h2>
          <p className="mt-1 text-sm text-mute">Meet people at events, or find organisers to follow.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Link
              href="/communities"
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-brand px-5 text-sm font-semibold text-white transition-[background-color,transform] hover:bg-brand-ink active:scale-95"
            >
              <Users size={15} />
              <span>Find communities</span>
            </Link>
            <Link
              href="/circle"
              className="neu-btn inline-flex min-h-[44px] items-center px-5 text-sm font-semibold text-ink transition-[box-shadow,transform] active:scale-95"
            >
              Open full Circle
            </Link>
          </div>
        </div>
      )}

      {goingTogether.length > 0 ? (
        <section aria-label="Going together">
          <h2 className="human-section-title text-lg">Going together</h2>
          <p className="mt-0.5 text-sm text-mute">Your upcoming passes — send the link, bring a friend.</p>
          <div className="mt-3 space-y-2">
            {goingTogether.map((b) => (
              <Link
                key={b.id}
                href={`/ticket/${b.id}`}
                className="neu-row group flex items-center gap-3 p-3.5 transition-transform active:scale-[0.99]"
              >
                <span
                  className="neu-avatar grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary-container text-on-primary-container"
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
                  className="shrink-0 text-mute transition-[transform,color] group-hover:translate-x-0.5 group-hover:text-ink"
                  aria-hidden="true"
                />
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/* Log Met IRL Sheet */}
      <Sheet open={logMetOpen} onClose={() => setLogMetOpen(false)} title="Log someone you met IRL">
        <div className="space-y-4">
          <p className="text-xs text-mute leading-relaxed">
            Met someone at an event, venue, or coffee spot? Add them here so they stay in your Friends &amp; Circle.
          </p>
          <div>
            <label htmlFor="friend-met-name" className="block text-xs font-bold text-ink mb-1">
              Their Name *
            </label>
            <input
              id="friend-met-name"
              type="text"
              value={metName}
              onChange={(e) => setMetName(e.target.value)}
              placeholder="e.g. Priya Sharma"
              className={fieldInput}
            />
          </div>
          <div>
            <label htmlFor="friend-met-handle" className="block text-xs font-bold text-ink mb-1">
              AirPal @handle (optional)
            </label>
            <input
              id="friend-met-handle"
              type="text"
              value={metHandle}
              onChange={(e) => setMetHandle(e.target.value)}
              placeholder="@priya"
              className={fieldInput}
            />
          </div>
          <div>
            <label htmlFor="friend-met-where" className="block text-xs font-bold text-ink mb-1">
              Where did you meet? (optional)
            </label>
            <input
              id="friend-met-where"
              type="text"
              value={metWhere}
              onChange={(e) => setMetWhere(e.target.value)}
              placeholder="e.g. Harbour Jazz Night, The Rocks"
              className={fieldInput}
            />
          </div>
          <label className="flex items-center gap-2.5 text-xs font-medium text-ink cursor-pointer">
            <input
              type="checkbox"
              checked={metAlsoFollow}
              onChange={(e) => setMetAlsoFollow(e.target.checked)}
              className="h-4 w-4 rounded border-line text-brand focus:ring-brand"
            />
            <span>Also follow their @handle in my Circle</span>
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setLogMetOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => void handleSaveMetPerson()}>
              Save to Friends
            </Button>
          </div>
        </div>
      </Sheet>

      {/* 1-on-1 Catch-Up Proposal Modal */}
      {catchUpTarget && (
        <BioCatchUpModal
          open={Boolean(catchUpTarget)}
          onClose={() => setCatchUpTarget(null)}
          handle={catchUpTarget.handle}
          name={catchUpTarget.name}
          city={catchUpTarget.city || mine?.city}
          avatar={catchUpTarget.avatar}
        />
      )}

      {/* In-Person QR Bio Share Modal */}
      {mine?.handle && (
        <BioShareModal
          open={qrOpen}
          onClose={() => setQrOpen(false)}
          handle={mine.handle}
          name={mine.name || user?.displayName || `@${mine.handle}`}
          url={toPublicUrl(bioPath(mine.handle))}
          avatar={mine.avatar}
          city={mine.city}
          headline={mine.shortWhy}
          kind={mine.kind}
          phone={mine.phone}
        />
      )}
    </div>
  );
}
