import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Contact,
  Handshake,
  MapPin,
  QrCode,
  Search,
  Sparkles,
  Store,
  UserCheck,
  UserPlus,
  Users,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { fieldInput } from "@/components/forms/ValidField";
import { useBio } from "@/contexts/BioContext";
import { useEvents } from "@/contexts/EventsContext";
import { useSocial } from "@/contexts/SocialContext";
import { HereCheckIn } from "@/components/circle/HereCheckIn";
import { BioCatchUpModal } from "@/components/bio/BioCatchUpModal";
import { BioShareModal } from "@/components/bio/BioShareModal";
import { openGlobalSearch } from "@/components/search/openSearch";
import {
  CIRCLE_QUESTS,
  circleQuestProgress,
  hasMarkedCircleInvite,
  markCircleInviteSent,
  sameCity,
} from "@/lib/circle";
import { listPeople, saveBioContact, upsertPerson, type PersonMet } from "@/lib/people";
import { triggerHaptic } from "@/lib/native";
import { toast } from "sonner";
import { FilterChips } from "@/components/ui/FilterChips";
import { cn } from "@/lib/cn";
import { activePlaces } from "@/lib/catalog";

import {
  sortCircleContacts,
  type CircleContact,
  type CircleFilter,
  type CircleRelationshipFilter,
} from "@/lib/circle-sort";
export type { CircleContact, CircleFilter, CircleRelationshipFilter } from "@/lib/circle-sort";
export { sortCircleContacts } from "@/lib/circle-sort";

