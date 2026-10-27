import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useRoute, Link } from "wouter";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowUpRight,
  Calendar,
  Check,
  ChevronRight,
  Coffee,
  ContactRound,
  Copy,
  Edit3,
  Globe,
  Lock,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  PhoneCall,
  QrCode,
  Share2,
  Sparkles,
  Star,
  Ticket,
  UserPlus,
  UserRound,
  Users,
  Video,
  X,
} from "lucide-react";
import type { BioCatalogItem, BioTheme } from "@shared/bio";
import { bioThemeCssVars, isClaimableBioProfile, resolveBioTheme } from "@shared/bio";
import type { CSSProperties } from "react";
import { BUSINESS_CATEGORIES } from "@shared/business";
import { FollowButton, LikeButton } from "@/components/social/SocialButtons";
import { saveBioContact, upsertPerson } from "@/lib/people";
import { BrandMark } from "@/components/brand/BrandMark";
import { BioHandleButton } from "@/components/bio/BioHandleButton";
import { BioSocials } from "@/components/bio/BioSocials";
import { BioCatalogSection } from "@/components/bio/BioCatalog";
import { BioShareModal } from "@/components/bio/BioShareModal";
import { BioCatchUpModal } from "@/components/bio/BioCatchUpModal";
import { CatchUpSlotActions } from "@/components/bio/CatchUpSlotActions";
import { BioStatusModal } from "@/components/bio/BioStatusModal";
import { BioPulseRate } from "@/components/bio/BioPulseRate";
import { BioKindIcon } from "@/components/bio/BioKindBadge";
import { AddToCalendarMenu } from "@/components/calendar/AddToCalendarMenu";
import { inviteLinkFor } from "@/lib/app-invites";
import { AppleWalletButton } from "@/components/ui/AppleWalletButton";
import { GoogleWalletButton } from "@/components/ui/GoogleWalletButton";
import {
  businessCardWalletPassUrl,
  googleWalletCardUrl,
  openAppleWalletPass,
  openGoogleWalletPass,
} from "@/lib/wallet";
import { makeQrDataUrl } from "@/lib/qr";
import {
  listCatchUpsForHandle,
  subscribeCatchUpsForOwner,
  subscribeMyCatchUps,
  updateCatchUpStatus,
  toggleCatchUpReminder,
  type CatchUpItem,
  type CatchUpType,
} from "@/lib/catchup";
import { toZonedDateStr } from "@/lib/local-time";
import { buildCalendarShareDescription } from "@/lib/calendar-export";
import { Photo } from "@/components/ui/Photo";
import { Button } from "@/components/ui/Button";
import { useBio } from "@/contexts/BioContext";
import { useSocial } from "@/contexts/SocialContext";
import { canViewProfile } from "@/lib/profile-stats";
import { useAuth } from "@/contexts/AuthContext";
import { useEvents } from "@/contexts/EventsContext";
import { fetchPublicBio } from "@/lib/bio-store";
import { TradingHoursScheduleView } from "@/components/discovery/TradingHoursScheduleView";
import { resolvePublicBio } from "@/lib/bio-handle";
import { claimBioOfferRemote, joinGuestlistSignupRemote } from "@/lib/functions";
import { CITY_OPTIONS } from "@/lib/cities";
import { ensureAnonymousSession } from "@/lib/firebase";
import {
  GUESTLIST_CONSENT_V1,
  GUESTLIST_INTERESTS,
  validateGuestlistSignup,
  type GuestlistInterest,
} from "@shared/airpal-guestlist";
import { track, trackMapClick } from "@/lib/analytics";
import { firstNameOf, initialsOf } from "@/lib/profile-text";
import { setShareMeta } from "@/lib/share-meta";
import {
  AVAILABILITY_STATUSES,
  type AvailabilityStatus,
  BIO_PUBLIC_PATH,
  bioPath,
  catalogDeals,
  isSafeBioHref,
  normalizeHandle,
  parseAtHandle,
  socialLinks,
  stackLinks,
  visibleBioLinks,
} from "@shared/bio";
import { mapsPlaceIdUrl, mapsPlaceUrl } from "@/lib/maps";
import { toPublicUrl } from "@/lib/public-origin";
import { NotFoundPage } from "./NotFoundPage";
import { cn } from "@/lib/cn";
import { PingButton } from "@/components/social/PingButton";
import { BizCircle } from "@/components/bio/BizCircle";
import { triggerHaptic } from "@/lib/native";

function getInternalPath(href: string): string | null {
  if (href.startsWith("/")) return href;
  try {
    const parsed = new URL(href);
    if (parsed.hostname === "airpal.me" || parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
      return parsed.pathname + parsed.search + parsed.hash;
    }
  } catch {
    // not a valid url
  }
  return null;
}

