import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Search,
  Sparkles,
  Store,
  UserCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useBio } from "@/contexts/BioContext";
import { useSocial } from "@/contexts/SocialContext";
import { HereCheckIn } from "@/components/circle/HereCheckIn";
import { BioCatchUpModal } from "@/components/bio/BioCatchUpModal";
import { openGlobalSearch } from "@/components/search/openSearch";
import { CIRCLE_QUESTS, circleQuestProgress, hasMarkedCircleInvite, markCircleInviteSent } from "@/lib/circle";
import { listPeople } from "@/lib/people";
import { triggerHaptic } from "@/lib/native";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import { BIBIN_JOSE_PROFILE } from "@/lib/bio-handle";
import { activePlaces } from "@/lib/catalog";

export type CircleFilter = "all" | "friends" | "communities" | "places";

export interface CircleContact {
  id: string;
  handle: string;
  name: string;
  avatar?: string;
  city?: string;
  category: "friends" | "communities" | "places";
  categoryLabel: string;
  whereMet?: string;
  isFollowing: boolean;
  isFollower: boolean;
  isMutual: boolean;
  isMet: boolean;
}

export function CirclePage() {
  const { mine, profiles } = useBio();
  const { followedHandles, followerHandles, likedHandles, toggleFollow } = useSocial();
  const [, nav] = useLocation();

  const [filter, setFilter] = useState<CircleFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showQuests, setShowQuests] = useState(false);
  const [catchUpContact, setCatchUpContact] = useState<{ handle: string; name: string } | null>(null);

  // Met people from direct in-person connections
  const metList = useMemo(() => listPeople(), []);

  // Followers are real local graph state only — never assert a follow nobody made.
  const effectiveFollowerHandles = followerHandles;

  // Aggregate all circle contacts across Friends, Communities, and Places
  const allContacts = useMemo<CircleContact[]>(() => {
    const list: CircleContact[] = [];
    const seenHandles = new Set<string>();

    const myHandle = (mine?.handle || "").toLowerCase();
    if (myHandle) seenHandles.add(myHandle);

    // Helper to add contact
    const addContact = (contact: CircleContact) => {
      const h = contact.handle.toLowerCase();
      if (seenHandles.has(h)) return;
      seenHandles.add(h);
      list.push(contact);
    };

    // 1. FRIENDS: Met people
    for (const p of metList) {
      const h = (p.handle || "").toLowerCase();
      if (!h || h === myHandle) continue;
      const isFw = followedHandles.has(h);
      const isFr = effectiveFollowerHandles.has(h);
      addContact({
        id: `person-${p.id}`,
        handle: h,
        name: p.name,
        avatar: p.photo,
        city: mine?.city || "Sydney",
        category: "friends",
        categoryLabel: "Personal Friend",
        whereMet: p.whereMet,
        isFollowing: isFw,
        isFollower: isFr,
        isMutual: isFw && isFr,
        isMet: true,
      });
    }

    // 2. FRIENDS: Platform Persona - Bibin Jose (Founder & CTO)
    if (myHandle !== "bibinjose") {
      const isFw = followedHandles.has("bibinjose");
      const isFr = effectiveFollowerHandles.has("bibinjose");
      addContact({
        id: "person-bibinjose",
        handle: BIBIN_JOSE_PROFILE.handle,
        name: BIBIN_JOSE_PROFILE.name,
        avatar: BIBIN_JOSE_PROFILE.avatar,
        city: BIBIN_JOSE_PROFILE.city,
        category: "friends",
        categoryLabel: "Founder & CTO",
        isFollowing: isFw,
        isFollower: isFr,
        isMutual: isFw && isFr,
        isMet: false,
      });
    }

    // 3. FRIENDS: Any other personal followed or follower handles
    const personalCandidates = new Set<string>();
    followedHandles.forEach((h) => personalCandidates.add(h));
    effectiveFollowerHandles.forEach((h) => personalCandidates.add(h));
    personalCandidates.forEach((h) => {
      if (seenHandles.has(h)) return;
      const bio = profiles.find((p) => p.handle.toLowerCase() === h);
      if (bio && bio.kind === "business") return; // will be handled under Places

      const isFw = followedHandles.has(h);
      const isFr = effectiveFollowerHandles.has(h);
      addContact({
        id: `user-${h}`,
        handle: h,
        name: bio?.name || `@${h}`,
        avatar: bio?.avatar,
        city: bio?.city || "Sydney",
        category: "friends",
        categoryLabel: "Circle Connection",
        isFollowing: isFw,
        isFollower: isFr,
        isMutual: isFw && isFr,
        isMet: false,
      });
    });

    // 4. PLACES: Liked or followed places, plus an offline landmark fallback
    const placesCatalog = activePlaces();
    const candidatePlaces = placesCatalog.slice(0, 4);

    // Offline fallback only: when the live catalog is empty, suggest two real
    // Sydney landmarks instead of rendering an empty directory.
    const seedPlaces =
      candidatePlaces.length === 0
        ? [
            {
              id: "the-glenmore",
              handle: "theglenmore",
              name: "The Glenmore Hotel",
              city: "The Rocks, Sydney",
              categoryLabel: "Historic Rooftop Pub",
            },
            {
              id: "cut-bar-grill",
              handle: "cutbar",
              name: "Cut Bar & Grill",
              city: "The Rocks, Sydney",
              categoryLabel: "Dining & Drinks Partner",
            },
          ]
        : [];

    for (const sp of seedPlaces) {
      const isFw = followedHandles.has(sp.handle) || likedHandles.has(sp.handle);
      addContact({
        id: `place-${sp.id}`,
        handle: sp.handle,
        name: sp.name,
        city: sp.city,
        category: "places",
        categoryLabel: sp.categoryLabel,
        isFollowing: isFw,
        isFollower: false,
        isMutual: false,
        isMet: false,
      });
    }

    for (const cp of candidatePlaces) {
      const handle = cp.handle || cp.id;
      if (seenHandles.has(handle)) continue;
      const isFw = followedHandles.has(handle) || likedHandles.has(handle);
      addContact({
        id: `place-${cp.id}`,
        handle,
        name: cp.name,
        avatar: cp.heroImage,
        city: cp.precinctId ? `The Rocks, Sydney` : "Sydney",
        category: "places",
        categoryLabel:
          cp.category === "eat"
            ? "Dining & Eatery"
            : cp.category === "coffee"
              ? "Coffee & Cafe"
              : "Local Precinct Spot",
        isFollowing: isFw,
        isFollower: false,
        isMutual: false,
        isMet: false,
      });
    }

    return list;
  }, [effectiveFollowerHandles, followedHandles, likedHandles, metList, mine?.city, mine?.handle, profiles]);

  // Counts by category
  const counts = useMemo(() => {
    return {
      all: allContacts.length,
      friends: allContacts.filter((c) => c.category === "friends").length,
      communities: allContacts.filter((c) => c.category === "communities").length,
      places: allContacts.filter((c) => c.category === "places").length,
    };
  }, [allContacts]);

  // Filtered and searched list
  const filteredContacts = useMemo(() => {
    return allContacts.filter((c) => {
      if (filter !== "all" && c.category !== filter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        c.name.toLowerCase().includes(q) ||
        c.handle.toLowerCase().includes(q) ||
        (c.city && c.city.toLowerCase().includes(q)) ||
        c.categoryLabel.toLowerCase().includes(q) ||
        (c.whereMet && c.whereMet.toLowerCase().includes(q))
      );
    });
  }, [allContacts, filter, searchQuery]);

  // Connector Rank Quest Progress
  const quest = useMemo(() => {
    return circleQuestProgress({
      hasHandle: Boolean(mine?.handle),
      sharingCity: Boolean(mine?.city),
      invited: hasMarkedCircleInvite(),
      memberCount: allContacts.length,
    });
  }, [mine?.handle, mine?.city, allContacts.length]);

  const handleShareCircleInvite = () => {
    void triggerHaptic("medium");
    const url = mine?.handle ? `${window.location.origin}/@${mine.handle}` : `${window.location.origin}/start`;
    void navigator.clipboard.writeText(url);
    markCircleInviteSent();
    toast.success("Circle invite link copied to clipboard!");
  };

  const handleToggleFollow = (handle: string, name: string) => {
    void triggerHaptic("light");
    toggleFollow(handle, name);
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 pb-[calc(env(safe-area-inset-bottom,0px)+6.5rem)] sm:px-6 sm:pb-32">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-3 py-1 text-xs font-bold text-accent">
            <Users size={13} />
            <span>Networking Circle</span>
          </div>
          <h1 className="font-display mt-2 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">My Circle</h1>
          <p className="mt-1 text-sm text-mute">Your real-world network — friends, communities, and local places.</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            onClick={handleShareCircleInvite}
            className="min-h-[44px] gap-1.5 px-4 text-xs font-semibold shadow-xs active:scale-95"
            aria-label="Invite to Circle"
          >
            <UserPlus size={15} />
            <span>Invite to Circle</span>
          </Button>
        </div>
      </header>

      {/* Compact Connector Rank Card */}
      <div className="mt-6 rounded-2xl bg-card p-4 ring-1 ring-line shadow-clay">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand/10 text-lg font-bold text-accent">
              ⚡
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-mute">Connector Rank</span>
                <span className="rounded-full bg-brand/10 px-2 py-0.2 text-[10px] font-bold text-accent">
                  Level {quest.level.rank}
                </span>
              </div>
              <h3 className="font-display text-sm font-bold text-ink truncate">{quest.level.name}</h3>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <span className="text-xs font-bold text-accent">{quest.points} pts</span>
              <p className="text-[10px] text-mute">
                {quest.completed}/{quest.total} quests
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                void triggerHaptic("light");
                setShowQuests((prev) => !prev);
              }}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-paper ring-1 ring-line text-mute hover:text-ink cursor-pointer"
              aria-label={showQuests ? "Hide quests" : "Show quests"}
            >
              {showQuests ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        </div>

        <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-line/80">
          <div
            className="h-full bg-brand transition-all duration-500 rounded-full"
            style={{ width: `${Math.round((quest.completed / quest.total) * 100)}%` }}
          />
        </div>

        {showQuests && (
          <div className="mt-3.5 space-y-2 border-t border-line/70 pt-3">
            {CIRCLE_QUESTS.map((q) => {
              const isDone = quest.done[q.id];
              return (
                <div
                  key={q.id}
                  className="flex items-center justify-between gap-3 rounded-xl bg-paper/70 p-2.5 ring-1 ring-line/50 text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={cn(
                        "grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold",
                        isDone ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-brand/10 text-accent",
                      )}
                    >
                      {isDone ? <CheckCircle2 size={13} /> : `+${q.points}`}
                    </span>
                    <div className="min-w-0">
                      <p className={cn("font-bold truncate", isDone ? "text-ink/70 line-through" : "text-ink")}>
                        {q.title}
                      </p>
                      <p className="text-[11px] text-mute truncate">{q.hint}</p>
                    </div>
                  </div>

                  {!isDone && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="shrink-0 text-xs h-7 px-2.5 py-0"
                      onClick={() => {
                        void triggerHaptic("light");
                        if (q.id === "handle") nav("/bio/setup");
                        else if (q.id === "city") nav("/bio/edit");
                        else if (q.id === "invite") handleShareCircleInvite();
                        else if (q.id === "people") openGlobalSearch({ category: "people" });
                      }}
                    >
                      Start →
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Live Presence Check-In (Clean & Compact) */}
      <div className="mt-4">
        <HereCheckIn placeName={mine?.city || "Sydney Hub"} />
      </div>

      {/* Section Divider & Directory Header */}
      <section className="mt-7">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-xl font-bold text-ink">Circle Directory</h2>
            <span className="rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-bold text-accent">
              {allContacts.length}
            </span>
          </div>
        </div>

        {/* Filter Tabs: Places | Communities | Friends */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={filter === "all"}
            onClick={() => {
              void triggerHaptic("selection");
              setFilter("all");
            }}
            className={cn(
              "inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition-all duration-200 cursor-pointer touch-manipulation",
              filter === "all"
                ? "bg-brand text-white shadow-xs"
                : "bg-paper text-mute hover:bg-card hover:text-ink ring-1 ring-line/80",
            )}
          >
            <Sparkles size={13} />
            <span>All</span>
            <span
              className={cn(
                "ml-1 rounded-full px-1.5 py-0.2 text-[10px] font-bold",
                filter === "all" ? "bg-white/20 text-white" : "bg-line/70 text-mute",
              )}
            >
              {counts.all}
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={filter === "friends"}
            onClick={() => {
              void triggerHaptic("selection");
              setFilter("friends");
            }}
            className={cn(
              "inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition-all duration-200 cursor-pointer touch-manipulation",
              filter === "friends"
                ? "bg-brand text-white shadow-xs"
                : "bg-paper text-mute hover:bg-card hover:text-ink ring-1 ring-line/80",
            )}
          >
            <Users size={13} />
            <span>Friends</span>
            <span
              className={cn(
                "ml-1 rounded-full px-1.5 py-0.2 text-[10px] font-bold",
                filter === "friends" ? "bg-white/20 text-white" : "bg-line/70 text-mute",
              )}
            >
              {counts.friends}
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={filter === "communities"}
            onClick={() => {
              void triggerHaptic("selection");
              setFilter("communities");
            }}
            className={cn(
              "inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition-all duration-200 cursor-pointer touch-manipulation",
              filter === "communities"
                ? "bg-brand text-white shadow-xs"
                : "bg-paper text-mute hover:bg-card hover:text-ink ring-1 ring-line/80",
            )}
          >
            <Building2 size={13} />
            <span>Communities</span>
            <span
              className={cn(
                "ml-1 rounded-full px-1.5 py-0.2 text-[10px] font-bold",
                filter === "communities" ? "bg-white/20 text-white" : "bg-line/70 text-mute",
              )}
            >
              {counts.communities}
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={filter === "places"}
            onClick={() => {
              void triggerHaptic("selection");
              setFilter("places");
            }}
            className={cn(
              "inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition-all duration-200 cursor-pointer touch-manipulation",
              filter === "places"
                ? "bg-brand text-white shadow-xs"
                : "bg-paper text-mute hover:bg-card hover:text-ink ring-1 ring-line/80",
            )}
          >
            <Store size={13} />
            <span>Places</span>
            <span
              className={cn(
                "ml-1 rounded-full px-1.5 py-0.2 text-[10px] font-bold",
                filter === "places" ? "bg-white/20 text-white" : "bg-line/70 text-mute",
              )}
            >
              {counts.places}
            </span>
          </button>
        </div>

        {/* Clean Search Input */}
        <div className="relative mt-3.5">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mute pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, @handle, community, or precinct..."
            className="w-full min-h-[44px] rounded-2xl bg-card pl-10 pr-9 text-xs text-ink placeholder:text-mute ring-1 ring-line focus:outline-hidden focus:ring-2 focus:ring-brand/40"
            aria-label="Search contacts"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-mute hover:text-ink p-1"
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Contact List View ("contact list ish") */}
        <div className="mt-4 space-y-3">
          {filteredContacts.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-line bg-card/60 p-8 text-center">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-brand/10 text-accent">
                {filter === "places" ? (
                  <Store size={22} />
                ) : filter === "communities" ? (
                  <Building2 size={22} />
                ) : (
                  <Users size={22} />
                )}
              </div>
              <h3 className="font-display mt-3 text-base font-bold text-ink">
                {searchQuery ? "No matches found" : `No ${filter} yet`}
              </h3>
              <p className="mt-1 text-xs text-mute max-w-sm mx-auto">
                {searchQuery
                  ? `No contacts matched "${searchQuery}". Try a different name or clear the filter.`
                  : filter === "places"
                    ? "Follow local spots, cafes, and bars to stay updated on perks and live events."
                    : filter === "communities"
                      ? "No communities yet — find your people at events."
                      : "Add friends by sharing your bio link or connecting in person."}
              </p>
              <div className="mt-5 flex justify-center gap-2">
                {searchQuery ? (
                  <Button variant="ghost" size="sm" onClick={() => setSearchQuery("")}>
                    Clear Search
                  </Button>
                ) : filter === "places" ? (
                  <Button variant="primary" size="sm" onClick={() => openGlobalSearch({ category: "places" })}>
                    Search Places
                  </Button>
                ) : filter === "communities" ? (
                  <Button variant="primary" size="sm" onClick={() => nav("/events")}>
                    Browse Events
                  </Button>
                ) : (
                  <Button variant="primary" size="sm" onClick={handleShareCircleInvite}>
                    Invite Friends
                  </Button>
                )}
              </div>
            </div>
          ) : (
            filteredContacts.map((contact) => (
              <div
                key={contact.id}
                className="group relative flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 rounded-2xl bg-card p-4 ring-1 ring-line shadow-clay transition-all duration-200 hover:shadow-clay-hover hover:border-line"
              >
                {/* Left: Avatar & Contact Metadata */}
                <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    {contact.avatar ? (
                      <img
                        src={contact.avatar}
                        alt={contact.name}
                        className="h-12 w-12 rounded-full object-cover ring-1 ring-line/80 shadow-2xs"
                      />
                    ) : (
                      <div className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-brand/15 via-brand/10 to-accent/10 font-bold text-base text-accent ring-1 ring-brand/20 shadow-2xs">
                        {contact.category === "communities" ? (
                          <Building2 size={20} />
                        ) : contact.category === "places" ? (
                          <Store size={20} />
                        ) : (
                          contact.name.charAt(0).toUpperCase()
                        )}
                      </div>
                    )}

                    {/* Mutual Connection Badge Dot */}
                    {contact.isMutual && (
                      <span
                        className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white ring-2 ring-card"
                        title="Mutual connection"
                      >
                        ✓
                      </span>
                    )}
                  </div>

                  {/* Contact Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <Link
                        href={`/@${contact.handle}`}
                        className="font-bold text-sm text-ink hover:underline truncate"
                      >
                        {contact.name}
                      </Link>
                      <span className="text-xs text-mute truncate">@{contact.handle}</span>

                      {/* Relationship Pill */}
                      {contact.isMutual ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-500/20">
                          Mutual connection
                        </span>
                      ) : contact.isFollower && !contact.isFollowing ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-brand/15 px-2 py-0.5 text-[10px] font-bold text-accent ring-1 ring-brand/25">
                          Follows you
                        </span>
                      ) : contact.isFollowing ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-paper px-2 py-0.5 text-[10px] font-medium text-mute ring-1 ring-line">
                          Following
                        </span>
                      ) : null}
                    </div>

                    {/* Category & Met Location */}
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-mute">
                      <span className="font-medium text-ink/70">{contact.categoryLabel}</span>
                      {contact.city && <span>· {contact.city}</span>}
                      {contact.whereMet && (
                        <span className="text-accent/90 font-medium">· Met at {contact.whereMet}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center pt-2 sm:pt-0">
                  {/* Prominent Follow Back / Following button */}
                  {contact.isFollower && !contact.isFollowing ? (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleToggleFollow(contact.handle, contact.name)}
                      className="min-h-[44px] gap-1 px-3.5 text-xs font-bold shadow-xs active:scale-95"
                      aria-label={`Follow back ${contact.name}`}
                    >
                      <UserCheck size={14} />
                      <span>Follow Back</span>
                    </Button>
                  ) : (
                    <Button
                      variant={contact.isFollowing ? "outlined" : "light"}
                      size="sm"
                      onClick={() => handleToggleFollow(contact.handle, contact.name)}
                      className="min-h-[44px] px-3.5 text-xs font-semibold active:scale-95"
                      aria-label={contact.isFollowing ? `Unfollow ${contact.name}` : `Follow ${contact.name}`}
                    >
                      {contact.isFollowing ? "Following" : "Follow"}
                    </Button>
                  )}

                  {/* Contextual Action (Catch Up, Hub, or View Place) */}
                  {contact.category === "places" ? (
                    <Link
                      href={`/@${contact.handle}`}
                      className="inline-flex min-h-[44px] items-center rounded-full bg-paper px-3.5 py-1.5 text-xs font-semibold text-ink ring-1 ring-line hover:bg-card active:scale-95 transition"
                      aria-label={`View place ${contact.name}`}
                    >
                      View
                    </Link>
                  ) : contact.category === "communities" ? (
                    <Link
                      href="/events"
                      className="inline-flex min-h-[44px] items-center rounded-full bg-paper px-3.5 py-1.5 text-xs font-semibold text-ink ring-1 ring-line hover:bg-card active:scale-95 transition"
                      aria-label={`Find events near ${contact.name}`}
                    >
                      Events →
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setCatchUpContact({ handle: contact.handle, name: contact.name })}
                      className="inline-flex min-h-[44px] cursor-pointer items-center gap-1 rounded-full bg-paper px-3.5 py-1.5 text-xs font-semibold text-ink ring-1 ring-line hover:bg-card active:scale-95 transition"
                      aria-label={`Propose a catch-up with ${contact.name}`}
                    >
                      <CalendarDays size={13} />
                      <span>Catch up</span>
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Fast CTA */}
      <div className="mt-8 rounded-3xl bg-card p-6 ring-1 ring-line shadow-clay flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-display text-base font-bold text-ink">Grow your circle?</h3>
          <p className="text-xs text-mute mt-0.5">Invite family or a friend with your Circle link in one tap.</p>
        </div>
        <Button
          variant="primary"
          onClick={handleShareCircleInvite}
          className="shrink-0 min-h-[44px] px-5 text-xs font-semibold shadow-xs active:scale-95"
        >
          Invite to Circle
        </Button>
      </div>
      {catchUpContact && (
        <BioCatchUpModal
          open
          onClose={() => setCatchUpContact(null)}
          handle={catchUpContact.handle}
          name={catchUpContact.name}
          initialType="catchup"
        />
      )}
    </div>
  );
}