export function CirclePage() {
  const { mine, profiles } = useBio();
  const { calendarEvents } = useEvents();
  const { followedHandles, followerHandles, likedHandles, toggleFollow } = useSocial();
  const [, nav] = useLocation();

  const [filter, setFilter] = useState<CircleFilter>("all");
  const [relationshipFilter, setRelationshipFilter] = useState<CircleRelationshipFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showQuests, setShowQuests] = useState(false);
  const [invitedSent, setInvitedSent] = useState(() => hasMarkedCircleInvite());
  const [catchUpContact, setCatchUpContact] = useState<{ handle: string; name: string } | null>(null);

  // Met people from direct in-person connections (reactive when user logs a new person met)
  const [metList, setMetList] = useState<PersonMet[]>(() => listPeople());
  const [logMetOpen, setLogMetOpen] = useState(false);
  const [metName, setMetName] = useState("");
  const [metHandle, setMetHandle] = useState("");
  const [metWhere, setMetWhere] = useState("");
  const [metAlsoFollow, setMetAlsoFollow] = useState(true);

  // In-person QR Circle Pass sheet
  const [qrOpen, setQrOpen] = useState(false);

  const circleInviteUrl = useMemo(() => {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://airpal.me";
    return mine?.handle ? `${origin}/@${mine.handle}` : `${origin}/start`;
  }, [mine?.handle]);

  // Organisers running upcoming events, keyed by handle — the Communities bucket source.
  const organisers = useMemo(() => {
    const now = new Date().toISOString();
    const byHandle = new Map<string, { name: string; events: number }>();
    for (const e of calendarEvents) {
      if (e.startsAt < now) continue;
      const handle = (e.businessHandle || e.hostHandle || "").trim().replace(/^@+/, "").toLowerCase();
      if (!handle) continue;
      const name = (e.businessName || e.hostName || "").trim() || `@${handle}`;
      const existing = byHandle.get(handle);
      if (existing) existing.events += 1;
      else byHandle.set(handle, { name, events: 1 });
    }
    return byHandle;
  }, [calendarEvents]);

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
      const rawHandle = (p.handle || p.id || "").toLowerCase();
      if (!rawHandle || rawHandle === myHandle) continue;
      const isFw = followedHandles.has(rawHandle);
      const isFr = effectiveFollowerHandles.has(rawHandle);
      addContact({
        id: `person-${p.id}`,
        handle: rawHandle,
        name: p.name,
        avatar: p.photo,
        city: mine?.city || undefined,
        category: "friends",
        categoryLabel: "Personal Friend",
        whereMet: p.whereMet,
        metAt: p.metAt,
        isFollowing: isFw,
        isFollower: isFr,
        isMutual: isFw && isFr,
        isMet: true,
      });
    }

    // 2. FRIENDS: Any other personal followed or follower handles.

    // Followed organisers go to Communities; followed business bios go to Places.
    const personalCandidates = new Set<string>();
    followedHandles.forEach((h) => personalCandidates.add(h));
    effectiveFollowerHandles.forEach((h) => personalCandidates.add(h));
    personalCandidates.forEach((h) => {
      if (seenHandles.has(h)) return;
      if (organisers.has(h)) return; // handled under Communities
      const bio = profiles.find((p) => p.handle.toLowerCase() === h);
      if (bio && bio.kind === "business") return; // handled under Places

      const isFw = followedHandles.has(h);
      const isFr = effectiveFollowerHandles.has(h);
      addContact({
        id: `user-${h}`,
        handle: h,
        name: bio?.name || `@${h}`,
        avatar: bio?.avatar,
        city: bio?.city || mine?.city || undefined,
        category: "friends",
        categoryLabel: "Circle Connection",
        isFollowing: isFw,
        isFollower: isFr,
        isMutual: isFw && isFr,
        isMet: false,
      });
    });

    // 3b. COMMUNITIES: Followed organisers running upcoming events.
    organisers.forEach((org, h) => {
      if (seenHandles.has(h)) return;
      if (!followedHandles.has(h)) return;
      addContact({
        id: `community-${h}`,
        handle: h,
        name: org.name,
        avatar: undefined,
        city: mine?.city || undefined,
        category: "communities",
        categoryLabel: org.events > 1 ? `Event Organiser · ${org.events} upcoming` : "Event Organiser",
        isFollowing: true,
        isFollower: false,
        isMutual: false,
        isMet: false,
      });
    });

    // 3c. PLACES: Followed business bios live here, not in Friends.
    for (const bio of profiles) {
      const h = (bio.handle || "").toLowerCase();
      if (!h || seenHandles.has(h)) continue;
      if (bio.kind !== "business") continue;
      if (!followedHandles.has(h) && !likedHandles.has(h)) continue;
      addContact({
        id: `place-bio-${h}`,
        handle: h,
        name: bio.name,
        avatar: bio.avatar,
        city: bio.city || mine?.city || undefined,
        category: "places",
        categoryLabel: "Local Business",
        isFollowing: followedHandles.has(h),
        isFollower: false,
        isMutual: false,
        isMet: false,
      });
    }

    // 4. PLACES: Liked or followed places, plus an offline landmark fallback
    const placesCatalog = activePlaces();
    const candidatePlaces = placesCatalog.slice(0, 4);

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

    return sortCircleContacts(list, mine?.city);
  }, [
    effectiveFollowerHandles,
    followedHandles,
    likedHandles,
    metList,
    mine?.city,
    mine?.handle,
    organisers,
    profiles,
  ]);

  // Counts by category
  const counts = useMemo(() => {
    return {
      all: allContacts.length,
      friends: allContacts.filter((c) => c.category === "friends").length,
      communities: allContacts.filter((c) => c.category === "communities").length,
      places: allContacts.filter((c) => c.category === "places").length,
    };
  }, [allContacts]);

  // Counts by relationship state (scoped to the active category filter)
  const relationshipCounts = useMemo(() => {
    const scoped = filter === "all" ? allContacts : allContacts.filter((c) => c.category === filter);
    return {
      mutual: scoped.filter((c) => c.isMutual).length,
      incoming: scoped.filter((c) => c.isFollower && !c.isFollowing).length,
      met: scoped.filter((c) => c.isMet).length,
      nearby: mine?.city ? scoped.filter((c) => sameCity(c.city, mine.city)).length : 0,
    };
  }, [allContacts, filter, mine?.city]);

  // Filtered and searched list
  const filteredContacts = useMemo(() => {
    return allContacts.filter((c) => {
      if (filter !== "all" && c.category !== filter) return false;
      if (relationshipFilter === "mutual" && !c.isMutual) return false;
      if (relationshipFilter === "incoming" && !(c.isFollower && !c.isFollowing)) return false;
      if (relationshipFilter === "met" && !c.isMet) return false;
      if (relationshipFilter === "nearby" && !sameCity(c.city, mine?.city)) return false;
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
  }, [allContacts, filter, mine?.city, relationshipFilter, searchQuery]);

  // Connector Rank Quest Progress
  const quest = useMemo(() => {
    return circleQuestProgress({
      hasHandle: Boolean(mine?.handle),
      sharingCity: Boolean(mine?.city),
      invited: invitedSent,
      memberCount: allContacts.length,
    });
  }, [mine?.handle, mine?.city, invitedSent, allContacts.length]);

  const handleShareCircleInvite = () => {
    void triggerHaptic("medium");
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(circleInviteUrl);
    }
    markCircleInviteSent();
    setInvitedSent(true);
    toast.success("Circle invite link copied to clipboard!");
  };

  const handleToggleFollow = (handle: string, name: string) => {
    void triggerHaptic("light");
    toggleFollow(handle, name);
  };

  const handleSaveMetPerson = () => {
    const cleanName = metName.trim();
    if (cleanName.length < 2) {
      toast.message("Enter the name of the person you met.");
      return;
    }
    const cleanHandle = metHandle.trim().replace(/^@+/, "").toLowerCase();
    const saved = upsertPerson({
      name: cleanName,
      handle: cleanHandle || undefined,
      whereMet: metWhere.trim() || undefined,
    });
    setMetList(listPeople());
    if (cleanHandle && metAlsoFollow && !followedHandles.has(cleanHandle)) {
      toggleFollow(cleanHandle, saved.name);
    }
    void triggerHaptic("success");
    toast.success(`Added ${saved.name} to your Circle`);
    setMetName("");
    setMetHandle("");
    setMetWhere("");
    setLogMetOpen(false);
  };

  const handleSaveVCard = (contact: CircleContact) => {
    void triggerHaptic("light");
    const origin = typeof window !== "undefined" ? window.location.origin : "https://airpal.me";
    void saveBioContact({
      name: contact.name,
      handle: contact.handle,
      url: `${origin}/@${contact.handle}`,
      headline: contact.whereMet ? `Met at ${contact.whereMet}` : undefined,
    });
  };

  const quickMetSpots = useMemo(() => {
    const fromCatalog = activePlaces()
      .slice(0, 3)
      .map((p) => p.name);
    if (fromCatalog.length > 0) return fromCatalog;
    return ["The Rocks Market", "The Glenmore Hotel", mine?.city || "Sydney"];
  }, [mine?.city]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 pb-[calc(env(safe-area-inset-bottom,0px)+6.5rem)] sm:px-6 sm:pb-32">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-human-blush px-3 py-1 text-xs font-bold text-human-clay">
            <Users size={13} aria-hidden="true" />
            <span>Networking Circle</span>
          </div>
          <h1 className="human-title mt-2 text-3xl sm:text-4xl">My Circle</h1>
          <p className="human-lede mt-1 text-sm sm:text-base">
            Your real-world network — friends, communities, and local places.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full sm:w-auto">
          <Button
            variant="outlined"
            onClick={() => {
              void triggerHaptic("light");
              setLogMetOpen(true);
            }}
            className="min-h-[44px] justify-center gap-1.5 px-3.5 text-xs font-semibold active:scale-95"
            aria-label="Log someone you met in person"
          >
            <Handshake size={15} aria-hidden="true" />
            <span>Log Met IRL</span>
          </Button>
          <Button
            variant="outlined"
            onClick={() => {
              void triggerHaptic("light");
              setQrOpen(true);
            }}
            className="min-h-[44px] justify-center gap-1.5 px-3.5 text-xs font-semibold active:scale-95"
            aria-label="Show Circle QR code"
          >
            <QrCode size={15} aria-hidden="true" />
            <span>QR Pass</span>
          </Button>
          <Button
            variant="primary"
            onClick={handleShareCircleInvite}
            className="col-span-2 sm:col-span-1 min-h-[44px] justify-center gap-1.5 px-4 text-xs font-semibold shadow-xs active:scale-95"
            aria-label="Invite to Circle"
          >
            <UserPlus size={15} aria-hidden="true" />
            <span>Invite to Circle</span>
          </Button>
        </div>
      </header>

      {/* Compact Connector Rank Card */}
      <div className="human-card mt-6 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-human-blush text-human-clay">
              <Zap size={20} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-mute">Connector Rank</span>
                <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-bold text-accent tabular-nums">
                  Level {quest.level.rank}
                </span>
              </div>
              <h3 className="font-display text-sm font-bold text-ink truncate">{quest.level.name}</h3>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <span className="text-sm font-bold text-accent tabular-nums">{quest.points} pts</span>
              <p className="text-xs text-mute tabular-nums">
                {quest.completed}/{quest.total} quests
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                void triggerHaptic("light");
                setShowQuests((prev) => !prev);
              }}
              className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-paper ring-1 ring-line text-mute hover:text-ink cursor-pointer"
              aria-label={showQuests ? "Hide quests" : "Show quests"}
            >
              {showQuests ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        </div>

        <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-line/80">
          <div
            className="h-full bg-brand transition-[width] duration-500 rounded-full"
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
                        "grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold tabular-nums",
                        isDone ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-brand/10 text-accent",
                      )}
                    >
                      {isDone ? <CheckCircle2 size={13} /> : `+${q.points}`}
                    </span>
                    <div className="min-w-0">
                      <p className={cn("font-bold truncate", isDone ? "text-ink/70 line-through" : "text-ink")}>
                        {q.title}
                      </p>
                      <p className="text-xs text-mute truncate">{q.hint}</p>
                    </div>
                  </div>

                  {!isDone && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="shrink-0 text-xs min-h-[44px] px-3.5"
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
        <HereCheckIn placeName={mine?.city || "Nearby"} />
      </div>

      {/* Section Divider & Directory Header */}
      <section className="mt-7">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-xl font-bold text-ink">Circle Directory</h2>
            <span className="rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-bold text-accent tabular-nums">
              {allContacts.length}
            </span>
          </div>
          {relationshipCounts.incoming > 0 && (
            <button
              type="button"
              onClick={() => {
                void triggerHaptic("selection");
                setRelationshipFilter((prev) => (prev === "incoming" ? "all" : "incoming"));
              }}
              className={cn(
                "inline-flex min-h-[36px] items-center gap-1.5 self-start sm:self-auto rounded-full px-3 py-1 text-xs font-bold transition cursor-pointer",
                relationshipFilter === "incoming"
                  ? "bg-brand text-white"
                  : "bg-brand/10 text-accent ring-1 ring-brand/25 hover:bg-brand/15",
              )}
            >
              <UserCheck size={13} aria-hidden="true" />
              <span className="tabular-nums">
                {relationshipCounts.incoming} {relationshipCounts.incoming === 1 ? "follows you" : "follow you"}
              </span>
            </button>
          )}
        </div>

        {/* Filter Tabs: Places | Communities | Friends */}
        <FilterChips
          ariaLabel="Contact filters"
          options={[
            { id: "all", label: "All", icon: Sparkles, count: counts.all > 0 ? counts.all : undefined },
            { id: "friends", label: "Friends", icon: Users, count: counts.friends > 0 ? counts.friends : undefined },
            {
              id: "communities",
              label: "Communities",
              icon: Building2,
              count: counts.communities > 0 ? counts.communities : undefined,
            },
            { id: "places", label: "Places", icon: Store, count: counts.places > 0 ? counts.places : undefined },
          ]}
          value={filter}
          onChange={(next) => {
            setFilter(next);
            setRelationshipFilter("all");
          }}
        />

        {/* Relationship Sub-Filter Pills */}
        {(relationshipCounts.mutual > 0 ||
          relationshipCounts.incoming > 0 ||
          relationshipCounts.met > 0 ||
          relationshipCounts.nearby > 0) && (
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by relationship">
            {(
              [
                { id: "all" as const, label: "All relationships", count: undefined, show: true },
                {
                  id: "mutual" as const,
                  label: "Mutuals",
                  count: relationshipCounts.mutual,
                  show: relationshipCounts.mutual > 0,
                },
                {
                  id: "incoming" as const,
                  label: "Follows you",
                  count: relationshipCounts.incoming,
                  show: relationshipCounts.incoming > 0,
                },
                {
                  id: "met" as const,
                  label: "Met IRL",
                  count: relationshipCounts.met,
                  show: relationshipCounts.met > 0,
                },
                {
                  id: "nearby" as const,
                  label: mine?.city ? `In ${mine.city}` : "Same city",
                  count: relationshipCounts.nearby,
                  show: relationshipCounts.nearby > 0,
                },
              ] as const
            )
              .filter((pill) => pill.show)
              .map((pill) => {
                const active = relationshipFilter === pill.id;
                return (
                  <button
                    key={pill.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      void triggerHaptic("selection");
                      setRelationshipFilter((prev) => (prev === pill.id && pill.id !== "all" ? "all" : pill.id));
                    }}
                    className={cn(
                      "inline-flex min-h-[36px] items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition cursor-pointer",
                      active ? "bg-ink text-card shadow-2xs" : "bg-paper text-mute ring-1 ring-line hover:text-ink",
                    )}
                  >
                    <span>{pill.label}</span>
                    {pill.count !== undefined && (
                      <span
                        className={cn(
                          "rounded-full px-1.5 py-0.2 text-[11px] font-bold tabular-nums",
                          active ? "bg-card/20 text-card" : "bg-card text-ink",
                        )}
                      >
                        {pill.count}
                      </span>
                    )}
                  </button>
                );
              })}
          </div>
        )}

        {/* Clean Search Input */}
        <div className="relative mt-3.5">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mute pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, @handle, community, or precinct..."
            className="w-full min-h-[44px] rounded-2xl bg-card pl-10 pr-9 text-base sm:text-sm text-ink placeholder:text-mute ring-1 ring-line focus:outline-hidden focus:ring-2 focus:ring-brand/40"
            aria-label="Search contacts"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-1 top-1/2 grid min-h-[44px] min-w-[44px] -translate-y-1/2 place-items-center text-mute hover:text-ink cursor-pointer"
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
                {searchQuery || relationshipFilter !== "all"
                  ? "No matches found"
                  : filter === "all"
                    ? "No contacts yet"
                    : `No ${filter} yet`}
              </h3>
              <p className="mt-1 text-sm text-mute max-w-sm mx-auto">
                {searchQuery
                  ? `No contacts matched “${searchQuery}”. Try a different name or clear the filter.`
                  : relationshipFilter !== "all"
                    ? "No contacts in this relationship view yet. Try switching back to all relationships."
                    : filter === "places"
                      ? "Follow local spots, cafes, and bars to stay updated on perks and live events."
                      : filter === "communities"
                        ? "No communities yet — find your people at events."
                        : "Add friends by sharing your bio link or logging people you meet in person."}
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {searchQuery || relationshipFilter !== "all" ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchQuery("");
                      setRelationshipFilter("all");
                    }}
                  >
                    Reset Filters
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
                  <>
                    <Button variant="outlined" size="sm" onClick={() => setLogMetOpen(true)}>
                      Log Met IRL
                    </Button>
                    <Button variant="primary" size="sm" onClick={handleShareCircleInvite}>
                      Invite Friends
                    </Button>
                  </>
                )}
              </div>
            </div>
          ) : (
            filteredContacts.map((contact) => (
              <div
                key={contact.id}
                className="group relative flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 rounded-2xl bg-card p-4 ring-1 ring-line shadow-clay transition-[box-shadow,border-color] duration-200 hover:shadow-clay-hover hover:border-line"
              >
                {/* Left: Avatar & Contact Metadata */}
                <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    {contact.avatar ? (
                      <img
                        src={contact.avatar}
                        alt={contact.name}
                        width={48}
                        height={48}
                        loading="lazy"
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
                        className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white ring-2 ring-card"
                        title="Mutual connection"
                        aria-hidden="true"
                      >
                        <Check size={10} strokeWidth={3.5} />
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
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-500/20">
                          Mutual connection
                        </span>
                      ) : contact.isFollower && !contact.isFollowing ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-brand/15 px-2 py-0.5 text-[11px] font-bold text-accent ring-1 ring-brand/25">
                          Follows you
                        </span>
                      ) : contact.isFollowing ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-paper px-2 py-0.5 text-[11px] font-medium text-mute ring-1 ring-line">
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
                <div className="flex w-full sm:w-auto items-center justify-end gap-2 shrink-0 border-t border-line/50 pt-3 sm:border-0 sm:pt-0">
                  {contact.isMet && (
                    <button
                      type="button"
                      onClick={() => handleSaveVCard(contact)}
                      className="inline-flex min-h-[44px] min-w-[44px] shrink-0 cursor-pointer items-center justify-center rounded-full bg-paper px-2.5 text-xs font-semibold text-mute ring-1 ring-line transition hover:bg-card hover:text-ink active:scale-95"
                      aria-label={`Save contact card for ${contact.name}`}
                      title="Save to phone contacts"
                    >
                      <Contact size={14} aria-hidden="true" />
                    </button>
                  )}

                  {/* Prominent Follow Back / Following button */}
                  {contact.isFollower && !contact.isFollowing ? (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleToggleFollow(contact.handle, contact.name)}
                      className="min-h-[44px] flex-1 sm:flex-initial justify-center gap-1 px-3.5 text-xs font-bold shadow-xs active:scale-95"
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
                      className="min-h-[44px] flex-1 sm:flex-initial justify-center px-3.5 text-xs font-semibold active:scale-95"
                      aria-label={contact.isFollowing ? `Unfollow ${contact.name}` : `Follow ${contact.name}`}
                    >
                      {contact.isFollowing ? "Following" : "Follow"}
                    </Button>
                  )}

                  {/* Contextual Action (Catch Up, Hub, or View Place) */}
                  {contact.category === "places" ? (
                    <Link
                      href={`/@${contact.handle}`}
                      className="inline-flex min-h-[44px] flex-1 sm:flex-initial items-center justify-center whitespace-nowrap rounded-full bg-paper px-3.5 py-1.5 text-xs font-semibold text-ink ring-1 ring-line hover:bg-card active:scale-95 transition"
                      aria-label={`View place ${contact.name}`}
                    >
                      View
                    </Link>
                  ) : contact.category === "communities" ? (
                    <Link
                      href="/events"
                      className="inline-flex min-h-[44px] flex-1 sm:flex-initial items-center justify-center whitespace-nowrap rounded-full bg-paper px-3.5 py-1.5 text-xs font-semibold text-ink ring-1 ring-line hover:bg-card active:scale-95 transition"
                      aria-label={`Find events near ${contact.name}`}
                    >
                      Events →
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setCatchUpContact({ handle: contact.handle, name: contact.name })}
                      className="inline-flex min-h-[44px] flex-1 sm:flex-initial cursor-pointer items-center justify-center gap-1 whitespace-nowrap rounded-full bg-paper px-3.5 py-1.5 text-xs font-semibold text-ink ring-1 ring-line hover:bg-card active:scale-95 transition"
                      aria-label={`Propose a catch-up with ${contact.name}`}
                    >
                      <CalendarDays size={13} className="shrink-0" />
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
      <div className="human-card mt-8 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="human-section-title text-base">Grow your circle?</h3>
          <p className="text-sm text-mute mt-0.5">Invite family or a friend with your Circle link in one tap.</p>
        </div>
        <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto shrink-0">
          <Button
            variant="outlined"
            onClick={() => setQrOpen(true)}
            className="min-h-[44px] justify-center gap-1.5 px-4 text-sm font-semibold active:scale-95"
          >
            <QrCode size={15} aria-hidden="true" />
            <span>Show QR</span>
          </Button>
          <Button
            variant="primary"
            onClick={handleShareCircleInvite}
            className="min-h-[44px] justify-center px-5 text-sm font-semibold shadow-xs active:scale-95"
          >
            Invite to Circle
          </Button>
        </div>
      </div>

      {/* Log Person Met IRL Sheet */}
      <Sheet open={logMetOpen} onClose={() => setLogMetOpen(false)} title="Log Someone You Met">
        <p className="text-sm leading-6 text-mute">
          Remember who you met and where you crossed paths. They’ll appear in your Circle with a one-tap catch-up.
        </p>
        <div className="mt-4 space-y-3.5">
          <label className="block">
            <span className="text-xs font-semibold text-mute">Their Name *</span>
            <input
              value={metName}
              onChange={(e) => setMetName(e.target.value.slice(0, 60))}
              placeholder="e.g. Maya Lin"
              className={`${fieldInput} mt-1`}
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-mute">AirPal @handle (optional)</span>
            <input
              value={metHandle}
              onChange={(e) => setMetHandle(e.target.value.replace(/^@+/, "").slice(0, 30))}
              placeholder="maya"
              className={`${fieldInput} mt-1`}
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-mute">Where did you meet?</span>
            <div className="relative mt-1">
              <MapPin size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-mute" />
              <input
                value={metWhere}
                onChange={(e) => setMetWhere(e.target.value.slice(0, 80))}
                placeholder="The Rocks Market"
                className={`${fieldInput} pl-10`}
              />
            </div>
          </label>
          <div className="flex flex-wrap gap-1.5">
            {quickMetSpots.map((spot) => (
              <button
                key={spot}
                type="button"
                onClick={() => setMetWhere(spot)}
                className={cn(
                  "min-h-[36px] rounded-full px-3 py-1 text-xs font-medium ring-1 ring-line transition cursor-pointer",
                  metWhere === spot ? "bg-brand/10 text-accent ring-brand/30" : "bg-paper text-mute hover:text-ink",
                )}
              >
                {spot}
              </button>
            ))}
          </div>

          {metHandle.trim().length > 0 && (
            <label className="flex min-h-[44px] cursor-pointer items-center gap-3 pt-1">
              <input
                type="checkbox"
                className="h-5 w-5 accent-[#004eff]"
                checked={metAlsoFollow}
                onChange={(e) => setMetAlsoFollow(e.target.checked)}
              />
              <span className="text-sm text-ink">
                Also follow <span className="font-semibold">@{metHandle.trim().replace(/^@+/, "")}</span> on AirPal
              </span>
            </label>
          )}
        </div>
        <Button className="mt-5 w-full min-h-[44px]" onClick={handleSaveMetPerson}>
          Save to Circle
        </Button>
        <button
          type="button"
          onClick={() => setLogMetOpen(false)}
          className="mt-2 min-h-[44px] w-full text-center text-sm font-medium text-mute hover:text-ink cursor-pointer"
        >
          Cancel
        </button>
      </Sheet>

      {/* In-Person My Digital Bio Pass Luxury Wallet Pass Modal */}
      <BioShareModal
        open={qrOpen}
        onClose={() => setQrOpen(false)}
        handle={mine?.handle || "member"}
        name={mine?.name || "AirPal Member"}
        url={circleInviteUrl}
        avatar={mine?.avatar}
        city={mine?.city}
        headline={mine?.shortWhy}
        kind={mine?.kind}
        phone={mine?.phone}
      />

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