export function BioPublicPage() {
  const [path, nav] = useLocation();
  const [, params] = useRoute(BIO_PUBLIC_PATH);
  const handle = normalizeHandle(params?.handle || params?.[0] || parseAtHandle(path) || "");
  const { user, requireUser } = useAuth();
  const { byHandle, recordTap, mine, updateProfile } = useBio();
  const [listEmail, setListEmail] = useState("");
  const [listName, setListName] = useState("");
  const [listCity, setListCity] = useState("");
  const [listCityOther, setListCityOther] = useState("");
  const [listInterests, setListInterests] = useState<GuestlistInterest[]>([]);
  const [listSending, setListSending] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [catchUpModalOpen, setCatchUpModalOpen] = useState(false);
  const [catchUpInitialType, setCatchUpInitialType] = useState<CatchUpType>("catchup");
  const [catchUpsList, setCatchUpsList] = useState<CatchUpItem[]>([]);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [visibilitySaving, setVisibilitySaving] = useState(false);
  const [activeVisibility, setActiveVisibility] = useState<"public" | "private" | null>(null);
  const [requesterCatchUps, setRequesterCatchUps] = useState<CatchUpItem[]>([]);
  const [requesterCatchUpsLoaded, setRequesterCatchUpsLoaded] = useState(false);
  const [reminderSaving, setReminderSaving] = useState(false);
  const { stalls, getEvent } = useEvents();
  const { isFollowing, followerHandles } = useSocial();
  const local = resolvePublicBio(handle, byHandle);
  const [remote, setRemote] = useState<typeof local>();
  const [tried, setTried] = useState(!handle);
  const [claim, setClaim] = useState<{ code: string; badge: string; detail: string } | null>(null);
  const viewed = useRef("");

  useEffect(() => {
    if (!user?.uid) {
      setRequesterCatchUps([]);
      setRequesterCatchUpsLoaded(true);
      return;
    }
    setRequesterCatchUpsLoaded(false);
    return subscribeMyCatchUps(
      user.uid,
      (rows) => {
        setRequesterCatchUps(rows);
        setRequesterCatchUpsLoaded(true);
      },
      () => {
        setRequesterCatchUpsLoaded(false);
        toast.error("Could not load your catch-up reminders from the server.");
      },
    );
  }, [user?.uid]);

  useEffect(() => {
    const p = remote || local;
    if (!p || !user) {
      setCatchUpsList(p ? listCatchUpsForHandle(p.handle) : []);
      return;
    }
    const owner = Boolean(
      (p.ownerUid && p.ownerUid === user.uid) ||
      (p.ownerEmail && p.ownerEmail === user.email) ||
      (mine && normalizeHandle(mine.handle) === normalizeHandle(p.handle)),
    );
    if (!owner) return;
    if (p.ownerUid) return subscribeCatchUpsForOwner(p.ownerUid, setCatchUpsList);
    setCatchUpsList(listCatchUpsForHandle(p.handle));
  }, [remote, local, user, mine]);

  useEffect(() => {
    let live = true;
    setRemote(undefined);
    if (!handle) {
      setTried(true);
      return;
    }
    setTried(false);
    void fetchPublicBio(handle)
      .then((row) => {
        if (!live) return;
        if (row) setRemote(row);
        setTried(true);
      })
      .catch(() => {
        if (live) setTried(true);
      });
    return () => {
      live = false;
    };
  }, [handle]);

  useEffect(() => {
    if (!claim) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setClaim(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [claim]);

  const profile = remote || local;
  // Hoisted above the early returns: hooks must run in the same order on
  // every render. Empty while the profile is still resolving; only read
  // after the guards below.
  const publicLinks = useMemo(() => (profile ? visibleBioLinks(profile.links) : []), [profile]);
  const [bioQrUrl, setBioQrUrl] = useState<string>("");
  const catchUpReminderActive = Boolean(
    user?.uid &&
    requesterCatchUps.some(
      (item) =>
        item.requesterUid === user.uid &&
        item.isReminderOnly &&
        item.status !== "dismissed" &&
        normalizeHandle(item.targetHandle) === normalizeHandle(profile?.handle || handle),
    ),
  );

  useEffect(() => {
    if (!profile?.handle) return;
    let live = true;
    void makeQrDataUrl(toPublicUrl(bioPath(profile.handle)), 320).then((data) => {
      if (live) setBioQrUrl(data);
    });
    return () => {
      live = false;
    };
  }, [profile?.handle]);

  const loadFailed = useRef("");

  useEffect(() => {
    if (!tried || profile || !handle || loadFailed.current === handle) return;
    loadFailed.current = handle;
    void track("context_load_failed", { contextType: "bio", contextId: handle, errorClass: "not_found" });
  }, [tried, profile, handle]);

  useEffect(() => {
    if (!profile) return;
    if (viewed.current === profile.handle) return;
    viewed.current = profile.handle;
    recordTap(profile.handle, "view");

    let shareImg = profile.cover || profile.avatar;
    if (shareImg && shareImg.startsWith("idb:")) {
      shareImg = undefined;
    }
    if (!shareImg) {
      shareImg = "https://airpal.me/brand/og-share.jpg";
    }

    const bioDescription =
      profile.shortWhy ||
      profile.offer?.detail ||
      profile.customStatus ||
      `Connect with ${profile.name} (@${profile.handle}) on AirPal.Me — Life Made Easy.`;

    setShareMeta({
      title: `${profile.name} (@${profile.handle}) · AirPal.Me`,
      description: bioDescription.slice(0, 160),
      image: shareImg,
      url: toPublicUrl(bioPath(profile.handle)),
      type: "profile",
      imageAlt: `${profile.name} on AirPal.Me`,
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "ProfilePage",
        mainEntity: {
          "@type": "Person",
          name: profile.name,
          alternateName: `@${profile.handle}`,
          description: bioDescription,
          image: shareImg ? (shareImg.startsWith("http") ? shareImg : toPublicUrl(shareImg)) : undefined,
          url: toPublicUrl(bioPath(profile.handle)),
        },
      },
    });
  }, [profile, recordTap]);

  if (!profile && !tried) {
    return (
      <div className="mx-auto max-w-lg px-4 py-8" aria-label="Loading profile" role="status">
        <div className="overflow-hidden rounded-3xl bg-card ring-1 ring-line/70 shadow-xs">
          <div className="h-44 w-full motion-safe:animate-pulse bg-paper sm:h-52" />
          <div className="p-5">
            <div className="flex items-end justify-between">
              <div className="-mt-14 h-24 w-24 sm:h-28 sm:w-28 motion-safe:animate-pulse rounded-full bg-paper ring-4 ring-card shadow-md" />
              <div className="mb-1 h-8 w-24 motion-safe:animate-pulse rounded-full bg-paper" />
            </div>
            <div className="mt-4 space-y-2.5">
              <div className="h-7 w-48 motion-safe:animate-pulse rounded-lg bg-paper" />
              <div className="h-4 w-24 motion-safe:animate-pulse rounded-md bg-paper" />
              <div className="h-4 w-full motion-safe:animate-pulse rounded-md bg-paper" />
              <div className="h-4 w-3/4 motion-safe:animate-pulse rounded-md bg-paper" />
            </div>
            <div className="mt-5 flex gap-2">
              <div className="h-10 flex-1 motion-safe:animate-pulse rounded-full bg-paper" />
              <div className="h-10 flex-1 motion-safe:animate-pulse rounded-full bg-paper" />
              <div className="h-10 w-16 motion-safe:animate-pulse rounded-full bg-paper" />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="h-12 motion-safe:animate-pulse rounded-2xl bg-paper" />
              <div className="h-12 motion-safe:animate-pulse rounded-2xl bg-paper" />
              <div className="h-12 motion-safe:animate-pulse rounded-2xl bg-paper" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile && tried) {
    if (handle) {
      return (
        <div className="mx-auto max-w-md px-4 py-16 text-center">
          <div className="rounded-[32px] border border-line bg-card p-6 sm:p-8 shadow-clay">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-brand/10 text-accent shadow-inner">
              <Sparkles size={32} />
            </div>
            <h1 className="human-title mt-5 text-2xl sm:text-3xl text-balance">@{handle} is available!</h1>
            <p className="human-lede mt-2.5 text-sm sm:text-base">
              This AirPal handle hasn’t been set up yet. Be the first to claim <strong>@{handle}</strong> and launch
              your public bio page.
            </p>
            <div className="mt-6 flex flex-col gap-2.5">
              <Button
                size="lg"
                className="w-full gap-2 rounded-full bg-brand font-semibold text-white shadow-md hover:bg-brand-ink"
                onClick={() => nav(`/bio/setup?handle=${handle}`)}
              >
                Claim @{handle}
              </Button>
              <Button variant="ghost" className="w-full rounded-full" onClick={() => nav("/")}>
                Explore AirPal
              </Button>
            </div>
          </div>
        </div>
      );
    }
    return <NotFoundPage />;
  }

  if (!profile) return <NotFoundPage />;
  const bio = profile;
  const theme: BioTheme = resolveBioTheme(bio.theme);
  const themed = theme.id !== "airpal";
  const isBizBio = bio.kind === "business";
  // Single source of truth shared with the edit-preview mirror.
  const themeVars = bioThemeCssVars(theme) as CSSProperties;

  const isOwner = Boolean(
    (user && bio.ownerUid && bio.ownerUid === user.uid) ||
    (user && bio.ownerEmail && bio.ownerEmail === user.email) ||
    (mine && normalizeHandle(mine.handle) === normalizeHandle(bio.handle)),
  );

  const viewer = user ? { uid: user.uid, email: user.email || undefined, handle: mine?.handle } : null;
  const canView = canViewProfile(viewer, bio, {
    isFollowing: (h) => isFollowing(h),
    isFollower: (h) => followerHandles.has(h.trim().toLowerCase().replace(/^@/, "")),
  });

  if (!canView) {
    return (
      <main className="bio-page-shell px-4 py-16 sm:py-24" aria-label="Private AirPal bio">
        <div className="overflow-hidden rounded-[32px] border border-line bg-card text-center shadow-clay">
          <div className="h-24 bg-gradient-to-br from-[#0c1024] via-[#141b38] to-[#0a0d1e]" />
          <div className="px-6 pb-8 sm:px-8 sm:pb-10">
            <span className="-mt-9 mx-auto grid h-[72px] w-[72px] place-items-center rounded-[26px] bg-card text-accent shadow-clay ring-1 ring-line">
              <Lock size={28} aria-hidden="true" />
            </span>
            <p className="human-eyebrow mt-5">Profile protected</p>
            <h1 className="human-title mt-2 text-2xl text-balance">{bio.name}</h1>
            <p className="mt-1 text-sm font-medium text-mute">@{bio.handle}</p>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-mute">
              {bio.visibility === "private"
                ? "This profile is private."
                : "This profile is visible to friends. Follow to view it."}
            </p>
            {bio.visibility !== "private" && (
              <div className="mt-6">
                <FollowButton handle={bio.handle} name={bio.name} className="w-full" />
              </div>
            )}
          </div>
        </div>
      </main>
    );
  }

  const appearing = stalls.filter((s) => s.handle === bio.handle && s.status === "active");
  const unclaimed = isClaimableBioProfile(bio, isOwner);
  // Unified Connect card: format tiles + reminder exactly where the old
  // visitor planner deck rendered; direct-reach actions for every viewer.
  const hasCatalog = (bio.products || []).length > 0 || (bio.services || []).length > 0;
  const showPlanner = !isOwner && !(bio.kind === "business" && hasCatalog);

  const maps = bio.mapsPlaceId
    ? mapsPlaceIdUrl(bio.mapsPlaceId)
    : bio.geo
      ? mapsPlaceUrl(bio.geo, bio.name)
      : visibleBioLinks(bio.links).find((l) => l.type === "maps")?.href;

  async function onClaimDeal(item: BioCatalogItem) {
    recordTap(bio.handle, "deal");
    try {
      const saved = await claimBioOfferRemote({ handle: bio.handle, dealId: item.id });
      setClaim(saved);
      void track("offer_claim", {
        offerId: item.id,
        partnerId: bio.handle,
        claimId: `${bio.handle}_${item.id}`,
        contextId: bio.handle,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save this offer claim. Please try again.");
    }
  }

  // Website URL resolution
  const websiteLink = publicLinks.find(
    (l) => l.type === "website" || l.type === "book" || l.type === "order" || l.type === "menu",
  );
  const rawWebsite = (bio as Record<string, unknown>).website;
  const websiteFallback =
    typeof rawWebsite === "string" && rawWebsite.trim()
      ? rawWebsite.startsWith("http")
        ? rawWebsite.trim()
        : `https://${rawWebsite.trim()}`
      : undefined;
  const rawWebsiteUrl =
    websiteLink?.href ||
    (bio.domain ? (bio.domain.startsWith("http") ? bio.domain : `https://${bio.domain}`) : undefined) ||
    websiteFallback;
  // Raw Firestore/domain strings are never trusted as hrefs — only an
  // allowlisted scheme reaches the anchor.
  const websiteUrl = rawWebsiteUrl && isSafeBioHref(rawWebsiteUrl) ? rawWebsiteUrl : undefined;

  // WhatsApp URL resolution
  const whatsappLink = publicLinks.find((l) => l.type === "whatsapp");
  const whatsappUrl =
    whatsappLink?.href || (bio.phone ? `https://wa.me/${bio.phone.replace(/[^0-9]/g, "")}` : undefined);

  // Call / tel resolution
  const callLink = publicLinks.find((l) => l.type === "call");
  const tel = bio.phone ? `tel:${bio.phone.replace(/\s/g, "")}` : callLink?.href;

  const share = toPublicUrl(bioPath(bio.handle));
  const stacked = stackLinks(publicLinks).filter((l) => l.href !== websiteUrl && l.type !== "whatsapp");
  const avatar = bio.avatar && bio.avatar !== bio.cover ? bio.avatar : undefined;

  const deals = catalogDeals(bio);
  const liveOffer = bio.offer?.badge
    ? { badge: bio.offer.badge, detail: bio.offer.detail, title: bio.offer.badge }
    : deals.length > 0
      ? { badge: deals[0].badge || "Special Offer", detail: deals[0].detail, title: deals[0].title }
      : null;

  const statusKey: AvailabilityStatus =
    bio.availabilityStatus || (bio.openNow === true ? "available" : bio.openNow === false ? "offline" : "available");
  const statusInfo = AVAILABILITY_STATUSES[statusKey] || AVAILABILITY_STATUSES.available;

  const handleQuickCopy = async () => {
    void triggerHaptic("light");
    try {
      await navigator.clipboard.writeText(share);
      setCopiedLink(true);
      toast.success("Profile link copied to clipboard!");
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      toast.message(share);
    }
  };

  /** Owner-only privacy rail: persist first, then reveal the new state in-place. */
  const isPersonBio = bio.kind === "person" || !bio.kind;
  const isPublic = activeVisibility !== null ? activeVisibility === "public" : bio.visibility === "public";

  const handleVisibilityToggle = async () => {
    if (!isOwner || !isPersonBio || visibilitySaving) return;
    const nextVisibility = isPublic ? "private" : "public";
    setActiveVisibility(nextVisibility);
    setVisibilitySaving(true);
    try {
      await updateProfile({ handle: bio.handle, visibility: nextVisibility });
      setRemote((prev) => (prev ? { ...prev, visibility: nextVisibility } : { ...bio, visibility: nextVisibility }));
      void triggerHaptic("success");
      toast.success(nextVisibility === "public" ? "Your bio is now public" : "Your bio is now private");
    } catch (err) {
      setActiveVisibility(isPublic ? "public" : "private");
      void triggerHaptic("error");
      toast.error(err instanceof Error ? err.message : "Could not update profile visibility. Try again.");
    } finally {
      setVisibilitySaving(false);
    }
  };

  const handleCopyInviteCode = async () => {
    void triggerHaptic("light");
    try {
      await navigator.clipboard.writeText(`@${bio.handle}`);
      setCopiedCode(true);
      toast.success("Invite code copied!");
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      toast.message(`@${bio.handle}`);
    }
  };

  const handleShareInvite = async () => {
    void triggerHaptic("light");
    const url = inviteLinkFor(bio.handle);
    const text = `Join me on AirPal — use my code @${bio.handle}.`;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: `Join ${bio.name} on AirPal`, text, url });
        return;
      } catch {
        /* user dismissed — fall through to clipboard */
      }
    }
    try {
      await navigator.clipboard.writeText(`${text} ${url}`);
      toast.success("Invite link copied!");
    } catch {
      toast.message(url);
    }
  };

  return (
    <div
      className={
        themed
          ? "bio-page-shell bio-themed px-3 pb-[calc(env(safe-area-inset-bottom,0px)+2.5rem)] pt-3 sm:px-4 sm:pt-8 sm:pb-12 lg:px-0"
          : "bio-page-shell px-3 pb-[calc(env(safe-area-inset-bottom,0px)+2.5rem)] pt-3 sm:px-4 sm:pt-8 sm:pb-12 lg:px-0"
      }
      style={themed ? themeVars : undefined}
      data-bio-theme={themed ? theme.id : undefined}
    >
      {/* A solid content card keeps the profile readable; glass is reserved for navigation. */}
      <main
        className="bio-page-card overflow-hidden ring-1 ring-line/80 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500"
        aria-label={`${bio.name}'s AirPal bio`}
      >
        {/* Cover Hero Header with Cinematic Vignette */}
        <div className="relative overflow-hidden">
          {bio.cover ? (
            <div className="bio-hero relative w-full overflow-hidden">
              <Photo src={bio.cover} className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-black/10" />
            </div>
          ) : (
            <div
              className={
                themed
                  ? "bio-hero bio-hero-fallback relative w-full overflow-hidden"
                  : "bio-hero relative w-full overflow-hidden bg-gradient-to-br from-[#0c1024] via-[#141b38] to-[#0a0d1e]"
              }
            >
              <div className="absolute inset-0 text-accent opacity-25 bg-[radial-gradient(color-mix(in_srgb,currentColor_45%,transparent)_1.5px,transparent_1.5px)] [background-size:22px_22px]" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
            </div>
          )}

          {/* Top Floating Liquid Glass Navigation Dock */}
          <div className="absolute inset-x-3.5 sm:inset-x-5 top-3.5 sm:top-5 z-20 flex items-center justify-between gap-2">
            {/* Left Pill: Back & AirPal Logo */}
            <div className="inline-flex items-center rounded-full bg-white/85 dark:bg-black/60 p-1 shadow-clay ring-1 ring-white/60 dark:ring-white/15 backdrop-blur-2xl">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  void triggerHaptic("light");
                  if (window.history.length > 1) {
                    window.history.back();
                  } else {
                    nav("/");
                  }
                }}
                className="flex h-11 w-11 items-center justify-center rounded-full text-ink transition hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 cursor-pointer touch-manipulation"
                aria-label="Go back"
                title="Go back"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <span className="mx-0.5 h-4 w-[1px] bg-line/80" />
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  void triggerHaptic("light");
                  nav("/");
                }}
                className="flex h-11 items-center rounded-full px-3 transition hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 cursor-pointer touch-manipulation"
                aria-label="AirPal Home"
                title="AirPal Home"
              >
                <BrandMark compact />
              </button>
            </div>

            {/* Right Controls: Quick Share Pill & Handle Badge */}
            <div className="flex min-w-0 items-center gap-1.5">
              <button
                type="button"
                onClick={handleQuickCopy}
                className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-white/85 dark:bg-black/60 px-3 sm:px-4 text-xs font-bold text-ink shadow-clay ring-1 ring-white/60 dark:ring-white/15 backdrop-blur-2xl transition hover:bg-white active:scale-95 cursor-pointer touch-manipulation"
                title="Copy profile link"
                aria-label="Copy profile link"
              >
                {copiedLink ? (
                  <>
                    <Check size={14} className="shrink-0 text-emerald-600 animate-in zoom-in" />
                    <span className="text-emerald-600 font-bold">Copied</span>
                  </>
                ) : (
                  <>
                    <Share2 size={13} className="shrink-0 text-ink" />
                    <span className="hidden xs:inline">Share</span>
                  </>
                )}
              </button>
              <BioHandleButton handle={bio.handle} className="shadow-clay backdrop-blur-2xl" />
            </div>
          </div>
        </div>

        {/* Profile Content Body */}
        <div className="px-4 pb-10 sm:px-8 sm:pb-12">
          {/* Avatar & Action Button Row */}
          <div className="flex items-end justify-between gap-3">
            {/* Round Circular Profile Avatar */}
            <div className="relative shrink-0">
              <div className="-mt-16 sm:-mt-20 relative z-10 h-28 w-28 sm:h-32 sm:w-32 overflow-hidden rounded-full bg-paper ring-4 ring-card transition-all duration-300 shadow-xl">
                {avatar ? (
                  <Photo src={avatar} className="h-full w-full object-cover rounded-full" />
                ) : (
                  <span className="grid h-full w-full place-items-center bg-gradient-to-br from-[#1805db] via-[#100399] to-[#090259] font-display text-2xl sm:text-3xl font-extrabold text-white tracking-wider shadow-inner ring-2 ring-white/20">
                    {initialsOf(bio.name)}
                  </span>
                )}
              </div>

              {/* Status Indicator Badge */}
              <span
                className={cn(
                  "absolute bottom-0 right-0 z-20 h-6 w-6 rounded-full ring-2 ring-card shadow-sm grid place-items-center",
                  statusKey === "available" ? "bg-emerald-500" : statusKey === "busy" ? "bg-amber-500" : "bg-zinc-400",
                )}
                title={statusInfo.label}
              >
                <BioKindIcon kind={bio.kind} className="h-3.5 w-3.5 ring-0 text-white" />
              </span>
            </div>

            {/* Profile Action Deck (Open Me, Edit, Claim, Connect, Save Contact) */}
            <div className="mb-2 flex items-center gap-2 flex-wrap justify-end">
              {isOwner ? (
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <Button
                    size="sm"
                    className="gap-1.5 rounded-full bg-brand px-3.5 sm:px-5 min-h-[44px] text-xs font-bold text-white shadow-xs hover:bg-brand-ink active:scale-95 cursor-pointer touch-manipulation"
                    onClick={() => {
                      void triggerHaptic("light");
                      nav("/me");
                    }}
                  >
                    <UserRound size={14} />
                    <span>Open Me</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="bio-theme-btn gap-1.5 rounded-full border border-line bg-card/90 px-3.5 sm:px-4 min-h-[44px] text-xs font-semibold text-ink shadow-2xs hover:bg-paper active:scale-95 cursor-pointer touch-manipulation"
                    onClick={() => {
                      void triggerHaptic("light");
                      nav("/bio/edit");
                    }}
                  >
                    <Edit3 size={13} />
                    <span>Edit Bio</span>
                  </Button>
                </div>
              ) : unclaimed ? (
                <Button
                  size="sm"
                  className="rounded-full bg-brand px-4 sm:px-5 min-h-[44px] text-xs font-bold text-white shadow-sm hover:bg-brand-ink active:scale-95 cursor-pointer touch-manipulation"
                  onClick={() => {
                    void triggerHaptic("medium");
                    nav(`/bio/setup?handle=${bio.handle}${bio.kind === "business" ? "&kind=business" : ""}`);
                  }}
                  title={
                    bio.kind === "business"
                      ? "Claim this place as its owner — business verification applies"
                      : `Claim @${bio.handle} as your AirPal Me handle`
                  }
                >
                  <Sparkles size={14} />
                  <span>Claim @{bio.handle}</span>
                </Button>
              ) : bio.kind === "person" ? (
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <Button
                    size="sm"
                    className="gap-1.5 rounded-full bg-brand px-3.5 sm:px-5 min-h-[44px] text-xs font-bold text-white shadow-sm hover:bg-brand-ink active:scale-95 cursor-pointer touch-manipulation"
                    onClick={() => {
                      void triggerHaptic("light");
                      if (!requireUser("Sign in to keep the people you meet in one place.")) return;
                      void upsertPerson({
                        handle: bio.handle,
                        name: bio.name,
                        photo: avatar,
                        whereMet: bio.city || undefined,
                      })
                        .then(() => toast.success(`${bio.name} saved to people you met`))
                        .catch((err: unknown) =>
                          toast.error(err instanceof Error ? err.message : "Could not save this person."),
                        );
                    }}
                  >
                    <UserPlus size={14} />
                    <span>Connect</span>
                  </Button>
                  {bio.ownerUid && (!user || bio.ownerUid !== user.uid) && (
                    <PingButton toUid={bio.ownerUid} toHandle={bio.handle} toName={bio.name} />
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="bio-theme-btn gap-1.5 rounded-full border border-line bg-card/90 px-3 sm:px-4 min-h-[44px] text-xs font-semibold text-ink shadow-2xs hover:bg-paper active:scale-95 cursor-pointer touch-manipulation"
                    aria-label={`Save ${bio.name} to phone contacts`}
                    title="Save contact to phone (.vcf)"
                    onClick={() => {
                      void saveBioContact({
                        name: bio.name,
                        handle: bio.handle,
                        phone: bio.phone,
                        avatar: bio.avatar,
                        url: share,
                        note: `AirPal bio · AirPal.Me/@${bio.handle}`,
                      });
                    }}
                  >
                    <ContactRound size={14} className="text-accent" />
                    <span className="hidden sm:inline">Save Contact</span>
                  </Button>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="bio-theme-btn gap-1.5 rounded-full border border-line bg-card/90 px-3.5 sm:px-4 min-h-[44px] text-xs font-semibold text-ink shadow-2xs hover:bg-paper active:scale-95 cursor-pointer touch-manipulation"
                  aria-label={`Save ${bio.name} to phone contacts`}
                  title="Save contact to phone (.vcf)"
                  onClick={() => {
                    void saveBioContact({
                      name: bio.name,
                      handle: bio.handle,
                      phone: bio.phone,
                      avatar: bio.avatar,
                      url: share,
                      note: `AirPal bio · AirPal.Me/@${bio.handle}`,
                    });
                  }}
                >
                  <ContactRound size={14} className="text-accent" />
                  <span>Save Contact</span>
                </Button>
              )}
            </div>
          </div>

          {/* Profile Name & Primary Identity */}
          <div className="mt-4 text-left">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="human-title text-[26px] sm:text-[34px] text-balance">{bio.name}</h1>
              {bio.categoryTag &&
                (bio.categoryTag.trim().toLowerCase() === "airpal mate" ||
                bio.categoryTag.trim().toLowerCase() === "airpal star" ? (
                  <span className="inline-flex items-center" title="AirPal Star" aria-label="AirPal Star" role="img">
                    <Star size={20} className="fill-current text-accent" aria-hidden="true" />
                  </span>
                ) : (
                  <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-accent ring-1 ring-brand/20">
                    {bio.categoryTag}
                  </span>
                ))}
            </div>

            {/* Handle, Location & Subtitle Metadata Strip */}
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm font-medium text-mute">
              <span className="font-bold text-ink">@{bio.handle}</span>
              {bio.pronouns && <span>· {bio.pronouns}</span>}
              {bio.city && (
                <span className="inline-flex items-center gap-1">
                  <MapPin size={12} className="text-accent shrink-0" aria-hidden />
                  {bio.city}
                </span>
              )}
              {bio.kind === "business" && bio.category && (
                <span>
                  ·{" "}
                  {bio.category === "stay"
                    ? "Stay & Accommodation"
                    : BUSINESS_CATEGORIES.find((c) => c.id === bio.category)?.label || "Business"}
                </span>
              )}
              {bio.languages && <span>· {bio.languages}</span>}
            </div>

            {isOwner && isPersonBio && (
              <button
                type="button"
                role="switch"
                aria-checked={isPublic}
                aria-label={`Profile visibility: ${isPublic ? "public" : "private"}. Activate to switch.`}
                disabled={visibilitySaving}
                onClick={() => void handleVisibilityToggle()}
                className="mt-4 flex min-h-[52px] w-full max-w-sm items-center gap-3 rounded-2xl bg-paper px-3.5 py-2 text-left ring-1 ring-line/80 transition-[background-color,color,opacity] duration-200 hover:bg-card disabled:cursor-wait disabled:opacity-70 cursor-pointer touch-manipulation active:scale-[0.99]"
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-card text-accent ring-1 ring-line/80">
                  <Lock size={14} aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-ink">Profile visibility</span>
                  <span className="block text-xs leading-tight text-mute">
                    {visibilitySaving ? "Saving…" : isPublic ? "Public — anyone with the link" : "Private — only you"}
                  </span>
                </span>
                <span
                  className={cn(
                    "relative h-7 w-12 shrink-0 rounded-full p-1 transition-[background-color] duration-200",
                    isPublic ? "bg-brand" : "bg-zinc-300 dark:bg-zinc-700",
                  )}
                  aria-hidden="true"
                >
                  <span
                    className={cn(
                      "block h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-200",
                      isPublic ? "translate-x-5" : "translate-x-0",
                    )}
                  />
                </span>
              </button>
            )}

            {/* Interactive Apple Availability / Focus Capsule without green frame */}
            <div className="mt-3">
              <button
                type="button"
                onClick={() => {
                  if (isOwner) {
                    void triggerHaptic("selection");
                    setStatusModalOpen(true);
                  }
                }}
                className={cn(
                  "inline-flex min-h-[44px] items-center gap-2 rounded-full px-4 text-xs font-semibold ring-1 ring-line/80 bg-paper/70 text-ink transition-[background-color,transform] duration-200 shadow-2xs",
                  isOwner ? "cursor-pointer hover:bg-paper active:scale-95" : "cursor-default",
                )}
                title={isOwner ? "Click to change status" : statusInfo.description}
              >
                <span className={cn("h-2 w-2 rounded-full shrink-0", statusInfo.dotColor)} />
                {bio.customStatus ? (
                  <span className="font-bold text-ink truncate max-w-[300px] sm:max-w-md">
                    {bio.customStatusEmoji && `${bio.customStatusEmoji} `}
                    {bio.customStatus}
                  </span>
                ) : (
                  <span className="font-bold">{statusInfo.label}</span>
                )}
                {isOwner && <Edit3 size={11} className="opacity-60 ml-0.5" />}
              </button>
            </div>

            {/* Elevator Pitch / Short Why */}
            {bio.shortWhy &&
              bio.shortWhy.trim().toLowerCase() !== bio.customStatus?.trim().toLowerCase() &&
              bio.shortWhy.trim().toLowerCase() !==
                `${bio.customStatusEmoji || ""} ${bio.customStatus || ""}`.trim().toLowerCase() && (
                <p className="mt-3.5 text-[14px] sm:text-[15px] leading-relaxed text-ink font-normal">{bio.shortWhy}</p>
              )}
          </div>

          {/* Social Engagement Deck: Follow, Like, www, and QR all in one horizontal line on mobile & desktop */}
          <div className="mt-5 flex flex-nowrap items-center gap-1.5 sm:gap-2">
            <FollowButton handle={bio.handle} name={bio.name} className="min-h-[44px] flex-1 min-w-0" />
            <LikeButton handle={bio.handle} name={bio.name} className="min-h-[44px] flex-1 min-w-0" />
            {websiteUrl ? (
              <a
                href={websiteUrl}
                target="_blank"
                rel="noreferrer"
                onClick={() => {
                  void triggerHaptic("light");
                  recordTap(bio.handle, websiteLink?.type || "website");
                }}
                className="inline-flex h-11 w-11 sm:w-auto min-h-[44px] min-w-[44px] shrink-0 items-center justify-center gap-1.5 rounded-full bg-paper sm:px-3.5 text-xs font-bold text-ink whitespace-nowrap shadow-2xs ring-1 ring-line/80 transition hover:bg-paper/80 active:scale-95"
                title={`Visit ${websiteUrl}`}
                aria-label="Visit website"
              >
                <Globe size={15} className="shrink-0 text-accent" />
                <span className="hidden sm:inline">www</span>
              </a>
            ) : null}
            <button
              type="button"
              onClick={() => {
                void triggerHaptic("light");
                setShareModalOpen(true);
              }}
              className="inline-flex h-11 w-11 min-h-[44px] min-w-[44px] shrink-0 cursor-pointer items-center justify-center rounded-full bg-paper text-ink shadow-2xs ring-1 ring-line/80 transition hover:bg-paper/80 active:scale-95"
              title="Share & QR Code"
              aria-label="Open share and QR code"
            >
              <QrCode size={18} className="text-accent" />
            </button>
          </div>

          {/* Connect: one card for formats + direct reach. Replaces the old
              quick-action deck and the visitor planner deck — same actions,
              same conditions, single composition in the shared design language. */}
          <div className="mt-3 px-1 pt-1">
            {showPlanner ? (
              <>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-accent flex items-center gap-1.5">
                    <Sparkles size={12} className="text-accent" />
                    <span>AirPal Hangout Planner</span>
                  </span>
                  <button
                    type="button"
                    disabled={reminderSaving || (Boolean(user?.uid) && !requesterCatchUpsLoaded)}
                    onClick={async () => {
                      if (reminderSaving || (user?.uid && !requesterCatchUpsLoaded)) return;
                      if (!user?.uid || !requireUser("Sign in to save catch-up reminders.")) return;
                      void triggerHaptic("light");
                      setReminderSaving(true);
                      try {
                        const next = await toggleCatchUpReminder({
                          handle: bio.handle,
                          name: bio.name,
                          photo: avatar,
                          city: bio.city,
                          requesterUid: user.uid,
                        });
                        setRequesterCatchUps(
                          listCatchUpsForHandle(bio.handle).filter(
                            (item) => item.requesterUid === user.uid && item.status !== "dismissed",
                          ),
                        );
                        toast[next ? "success" : "info"](
                          next ? `Saved a reminder to catch up with ${bio.name}` : `Removed reminder for ${bio.name}`,
                        );
                        setCatchUpsList(listCatchUpsForHandle(bio.handle));
                      } catch (error) {
                        toast.error(error instanceof Error ? error.message : "Couldn't save the reminder.");
                      } finally {
                        setReminderSaving(false);
                      }
                    }}
                    className={cn(
                      "inline-flex min-h-[44px] items-center gap-1.5 whitespace-nowrap rounded-full px-4 text-xs font-semibold ring-1 transition cursor-pointer active:scale-95 touch-manipulation",
                      catchUpReminderActive
                        ? "bg-amber-500/15 text-amber-800 dark:text-amber-300 ring-amber-500/40 dark:ring-amber-500/30 font-bold"
                        : "bg-card text-mute ring-line hover:text-ink hover:bg-paper",
                    )}
                    title={catchUpReminderActive ? "Catch-up reminder active" : "Set a reminder to catch up"}
                  >
                    <span
                      className={cn(
                        "h-2 w-2 shrink-0 rounded-full",
                        catchUpReminderActive ? "bg-amber-500 motion-safe:animate-pulse" : "bg-mute/50",
                      )}
                    />
                    <span className="inline-flex items-center gap-1">
                      {catchUpReminderActive ? (
                        <>
                          <span>Reminder on</span>
                          <Check size={12} className="shrink-0" aria-hidden="true" />
                        </>
                      ) : (
                        <span>Remind me</span>
                      )}
                    </span>
                  </button>
                </div>
                {!user && (
                  <p className="mt-1.5 text-right text-[11px] font-medium text-mute">
                    Saved on this device only — sign in to sync
                  </p>
                )}
                <h3 className="font-display mt-2.5 text-lg sm:text-xl font-bold text-ink">Catch up with {bio.name}</h3>
                <p className="mt-1 text-xs sm:text-sm leading-relaxed text-mute">
                  Propose a 1-on-1 coffee, schedule a sync meeting, or create a group hangout with instant calendar
                  sync.
                </p>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
                  {(
                    [
                      {
                        type: "catchup" as const,
                        label: "Catch Up",
                        sub: "1-on-1 coffee · 45m",
                        Icon: Coffee,
                        tint: "bg-amber-500/15 text-amber-700 dark:text-amber-400 ring-1 ring-amber-500/20",
                      },
                      {
                        type: "meeting" as const,
                        label: "Meeting",
                        sub: "1-on-1 sync · 30m",
                        Icon: Calendar,
                        tint: "bg-sky-500/15 text-sky-700 dark:text-sky-400 ring-1 ring-sky-500/20",
                      },
                      {
                        type: "nightout" as const,
                        label: "Hangout",
                        sub: "Group catch-up · 2h",
                        Icon: Users,
                        tint: "bg-rose-500/15 text-rose-700 dark:text-rose-400 ring-1 ring-rose-500/20",
                      },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.type}
                      type="button"
                      onClick={() => {
                        void triggerHaptic("light");
                        setCatchUpInitialType(opt.type);
                        setCatchUpModalOpen(true);
                      }}
                      className="bio-theme-btn group flex flex-row sm:flex-col items-center sm:justify-center gap-3 sm:gap-0 min-h-[68px] sm:min-h-[104px] rounded-[24px] bg-card/90 p-3.5 sm:p-4 text-left sm:text-center ring-1 ring-line/80 shadow-2xs transition-[box-shadow,ring-color,transform] duration-200 hover:ring-brand/40 hover:shadow-md active:scale-[0.98] cursor-pointer touch-manipulation"
                    >
                      <span
                        className={cn(
                          "sm:mb-2 grid h-10 w-10 sm:h-11 sm:w-11 shrink-0 place-items-center rounded-2xl transition-transform group-hover:scale-105",
                          opt.tint,
                        )}
                      >
                        <opt.Icon size={19} />
                      </span>
                      <span className="flex flex-col sm:items-center">
                        <span className="text-xs font-bold text-ink">{opt.label}</span>
                        <span className="mt-0.5 text-[11px] sm:text-[10px] text-mute">{opt.sub}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-accent flex items-center gap-1.5">
                <Sparkles size={12} className="text-accent" />
                <span>Get in touch</span>
              </p>
            )}

            {/* Direct reach: same actions and conditions as the old quick-action deck. */}
            <div
              className={cn(
                "flex flex-wrap sm:flex-nowrap items-stretch gap-2",
                showPlanner && "mt-4 border-t border-line/70 pt-4",
                !showPlanner && "mt-3",
              )}
            >
              {whatsappUrl && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => {
                    void triggerHaptic("light");
                    recordTap(bio.handle, "whatsapp");
                  }}
                  className="group flex-1 min-w-[110px] flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/15 px-3 text-xs font-bold text-emerald-700 dark:text-white ring-1 ring-emerald-500/30 transition-[background-color,color,transform] duration-200 hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-600 dark:hover:text-white active:scale-95 shadow-2xs"
                >
                  <MessageCircle
                    size={16}
                    className="text-emerald-600 dark:text-white group-hover:text-white shrink-0 group-hover:scale-110 transition-transform"
                  />
                  <span className="truncate">WhatsApp</span>
                </a>
              )}

              {tel && (
                <a
                  href={tel}
                  onClick={() => {
                    void triggerHaptic("light");
                    recordTap(bio.handle, "call");
                  }}
                  className="group flex-1 min-w-[100px] flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 px-3 text-xs font-bold text-amber-700 dark:text-white ring-1 ring-amber-500/30 transition-[background-color,color,transform] duration-200 hover:bg-amber-600 hover:text-white dark:hover:bg-amber-600 dark:hover:text-white active:scale-95 shadow-2xs"
                >
                  <Phone
                    size={16}
                    className="text-amber-600 dark:text-white group-hover:text-white shrink-0 group-hover:scale-110 transition-transform"
                  />
                  <span className="truncate">Call</span>
                </a>
              )}

              <button
                type="button"
                onClick={() => {
                  void triggerHaptic("light");
                  void saveBioContact({
                    name: bio.name,
                    handle: bio.handle,
                    phone: bio.phone,
                    avatar: bio.avatar,
                    url: share,
                    note: `AirPal bio · AirPal.Me/@${bio.handle}`,
                  });
                }}
                className="group flex-1 min-w-[110px] flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-paper/80 dark:bg-card/70 px-3 text-xs font-semibold text-ink ring-1 ring-line/80 transition-[background-color,ring-color,transform] duration-200 hover:bg-paper hover:ring-brand/40 active:scale-95 shadow-2xs cursor-pointer touch-manipulation"
                title={`Save ${bio.name} to phone contacts (.vcf)`}
              >
                <ContactRound size={16} className="text-accent group-hover:scale-110 transition-transform shrink-0" />
                <span className="truncate">Save Contact</span>
              </button>
            </div>
          </div>

          {/* Extended About Story Card: the story follows the action, connection-first. */}
          {bio.aboutText && (
            <div
              id="bio-about"
              className="mt-4 scroll-mt-24 rounded-[26px] bg-paper/70 p-4 sm:p-5 ring-1 ring-line/80 shadow-2xs"
            >
              <p className="human-eyebrow mb-1.5">About Story</p>
              <p className="text-sm sm:text-base leading-relaxed text-ink whitespace-pre-line">{bio.aboutText}</p>
            </div>
          )}

          {/* AirPal Pass (owner-only: save the profile QR card to Apple or Google Wallet) */}
          {isOwner && (
            <div className="human-card mt-6 p-5 sm:p-6 relative overflow-hidden ring-1 ring-brand/30 shadow-xs">
              <div className="flex items-center justify-between gap-2 mb-4">
                <div className="human-eyebrow flex items-center gap-2">
                  <QrCode size={15} aria-hidden="true" />
                  <span>Your AirPal Pass · Digital Card</span>
                </div>
                <span className="text-xs font-mono font-bold text-accent bg-brand/10 px-2.5 py-0.5 rounded-full ring-1 ring-brand/30 tabular-data">
                  @{bio.handle}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-5">
                <button
                  type="button"
                  onClick={() => {
                    void triggerHaptic("medium");
                    setShareModalOpen(true);
                  }}
                  className="relative group cursor-pointer shrink-0 grid place-items-center h-36 w-36 rounded-[22px] bg-white p-2.5 shadow-inner ring-1 ring-black/10 hover:ring-brand/50 transition-[box-shadow,ring-color,transform] duration-200 active:scale-95"
                  title="Tap to preview or share Pass QR"
                  aria-label="Enlarge QR Code"
                >
                  {bioQrUrl ? (
                    <img src={bioQrUrl} alt={`QR Code for @${bio.handle}`} className="h-full w-full object-contain" />
                  ) : (
                    <div className="text-xs text-mute animate-pulse">Loading QR…</div>
                  )}
                  <span className="absolute inset-0 bg-brand/5 rounded-[22px] opacity-0 group-hover:opacity-100 transition-opacity grid place-items-center">
                    <span className="text-[11px] font-bold bg-ink/85 text-white rounded-full px-2.5 py-1 shadow-sm">
                      Enlarge QR
                    </span>
                  </span>
                </button>

                <div className="flex-1 min-w-0 w-full space-y-3">
                  <p className="text-sm text-mute leading-relaxed text-center sm:text-left">
                    Add this QR-backed profile card to Apple Wallet or Google Wallet, then let people scan it to connect
                    with you in person.
                  </p>

                  <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1">
                    <AppleWalletButton
                      className="w-full sm:w-auto flex-1 justify-center min-h-[44px]"
                      onClick={() => {
                        void triggerHaptic("medium");
                        const passUrl = businessCardWalletPassUrl(bio.handle);
                        void openAppleWalletPass(passUrl, "@" + bio.handle + "-AirPal-Pass");
                      }}
                    />
                    <GoogleWalletButton
                      className="w-full sm:w-auto flex-1 justify-center min-h-[44px]"
                      onClick={() => {
                        void triggerHaptic("medium");
                        void openGoogleWalletPass(googleWalletCardUrl(bio.handle));
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-center sm:justify-start pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        void triggerHaptic("light");
                        setShareModalOpen(true);
                      }}
                      className="inline-flex min-h-[44px] items-center gap-1.5 text-xs font-semibold text-accent hover:text-brand-ink transition cursor-pointer"
                    >
                      <Share2 size={13} />
                      <span>View Branded Pass Card &amp; Share Sheet &rarr;</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Business profile specific overview & actions */}
          {bio.kind === "business" && (
            <div className="mt-6">
              <div className="flex items-center justify-between">
                <p className="text-[14px] font-semibold">
                  <span className={cn(bio.openNow ? "text-emerald-600" : "text-red-500")}>
                    ● {bio.openNow ? "Open now" : "Closed"}
                  </span>
                  {bio.hours && <span className="text-mute font-normal"> · {bio.hours}</span>}
                </p>
              </div>

              {/* Section Tabs */}
              <div
                className="mt-4 flex gap-2 overflow-x-auto pb-1 no-scrollbar"
                role="navigation"
                aria-label="Business sections"
              >
                <button
                  type="button"
                  onClick={() => {
                    void triggerHaptic("selection");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="min-h-[44px] shrink-0 rounded-full bg-neutral-900 px-4 text-xs font-bold text-white transition active:scale-95 shadow-2xs"
                >
                  Overview
                </button>
                {liveOffer && (
                  <button
                    type="button"
                    onClick={() => {
                      void triggerHaptic("selection");
                      document.getElementById("bio-offers")?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="min-h-[44px] shrink-0 rounded-full bg-paper px-4 text-xs font-semibold text-ink ring-1 ring-line/80 transition hover:ring-brand/40 active:scale-95"
                  >
                    Offers
                  </button>
                )}
                {(bio.products || []).length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      void triggerHaptic("selection");
                      document.getElementById("bio-products")?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="min-h-[44px] shrink-0 rounded-full bg-paper px-4 text-xs font-semibold text-ink ring-1 ring-line/80 transition hover:ring-brand/40 active:scale-95"
                  >
                    Products
                  </button>
                )}
                {(bio.services || []).length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      void triggerHaptic("selection");
                      document.getElementById("bio-services")?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="min-h-[44px] shrink-0 rounded-full bg-paper px-4 text-xs font-semibold text-ink ring-1 ring-line/80 transition hover:ring-brand/40 active:scale-95"
                  >
                    Services
                  </button>
                )}
                {bio.aboutText && (
                  <button
                    type="button"
                    onClick={() => {
                      void triggerHaptic("selection");
                      document.getElementById("bio-about")?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="min-h-[44px] shrink-0 rounded-full bg-paper px-4 text-xs font-semibold text-ink ring-1 ring-line/80 transition hover:ring-brand/40 active:scale-95"
                  >
                    About
                  </button>
                )}
              </div>

              {/* Action Circles */}
              <div className="mt-5 flex gap-3 overflow-x-auto pb-1 no-scrollbar" aria-label="Contact actions">
                {tel && (
                  <BizCircle label="Call" Icon={Phone} href={tel} onClick={() => recordTap(bio.handle, "call")} />
                )}
                {maps && (
                  <BizCircle
                    label="Directions"
                    Icon={Navigation}
                    href={maps}
                    onClick={() => {
                      recordTap(bio.handle, "maps");
                      trackMapClick({ source: "bio" });
                    }}
                  />
                )}
                {websiteUrl && (
                  <BizCircle
                    label="Website"
                    Icon={Globe}
                    href={websiteUrl}
                    onClick={() => recordTap(bio.handle, websiteLink?.type || "website")}
                  />
                )}
                <BizCircle label="Share" Icon={Share2} onClick={() => setShareModalOpen(true)} />
                <BizCircle
                  label="Save"
                  Icon={ContactRound}
                  onClick={() => {
                    void saveBioContact({
                      name: bio.name,
                      handle: bio.handle,
                      phone: bio.phone,
                      avatar: bio.avatar,
                      url: share,
                      note: `AirPal bio · AirPal.Me/@${bio.handle}`,
                    });
                  }}
                />
              </div>

              {/* Business Location & Trading Hours Schedule Card */}
              {(bio.city || bio.hours || bio.phone) && (
                <div className="mt-5 divide-y divide-line/70 rounded-[28px] bg-paper/60 ring-1 ring-line/80 overflow-hidden shadow-2xs">
                  {bio.city && (
                    <a
                      href={maps || undefined}
                      target={maps ? "_blank" : undefined}
                      rel="noreferrer"
                      onClick={() => {
                        void triggerHaptic("light");
                        if (maps) recordTap(bio.handle, "maps");
                      }}
                      className="flex min-h-[52px] items-center gap-3 p-4 transition hover:bg-paper active:scale-[0.99] touch-manipulation cursor-pointer"
                    >
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-brand/10 text-accent">
                        <MapPin size={18} />
                      </span>
                      <span className="min-w-0 flex-1 text-sm font-semibold text-ink">{bio.city}</span>
                      {maps && <ChevronRight size={18} className="shrink-0 text-mute" />}
                    </a>
                  )}
                  {bio.hours && (
                    <div className="p-1">
                      <TradingHoursScheduleView hours={bio.hours} placeName={bio.name || bio.handle} variant="row" />
                    </div>
                  )}
                  {bio.phone && (
                    <a
                      href={tel || undefined}
                      onClick={() => {
                        void triggerHaptic("light");
                        recordTap(bio.handle, "call");
                      }}
                      className="flex min-h-[52px] items-center gap-3 p-4 transition hover:bg-paper active:scale-[0.99] touch-manipulation cursor-pointer"
                    >
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-brand/10 text-accent">
                        <Phone size={18} />
                      </span>
                      <span className="min-w-0 flex-1 text-sm font-semibold text-ink">{bio.phone}</span>
                      <ChevronRight size={18} className="shrink-0 text-mute" />
                    </a>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Owner Hangout Planner Hub and Proposals Inbox */}
          {isOwner && (
            <div className="mt-7 rounded-[28px] sm:rounded-[32px] bg-gradient-to-br from-paper/90 via-card to-paper/60 p-5 sm:p-6 ring-1 ring-brand/30 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-accent flex items-center gap-1.5">
                  <Sparkles size={12} className="text-accent" />
                  <span>AirPal Hangout Planner</span>
                </span>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/15 rounded-full px-2.5 py-0.5">
                  Live on @{bio.handle}
                </span>
              </div>
              <h3 className="font-display mt-2.5 text-lg sm:text-xl font-bold text-ink">
                Plan Catch-Ups &amp; Hangouts
              </h3>
              <p className="mt-1 text-xs sm:text-sm leading-relaxed text-mute">
                Anyone visiting your bio can request a 1-on-1 coffee, schedule a meeting, or invite you to a group
                hangout with instant calendar sync.
              </p>

              {/* Format Launcher Options */}
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3.5">
                {(
                  [
                    {
                      type: "catchup" as const,
                      label: "Catch Up",
                      sub: "1-on-1 coffee",
                      Icon: Coffee,
                      tint: "bg-amber-500/15 text-amber-700",
                    },
                    {
                      type: "meeting" as const,
                      label: "Meeting",
                      sub: "1-on-1 sync",
                      Icon: Calendar,
                      tint: "bg-sky-500/15 text-sky-700",
                    },
                    {
                      type: "nightout" as const,
                      label: "Hangout",
                      sub: "Group catch-up",
                      Icon: Users,
                      tint: "bg-rose-500/15 text-rose-700 dark:text-rose-400 ring-1 ring-rose-500/20",
                    },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.type}
                    type="button"
                    onClick={() => {
                      void triggerHaptic("light");
                      setCatchUpInitialType(opt.type);
                      setCatchUpModalOpen(true);
                    }}
                    className="group flex flex-row sm:flex-col items-center sm:justify-center gap-3 sm:gap-0 min-h-[64px] sm:min-h-[96px] rounded-[22px] bg-card p-3.5 sm:p-4 text-left sm:text-center ring-1 ring-line/80 shadow-2xs transition-[box-shadow,ring-color,transform] duration-200 hover:ring-brand/40 hover:shadow-xs active:scale-[0.98] cursor-pointer touch-manipulation"
                  >
                    <span
                      className={cn(
                        "sm:mb-2 grid h-10 w-10 sm:h-11 sm:w-11 shrink-0 place-items-center rounded-2xl transition-transform group-hover:scale-105",
                        opt.tint,
                      )}
                    >
                      <opt.Icon size={19} />
                    </span>
                    <span className="flex flex-col sm:items-center">
                      <span className="text-xs font-bold text-ink">{opt.label}</span>
                      <span className="mt-0.5 text-[11px] sm:text-[10px] text-mute">{opt.sub}</span>
                    </span>
                  </button>
                ))}
              </div>

              {/* Proposals Inbox when requests exist */}
              {catchUpsList.length > 0 && (
                <div className="mt-6 border-t border-line/70 pt-5">
                  <div className="flex items-center justify-between mb-3.5">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-amber-700">
                      <Users size={14} className="text-amber-600" />
                      <span>Meetup Proposals ({catchUpsList.length})</span>
                    </div>
                    <span className="text-[10px] font-bold rounded-full bg-amber-500/20 px-2.5 py-0.5 text-amber-800">
                      Inbox
                    </span>
                  </div>

                  <div className="space-y-3">
                    {catchUpsList.map((item) => {
                      const eventPayload = {
                        title: `${item.type === "meeting" ? "Meeting" : item.type === "nightout" ? "Hangout" : "Catch Up"}: ${item.requesterName}`,
                        description: buildCalendarShareDescription(
                          item.notes || `AirPal with ${item.requesterName}`,
                          [{ label: "Venue", value: item.venue }],
                          `https://airpal.me/@${bio.handle}`,
                        ),
                        startsAt: `${item.date || toZonedDateStr(new Date())}T${item.time || "14:00"}:00`,
                        venue: item.venue,
                        city: bio.city,
                        meetingLink: item.meetingLink,
                        meetingPlatform: item.meetingPlatform,
                      };

                      return (
                        <div
                          key={item.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 rounded-[22px] bg-card p-4 ring-1 ring-line/80 shadow-2xs"
                        >
                          <div className="min-w-0 flex-1 space-y-2.5">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="h-11 w-11 overflow-hidden rounded-full ring-1 ring-line bg-paper shrink-0">
                                {item.requesterPhoto ? (
                                  <Photo src={item.requesterPhoto} className="h-full w-full object-cover" />
                                ) : (
                                  <span className="grid h-full w-full place-items-center bg-neutral-900 font-bold text-sm text-white">
                                    {item.requesterName[0]}
                                  </span>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <p className="font-bold text-xs sm:text-sm text-ink truncate">{item.requesterName}</p>
                                  {item.requesterHandle && (
                                    <Link
                                      href={`/@${item.requesterHandle}`}
                                      className="text-[11px] text-mute hover:text-accent truncate font-medium"
                                    >
                                      @{item.requesterHandle}
                                    </Link>
                                  )}
                                </div>
                                <p className="text-[11px] text-mute truncate mt-0.5">
                                  {item.type === "meeting"
                                    ? "Meeting"
                                    : item.type === "nightout"
                                      ? "Hangout"
                                      : "Catch Up"}
                                  {item.date && ` · ${item.date}`}
                                  {item.time && ` @ ${item.time}`}
                                  {item.venue && ` · ${item.venue}`}
                                </p>
                                {item.notes && (
                                  <p className="text-[11px] text-ink italic mt-0.5 truncate">"{item.notes}"</p>
                                )}
                              </div>
                            </div>
                            <CatchUpSlotActions item={item} />
                          </div>

                          <div className="flex w-full sm:w-auto flex-wrap items-center justify-end gap-2 shrink-0 border-t border-line/40 pt-2.5 sm:border-0 sm:pt-0">
                            {item.meetingLink && (
                              <a
                                href={item.meetingLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => void triggerHaptic("light")}
                                className={cn(
                                  "inline-flex min-h-[44px] items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-xs font-semibold transition active:scale-95 touch-manipulation focus-visible:outline-2 focus-visible:outline-brand",
                                  item.meetingPlatform === "facetime" || item.meetingLink.includes("facetime")
                                    ? "bg-emerald-500/15 text-emerald-800 ring-1 ring-emerald-500/30 hover:bg-emerald-500/25"
                                    : "bg-brand/10 text-accent ring-1 ring-brand/30 hover:bg-brand/20",
                                )}
                                title={
                                  item.meetingPlatform === "facetime" || item.meetingLink.includes("facetime")
                                    ? "Open FaceTime call"
                                    : "Join Google Meet video call"
                                }
                              >
                                {item.meetingPlatform === "facetime" || item.meetingLink.includes("facetime") ? (
                                  <PhoneCall size={13} className="shrink-0 text-emerald-700" />
                                ) : (
                                  <Video size={13} className="shrink-0 text-accent" />
                                )}
                                <span>
                                  {item.meetingPlatform === "facetime" || item.meetingLink.includes("facetime")
                                    ? "FaceTime"
                                    : "Google Meet"}
                                </span>
                              </a>
                            )}
                            <AddToCalendarMenu
                              event={eventPayload}
                              size="sm"
                              variant="ghost"
                              label="Sync to Phone"
                              buttonClassName="min-h-[44px] px-4 text-xs font-semibold rounded-full border border-line"
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              aria-label="Dismiss request"
                              className="h-11 w-11 min-h-[44px] min-w-[44px] p-0 rounded-full text-mute hover:text-ink hover:bg-black/5"
                              onClick={async () => {
                                void triggerHaptic("light");
                                try {
                                  await updateCatchUpStatus(item.id, "dismissed");
                                  setCatchUpsList((prev) => prev.filter((i) => i.id !== item.id));
                                  toast.info("Request dismissed");
                                } catch (error) {
                                  toast.error(error instanceof Error ? error.message : "Couldn't dismiss request.");
                                }
                              }}
                            >
                              <X size={15} />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* What's On / Appearing at Events */}
          {appearing.length > 0 && (
            <div className="mt-7">
              <div className="flex items-center justify-between mb-2.5 px-0.5">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-accent">What’s On</p>
                <span className="text-[10px] font-bold text-mute uppercase tracking-wider">
                  {appearing.length} {appearing.length === 1 ? "Event" : "Events"}
                </span>
              </div>
              <div className="space-y-2">
                {appearing.map((s) => {
                  const event = getEvent(s.eventId);
                  const stallEventPayload = {
                    title: `${bio.name} at ${event?.name || s.eventId}`,
                    description: buildCalendarShareDescription(
                      "",
                      [
                        { label: "Offer", value: s.offer },
                        { label: "Booth", value: s.booth },
                      ],
                      `https://airpal.me/@${bio.handle}`,
                    ),
                    startsAt: event?.startsAt || `${toZonedDateStr(new Date())}T10:00:00`,
                    venue: s.location || event?.venue || "Sydney",
                    city: event?.city || bio.city,
                  };

                  return (
                    <div
                      key={s.id}
                      className="w-full flex items-center justify-between rounded-3xl bg-card p-4 text-left ring-1 ring-line/80 transition hover:bg-paper shadow-2xs"
                    >
                      <button
                        type="button"
                        onClick={() => nav(`/e/${s.eventId}`)}
                        className="min-w-0 flex-1 text-left active:scale-[0.99] cursor-pointer"
                      >
                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-accent">Appearing at</p>
                        <p className="font-display text-sm font-bold text-ink mt-0.5">
                          {event?.name || "Event / Market"}
                        </p>
                        {s.booth && <p className="text-xs text-mute mt-0.5">Booth {s.booth}</p>}
                      </button>
                      <div className="flex items-center gap-2 shrink-0">
                        <AddToCalendarMenu
                          event={stallEventPayload}
                          size="sm"
                          variant="ghost"
                          label="Sync"
                          buttonClassName="min-h-[44px] px-4 text-xs rounded-full border border-line"
                        />
                        <button
                          type="button"
                          onClick={() => nav(`/e/${s.eventId}`)}
                          className="grid h-11 w-11 place-items-center rounded-full text-mute hover:text-ink hover:bg-black/5"
                          aria-label="View event"
                        >
                          <ChevronRight size={18} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Featured Live Offer Banner */}
          {liveOffer && (
            <div
              id="bio-offers"
              className="mt-8 scroll-mt-24 overflow-hidden rounded-[28px] sm:rounded-[32px] bg-gradient-to-br from-card via-card to-paper p-5 sm:p-6 ring-1 ring-gold/40 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-gold/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-accent">
                  <Sparkles size={11} />
                  {liveOffer.badge}
                </span>
                <span className="text-[10px] font-medium text-mute uppercase tracking-wider">AirPal Offer</span>
              </div>
              <h3 className="font-display mt-2.5 text-lg sm:text-xl font-bold leading-snug text-ink">
                {liveOffer.title}
              </h3>
              <p className="mt-1 text-xs sm:text-sm leading-relaxed text-mute">{liveOffer.detail}</p>
              <Button
                className="mt-4 min-h-[44px] h-12 w-full gap-2 rounded-full bg-brand text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-brand-ink active:scale-[0.98] cursor-pointer"
                onClick={() => {
                  void triggerHaptic("medium");
                  onClaimDeal({
                    id: "live-offer",
                    kind: "deal",
                    title: liveOffer.title,
                    detail: liveOffer.detail,
                    badge: liveOffer.badge,
                  });
                }}
              >
                <Ticket size={16} className="text-accent" />
                <span>Claim Live Offer</span>
              </Button>
            </div>
          )}

          {/* Secondary Deals, Products & Services Catalog */}
          <BioCatalogSection
            label={liveOffer ? "More Deals & Offers" : "Deals & Offers"}
            items={deals}
            featured={!liveOffer}
            onTap={(kind) => recordTap(bio.handle, kind)}
            onClaim={onClaimDeal}
          />
          <BioCatalogSection
            label="Products"
            items={bio.products || []}
            onTap={(kind) => recordTap(bio.handle, kind)}
            id="bio-products"
          />
          <BioCatalogSection
            label="Services"
            items={bio.services || []}
            onTap={(kind) => recordTap(bio.handle, kind)}
            id="bio-services"
          />

          {/* Custom Outbound Links Stack */}
          {stacked.length > 0 && (
            <div className="mt-8">
              <div className="flex items-center justify-between mb-3 px-0.5">
                <h3 className="text-[11px] font-bold uppercase tracking-[0.16em] text-accent">Featured Links</h3>
                <span className="text-[10px] font-medium text-mute uppercase tracking-wider">
                  {stacked.length} {stacked.length === 1 ? "Link" : "Links"}
                </span>
              </div>
              <ul className="space-y-2.5">
                {stacked
                  .filter((link) => isSafeBioHref(link.href))
                  .map((link) => {
                    const internal = getInternalPath(link.href);
                    const isLinkedIn = link.type === "linkedin" || link.href.includes("linkedin.com");
                    const isX = link.type === "x" || link.href.includes("x.com") || link.href.includes("twitter.com");
                    const isInternal = Boolean(internal);

                    return (
                      <li key={link.id}>
                        <a
                          href={link.href}
                          target={isInternal ? undefined : link.href.startsWith("http") ? "_blank" : undefined}
                          rel={isInternal ? undefined : "noreferrer"}
                          onClick={(e) => {
                            if (internal) {
                              e.preventDefault();
                              void triggerHaptic("light");
                              nav(internal);
                              recordTap(bio.handle, link.type, link.id);
                              return;
                            }
                            void triggerHaptic("light");
                            recordTap(bio.handle, link.type, link.id);
                          }}
                          className="bio-theme-btn group flex min-h-[56px] sm:min-h-[60px] items-center justify-between rounded-[22px] bg-card/90 dark:bg-card/75 p-3.5 sm:px-4 sm:py-3 ring-1 ring-line/80 shadow-2xs backdrop-blur-sm transition-[background-color,ring-color,box-shadow,transform] duration-200 hover:bg-card hover:ring-brand/40 hover:shadow-xs active:scale-[0.99] touch-manipulation cursor-pointer"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-paper dark:bg-paper/50 text-ink ring-1 ring-line/60 group-hover:bg-brand/10 group-hover:text-brand transition-colors">
                              {isInternal ? (
                                <Sparkles size={16} className="text-accent" />
                              ) : isLinkedIn ? (
                                <Globe size={16} className="text-[#0a66c2]" />
                              ) : isX ? (
                                <Globe size={16} className="text-ink" />
                              ) : (
                                <Globe size={16} className="text-accent" />
                              )}
                            </span>
                            <div className="min-w-0 text-left">
                              <span className="block truncate text-sm sm:text-[15px] font-bold text-ink group-hover:text-brand transition-colors">
                                {link.label || link.type}
                              </span>
                              <span className="block truncate text-[11px] text-mute font-medium">
                                {isInternal
                                  ? "AirPal Experience"
                                  : link.href.replace(/^https?:\/\/(www\.)?/, "").split("/")[0]}
                              </span>
                            </div>
                          </div>
                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-mute group-hover:text-ink transition-colors ml-2">
                            {isInternal ? (
                              <ChevronRight size={17} className="transition-transform group-hover:translate-x-0.5" />
                            ) : (
                              <ArrowUpRight
                                size={17}
                                className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                              />
                            )}
                          </span>
                        </a>
                      </li>
                    );
                  })}
              </ul>
            </div>
          )}

          {/* Social Links Long Strip Section */}
          {publicLinks && socialLinks(publicLinks).some((l) => isSafeBioHref(l.href)) && (
            <div className="mt-8 pt-5 border-t border-line/60">
              <div className="flex items-center justify-between mb-3 px-0.5">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-accent">Follow &amp; Connect</p>
                <span className="text-[10px] font-medium text-mute uppercase tracking-wider">Social Channels</span>
              </div>
              <BioSocials links={publicLinks} onTap={(kind, linkId) => recordTap(bio.handle, kind, linkId)} />
            </div>
          )}

          {/* Open in Maps Button */}
          {maps && (
            <div className="mt-5">
              <a
                href={maps}
                target="_blank"
                rel="noreferrer"
                onClick={() => {
                  void triggerHaptic("light");
                  recordTap(bio.handle, "maps");
                  trackMapClick({ source: "bio" });
                }}
                className="flex min-h-[44px] h-11 items-center justify-center gap-2 rounded-full bg-paper text-xs font-bold text-ink ring-1 ring-line/80 transition hover:bg-paper/80 shadow-2xs active:scale-95 touch-manipulation cursor-pointer"
              >
                <MapPin size={15} className="text-accent" />
                <span>Open in Maps</span>
              </a>
            </div>
          )}

          {/* Guestlist signups are stored by the authenticated server callable. */}
          <form
            className="mt-8 rounded-[28px] sm:rounded-[32px] bg-paper/60 p-5 sm:p-6 ring-1 ring-line/80 shadow-2xs space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (listSending) return;
              const cityLabel =
                listCity === "other"
                  ? listCityOther.trim()
                  : (CITY_OPTIONS.find((c) => c.id === listCity)?.label || "").trim();
              const problems = validateGuestlistSignup({
                name: listName,
                city: cityLabel,
                email: listEmail,
                interests: listInterests,
                source: bio.handle,
              });
              if (problems.length > 0) {
                toast.error(problems[0] || "Check the form and try again.");
                return;
              }
              void triggerHaptic("medium");
              setListSending(true);
              void (async () => {
                try {
                  await ensureAnonymousSession();
                  await joinGuestlistSignupRemote({
                    name: listName.trim(),
                    city: cityLabel,
                    email: listEmail.trim(),
                    interests: listInterests,
                    source: bio.handle,
                  });
                  toast.success(isBizBio ? "You're on the AirPal Guestlist" : "You're subscribed");
                  setListEmail("");
                  setListName("");
                  setListCity("");
                  setListCityOther("");
                  setListInterests([]);
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Couldn't join. Try again.");
                } finally {
                  setListSending(false);
                }
              })();
            }}
          >
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-accent">
                {isBizBio ? "AirPal Guestlist" : "Stay in the loop"}
              </p>
              <h4 className="font-display text-base sm:text-lg font-bold text-ink mt-0.5">
                {isBizBio ? "VIP Invites & Secret Spots" : "Updates & Invites"}
              </h4>
              <p className="text-xs text-mute mt-0.5">
                {isBizBio
                  ? "Get notified for exclusive gatherings, door perks, and secret drops."
                  : `Get ${bio.name.split(" ")[0]}'s event invites and drops first.`}
              </p>
            </div>
            <label htmlFor="guestlist-name" className="sr-only">
              Your name
            </label>
            <input
              id="guestlist-name"
              value={listName}
              onChange={(e) => setListName(e.target.value)}
              placeholder="Your Name"
              autoComplete="name"
              maxLength={80}
              className="bio-theme-field min-h-[48px] h-12 w-full rounded-2xl bg-card px-4 text-[16px] sm:text-sm font-medium text-ink border border-line outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:border-brand shadow-2xs"
            />
            <label htmlFor="guestlist-city" className="sr-only">
              Your city
            </label>
            <select
              id="guestlist-city"
              value={listCity}
              onChange={(e) => setListCity(e.target.value)}
              className="bio-theme-field min-h-[48px] h-12 w-full rounded-2xl bg-card px-4 text-[16px] sm:text-sm font-medium text-ink border border-line outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:border-brand shadow-2xs"
            >
              <option value="">Your City</option>
              {CITY_OPTIONS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                  {c.region ? `, ${c.region}` : ""}
                </option>
              ))}
              <option value="other">Somewhere else</option>
            </select>
            {listCity === "other" && (
              <>
                <label htmlFor="guestlist-city-other" className="sr-only">
                  Your city or town
                </label>
                <input
                  id="guestlist-city-other"
                  value={listCityOther}
                  onChange={(e) => setListCityOther(e.target.value)}
                  placeholder="Your city or town"
                  autoComplete="address-level2"
                  maxLength={60}
                  className="bio-theme-field min-h-[48px] h-12 w-full rounded-2xl bg-card px-4 text-[16px] sm:text-sm font-medium text-ink border border-line outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:border-brand shadow-2xs"
                />
              </>
            )}
            <label htmlFor="guestlist-email" className="sr-only">
              Your email
            </label>
            <input
              id="guestlist-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              required
              value={listEmail}
              onChange={(e) => setListEmail(e.target.value)}
              placeholder="Your Email"
              className="bio-theme-field min-h-[48px] h-12 w-full rounded-2xl bg-card px-4 text-[16px] sm:text-sm font-medium text-ink border border-line outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:border-brand shadow-2xs"
            />
            <fieldset>
              <legend className="text-[11px] font-semibold text-mute">I&apos;m into — pick any</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {GUESTLIST_INTERESTS.map((interest) => {
                  const on = listInterests.includes(interest.id);
                  return (
                    <button
                      key={interest.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => {
                        void triggerHaptic("light");
                        setListInterests((prev) =>
                          prev.includes(interest.id) ? prev.filter((v) => v !== interest.id) : [...prev, interest.id],
                        );
                      }}
                      className={
                        on
                          ? "min-h-[44px] shrink-0 cursor-pointer rounded-full bg-brand px-4 text-xs font-bold text-white shadow-xs transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                          : "min-h-[44px] shrink-0 cursor-pointer rounded-full bg-card px-4 text-xs font-semibold text-ink ring-1 ring-line transition hover:ring-brand/40 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                      }
                    >
                      {interest.label}
                    </button>
                  );
                })}
              </div>
            </fieldset>
            <button
              type="submit"
              disabled={listSending}
              className="bio-theme-primary min-h-[48px] h-12 w-full rounded-full bg-brand text-xs sm:text-sm font-bold text-white transition hover:bg-brand-ink active:scale-95 shadow-xs disabled:opacity-60 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand touch-manipulation"
            >
              {listSending
                ? isBizBio
                  ? "Joining VIP list…"
                  : "Subscribing…"
                : isBizBio
                  ? "Join the Guestlist (Free)"
                  : "Subscribe (Free)"}
            </button>
            <p className="text-center text-[11px] leading-relaxed text-mute">
              {GUESTLIST_CONSENT_V1} Includes AirPal Club perks and priority invites.
            </p>
          </form>

          {bio.propertyId ? <BioPulseRate propertyId={bio.propertyId} /> : null}

          {/* Invite code — every bio carries its owner's code so any visitor can join under them */}
          {bio.ownerUid && (
            <div className="mt-8 rounded-[28px] bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-amber-500/10 p-5 ring-1 ring-amber-500/25 shadow-xs">
              <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-accent">
                <Ticket size={14} className="text-amber-500" aria-hidden />
                <span>{isOwner ? "Your invite code" : `Join with ${firstNameOf(bio.name)}'s code`}</span>
              </p>
              <div className="mt-3 flex flex-wrap sm:flex-nowrap items-center gap-2">
                <code className="min-w-0 w-full sm:w-auto sm:flex-1 truncate rounded-2xl bg-card px-4 py-2.5 text-sm font-bold text-ink ring-1 ring-line/80 shadow-2xs font-mono">
                  @{bio.handle}
                </code>
                <button
                  type="button"
                  onClick={() => void handleCopyInviteCode()}
                  className="inline-flex min-h-[44px] flex-1 sm:flex-initial sm:shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-2xl bg-card px-4 text-xs font-semibold text-ink ring-1 ring-line/80 shadow-2xs transition hover:bg-paper active:scale-95 cursor-pointer touch-manipulation"
                  aria-label="Copy invite code"
                >
                  {copiedCode ? (
                    <Check size={14} className="shrink-0 text-emerald-600 animate-in zoom-in" />
                  ) : (
                    <Copy size={14} className="shrink-0 text-mute" />
                  )}
                  <span>{copiedCode ? "Copied" : "Copy"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => void handleShareInvite()}
                  className="bio-theme-primary inline-flex min-h-[44px] flex-1 sm:flex-initial sm:shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-2xl bg-brand px-4 text-xs font-bold text-white shadow-xs transition hover:bg-brand-ink active:scale-95 cursor-pointer touch-manipulation"
                  aria-label="Share invite link"
                >
                  <Share2 size={14} className="shrink-0" />
                  <span>Invite</span>
                </button>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-mute">
                {isOwner
                  ? "Share your code — you both earn Stars when your mate completes their first experience."
                  : "Use this code when you join — you both earn Stars when you complete your first experience."}
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Master Brand Profile Footer */}
      <footer className="mt-8 sm:mt-10 mb-4 flex flex-col items-center justify-center gap-6 px-4 text-center">
        {/* Brand Identity Lockup */}
        <div className="flex flex-col items-center gap-2">
          <Link
            href="/"
            className="group inline-flex items-center gap-2.5 rounded-full bg-card/85 dark:bg-card/60 px-4 py-2 ring-1 ring-line/70 shadow-2xs backdrop-blur-md transition hover:bg-card hover:ring-brand/40 active:scale-95"
            aria-label="AirPal Home"
          >
            <BrandMark compact mode="me" className="h-7 w-7" />
            <div className="flex items-center gap-1.5 text-left">
              <span className="font-display text-sm font-bold tracking-tight text-ink">
                AirPal<span className="text-brand">.Me</span>
              </span>
              <span className="text-mute/60">·</span>
              <span className="text-[11px] font-semibold text-mute group-hover:text-ink transition">
                Life Made Easy
              </span>
            </div>
          </Link>
        </div>

        {/* Dynamic Context CTAs: Owner Actions vs Visitor Promotion */}
        {isOwner ? (
          <div className="flex flex-wrap items-center justify-center gap-2 max-w-md">
            <Link
              href="/bio/edit"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl bg-card/90 dark:bg-card/70 px-4 py-2 text-xs font-semibold text-ink ring-1 ring-line/80 shadow-2xs backdrop-blur-sm transition hover:bg-card hover:ring-brand/50 active:scale-95 cursor-pointer touch-manipulation"
            >
              <Edit3 size={14} className="text-brand shrink-0" />
              <span>Edit Bio Pass</span>
            </Link>
            <button
              type="button"
              onClick={() => {
                void triggerHaptic("medium");
                setShareModalOpen(true);
              }}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl bg-card/90 dark:bg-card/70 px-4 py-2 text-xs font-semibold text-ink ring-1 ring-line/80 shadow-2xs backdrop-blur-sm transition hover:bg-card hover:ring-brand/50 active:scale-95 cursor-pointer touch-manipulation"
            >
              <QrCode size={14} className="text-accent shrink-0" />
              <span>Share Pass QR</span>
            </button>
            <Link
              href="/pass"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl bg-card/90 dark:bg-card/70 px-4 py-2 text-xs font-semibold text-ink ring-1 ring-line/80 shadow-2xs backdrop-blur-sm transition hover:bg-card hover:ring-brand/50 active:scale-95 cursor-pointer touch-manipulation"
            >
              <Ticket size={14} className="text-amber-500 shrink-0" />
              <span>Events &amp; Deals</span>
            </Link>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 max-w-md w-full">
            <p className="text-xs text-mute leading-relaxed max-w-sm">
              Discover what&apos;s on, catch up with mates &amp; share with your Circle and pals — all from your
              personal digital pass.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              <Link
                href="/bio/setup"
                className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl bg-brand px-5 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-brand-ink active:scale-95 cursor-pointer touch-manipulation"
              >
                <Sparkles size={14} className="shrink-0" />
                <span>Claim your free @handle</span>
              </Link>
              <Link
                href="/pass"
                className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl bg-card/90 dark:bg-card/70 px-4 py-2.5 text-xs font-semibold text-ink ring-1 ring-line/80 shadow-2xs backdrop-blur-sm transition hover:bg-card hover:ring-brand/50 active:scale-95 cursor-pointer touch-manipulation"
              >
                <span>AirPal Pass</span>
                <ChevronRight size={14} className="shrink-0 text-mute" />
              </Link>
            </div>
          </div>
        )}

        {/* Interactive Share / URL Pill */}
        <button
          type="button"
          onClick={handleQuickCopy}
          className="group inline-flex min-h-[44px] items-center gap-2 rounded-full bg-paper/80 dark:bg-card/70 px-4 py-1.5 text-xs font-mono text-mute ring-1 ring-line/70 transition hover:text-ink hover:ring-brand/40 active:scale-95 cursor-pointer touch-manipulation select-none"
          title="Copy profile link"
          aria-label="Copy profile link"
        >
          {copiedLink ? (
            <Check size={13} className="shrink-0 text-emerald-600 animate-in zoom-in" />
          ) : (
            <Copy size={13} className="shrink-0 text-mute group-hover:text-ink transition" />
          )}
          <span className="font-semibold text-ink">airpal.me/@{bio.handle}</span>
          <span className="text-[11px] font-sans text-mute group-hover:text-accent transition">
            {copiedLink ? "Copied" : "Copy"}
          </span>
        </button>

        {/* Navigation & Trust Links */}
        <nav
          aria-label="Profile footer navigation"
          className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-mute"
        >
          <Link href="/about" className="transition hover:text-ink hover:underline">
            About
          </Link>
          <span className="text-line select-none">·</span>
          <Link href="/circle" className="transition hover:text-ink hover:underline">
            Circle
          </Link>
          <span className="text-line select-none">·</span>
          <Link href="/pass" className="transition hover:text-ink hover:underline">
            Events
          </Link>
          <span className="text-line select-none">·</span>
          <Link href="/trust" className="transition hover:text-ink hover:underline">
            Trust &amp; Safety
          </Link>
          <span className="text-line select-none">·</span>
          <Link href="/privacy" className="transition hover:text-ink hover:underline">
            Privacy
          </Link>
          <span className="text-line select-none">·</span>
          <Link href="/terms" className="transition hover:text-ink hover:underline">
            Terms
          </Link>
        </nav>

        {/* Philosophy & Copyright */}
        <p className="text-[11px] text-mute/70">&copy; {new Date().getFullYear()} AirPal &middot; Life Made Easy</p>
      </footer>

      {/* Floating QR — instant access to the branded share screen.
          Left side so it never collides with the global Create FAB (right)
          or the bottom tab dock; hidden while the share sheet is open. */}
      {!shareModalOpen && (
        <button
          type="button"
          onClick={() => {
            void triggerHaptic("medium");
            setShareModalOpen(true);
          }}
          aria-label={`Open QR code for @${bio.handle}`}
          title={isOwner ? "My QR code" : `${firstNameOf(bio.name)}'s Pass QR`}
          className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+1.25rem)] left-4 z-40 flex cursor-pointer touch-manipulation flex-col items-center gap-1 rounded-[22px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 sm:bottom-6 sm:left-6"
        >
          <span className="relative grid h-16 w-16 place-items-center rounded-[22px] bg-white p-1.5 shadow-lg ring-2 ring-brand/70 transition-transform duration-150 active:scale-95">
            {bioQrUrl ? (
              <img
                src={bioQrUrl}
                alt=""
                aria-hidden="true"
                width={52}
                height={52}
                className="h-full w-full rounded-[14px] object-contain"
              />
            ) : (
              <QrCode size={28} className="text-accent" aria-hidden="true" />
            )}
            <span className="absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center overflow-hidden rounded-full bg-white shadow ring-1 ring-line">
              <img
                src="/logo-mark.png"
                alt=""
                aria-hidden="true"
                width={16}
                height={16}
                className="h-4 w-4 object-contain"
              />
            </span>
          </span>
          <span className="rounded-full bg-ink/85 px-2.5 py-0.5 text-[10px] font-bold text-white shadow backdrop-blur">
            {isOwner ? "My QR" : "Pass QR"}
          </span>
        </button>
      )}

      {/* Claim Redemption Modal */}
      {claim && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Claim offer"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-6 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setClaim(null)}
        >
          <div
            className="w-full max-w-sm rounded-t-[32px] sm:rounded-[32px] bg-card p-6 text-center shadow-2xl ring-1 ring-line animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)] sm:pb-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-line/80 sm:hidden" />
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent">{claim.badge}</p>
            <p className="font-mono mt-3 text-4xl font-bold tracking-widest text-ink tabular-nums">{claim.code}</p>
            <p className="mt-2 text-xs font-medium text-mute leading-relaxed">{claim.detail}</p>
            <div className="mt-4 rounded-2xl bg-gold/10 p-3 text-xs text-accent font-medium">
              Active offer · Show this code to your server or at the till.
            </div>
            <button
              type="button"
              className="bio-theme-primary mt-5 min-h-[48px] h-12 w-full rounded-full bg-brand py-3 text-xs sm:text-sm font-bold text-white transition hover:bg-brand-ink active:scale-95 cursor-pointer touch-manipulation shadow-xs"
              onClick={() => {
                void triggerHaptic("light");
                setClaim(null);
              }}
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Share QR Dialog */}
      <BioShareModal
        open={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        handle={bio.handle}
        name={bio.name}
        url={share}
        avatar={bio.avatar}
        city={bio.city}
        headline={bio.shortWhy}
        kind={bio.kind}
        phone={bio.phone}
      />

      {/* Catch Up / Meeting / Hangout Modal */}
      <BioCatchUpModal
        open={catchUpModalOpen}
        onClose={() => {
          setCatchUpModalOpen(false);
        }}
        handle={bio.handle}
        name={bio.name}
        city={bio.city}
        avatar={avatar}
        ownerUid={bio.ownerUid}
        initialType={catchUpInitialType}
        defaultMeetingUrl={bio.meetingUrl}
        defaultMeetingPlatform={bio.preferredMeetingPlatform}
      />

      {/* Availability Status Modal */}
      <BioStatusModal
        open={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        handle={bio.handle}
        currentStatus={
          bio.availabilityStatus ||
          (bio.openNow === true ? "available" : bio.openNow === false ? "offline" : "available")
        }
        currentCustomStatus={bio.customStatus}
        currentEmoji={bio.customStatusEmoji}
        onSaved={(newStatus, newCustom, newEmoji) => {
          if (remote) {
            setRemote({
              ...remote,
              availabilityStatus: newStatus,
              openNow: newStatus === "available",
              customStatus: newCustom,
              customStatusEmoji: newEmoji,
            });
          }
        }}
      />
    </div>
  );
}
