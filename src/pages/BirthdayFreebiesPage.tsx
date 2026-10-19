import { useState, useMemo, useEffect } from "react";
import { Link, useParams } from "wouter";
import {
  ArrowRight,
  Bookmark,
  BookmarkCheck,
  Building2,
  Cake,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Compass,
  ExternalLink,
  Gift,
  Heart,
  HelpCircle,
  MapPin,
  PartyPopper,
  Search,
  Sparkles,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import {
  BIRTHDAY_DISCLAIMER,
  BIRTHDAY_MATE_CTA,
  BIRTHDAY_MONTHS,
  BIRTHDAY_REGIONS,
  isBirthdayRegionCode,
} from "@shared/birthday-freebies";
import { useAuth } from "@/contexts/AuthContext";
import { ConfettiBurst } from "@/components/brand/ConfettiBurst";
import { triggerHaptic } from "@/lib/native";
import { friendlyBirthdayError, setBirthdayAlertPrefsRemote } from "@/lib/birthday-freebies";
import { cn } from "@/lib/cn";
import { CURATED_BIRTHDAY_OFFERS, type CuratedBirthdayOffer, type FreebieCategory } from "@/lib/birthdayFreebiesData";

const CATEGORIES: Array<{ id: FreebieCategory; label: string; emoji: string }> = [
  { id: "all", label: "All Treats", emoji: "✨" },
  { id: "food", label: "Dining & Meals", emoji: "🍔" },
  { id: "sweets", label: "Sweets & Bakery", emoji: "🍩" },
  { id: "drinks", label: "Drinks & Boba", emoji: "☕" },
  { id: "beauty", label: "Beauty & Care", emoji: "💄" },
  { id: "retail", label: "Shopping", emoji: "🛍️" },
  { id: "activity", label: "Experiences", emoji: "🎢" },
];

export function BirthdayFreebiesPage() {
  const params = useParams<{ region?: string }>();
  const raw = params.region?.trim().toLowerCase();
  const region = raw && isBirthdayRegionCode(raw) ? raw : null;
  const active = BIRTHDAY_REGIONS.find((r) => r.code === region) ?? null;

  const { user } = useAuth();

  // Current calendar month (1-12)
  const currentCalendarMonth = useMemo(() => new Date().getMonth() + 1, []);

  // Filter states
  const [selectedMonth, setSelectedMonth] = useState<number | null>(() => {
    if (user?.birthdayMonth && user.birthdayMonth >= 1 && user.birthdayMonth <= 12) {
      return user.birthdayMonth;
    }
    return currentCalendarMonth;
  });

  const [selectedCategory, setSelectedCategory] = useState<FreebieCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [onlyCompletelyFree, setOnlyCompletelyFree] = useState(false);
  const [onlyWishlist, setOnlyWishlist] = useState(false);

  // Confetti trigger
  const [confettiKey, setConfettiKey] = useState(0);

  // Expanded "How to claim" accordion IDs
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  // Wishlist in localStorage
  const [wishlist, setWishlist] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("airpal_birthday_wishlist");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Birthday Alert settings state (synced with user prefs)
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [isSavingAlerts, setIsSavingAlerts] = useState(false);

  useEffect(() => {
    if (user) {
      setAlertsEnabled(user.birthdayAlertsEnabled !== false);
    }
  }, [user]);

  // Sync wishlist to localStorage
  const toggleWishlist = (offerId: string) => {
    void triggerHaptic("selection");
    setWishlist((prev) => {
      const next = prev.includes(offerId) ? prev.filter((id) => id !== offerId) : [...prev, offerId];
      try {
        localStorage.setItem("airpal_birthday_wishlist", JSON.stringify(next));
      } catch {
        // ignore
      }
      if (!prev.includes(offerId)) {
        toast.success("Saved to your birthday wishlist 🎁");
      } else {
        toast.info("Removed from your wishlist");
      }
      return next;
    });
  };

  const toggleExpanded = (offerId: string) => {
    void triggerHaptic("light");
    setExpandedIds((prev) => ({ ...prev, [offerId]: !prev[offerId] }));
  };

  const handleCelebrate = () => {
    void triggerHaptic("medium");
    setConfettiKey((k) => k + 1);
    toast.success("Happy Birthday Month from AirPal! 🎉 Treat yourself!", {
      duration: 3500,
    });
  };

  const handleShareWithMate = async (offer: CuratedBirthdayOffer) => {
    void triggerHaptic("light");
    const shareText = `Hey! Check out this birthday perk at ${offer.brand}: ${offer.reward}. Life made easy — let's go celebrate together!`;
    const shareUrl = typeof window !== "undefined" ? window.location.href : "https://airpal.me/birthday-freebies";

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `${offer.brand} Birthday Treat`,
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch {
        // fallback to copy
      }
    }

    try {
      await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
      toast.success("Invite message copied to clipboard! Send to your mate 📲");
    } catch {
      toast.info("Could not copy link automatically.");
    }
  };

  const handleToggleAlerts = async () => {
    if (!user) {
      toast.message("Sign in to your AirPal account to receive birthday alerts.");
      return;
    }
    const next = !alertsEnabled;
    setAlertsEnabled(next);
    setIsSavingAlerts(true);
    try {
      await setBirthdayAlertPrefsRemote({
        birthdayAlertsEnabled: next,
        birthdayAlertsRegion: region ?? user.birthdayAlertsRegion ?? "au",
      });
      void triggerHaptic("light");
      toast.success(next ? "Birthday month alerts enabled 🎂" : "Birthday month alerts paused");
    } catch (err) {
      setAlertsEnabled(!next);
      toast.error(friendlyBirthdayError(err));
    } finally {
      setIsSavingAlerts(false);
    }
  };

  // Filtered offers list
  const filteredOffers = useMemo(() => {
    return CURATED_BIRTHDAY_OFFERS.filter((offer) => {
      // Region filter
      if (region && !offer.regions.includes(region)) {
        return false;
      }

      // Month filter (if set and offer is month-specific)
      if (selectedMonth && offer.months.length > 0 && !offer.months.includes(selectedMonth)) {
        return false;
      }

      // Category filter
      if (selectedCategory !== "all" && offer.category !== selectedCategory) {
        return false;
      }

      // 100% Free toggle
      if (onlyCompletelyFree && !offer.isCompletelyFree) {
        return false;
      }

      // Wishlist toggle
      if (onlyWishlist && !wishlist.includes(offer.id)) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesBrand = offer.brand.toLowerCase().includes(q);
        const matchesReward = offer.reward.toLowerCase().includes(q);
        const matchesCategory = offer.category.toLowerCase().includes(q);
        const matchesNotes = offer.notes?.toLowerCase().includes(q);
        if (!matchesBrand && !matchesReward && !matchesCategory && !matchesNotes) {
          return false;
        }
      }

      return true;
    });
  }, [region, selectedMonth, selectedCategory, onlyCompletelyFree, onlyWishlist, wishlist, searchQuery]);

  // Current active month label
  const activeMonthLabel = useMemo(() => {
    if (!selectedMonth) return "All Year";
    return BIRTHDAY_MONTHS.find((m) => m.value === selectedMonth)?.label ?? "All Year";
  }, [selectedMonth]);

  const userBirthMonthName = useMemo(() => {
    if (!user?.birthdayMonth) return null;
    return BIRTHDAY_MONTHS.find((m) => m.value === user.birthdayMonth)?.label ?? null;
  }, [user?.birthdayMonth]);

  return (
    <div className="mx-auto max-w-4xl px-4 pb-28 pt-6 sm:px-6">
      <ConfettiBurst fireKey={confettiKey} />

      {/* Header Eyebrow */}
      <div className="flex items-center justify-between gap-2">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/20">
          <Cake size={13} aria-hidden="true" />
          <span>Birthday Month Freebies · Life Made Easy</span>
        </div>
        {userBirthMonthName && (
          <span className="text-xs font-medium text-mute hidden sm:inline-block">
            Your Birthday: <strong className="text-ink font-semibold">{userBirthMonthName}</strong>
          </span>
        )}
      </div>

      {/* Primary Heading strictly matching e2e contracts */}
      <div className="mt-3 flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2">
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-4xl">
          {active ? `Birthday treats in ${active.label}.` : "Your birthday month freebies, on us-ish."}
        </h1>
      </div>

      <p className="mt-2 text-sm text-mute sm:text-base leading-relaxed max-w-2xl">
        Discover verified birthday rewards, complimentary meals, desserts, and secret perks across Australia, the US,
        UK, Europe, India, and UAE. Save your favourites, set an alert, and redeem with a mate.
      </p>

      {/* Celebration Festive Card */}
      <div className="relative mt-6 overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500/15 via-card to-brand/10 p-5 sm:p-6 ring-1 ring-line shadow-clay">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-2xl" aria-hidden="true">
                🎂
              </span>
              <h2 className="font-display text-lg font-bold text-ink">
                {userBirthMonthName && user && selectedMonth === user.birthdayMonth
                  ? `Happy Birthday Month, ${user.displayName || "Member"}!`
                  : `Celebrating your birthday in ${activeMonthLabel}?`}
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-mute max-w-lg">
              Most brands require you to join their rewards club 7–30 days prior. Plan your birthday route now and never
              leave a free burger or boba behind.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCelebrate}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl bg-brand px-4 text-xs sm:text-sm font-semibold text-white shadow-sm transition hover:bg-brand-ink active:scale-95 cursor-pointer"
            >
              <PartyPopper size={16} />
              <span>Celebrate! 🥳</span>
            </button>
            <Link
              href="/settings"
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-2xl bg-card px-3 text-xs font-semibold text-ink ring-1 ring-line hover:bg-paper active:scale-95 transition"
            >
              <Sparkles size={14} className="text-amber-500" />
              <span>{user?.birthdayMonth ? "Edit Birthday" : "Set Birthday in Profile"}</span>
            </Link>
          </div>
        </div>

        {/* 12-Month Quick Selector Pill Bar */}
        <div className="mt-5 border-t border-line/60 pt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-ink flex items-center gap-1">
              <Calendar size={13} className="text-mute" />
              Filter by Birthday Month:
            </span>
            {selectedMonth && (
              <button
                type="button"
                onClick={() => {
                  void triggerHaptic("light");
                  setSelectedMonth(null);
                }}
                className="text-[11px] font-semibold text-accent hover:underline cursor-pointer"
              >
                Show All Year
              </button>
            )}
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            <button
              type="button"
              onClick={() => {
                void triggerHaptic("selection");
                setSelectedMonth(null);
              }}
              className={cn(
                "min-h-[36px] rounded-xl px-3 text-xs font-medium transition shrink-0 cursor-pointer",
                selectedMonth === null
                  ? "bg-ink text-paper font-semibold shadow-xs"
                  : "bg-paper text-mute hover:text-ink ring-1 ring-line",
              )}
            >
              All Year
            </button>
            {BIRTHDAY_MONTHS.map((m) => {
              const isSelected = selectedMonth === m.value;
              const isUserMonth = user?.birthdayMonth === m.value;
              const isCurrentCalMonth = currentCalendarMonth === m.value;

              return (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => {
                    void triggerHaptic("selection");
                    setSelectedMonth(m.value);
                  }}
                  className={cn(
                    "min-h-[36px] rounded-xl px-3 text-xs transition shrink-0 cursor-pointer flex items-center gap-1",
                    isSelected
                      ? "bg-brand text-white font-semibold shadow-xs"
                      : "bg-paper text-ink ring-1 ring-line hover:bg-card",
                  )}
                >
                  <span>{m.short}</span>
                  {isUserMonth && <span title="Your Birthday Month">🎂</span>}
                  {isCurrentCalMonth && !isUserMonth && (
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" title="Current Month" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Regional Selector Pills */}
      <section className="mt-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-mute flex items-center gap-1.5">
            <MapPin size={13} />
            Select Region
          </span>
          <span className="text-xs text-mute">{filteredOffers.length} perks available</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
          <Link
            href="/birthday-freebies"
            aria-current={!region ? "page" : undefined}
            onClick={() => void triggerHaptic("light")}
            className={cn(
              "flex min-h-[48px] items-center justify-center gap-2 rounded-2xl px-3 text-xs sm:text-sm font-semibold transition text-center",
              !region
                ? "bg-ink text-paper shadow-xs"
                : "bg-card text-ink ring-1 ring-line hover:bg-paper hover:shadow-xs",
            )}
          >
            <span>🌍 All Regions</span>
          </Link>
          {BIRTHDAY_REGIONS.map((r) => {
            const on = r.code === region;
            const regionCount = CURATED_BIRTHDAY_OFFERS.filter((o) => o.regions.includes(r.code)).length;
            return (
              <Link
                key={r.code}
                href={`/birthday-freebies/${r.code}`}
                aria-current={on ? "page" : undefined}
                onClick={() => void triggerHaptic("light")}
                className={cn(
                  "flex min-h-[48px] items-center justify-between rounded-2xl px-3 text-xs sm:text-sm font-semibold transition",
                  on
                    ? "bg-brand text-white shadow-xs"
                    : "bg-card text-ink ring-1 ring-line hover:bg-paper hover:shadow-xs",
                )}
              >
                <span className="flex items-center gap-1.5 truncate">
                  <span>{r.flagEmoji}</span>
                  <span className="truncate">{r.label}</span>
                </span>
                <span
                  className={cn(
                    "ml-1 rounded-full px-1.5 py-0.5 text-[10px]",
                    on ? "bg-white/20 text-white" : "bg-paper text-mute",
                  )}
                >
                  {regionCount}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Search & Category Filter Bar */}
      <section className="mt-6 space-y-3">
        {/* Search input + toggles */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mute" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search brands, treats, burgers, zoo, boba..."
              className="w-full rounded-2xl bg-card pl-10 pr-4 py-2.5 text-sm text-ink placeholder:text-mute ring-1 ring-line focus:outline-none focus:ring-2 focus:ring-brand"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-mute hover:text-ink cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                void triggerHaptic("light");
                setOnlyCompletelyFree((v) => !v);
              }}
              className={cn(
                "inline-flex min-h-[42px] items-center gap-1.5 rounded-2xl px-3 text-xs font-semibold transition cursor-pointer shrink-0",
                onlyCompletelyFree
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-card text-ink ring-1 ring-line hover:bg-paper",
              )}
            >
              <CheckCircle2 size={13} />
              <span>100% Free Only</span>
            </button>

            <button
              type="button"
              onClick={() => {
                void triggerHaptic("light");
                setOnlyWishlist((v) => !v);
              }}
              className={cn(
                "inline-flex min-h-[42px] items-center gap-1.5 rounded-2xl px-3 text-xs font-semibold transition cursor-pointer shrink-0",
                onlyWishlist ? "bg-rose-600 text-white shadow-xs" : "bg-card text-ink ring-1 ring-line hover:bg-paper",
              )}
            >
              <Heart size={13} className={onlyWishlist ? "fill-white" : ""} />
              <span>Wishlist ({wishlist.length})</span>
            </button>
          </div>
        </div>

        {/* Category horizontal scroll */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {CATEGORIES.map((cat) => {
            const isCatActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  void triggerHaptic("selection");
                  setSelectedCategory(cat.id);
                }}
                className={cn(
                  "min-h-[38px] rounded-xl px-3 text-xs transition shrink-0 cursor-pointer flex items-center gap-1.5",
                  isCatActive
                    ? "bg-ink text-paper font-semibold shadow-xs"
                    : "bg-card text-ink ring-1 ring-line hover:bg-paper",
                )}
              >
                <span>{cat.emoji}</span>
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Active Filter Indicators */}
      {(searchQuery || selectedCategory !== "all" || onlyCompletelyFree || onlyWishlist) && (
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-mute">
          <span>Active filters:</span>
          {searchQuery && (
            <span className="inline-flex items-center gap-1 rounded-full bg-paper px-2.5 py-0.5 ring-1 ring-line text-ink">
              “{searchQuery}”
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="text-mute hover:text-ink cursor-pointer"
              >
                ×
              </button>
            </span>
          )}
          {selectedCategory !== "all" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-paper px-2.5 py-0.5 ring-1 ring-line text-ink">
              {CATEGORIES.find((c) => c.id === selectedCategory)?.label}
              <button
                type="button"
                onClick={() => setSelectedCategory("all")}
                className="text-mute hover:text-ink cursor-pointer"
              >
                ×
              </button>
            </span>
          )}
          {onlyCompletelyFree && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/20">
              100% Free
              <button
                type="button"
                onClick={() => setOnlyCompletelyFree(false)}
                className="hover:opacity-75 cursor-pointer"
              >
                ×
              </button>
            </span>
          )}
          {onlyWishlist && (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2.5 py-0.5 text-rose-600 dark:text-rose-400 ring-1 ring-rose-500/20">
              Wishlist Only
              <button type="button" onClick={() => setOnlyWishlist(false)} className="hover:opacity-75 cursor-pointer">
                ×
              </button>
            </span>
          )}
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setSelectedCategory("all");
              setOnlyCompletelyFree(false);
              setOnlyWishlist(false);
            }}
            className="text-accent underline font-semibold ml-auto cursor-pointer"
          >
            Reset all
          </button>
        </div>
      )}

      {/* Main Treats Grid */}
      <section className="mt-6 space-y-4">
        {filteredOffers.length === 0 ? (
          <div className="rounded-3xl bg-card p-10 text-center ring-1 ring-line shadow-xs">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-amber-500/10 text-amber-500 mb-3">
              <Gift size={28} />
            </div>
            <h3 className="font-display text-base font-bold text-ink">No treats match your criteria</h3>
            <p className="mt-1 text-xs text-mute max-w-sm mx-auto">
              Try switching your region, selecting "All Months", or clearing the search filters to discover more perks.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("all");
                setOnlyCompletelyFree(false);
                setOnlyWishlist(false);
                setSelectedMonth(null);
              }}
              className="mt-4 inline-flex min-h-[40px] items-center gap-2 rounded-2xl bg-brand px-4 text-xs font-semibold text-white shadow-xs"
            >
              Show all birthday treats
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {filteredOffers.map((offer) => {
              const isSaved = wishlist.includes(offer.id);
              const isExpanded = !!expandedIds[offer.id];

              return (
                <div
                  key={offer.id}
                  className="group relative flex flex-col justify-between rounded-3xl bg-card p-5 ring-1 ring-line transition hover:shadow-clay hover:ring-brand/30"
                >
                  <div>
                    {/* Top card row: brand, category, wishlist icon */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-paper ring-1 ring-line text-lg">
                          {offer.category === "food"
                            ? "🍔"
                            : offer.category === "drinks"
                              ? "☕"
                              : offer.category === "sweets"
                                ? "🍩"
                                : offer.category === "beauty"
                                  ? "💄"
                                  : offer.category === "retail"
                                    ? "🛍️"
                                    : "🎢"}
                        </span>
                        <div className="min-w-0">
                          <span className="block font-display text-sm font-bold text-ink truncate">{offer.brand}</span>
                          <span className="block text-[11px] text-mute capitalize">{offer.category}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => toggleWishlist(offer.id)}
                          aria-label={isSaved ? "Remove from wishlist" : "Save to wishlist"}
                          className="grid h-9 w-9 place-items-center rounded-xl bg-paper text-mute ring-1 ring-line hover:text-rose-500 hover:bg-card active:scale-90 transition cursor-pointer"
                        >
                          {isSaved ? (
                            <BookmarkCheck size={16} className="text-rose-500 fill-rose-500" />
                          ) : (
                            <Bookmark size={16} />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Reward Title */}
                    <div className="mt-3">
                      <h3 className="font-display text-base font-bold text-ink leading-snug">{offer.reward}</h3>
                    </div>

                    {/* Badges: Value, Timing */}
                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold",
                          offer.isCompletelyFree
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/20"
                            : "bg-paper text-ink ring-1 ring-line",
                        )}
                      >
                        {offer.isCompletelyFree ? "100% Free" : "Member Perk"} · {offer.valueEst}
                      </span>

                      <span className="inline-flex items-center gap-1 rounded-full bg-paper px-2.5 py-0.5 text-[11px] text-mute ring-1 ring-line">
                        <Clock size={11} />
                        {offer.timing}
                      </span>
                    </div>

                    {/* Notes if present */}
                    {offer.notes && <p className="mt-2 text-xs text-mute italic">Note: {offer.notes}</p>}

                    {/* How to claim accordion */}
                    <div className="mt-3 border-t border-line/60 pt-3">
                      <button
                        type="button"
                        onClick={() => toggleExpanded(offer.id)}
                        className="flex w-full items-center justify-between text-xs font-semibold text-accent hover:underline cursor-pointer"
                      >
                        <span className="flex items-center gap-1">
                          <HelpCircle size={13} />
                          {isExpanded ? "Hide claim steps" : "How to claim this treat"}
                        </span>
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>

                      {isExpanded && (
                        <ol className="mt-2.5 space-y-1.5 rounded-2xl bg-paper p-3 text-xs text-ink/90 ring-1 ring-line">
                          {offer.howToClaim.map((step, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-brand/10 text-[10px] font-bold text-brand mt-0.5">
                                {idx + 1}
                              </span>
                              <span className="leading-relaxed">{step}</span>
                            </li>
                          ))}
                          {offer.requiresEarlySignup && (
                            <li className="pt-1 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                              ⚠️ Requires joining before your birthday month.
                            </li>
                          )}
                        </ol>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons: Redeem with Mate & Official Link */}
                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line/60 pt-3">
                    <button
                      type="button"
                      onClick={() => void handleShareWithMate(offer)}
                      title={BIRTHDAY_MATE_CTA.blurb}
                      className="inline-flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-2xl bg-brand px-3 text-xs font-semibold text-white shadow-xs hover:bg-brand-ink active:scale-95 transition cursor-pointer"
                    >
                      <Users size={13} />
                      <span>{BIRTHDAY_MATE_CTA.label}</span>
                    </button>

                    <a
                      href={offer.claimUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-2xl bg-paper px-3 text-xs font-semibold text-ink ring-1 ring-line hover:bg-card active:scale-95 transition"
                    >
                      <span>Join / Claim</span>
                      <ExternalLink size={12} className="text-mute" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Birthday Month Alert Preferences Card */}
      <section className="mt-10 rounded-3xl bg-card p-5 sm:p-6 ring-1 ring-line shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-brand/10 text-brand">
                <Cake size={20} />
              </span>
              <div>
                <h3 className="font-display text-base font-bold text-ink">Birthday Month Alerts</h3>
                <p className="text-xs text-mute">
                  Receive a personal heads-up on the 1st of your birthday month with all your live treats.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <button
                type="button"
                onClick={() => void handleToggleAlerts()}
                disabled={isSavingAlerts}
                className={cn(
                  "relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
                  alertsEnabled ? "bg-brand" : "bg-line",
                )}
                role="switch"
                aria-checked={alertsEnabled}
                aria-label="Toggle birthday month alerts"
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out mt-1 ml-1",
                    alertsEnabled ? "translate-x-5" : "translate-x-0",
                  )}
                />
              </button>
            ) : (
              <Link
                href="/settings"
                className="inline-flex min-h-[40px] items-center gap-2 rounded-2xl bg-brand px-4 text-xs font-semibold text-white shadow-xs hover:bg-brand-ink"
              >
                Sign in to enable alerts
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* 4 Secrets to Maximizing Your Birthday Haul */}
      <section className="mt-8 rounded-3xl bg-paper p-5 sm:p-6 ring-1 ring-line">
        <h3 className="font-display text-base font-bold text-ink flex items-center gap-2">
          <Sparkles size={16} className="text-amber-500" />
          Pro Tips: How to Maximize Your Birthday Freebies
        </h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 text-xs">
          <div className="rounded-2xl bg-card p-3.5 ring-1 ring-line">
            <strong className="block text-ink font-semibold mb-1">1. Sign Up 2–4 Weeks Early</strong>
            <p className="text-mute leading-relaxed">
              Most loyalty systems generate birthday vouchers automatically on the 1st of the month. If your birthday is
              in October, join by September 25th.
            </p>
          </div>
          <div className="rounded-2xl bg-card p-3.5 ring-1 ring-line">
            <strong className="block text-ink font-semibold mb-1">2. Keep Photo ID Ready</strong>
            <p className="text-mute leading-relaxed">
              Attractions like Taronga Zoo ($1 entry) and restaurants like Denny’s require government-issued photo ID
              confirming your DOB.
            </p>
          </div>
          <div className="rounded-2xl bg-card p-3.5 ring-1 ring-line">
            <strong className="block text-ink font-semibold mb-1">3. Check App Reward Wallets</strong>
            <p className="text-mute leading-relaxed">
              Brands like Boost, Starbucks, and Sephora issue digital barcodes directly inside their native apps rather
              than email coupons.
            </p>
          </div>
          <div className="rounded-2xl bg-card p-3.5 ring-1 ring-line">
            <strong className="block text-ink font-semibold mb-1">4. Redeem With a Mate</strong>
            <p className="text-mute leading-relaxed">
              Freebies like San Churro (Churros for Two) and Wild Wadi Waterpark tickets are designed to be shared. Tap
              “Redeem with a Mate” on any card to invite a friend!
            </p>
          </div>
        </div>
      </section>

      {/* Add Your Business Perk / Merchant CTA */}
      <section className="mt-8 rounded-3xl bg-gradient-to-r from-card to-paper p-5 sm:p-6 ring-1 ring-line shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-accent flex items-center gap-1">
              <Building2 size={13} />
              For Business Owners & Cafes
            </span>
            <h3 className="font-display text-base font-bold text-ink">List your venue's birthday perk on AirPal</h3>
            <p className="text-xs text-mute max-w-lg">
              Drive local celebrations and new loyal customers to your door. Publish birthday perks, member discounts,
              and special promotions in minutes.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/business/promotions/new"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl bg-brand px-4 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-brand-ink transition active:scale-95"
            >
              <span>Add Your Perk</span>
              <ArrowRight size={14} />
            </Link>
            <Link
              href="/business"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl bg-card px-4 text-xs sm:text-sm font-semibold text-ink ring-1 ring-line hover:bg-paper transition"
            >
              <span>Business Hub</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Deals & Live Offers Cross-link */}
      <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-3xl bg-card p-5 ring-1 ring-line">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand/10 text-brand shrink-0">
            <Compass size={22} />
          </span>
          <div>
            <h4 className="font-display text-sm font-bold text-ink">Explore Year-Round Deals</h4>
            <p className="text-xs text-mute">
              Looking for perks today even if it's not your birthday? Browse live member promotions.
            </p>
          </div>
        </div>
        <Link
          href="/deals"
          className="inline-flex min-h-[42px] items-center gap-1.5 rounded-2xl bg-paper px-4 text-xs font-semibold text-ink ring-1 ring-line hover:bg-card shrink-0"
        >
          <span>Browse Member Deals</span>
          <ArrowRight size={13} />
        </Link>
      </div>

      {/* Legal & Editorial Disclaimer */}
      <p className="mt-8 text-center text-xs text-mute leading-relaxed max-w-xl mx-auto">{BIRTHDAY_DISCLAIMER}</p>
    </div>
  );
}
