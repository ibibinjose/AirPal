import { useState, useMemo, useEffect } from "react";
import { Link, useParams } from "wouter";
import { collection, deleteDoc, doc, onSnapshot, setDoc } from "firebase/firestore";
import {
  AlertTriangle,
  ArrowRight,
  Bookmark,
  BookmarkCheck,
  Brush,
  Building2,
  Cake,
  Calendar,
  CheckCircle2,
  CupSoda,
  ExternalLink,
  Gift,
  Heart,
  HelpCircle,
  MapPin,
  PartyPopper,
  Search,
  ShoppingBag,
  Sparkles,
  Ticket,
  Users,
  UtensilsCrossed,
  X,
  type LucideIcon,
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
import { getFirebaseDb } from "@/lib/firebase";

const CATEGORIES: Array<{ id: FreebieCategory; label: string; icon: LucideIcon }> = [
  { id: "all", label: "All Treats", icon: Sparkles },
  { id: "food", label: "Dining", icon: UtensilsCrossed },
  { id: "sweets", label: "Sweets", icon: Cake },
  { id: "drinks", label: "Drinks", icon: CupSoda },
  { id: "beauty", label: "Beauty", icon: Brush },
  { id: "retail", label: "Shopping", icon: ShoppingBag },
  { id: "activity", label: "Fun", icon: Ticket },
];

/** 4 Bright Color Card Themes: Pink, Blue, Green, Red */
interface CardColorTheme {
  name: "pink" | "blue" | "green" | "red";
  cardBg: string;
  badgeBg: string;
  btnPrimary: string;
  btnSecondary: string;
  glow: string;
}

const COLOR_THEMES: CardColorTheme[] = [
  // 1. Bright Pink
  {
    name: "pink",
    cardBg: "bg-gradient-to-br from-[#ff1b7b] via-[#ff3b8d] to-[#e11d48] text-white",
    badgeBg: "bg-white/20 text-white backdrop-blur-md",
    btnPrimary: "bg-white text-[#e11d48] hover:bg-white/95",
    btnSecondary: "bg-white/20 text-white hover:bg-white/30 ring-1 ring-white/30",
    glow: "shadow-[0_12px_28px_-6px_rgba(255,27,123,0.38)] ring-1 ring-white/25",
  },
  // 2. Bright Blue
  {
    name: "blue",
    cardBg: "bg-gradient-to-br from-[#0052ff] via-[#0284c7] to-[#0369a1] text-white",
    badgeBg: "bg-white/20 text-white backdrop-blur-md",
    btnPrimary: "bg-white text-[#0052ff] hover:bg-white/95",
    btnSecondary: "bg-white/20 text-white hover:bg-white/30 ring-1 ring-white/30",
    glow: "shadow-[0_12px_28px_-6px_rgba(0,82,255,0.38)] ring-1 ring-white/25",
  },
  // 3. Bright Green
  {
    name: "green",
    cardBg: "bg-gradient-to-br from-[#00b341] via-[#10b981] to-[#047857] text-white",
    badgeBg: "bg-white/20 text-white backdrop-blur-md",
    btnPrimary: "bg-white text-[#047857] hover:bg-white/95",
    btnSecondary: "bg-white/20 text-white hover:bg-white/30 ring-1 ring-white/30",
    glow: "shadow-[0_12px_28px_-6px_rgba(0,179,65,0.38)] ring-1 ring-white/25",
  },
  // 4. Bright Red
  {
    name: "red",
    cardBg: "bg-gradient-to-br from-[#ff2424] via-[#ef4444] to-[#b91c1c] text-white",
    badgeBg: "bg-white/20 text-white backdrop-blur-md",
    btnPrimary: "bg-white text-[#dc2626] hover:bg-white/95",
    btnSecondary: "bg-white/20 text-white hover:bg-white/30 ring-1 ring-white/30",
    glow: "shadow-[0_12px_28px_-6px_rgba(255,36,36,0.38)] ring-1 ring-white/25",
  },
];

export function BirthdayFreebiesPage() {
  const params = useParams<{ region?: string }>();
  const raw = params.region?.trim().toLowerCase();
  const region = raw && isBirthdayRegionCode(raw) ? raw : null;
  const active = BIRTHDAY_REGIONS.find((r) => r.code === region) ?? null;

  const { user, refreshUser, requireUser } = useAuth();
  const currentCalendarMonth = useMemo(() => new Date().getMonth() + 1, []);

  // The account profile is authoritative; this state is only a view of it.
  const [myBirthdayMonth, setMyBirthdayMonth] = useState<number | null>(() => {
    if (user?.birthdayMonth && user.birthdayMonth >= 1 && user.birthdayMonth <= 12) {
      return user.birthdayMonth;
    }
    return null;
  });

  const [isSavingMonth, setIsSavingMonth] = useState(false);

  useEffect(() => {
    setMyBirthdayMonth(
      user?.birthdayMonth && user.birthdayMonth >= 1 && user.birthdayMonth <= 12 ? user.birthdayMonth : null,
    );
  }, [user?.uid, user?.birthdayMonth]);

  // Filter states: default to user's birthday month if set, otherwise current calendar month
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
  const [confettiKey, setConfettiKey] = useState(0);

  const handleSetBirthdayMonth = async (month: number | null) => {
    if (!requireUser("Sign in to save your birthday month to your AirPal account.")) return;
    if (isSavingMonth) return;
    void triggerHaptic("medium");
    const monthLabel = month ? BIRTHDAY_MONTHS.find((m) => m.value === month)?.label : null;
    setIsSavingMonth(true);
    try {
      await setBirthdayAlertPrefsRemote({
        birthdayMonth: month,
        birthdayAlertsEnabled: true,
      });
      setMyBirthdayMonth(month);
      if (month !== null) {
        setSelectedMonth(month);
        setConfettiKey((k) => k + 1);
      }
      await refreshUser?.();
      toast.success(monthLabel ? `Birthday month set to ${monthLabel}! 🎂` : "Birthday month cleared.");
    } catch (err) {
      toast.error(friendlyBirthdayError(err));
    } finally {
      setIsSavingMonth(false);
    }
  };

  // Claim steps modal
  const [claimModalOffer, setClaimModalOffer] = useState<CuratedBirthdayOffer | null>(null);

  const [wishlist, setWishlist] = useState<string[]>([]);
  const [savingWishlist, setSavingWishlist] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setWishlist([]);
    if (!user) return;
    const db = getFirebaseDb();
    if (!db) {
      toast.error("Birthday wishlist needs a server connection.");
      return;
    }
    return onSnapshot(
      collection(db, "users", user.uid, "savedBirthdayOffers"),
      (snapshot) => setWishlist(snapshot.docs.map((item) => item.id)),
      () => toast.error("Could not load your saved birthday offers."),
    );
  }, [user?.uid]);

  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [isSavingAlerts, setIsSavingAlerts] = useState(false);

  const toggleWishlist = async (id: string) => {
    if (!user) {
      requireUser("Sign in to save birthday offers to your AirPal account.");
      return;
    }
    if (savingWishlist.has(id)) return;
    const db = getFirebaseDb();
    if (!db) {
      toast.error("Birthday wishlist needs a server connection.");
      return;
    }
    void triggerHaptic("medium");
    setSavingWishlist((current) => new Set(current).add(id));
    try {
      const savedRef = doc(db, "users", user.uid, "savedBirthdayOffers", id);
      if (wishlist.includes(id)) await deleteDoc(savedRef);
      else await setDoc(savedRef, { offerId: id, savedAt: new Date().toISOString() });
    } catch {
      toast.error("Could not save this offer. Check your connection and try again.");
    } finally {
      setSavingWishlist((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    }
  };

  const handleCelebrate = () => {
    void triggerHaptic("heavy");
    setConfettiKey((k) => k + 1);
    toast.success("Happy Birthday Month! 🥳 Enjoy all your treats!");
  };

  const handleShareWithMate = async (offer: CuratedBirthdayOffer) => {
    void triggerHaptic("light");
    const shareUrl = typeof window !== "undefined" ? window.location.href : "https://airpal.me/birthday-freebies";
    const shareText = `Hey! Found this birthday freebie from ${offer.brand}: ${offer.reward}! Let's grab it together on AirPal:`;

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `${offer.brand} Birthday Treat · AirPal`,
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch {
        /* user cancelled or fallback */
      }
    }

    try {
      await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
      toast.success("Link copied! Share it with your mate.");
    } catch {
      toast.error("Could not copy link.");
    }
  };

  const handleToggleAlerts = async () => {
    void triggerHaptic("light");
    const nextState = !alertsEnabled;
    setAlertsEnabled(nextState);
    if (!user) {
      toast.info("Sign in to sync your birthday alerts across devices.");
      return;
    }
    setIsSavingAlerts(true);
    try {
      await setBirthdayAlertPrefsRemote({ birthdayAlertsEnabled: nextState });
      toast.success(nextState ? "Birthday alerts active!" : "Birthday alerts paused.");
    } catch (err) {
      setAlertsEnabled(!nextState);
      toast.error(friendlyBirthdayError(err));
    } finally {
      setIsSavingAlerts(false);
    }
  };

  // Filter offers
  const filteredOffers = useMemo(() => {
    return CURATED_BIRTHDAY_OFFERS.filter((offer) => {
      if (region && !offer.regions.includes(region)) return false;
      if (selectedMonth !== null && offer.months.length > 0 && !offer.months.includes(selectedMonth)) return false;
      if (selectedCategory !== "all" && offer.category !== selectedCategory) return false;
      if (onlyCompletelyFree && !offer.isCompletelyFree) return false;
      if (onlyWishlist && !wishlist.includes(offer.id)) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const match =
          offer.brand.toLowerCase().includes(q) ||
          offer.reward.toLowerCase().includes(q) ||
          offer.category.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [region, selectedMonth, selectedCategory, onlyCompletelyFree, onlyWishlist, wishlist, searchQuery]);

  const activeMonthLabel = useMemo(() => {
    if (!selectedMonth) return "All Year";
    return BIRTHDAY_MONTHS.find((m) => m.value === selectedMonth)?.label ?? "All Year";
  }, [selectedMonth]);

  const myBirthMonthLabel = useMemo(() => {
    if (!myBirthdayMonth) return null;
    return BIRTHDAY_MONTHS.find((m) => m.value === myBirthdayMonth)?.label ?? null;
  }, [myBirthdayMonth]);

  return (
    <div className="mx-auto max-w-5xl px-4 pb-28 pt-4 sm:px-6">
      <ConfettiBurst fireKey={confettiKey} />

      {/* Top Bar with Birthday Month Chooser */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-600 dark:text-rose-400 ring-1 ring-rose-500/20">
          <Cake size={13} aria-hidden="true" />
          <span>Birthday Freebies</span>
        </div>

        {/* Interactive Birthday Month Chooser */}
        <div className="flex items-center gap-2">
          <label
            htmlFor="user-birthday-month-select"
            className="text-xs font-semibold text-ink flex items-center gap-1"
          >
            <span>🎂 Your Birthday:</span>
          </label>
          <div className="relative">
            <select
              id="user-birthday-month-select"
              aria-label="Choose your birthday month"
              value={myBirthdayMonth ?? ""}
              onChange={(e) => handleSetBirthdayMonth(e.target.value ? Number(e.target.value) : null)}
              disabled={isSavingMonth}
              className="min-h-[34px] rounded-xl bg-card border border-line pl-2.5 pr-8 py-1 text-xs font-bold text-ink shadow-xs transition hover:border-brand/40 focus:outline-hidden focus:ring-2 focus:ring-brand/30 cursor-pointer disabled:opacity-50 appearance-none"
            >
              <option value="">Choose Month... 🎂</option>
              {BIRTHDAY_MONTHS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label} ({m.short})
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-mute">
              <span className="text-[10px]">▼</span>
            </div>
          </div>
        </div>
      </div>

      {/* Primary Heading (Strict contract for E2E tests) */}
      <div className="mt-3 flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2">
        <h1 className="font-display text-2xl font-black tracking-tight text-ink sm:text-4xl">
          {active ? `Birthday treats in ${active.label}.` : "Your Birthday Month Freebies."}
        </h1>
      </div>

      <p className="mt-1 text-xs text-mute sm:text-sm max-w-xl">
        Free meals, drinks, desserts & gifts curated for your celebration.
      </p>

      {/* Region Selector Pills */}
      <div className="mt-4 flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        <MapPin size={13} className="shrink-0 text-accent ml-1 mr-0.5" />
        <Link
          href="/birthday-freebies"
          className={cn(
            "min-h-[34px] rounded-full px-3 text-xs font-semibold transition shrink-0 flex items-center gap-1",
            region === null ? "bg-brand text-white shadow-xs" : "bg-card text-ink ring-1 ring-line hover:bg-paper",
          )}
        >
          <span>Global / All</span>
        </Link>
        {BIRTHDAY_REGIONS.map((r) => {
          const isRegActive = region === r.code;
          return (
            <Link
              key={r.code}
              href={`/birthday-freebies/${r.code}`}
              className={cn(
                "min-h-[34px] rounded-full px-3 text-xs font-semibold transition shrink-0 flex items-center gap-1",
                isRegActive ? "bg-brand text-white shadow-xs" : "bg-card text-ink ring-1 ring-line hover:bg-paper",
              )}
            >
              {r.flagEmoji && <span>{r.flagEmoji}</span>}
              <span>{r.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Compact Month Filter & Celebration Strip */}
      <div className="mt-3.5 rounded-2xl bg-card p-3 ring-1 ring-line shadow-xs">
        <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
          <div className="flex items-center gap-2 text-xs font-bold text-ink flex-wrap">
            <div className="flex items-center gap-1.5">
              <Calendar size={13} className="text-rose-500" />
              <span>
                Viewing: <strong className="text-brand font-black">{activeMonthLabel}</strong>
              </span>
            </div>
            {myBirthdayMonth && selectedMonth !== myBirthdayMonth && (
              <button
                type="button"
                onClick={() => {
                  void triggerHaptic("selection");
                  setSelectedMonth(myBirthdayMonth);
                }}
                className="rounded-full bg-rose-500/15 text-rose-700 dark:text-rose-300 px-2 py-0.5 text-[11px] font-bold ring-1 ring-rose-500/30 hover:bg-rose-500/25 cursor-pointer transition"
              >
                🎂 Switch to My Month ({myBirthMonthLabel?.slice(0, 3)})
              </button>
            )}
          </div>
          <div className="flex items-center gap-1.5 ml-auto">
            {selectedMonth && selectedMonth !== myBirthdayMonth && (
              <button
                type="button"
                onClick={() => handleSetBirthdayMonth(selectedMonth)}
                className="inline-flex items-center gap-1 rounded-xl bg-paper px-2.5 py-1 text-xs font-semibold text-ink ring-1 ring-line hover:bg-card shadow-xs cursor-pointer transition"
                title="Save this month as your birthday month"
              >
                <span>🎂 Set as My Month</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleCelebrate}
              className="inline-flex items-center gap-1 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 px-2.5 py-1 text-xs font-bold text-white shadow-xs hover:brightness-105 active:scale-95 cursor-pointer"
            >
              <PartyPopper size={12} />
              <span>Celebrate! 🥳</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar">
          <button
            type="button"
            onClick={() => {
              void triggerHaptic("selection");
              setSelectedMonth(null);
            }}
            className={cn(
              "min-h-[32px] rounded-lg px-2.5 text-xs font-medium transition shrink-0 cursor-pointer",
              selectedMonth === null
                ? "bg-ink text-paper font-bold shadow-xs"
                : "bg-paper text-mute hover:text-ink ring-1 ring-line",
            )}
          >
            All Year
          </button>
          {BIRTHDAY_MONTHS.map((m) => {
            const isSelected = selectedMonth === m.value;
            const isUserBirthdayMonth = myBirthdayMonth === m.value;
            return (
              <button
                key={m.value}
                type="button"
                onClick={() => {
                  void triggerHaptic("selection");
                  setSelectedMonth(m.value);
                }}
                className={cn(
                  "min-h-[32px] rounded-lg px-2 text-xs transition shrink-0 cursor-pointer flex items-center gap-1",
                  isSelected
                    ? "bg-brand text-white font-bold shadow-xs"
                    : isUserBirthdayMonth
                      ? "bg-rose-500/15 text-rose-700 dark:text-rose-300 font-semibold ring-1 ring-rose-500/30"
                      : "bg-paper text-mute hover:text-ink ring-1 ring-line",
                )}
              >
                <span>{m.label.slice(0, 3)}</span>
                {isUserBirthdayMonth && (
                  <span className="text-[10px]" title="Your Birthday Month">
                    🎂
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Search & Category Pills */}
      <section className="mt-3.5 space-y-2">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mute" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search treats, burgers, drinks, zoo..."
              aria-label="Search birthday freebies"
              className="w-full rounded-xl bg-card pl-9 pr-10 py-2 text-sm text-ink placeholder:text-mute ring-1 ring-line focus:outline-none focus:ring-2 focus:ring-brand"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 grid h-7 w-7 place-items-center rounded-full text-mute hover:text-ink cursor-pointer"
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                void triggerHaptic("light");
                setOnlyCompletelyFree((v) => !v);
              }}
              className={cn(
                "inline-flex min-h-[36px] items-center gap-1 rounded-xl px-2.5 text-xs font-semibold transition cursor-pointer shrink-0",
                onlyCompletelyFree
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-card text-ink ring-1 ring-line hover:bg-paper",
              )}
            >
              <CheckCircle2 size={12} />
              <span>100% Free</span>
            </button>

            <button
              type="button"
              onClick={() => {
                void triggerHaptic("light");
                setOnlyWishlist((v) => !v);
              }}
              className={cn(
                "inline-flex min-h-[36px] items-center gap-1 rounded-xl px-2.5 text-xs font-semibold transition cursor-pointer shrink-0",
                onlyWishlist ? "bg-rose-600 text-white shadow-xs" : "bg-card text-ink ring-1 ring-line hover:bg-paper",
              )}
            >
              <Heart size={12} className={onlyWishlist ? "fill-white" : ""} />
              <span>Wishlist ({wishlist.length})</span>
            </button>
          </div>
        </div>

        {/* Category horizontal scroll */}
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar">
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
                  "min-h-[32px] rounded-lg px-2.5 text-xs transition shrink-0 cursor-pointer flex items-center gap-1 font-medium",
                  isCatActive
                    ? "bg-ink text-paper font-bold shadow-xs"
                    : "bg-card text-ink ring-1 ring-line hover:bg-paper",
                )}
              >
                <cat.icon size={12} className="shrink-0" aria-hidden="true" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Main Treats Grid: Bright Pink, Blue, Green, Red Color Cards */}
      <section className="mt-5">
        {filteredOffers.length === 0 ? (
          <div className="rounded-3xl bg-card p-8 text-center ring-1 ring-line shadow-xs">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-amber-500/10 text-amber-500 mb-2">
              <Gift size={24} />
            </div>
            <h3 className="font-display text-sm font-bold text-ink">No treats match your filters</h3>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("all");
                setOnlyCompletelyFree(false);
                setOnlyWishlist(false);
                setSelectedMonth(null);
              }}
              className="mt-3 inline-flex min-h-[36px] items-center gap-1.5 rounded-xl bg-brand px-3 text-xs font-semibold text-white shadow-xs"
            >
              Show all birthday treats
            </button>
          </div>
        ) : (
          <div className="grid gap-3.5 sm:grid-cols-2">
            {filteredOffers.map((offer, index) => {
              const isSaved = wishlist.includes(offer.id);
              // Cycle through 4 bright themes: Pink, Blue, Green, Red
              const theme = COLOR_THEMES[index % COLOR_THEMES.length];

              const categoryEmoji =
                offer.category === "food"
                  ? "🍔"
                  : offer.category === "drinks"
                    ? "☕"
                    : offer.category === "sweets"
                      ? "🍩"
                      : offer.category === "beauty"
                        ? "💄"
                        : offer.category === "retail"
                          ? "🛍️"
                          : "🎢";

              return (
                <div
                  key={offer.id}
                  className={cn(
                    "group relative flex flex-col justify-between rounded-3xl p-4 sm:p-5 transition-transform duration-200 hover:-translate-y-0.5",
                    theme.cardBg,
                    theme.glow,
                  )}
                >
                  <div>
                    {/* Header Row: Emoji icon + Brand + Category + Wishlist */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white/20 text-lg backdrop-blur-md shadow-inner">
                          {categoryEmoji}
                        </span>
                        <div className="min-w-0">
                          <span className="block font-display text-sm font-extrabold text-white truncate tracking-tight">
                            {offer.brand}
                          </span>
                          <span className="block text-[10.5px] font-semibold uppercase tracking-wider text-white/80">
                            {offer.category}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleWishlist(offer.id)}
                        disabled={savingWishlist.has(offer.id)}
                        aria-label={isSaved ? "Remove from wishlist" : "Save to wishlist"}
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/20 hover:bg-white/30 text-white backdrop-blur-md transition active:scale-90 cursor-pointer disabled:cursor-wait disabled:opacity-60"
                      >
                        {isSaved ? (
                          <BookmarkCheck size={16} className="text-yellow-300 fill-yellow-300" />
                        ) : (
                          <Bookmark size={16} />
                        )}
                      </button>
                    </div>

                    {/* Bold Reward Headline */}
                    <h3 className="mt-3 font-display text-lg sm:text-xl font-black leading-snug line-clamp-2 text-white drop-shadow-xs">
                      {offer.reward}
                    </h3>

                    {/* Badges: Value & Timing */}
                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-bold",
                          theme.badgeBg,
                        )}
                      >
                        {offer.isCompletelyFree ? "100% Free" : "Perk"} · {offer.valueEst}
                      </span>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-medium",
                          theme.badgeBg,
                        )}
                      >
                        {offer.timing}
                      </span>
                    </div>
                  </div>

                  {/* Actions: Claim CTA + Share + Info */}
                  <div className="mt-4 flex items-center gap-2 pt-2 border-t border-white/20">
                    <a
                      href={offer.claimUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        "inline-flex min-h-[38px] flex-1 items-center justify-center gap-1.5 rounded-2xl px-3 text-xs font-extrabold shadow-md transition active:scale-95 cursor-pointer",
                        theme.btnPrimary,
                      )}
                    >
                      <span>Join & Claim</span>
                      <ExternalLink size={12} />
                    </a>

                    <button
                      type="button"
                      onClick={() => void handleShareWithMate(offer)}
                      title={BIRTHDAY_MATE_CTA.blurb}
                      className={cn(
                        "inline-flex min-h-[38px] items-center justify-center gap-1 rounded-2xl px-2.5 text-xs font-semibold transition active:scale-95 cursor-pointer shrink-0",
                        theme.btnSecondary,
                      )}
                    >
                      <Users size={12} />
                      <span className="hidden min-[380px]:inline">Invite</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setClaimModalOffer(offer)}
                      title="View claim steps"
                      className={cn(
                        "grid h-9 w-9 shrink-0 place-items-center rounded-2xl transition active:scale-95 cursor-pointer",
                        theme.btnSecondary,
                      )}
                      aria-label="View how to claim"
                    >
                      <HelpCircle size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Claim Steps Bottom Sheet / Modal */}
      {claimModalOffer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl bg-card p-5 ring-1 ring-line shadow-2xl">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-amber-500/15 text-amber-500">
                  <Gift size={16} />
                </span>
                <div>
                  <h4 className="font-display text-sm font-bold text-ink">{claimModalOffer.brand}</h4>
                  <p className="text-[11px] text-mute">{claimModalOffer.reward}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setClaimModalOffer(null)}
                className="grid h-8 w-8 place-items-center rounded-full text-mute hover:text-ink cursor-pointer"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-3 space-y-2">
              <p className="text-xs font-bold text-ink uppercase tracking-wider">How to Claim:</p>
              <ol className="space-y-1.5 text-xs text-ink">
                {claimModalOffer.howToClaim.map((step, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-brand/10 text-[10px] font-bold text-brand mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>

              {claimModalOffer.requiresEarlySignup && (
                <div className="flex items-center gap-1.5 rounded-xl bg-amber-500/10 p-2 text-[11px] font-medium text-amber-700 dark:text-amber-300">
                  <AlertTriangle size={13} className="shrink-0" />
                  <span>Requires joining before your birthday month.</span>
                </div>
              )}
            </div>

            <div className="mt-4 flex items-center gap-2 border-t border-line pt-3">
              <a
                href={claimModalOffer.claimUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex min-h-[38px] items-center justify-center gap-1 rounded-xl bg-brand text-xs font-bold text-white shadow-xs hover:bg-brand-ink"
              >
                <span>Go to {claimModalOffer.brand}</span>
                <ExternalLink size={12} />
              </a>
              <button
                type="button"
                onClick={() => setClaimModalOffer(null)}
                className="inline-flex min-h-[38px] items-center justify-center rounded-xl bg-paper px-3 text-xs font-semibold text-ink ring-1 ring-line"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Birthday Month Alerts & Merchant Strip */}
      <section className="mt-8 grid gap-3 sm:grid-cols-2">
        {/* Alerts Card */}
        <div className="flex items-center justify-between rounded-2xl bg-card p-4 ring-1 ring-line shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand">
              <Cake size={18} />
            </span>
            <div className="min-w-0">
              <h3 className="font-display text-xs font-bold text-ink">Birthday Month Alerts</h3>
              <p className="text-[11px] text-mute truncate">Heads-up on the 1st of your month.</p>
            </div>
          </div>
          {user ? (
            <button
              type="button"
              onClick={() => void handleToggleAlerts()}
              disabled={isSavingAlerts}
              className={cn(
                "relative inline-flex h-6 w-10 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out",
                alertsEnabled ? "bg-brand" : "bg-line",
              )}
              role="switch"
              aria-checked={alertsEnabled}
              aria-label="Toggle birthday month alerts"
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out mt-1 ml-1",
                  alertsEnabled ? "translate-x-4" : "translate-x-0",
                )}
              />
            </button>
          ) : (
            <Link
              href="/settings"
              className="inline-flex min-h-[32px] items-center rounded-xl bg-brand px-2.5 text-xs font-bold text-white shadow-xs"
            >
              Enable
            </Link>
          )}
        </div>

        {/* Business Partner Card */}
        <div className="flex items-center justify-between rounded-2xl bg-card p-4 ring-1 ring-line shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600">
              <Building2 size={18} />
            </span>
            <div className="min-w-0">
              <h3 className="font-display text-xs font-bold text-ink">Add Your Venue Perk</h3>
              <p className="text-[11px] text-mute truncate">List freebies & welcome celebrators.</p>
            </div>
          </div>
          <Link
            href="/business/promotions/new"
            className="inline-flex min-h-[32px] items-center gap-1 rounded-xl bg-ink px-2.5 text-xs font-bold text-paper shadow-xs shrink-0"
          >
            <span>Add Perk</span>
            <ArrowRight size={12} />
          </Link>
        </div>
      </section>

      {/* Legal & Editorial Disclaimer */}
      <p className="mt-8 text-center text-[11px] text-mute leading-relaxed max-w-xl mx-auto">{BIRTHDAY_DISCLAIMER}</p>
    </div>
  );
}
