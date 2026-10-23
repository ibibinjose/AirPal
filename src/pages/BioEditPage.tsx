import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useLocation, useSearch } from "wouter";
import { toast } from "sonner";
import { nanoid } from "nanoid";
import {
  ArrowLeft,
  Building2,
  Camera,
  Check,
  Copy,
  Edit3,
  ExternalLink,
  Eye,
  Globe,
  HeartHandshake,
  Link2,
  Lock,
  MapPin,
  MessageCircle,
  Moon,
  Package,
  Phone,
  PhoneCall,
  Plus,
  QrCode,
  Shield,
  Smartphone,
  Sparkles,
  Star,
  Store,
  Sun,
  Archive,
  BarChart3,
  CalendarDays,
  Trash2,
  User,
  UserCheck,
  UserRound,
  Video,
} from "lucide-react";
import {
  AVAILABILITY_STATUSES,
  BIO_LINK_TYPES,
  bioPath,
  catalogDeals,
  isBusinessKind,
  isSocialLinkType,
  resolveBioTheme,
  type AvailabilityStatus,
  type BioCatalogItem,
  type BioCatalogKind,
  type BioLink,
  type BioLinkType,
  type BioProfile,
  type BioVisibility,
} from "@shared/bio";
import { Button } from "@/components/ui/Button";
import { BioCatalogEditor } from "@/components/bio/BioCatalogEditor";
import { BioInsightsPanel } from "@/components/bio/BioInsights";
import { BioSubscribersPanel } from "@/components/bio/BioSubscribers";
import { BioThemePicker } from "@/components/bio/BioThemePicker";
import { DigitalBioPassCard } from "@/components/bio/DigitalBioPassCard";
import { useBio } from "@/contexts/BioContext";
import { ImageField } from "@/components/media/ImageField";
import { makeQrDataUrl } from "@/lib/qr";
import { toPublicUrl } from "@/lib/public-origin";
import { TradingHoursField } from "@/components/forms/TradingHoursField";
import { CitySuburbRegionField } from "@/components/forms/CitySuburbRegionField";
import { cn } from "@/lib/cn";
import { PhoneField } from "@/components/forms/PhoneField";
import { isValidPhone } from "@shared/geo-address";
import { fieldInput } from "@/components/forms/ValidField";
import { GooglePlaceImportCard } from "@/components/business/GooglePlaceImport";
import { bioLinksFromGooglePlace, mergeBioLinks } from "@shared/google-place";
import { Photo } from "@/components/ui/Photo";
import { BioHandleButton } from "@/components/bio/BioHandleButton";
import { BioKindBadge, BioKindIcon } from "@/components/bio/BioKindBadge";
import { ChangeHandleForm } from "@/components/bio/ChangeHandleForm";
import { setAuthDisplayName } from "@/lib/auth-mail";
import { getFirebaseAuth } from "@/lib/firebase";
import { triggerHaptic } from "@/lib/native";
import {
  BUSINESS_CATEGORY_PRESETS,
  BUSINESS_CTA_PRESETS,
  PERSONAL_CATEGORY_PRESETS,
  PERSONAL_CTA_PRESETS,
  SOCIAL_CONFIG,
  formatFinalLinkHref,
} from "@/lib/bio-edit-presets";

export function BioEditPage() {
  const [, nav] = useLocation();
  const searchStr = useSearch();
  const params = useMemo(() => new URLSearchParams(searchStr), [searchStr]);
  const queryKind = params.get("kind");
  const queryHandle = params.get("handle");

  const { mine, business, profiles, updateProfile, tapsToday } = useBio();

  // Active target profile resolution: personal (mine) or business or selected handle
  const activeProfile: BioProfile | null = useMemo(() => {
    if (queryHandle) {
      const hit = profiles.find((p) => p.handle === queryHandle);
      if (hit) return hit;
    }
    if (queryKind === "business" && business) return business;
    if (queryKind === "person" && mine) return mine;
    return mine || business || profiles[0] || null;
  }, [business, mine, profiles, queryHandle, queryKind]);

  const isBusiness = isBusinessKind(activeProfile?.kind);

  const [tab, setTab] = useState<"profile" | "links" | "shop" | "share" | "insights">("profile");
  const [saving, setSaving] = useState(false);

  // Editable Profile Form States
  const [name, setName] = useState("");
  const [shortWhy, setShortWhy] = useState("");
  const [aboutText, setAboutText] = useState("");
  const [categoryTag, setCategoryTag] = useState("");
  const [pronouns, setPronouns] = useState("");
  const [languages, setLanguages] = useState("");
  const [primaryCta, setPrimaryCta] = useState("");
  const [city, setCity] = useState("");
  const [hours, setHours] = useState("");
  const [openNow, setOpenNow] = useState(true);
  const [availabilityStatus, setAvailabilityStatus] = useState<AvailabilityStatus>("available");
  // Existing friends-only profiles remain readable, while this control keeps
  // the privacy choice explicit: either share the link or keep it to yourself.
  const [visibility, setVisibility] = useState<BioVisibility>("private");
  const [customStatus, setCustomStatus] = useState("");
  const [customStatusEmoji, setCustomStatusEmoji] = useState("☕");
  const [phone, setPhone] = useState("");
  const [avatar, setAvatar] = useState("");
  const [cover, setCover] = useState("");

  const [mapsPlaceId, setMapsPlaceId] = useState("");
  const [links, setLinks] = useState<BioLink[]>([]);
  const [products, setProducts] = useState<BioCatalogItem[]>([]);
  const [services, setServices] = useState<BioCatalogItem[]>([]);
  const [deals, setDeals] = useState<BioCatalogItem[]>([]);
  const [qr, setQr] = useState("");
  const [type, setType] = useState<BioLinkType>("website");
  const [href, setHref] = useState("");
  const [zooHunt, setZooHunt] = useState(false);
  const [meetingUrl, setMeetingUrl] = useState("");
  const [preferredMeetingPlatform, setPreferredMeetingPlatform] = useState<
    "in_person" | "google_meet" | "facetime" | "zoom"
  >("in_person");

  // Mobile edit / preview switcher: below lg the live mirror renders inline
  // in the right column (bare screen, no device chrome) instead of a modal.
  const [mobileView, setMobileView] = useState<"edit" | "preview">("edit");
  const [previewThemeMode, setPreviewThemeMode] = useState<"dark" | "light">("dark");

  // Synchronize form states when active target profile changes
  useEffect(() => {
    if (!activeProfile) return;
    setName(activeProfile.name);
    setShortWhy(activeProfile.shortWhy || "");
    setAboutText(activeProfile.aboutText || "");
    const rawTag = activeProfile.categoryTag?.trim();
    setCategoryTag(
      rawTag?.toLowerCase() === "airpal mate"
        ? "AirPal Star"
        : rawTag || (isBusinessKind(activeProfile.kind) ? "Local Business" : "AirPal Star"),
    );
    setPronouns(activeProfile.pronouns || "");
    setLanguages(activeProfile.languages || "");
    setPrimaryCta(activeProfile.primaryCta || (isBusinessKind(activeProfile.kind) ? "Order Online" : "Catch Up"));
    setCity(activeProfile.city || "");
    setHours(activeProfile.hours || "");
    setOpenNow(activeProfile.openNow ?? true);
    setAvailabilityStatus(activeProfile.availabilityStatus || "available");
    setVisibility(activeProfile.visibility === "public" ? "public" : "private");
    setCustomStatus(activeProfile.customStatus || "");
    setCustomStatusEmoji(activeProfile.customStatusEmoji || "☕");
    setPhone(activeProfile.phone || "");
    setAvatar(activeProfile.avatar || "");
    setCover(activeProfile.cover || "");
    setMapsPlaceId(activeProfile.mapsPlaceId || "");
    setLinks(activeProfile.links || []);
    setProducts(activeProfile.products || []);
    setServices(activeProfile.services || []);
    setDeals(activeProfile.deals?.length ? activeProfile.deals : catalogDeals(activeProfile));
    setZooHunt(Boolean(activeProfile.zooHunt));
    setMeetingUrl(activeProfile.meetingUrl || "");
    setPreferredMeetingPlatform(activeProfile.preferredMeetingPlatform || "in_person");
    void makeQrDataUrl(toPublicUrl(bioPath(activeProfile.handle))).then(setQr);
  }, [activeProfile]);

  // Compute dirty/unsaved state
  const isDirty = useMemo(() => {
    if (!activeProfile) return false;
    const defaultTag = isBusiness ? "Local Business" : "AirPal Star";
    return (
      name !== activeProfile.name ||
      shortWhy !== (activeProfile.shortWhy || "") ||
      aboutText !== (activeProfile.aboutText || "") ||
      categoryTag !== (activeProfile.categoryTag || defaultTag) ||
      pronouns !== (activeProfile.pronouns || "") ||
      languages !== (activeProfile.languages || "") ||
      primaryCta !== (activeProfile.primaryCta || (isBusiness ? "Order Online" : "Catch Up")) ||
      city !== (activeProfile.city || "") ||
      hours !== (activeProfile.hours || "") ||
      availabilityStatus !== (activeProfile.availabilityStatus || "available") ||
      visibility !== (activeProfile.visibility === "public" ? "public" : "private") ||
      customStatus !== (activeProfile.customStatus || "") ||
      customStatusEmoji !== (activeProfile.customStatusEmoji || "☕") ||
      phone !== (activeProfile.phone || "") ||
      meetingUrl !== (activeProfile.meetingUrl || "") ||
      preferredMeetingPlatform !== (activeProfile.preferredMeetingPlatform || "in_person") ||
      zooHunt !== Boolean(activeProfile.zooHunt)
    );
  }, [
    activeProfile,
    name,
    shortWhy,
    aboutText,
    categoryTag,
    isBusiness,
    pronouns,
    languages,
    primaryCta,
    city,
    hours,
    availabilityStatus,
    visibility,
    customStatus,
    customStatusEmoji,
    phone,
    meetingUrl,
    preferredMeetingPlatform,
    zooHunt,
  ]);

  const handleResetChanges = () => {
    if (!activeProfile) return;
    void triggerHaptic("medium");
    setName(activeProfile.name);
    setShortWhy(activeProfile.shortWhy || "");
    setAboutText(activeProfile.aboutText || "");
    const rawTag = activeProfile.categoryTag?.trim();
    setCategoryTag(
      rawTag?.toLowerCase() === "airpal mate"
        ? "AirPal Star"
        : rawTag || (isBusinessKind(activeProfile.kind) ? "Local Business" : "AirPal Star"),
    );
    setPronouns(activeProfile.pronouns || "");
    setLanguages(activeProfile.languages || "");
    setPrimaryCta(activeProfile.primaryCta || (isBusinessKind(activeProfile.kind) ? "Order Online" : "Catch Up"));
    setCity(activeProfile.city || "");
    setHours(activeProfile.hours || "");
    setOpenNow(activeProfile.openNow ?? true);
    setAvailabilityStatus(activeProfile.availabilityStatus || "available");
    setVisibility(activeProfile.visibility === "public" ? "public" : "private");
    setCustomStatus(activeProfile.customStatus || "");
    setCustomStatusEmoji(activeProfile.customStatusEmoji || "☕");
    setPhone(activeProfile.phone || "");
    setMeetingUrl(activeProfile.meetingUrl || "");
    setPreferredMeetingPlatform(activeProfile.preferredMeetingPlatform || "in_person");
    setZooHunt(Boolean(activeProfile.zooHunt));
    toast.info("Changes reset to saved profile");
  };

  if (!activeProfile) {
    return (
      <div className="grid min-h-[60vh] place-items-center px-6 text-center">
        <div className="rounded-[32px] bg-card p-8 sm:p-10 shadow-clay ring-1 ring-line max-w-md w-full">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-brand/10 text-accent mb-5 ring-1 ring-brand/20">
            <UserRound size={32} />
          </div>
          <p className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-ink">No @handle yet</p>
          <p className="mt-2.5 text-sm text-mute leading-relaxed">
            Create your AirPal Me digital bio or register an AirPal Pass business place to launch your public profile.
          </p>
          <div className="mt-7 space-y-3">
            <Button
              className="w-full h-12 text-sm font-semibold shadow-md gap-2 rounded-2xl"
              onClick={() => nav("/bio/setup")}
            >
              <User size={16} />
              Set Up AirPal Me Bio
            </Button>
            <Button
              variant="ghost"
              className="w-full h-12 text-sm font-semibold border border-line gap-2 rounded-2xl bg-paper hover:bg-card"
              onClick={() => nav("/bio/setup?kind=business")}
            >
              <Store size={16} />
              Add Business Place
            </Button>
          </div>
        </div>
      </div>
    );
  }

  async function handleSaveAll(e?: FormEvent) {
    if (e) e.preventDefault();
    if (phone && !isValidPhone(phone)) {
      toast.error("Phone needs a valid country code (e.g. +61 400 123 456)");
      return;
    }
    setSaving(true);
    try {
      await updateProfile({
        handle: activeProfile!.handle,
        name,
        shortWhy,
        aboutText,
        categoryTag,
        pronouns,
        languages,
        primaryCta,
        city,
        hours,
        openNow,
        availabilityStatus,
        visibility,
        customStatus: customStatus.trim() || undefined,
        customStatusEmoji: customStatusEmoji.trim() || undefined,
        phone,
        avatar: avatar.trim() || undefined,
        cover: cover.trim() || undefined,
        mapsPlaceId: mapsPlaceId.trim() || undefined,
        zooHunt,
        meetingUrl: meetingUrl.trim() || undefined,
        preferredMeetingPlatform,
        links,
        products,
        services,
        deals,
      });
      const auth = getFirebaseAuth();
      if (auth?.currentUser && name.trim()) {
        try {
          await setAuthDisplayName(auth.currentUser, name.trim());
        } catch {
          /* best effort */
        }
      }
      void triggerHaptic("success");
      toast.success(isBusiness ? "Saved business place profile" : "Saved AirPal Me profile");
    } catch (err) {
      void triggerHaptic("error");
      toast.error(err instanceof Error ? err.message : "Could not save profile changes. Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function onSelectTheme(themeId: string | undefined) {
    if (!activeProfile) return;
    await updateProfile({ handle: activeProfile.handle, theme: themeId });
    void triggerHaptic("light");
    toast.success("Theme updated on your public bio");
  }

  async function onStoredPhoto(kind: "avatar" | "cover", src?: string) {
    if (!activeProfile) return;
    if (kind === "avatar") setAvatar(src || "");
    else setCover(src || "");
    await updateProfile({ handle: activeProfile.handle, [kind]: src || "" });
    void triggerHaptic("light");
    toast.success(kind === "avatar" ? "Avatar updated" : "Cover banner updated");
  }

  async function saveCatalog(kind: BioCatalogKind, rows: BioCatalogItem[]) {
    const nextProducts = kind === "product" ? rows : products;
    const nextServices = kind === "service" ? rows : services;
    const nextDeals = kind === "deal" ? rows : deals;
    if (kind === "product") setProducts(rows);
    if (kind === "service") setServices(rows);
    if (kind === "deal") setDeals(rows);
    await updateProfile({
      handle: activeProfile!.handle,
      products: nextProducts,
      services: nextServices,
      deals: nextDeals,
    });
    void triggerHaptic("light");
    toast.success("Catalog updated");
  }

  const statusInfo = AVAILABILITY_STATUSES[availabilityStatus] || AVAILABILITY_STATUSES.available;

  // Live preview mirror. Full device chrome on desktop; `bare` renders just
  // the live screen in a slim frame for the inline mobile preview.
  const renderLivePhoneMockup = (bare = false) => {
    const activeTheme = resolveBioTheme(activeProfile.theme);
    const isDarkPreview = previewThemeMode === "dark";
    // Same tokens as the public page (`bioThemeCssVars`): the mirror can
    // never drift from what visitors see, in either scheme.
    const screenBg = isDarkPreview ? activeTheme.darkPageBg : activeTheme.pageBg;
    const screenInk = isDarkPreview ? activeTheme.darkInk : activeTheme.ink;
    const screenMute = isDarkPreview ? activeTheme.darkMuted : activeTheme.muted;
    const screenCardBg = isDarkPreview ? activeTheme.darkSurface : activeTheme.surface;
    const screenBorder = isDarkPreview ? "rgba(255,255,255,0.14)" : activeTheme.border;

    return (
      <div className="relative mx-auto w-full max-w-[340px] select-none pt-2 pb-4">
        {!bare && (
          <>
            {/* Hardware Buttons Silhouettes (Titanium frame edges) */}
            {/* Left: Action Button, Volume Up, Volume Down */}
            <div
              className="absolute -left-[3px] top-[108px] h-7 w-[4px] rounded-l-[3px] bg-neutral-600/80 shadow-2xs"
              title="Action Button"
            />
            <div
              className="absolute -left-[3px] top-[148px] h-12 w-[4px] rounded-l-[3px] bg-neutral-600/80 shadow-2xs"
              title="Volume Up"
            />
            <div
              className="absolute -left-[3px] top-[208px] h-12 w-[4px] rounded-l-[3px] bg-neutral-600/80 shadow-2xs"
              title="Volume Down"
            />
            {/* Right: Side Power Button & Camera Control */}
            <div
              className="absolute -right-[3px] top-[160px] h-16 w-[4px] rounded-r-[3px] bg-neutral-600/80 shadow-2xs"
              title="Side Button"
            />
            <div
              className="absolute -right-[2.5px] bottom-[160px] h-12 w-[3.5px] rounded-r-[2px] bg-neutral-500/70 shadow-2xs"
              title="Camera Control"
            />
          </>
        )}

        {/* Device frame: full titanium chassis on desktop, slim ring frame when bare */}
        <div
          className={cn(
            "relative overflow-hidden bg-[#000000]",
            bare
              ? "rounded-[28px] ring-1 ring-line shadow-clay"
              : "rounded-[50px] border-[9px] border-[#18181b] dark:border-[#101012] shadow-[0_25px_65px_-12px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.12),inset_0_0_0_1px_rgba(255,255,255,0.08)] ring-1 ring-black/50",
          )}
        >
          {!bare && (
            <>
              {/* Dynamic Island */}
              <div className="absolute left-1/2 top-2.5 z-40 -translate-x-1/2">
                <div
                  className="group flex h-[27px] w-[105px] items-center justify-between rounded-full bg-black px-2.5 shadow-md ring-1 ring-white/10 transition-all duration-300 hover:w-[155px]"
                  title="iPhone Dynamic Island"
                >
                  {/* Sensor */}
                  <div className="h-2.5 w-2.5 rounded-full bg-[#030308] ring-1 ring-white/5" />

                  {/* Center text on expand */}
                  <span className="hidden text-[9px] font-bold text-white group-hover:inline-block tracking-wider uppercase">
                    AirPal Live
                  </span>

                  {/* TrueDepth Camera */}
                  <div className="relative h-3 w-3 rounded-full bg-[#0a0d18] ring-1 ring-white/10">
                    <span className="absolute inset-0.5 rounded-full bg-gradient-to-tr from-sky-900/60 to-slate-900/60 opacity-80" />
                  </div>
                </div>
              </div>

              {/* iOS 18 Top Status Bar */}
              <div className="relative z-30 flex h-11 w-full items-center justify-between px-6 pt-1 text-[11px] font-semibold text-white select-none">
                <span className="font-sans font-semibold tracking-tight text-white/95">9:41</span>
                <div className="flex items-center gap-1.5 text-white/95">
                  <div className="flex items-end gap-[1.5px] h-2.5">
                    <span className="w-[2.5px] h-1 bg-current rounded-xs" />
                    <span className="w-[2.5px] h-1.5 bg-current rounded-xs" />
                    <span className="w-[2.5px] h-2 bg-current rounded-xs" />
                    <span className="w-[2.5px] h-2.5 bg-current rounded-xs" />
                  </div>
                  <span className="text-[10px] font-bold">5G</span>
                  <div className="h-3 w-5 rounded-[4px] border border-current p-[1.5px] flex items-center">
                    <div className="h-full w-full bg-current rounded-[1px]" />
                  </div>
                </div>
              </div>

              {/* Mini Safari Address Bar */}
              <div className="relative z-20 px-5 pb-1">
                <div className="flex h-7 items-center justify-between rounded-full bg-white/10 dark:bg-white/10 backdrop-blur-md px-3 text-[10px] text-white/80 ring-1 ring-white/10">
                  <div className="flex items-center gap-1.5 truncate">
                    <Lock size={10} className="text-emerald-400 shrink-0" />
                    <span className="font-mono truncate">airpal.me/@{activeProfile.handle}</span>
                  </div>
                  <span className="text-[9px] uppercase tracking-wider text-white/50 font-semibold shrink-0">Live</span>
                </div>
              </div>
            </>
          )}

          {/* Screen Inner Viewport (Real-Time Live Bio Mirror) */}
          <div
            className={cn(
              "relative pb-6 scrollbar-none transition-colors duration-300",
              bare ? "rounded-[27px]" : "max-h-[570px] overflow-y-auto rounded-b-[40px]",
            )}
            style={{
              backgroundColor: screenBg,
              color: screenInk,
            }}
          >
            {/* Distinction Header Banner inside view */}
            <div
              className={cn(
                "flex items-center justify-between px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider border-b",
                isBusiness
                  ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                  : "bg-brand/10 text-brand border-brand/20",
              )}
            >
              <span className="flex items-center gap-1.5">
                {isBusiness ? <Store size={12} /> : <UserCheck size={12} />}
                {isBusiness ? "AirPal Pass Place" : "AirPal Me Bio"}
              </span>
              <span className="font-mono text-[10px] lowercase opacity-75">@{activeProfile.handle}</span>
            </div>

            {/* Cover Photo Hero */}
            <div className="relative">
              {cover ? (
                <Photo src={cover} className="h-32 w-full object-cover" />
              ) : (
                <div
                  className="relative h-32 w-full overflow-hidden"
                  style={{
                    background: `linear-gradient(135deg, ${activeTheme.heroFrom}, ${activeTheme.heroTo})`,
                  }}
                >
                  <div className="absolute inset-0 opacity-25 bg-[radial-gradient(#004eff_1.5px,transparent_1.5px)] [background-size:16px_16px]" />
                </div>
              )}

              {/* Real-time Indicator Pill */}
              <div className="absolute right-2.5 top-2.5 z-10">
                <span className="inline-flex items-center gap-1 rounded-full bg-black/75 px-2 py-0.5 text-[9px] font-bold text-white backdrop-blur-md shadow-xs">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 motion-safe:animate-pulse" />
                  PREVIEW
                </span>
              </div>
            </div>

            {/* Body Content */}
            <div className="px-4">
              {/* Avatar and Handle Row */}
              <div className="flex items-end justify-between -mt-9">
                <div className="relative">
                  <div
                    className={cn(
                      "relative z-10 h-20 w-20 overflow-hidden rounded-full ring-3 shadow-md transition-all",
                      statusInfo.ringClass,
                    )}
                    style={{ backgroundColor: screenCardBg }}
                  >
                    {avatar ? (
                      <Photo src={avatar} className="h-full w-full object-cover" />
                    ) : (
                      <span className="grid h-full w-full place-items-center bg-neutral-900 font-display text-xl font-bold text-white">
                        {(name || "A")[0]}
                      </span>
                    )}
                  </div>
                  <div className="absolute -bottom-1 -right-1 z-20">
                    <BioKindIcon kind={activeProfile.kind} className="h-5 w-5 shadow-xs ring-1 ring-black/10" />
                  </div>
                </div>

                <div className="mb-0.5">
                  <BioHandleButton handle={activeProfile.handle} />
                </div>
              </div>

              {/* Title, Category & Handle */}
              <div className="mt-2.5 text-left">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3
                    className="font-display text-lg font-bold tracking-tight truncate max-w-[190px]"
                    style={{ color: screenInk }}
                  >
                    {name || "Your Name"}
                  </h3>
                  {categoryTag &&
                    (categoryTag.trim().toLowerCase() === "airpal mate" ||
                    categoryTag.trim().toLowerCase() === "airpal star" ? (
                      <span
                        className="inline-flex items-center"
                        title="AirPal Star"
                        aria-label="AirPal Star"
                        role="img"
                      >
                        <Star size={15} className="fill-current text-accent" aria-hidden="true" />
                      </span>
                    ) : (
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider",
                          isBusiness ? "bg-amber-500/15 text-amber-500" : "bg-brand/10 text-brand",
                        )}
                      >
                        {categoryTag}
                      </span>
                    ))}
                </div>

                <p className="text-[11px] font-medium mt-0.5" style={{ color: screenMute }}>
                  @{activeProfile.handle}
                  {pronouns && ` · ${pronouns}`}
                </p>

                {/* Live Availability Status Badge */}
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border",
                      statusInfo.badgeBg,
                      statusInfo.textColor,
                    )}
                  >
                    <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", statusInfo.dotColor)} />
                    <span>{statusInfo.label}</span>
                    {customStatus && (
                      <>
                        <span className="opacity-40">·</span>
                        <span className="font-normal truncate max-w-[120px]">
                          {customStatusEmoji} {customStatus}
                        </span>
                      </>
                    )}
                  </span>
                  {hours && (
                    <span className="text-[10px] font-medium truncate max-w-[110px]" style={{ color: screenMute }}>
                      · {hours}
                    </span>
                  )}
                </div>

                {/* Location & Languages */}
                {(city || languages) && (
                  <p
                    className="mt-1.5 inline-flex flex-wrap items-center gap-1 text-[11px] font-medium"
                    style={{ color: screenMute }}
                  >
                    {city && (
                      <>
                        <MapPin size={11} className="text-brand shrink-0" />
                        <span className="truncate max-w-[120px]">{city}</span>
                      </>
                    )}
                    {city && languages && <span>·</span>}
                    {languages && <span className="truncate max-w-[120px]">{languages}</span>}
                  </p>
                )}

                {/* Tagline */}
                {shortWhy && (
                  <p className="mt-1.5 text-[11px] leading-relaxed font-normal" style={{ color: screenInk }}>
                    {shortWhy}
                  </p>
                )}

                {/* About Story Box */}
                {aboutText && (
                  <div
                    className="mt-2 rounded-xl p-2.5 text-[11px] leading-relaxed border shadow-2xs"
                    style={{
                      backgroundColor: screenCardBg,
                      borderColor: screenBorder,
                      color: screenInk,
                    }}
                  >
                    <p
                      className="font-semibold text-[9px] uppercase tracking-wider mb-0.5"
                      style={{ color: screenMute }}
                    >
                      {isBusiness ? "About Venue" : "About Story"}
                    </p>
                    <p className="whitespace-pre-line line-clamp-3">{aboutText}</p>
                  </div>
                )}
              </div>

              {/* Primary Action Button styled with active theme */}
              <div className="mt-3">
                <button
                  type="button"
                  style={{
                    backgroundColor: activeTheme.buttonBg,
                    color: activeTheme.buttonText,
                    borderRadius: activeTheme.buttonRadius,
                    backgroundImage: "linear-gradient(to bottom, rgba(255,255,255,0.22), rgba(255,255,255,0) 45%)",
                    boxShadow:
                      "inset 0 1px 1.5px rgba(255,255,255,0.5), inset 0 -1px 1px rgba(0,0,0,0.14), 0 10px 22px -14px rgba(0,0,0,0.5)",
                  }}
                  className="flex h-10 w-full items-center justify-center gap-1.5 text-[11px] font-bold uppercase tracking-wider shadow-sm transition active:scale-98"
                >
                  {isBusiness ? <Building2 size={13} /> : <HeartHandshake size={13} />}
                  <span className="truncate">{primaryCta || (isBusiness ? "Order Online" : "Catch Up")}</span>
                </button>
              </div>

              {/* Quick Action Row */}
              <div className="mt-2 grid grid-cols-3 gap-1">
                <div
                  className="flex h-8 items-center justify-center gap-1 rounded-full border text-[10px] font-medium"
                  style={{ backgroundColor: screenCardBg, borderColor: screenBorder, color: screenInk }}
                >
                  <Globe size={11} className="text-sky-500" />
                  <span>Website</span>
                </div>
                <div
                  className="flex h-8 items-center justify-center gap-1 rounded-full border text-[10px] font-medium"
                  style={{ backgroundColor: screenCardBg, borderColor: screenBorder, color: screenInk }}
                >
                  <MessageCircle size={11} className="text-emerald-500" />
                  <span>WhatsApp</span>
                </div>
                <div
                  className="flex h-8 items-center justify-center gap-1 rounded-full border text-[10px] font-medium"
                  style={{ backgroundColor: screenCardBg, borderColor: screenBorder, color: screenInk }}
                >
                  <Phone size={11} className="text-amber-500" />
                  <span>Call</span>
                </div>
              </div>

              {/* Deals / Special Highlight */}
              {deals.length > 0 && (
                <div
                  className="mt-3 rounded-2xl p-2.5 border"
                  style={{ backgroundColor: screenCardBg, borderColor: screenBorder }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-amber-500 flex items-center gap-1">
                      <Sparkles size={10} /> Offer
                    </span>
                    <span className="text-[9px]" style={{ color: screenMute }}>
                      {deals[0].badge || "Offer"}
                    </span>
                  </div>
                  <p className="mt-0.5 font-semibold text-[11px] truncate" style={{ color: screenInk }}>
                    {deals[0].title}
                  </p>
                </div>
              )}

              {/* Bio Links stack */}
              {links.length > 0 && (
                <div className="mt-3 space-y-1">
                  <p className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: screenMute }}>
                    {isBusiness ? "Place Links" : "Links"} ({links.length})
                  </p>
                  {links.slice(0, 4).map((l) => (
                    <div
                      key={l.id}
                      className="flex h-8 items-center justify-between rounded-xl px-2.5 text-[10px] font-medium border"
                      style={{
                        backgroundColor: screenCardBg,
                        borderColor: screenBorder,
                        color: screenInk,
                      }}
                    >
                      <span className="truncate">{l.label}</span>
                      <ExternalLink size={10} className="shrink-0" style={{ color: screenMute }} />
                    </div>
                  ))}
                  {links.length > 4 && (
                    <p className="text-[9px] text-center font-medium" style={{ color: screenMute }}>
                      + {links.length - 4} more links
                    </p>
                  )}
                </div>
              )}

              {/* iOS Home Indicator Bar (device chrome only) */}
              {!bare && (
                <div className="pt-4 pb-1">
                  <div className="h-[4px] w-28 rounded-full bg-neutral-400/80 dark:bg-neutral-600/80 mx-auto" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-canvas pb-[calc(env(safe-area-inset-bottom,0px)+6rem)]">
      {/* Top Ambient Glow Mesh */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-0 h-96 opacity-40 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(0,78,255,0.2),rgba(255,255,255,0))] dark:opacity-20"
      />

      {/* 1. Liquid Glass Sticky Header Bar */}
      <header className="sticky top-0 z-30 apple-liquid-glass-nav transition-all">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3 sm:px-6 lg:px-8">
          {/* Left: Back Arrow + Profile Identity */}
          <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
            <button
              type="button"
              onClick={() => {
                void triggerHaptic("light");
                nav(bioPath(activeProfile.handle));
              }}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-card border border-line text-ink transition hover:bg-paper active:scale-95 shadow-xs cursor-pointer"
              aria-label="Back to public bio"
              title="Back to public bio"
            >
              <ArrowLeft size={18} />
            </button>

            {/* Live avatar thumb with unsaved-changes dot */}
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-2xl bg-brand/10 ring-1 ring-line shadow-xs">
              {avatar ? (
                <Photo src={avatar} thumb className="h-full w-full object-cover" alt="" />
              ) : (
                <span className="grid h-full w-full place-items-center text-sm font-bold text-accent">
                  {(name || activeProfile.handle || "A")[0]?.toUpperCase()}
                </span>
              )}
              {isDirty && (
                <span
                  className="absolute right-1 top-1 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-card"
                  title="Unsaved changes"
                />
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-mono text-xs font-bold text-accent truncate max-w-[120px] sm:max-w-none">
                  @{activeProfile.handle}
                </span>
                <BioKindBadge kind={activeProfile.kind} />
                {/* Specific Personal Profile text for E2E and clear distinction */}
                {!isBusiness && (
                  <span className="hidden sm:inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold bg-brand/10 text-accent">
                    Personal Profile
                  </span>
                )}
                {isBusiness && (
                  <span className="hidden sm:inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold bg-amber-500/10 text-amber-800 dark:text-amber-300">
                    Business Profile
                  </span>
                )}
              </div>
              <h1 className="human-section-title text-base sm:text-xl truncate" style={{ textWrap: "nowrap" }}>
                {isBusiness ? "Edit Place Profile" : "Edit Digital Bio"}
              </h1>
            </div>
          </div>

          {/* Right: Actions & Save Primary Button */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* View Public Profile Link */}
            <div className="hidden sm:block">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 rounded-full border border-line bg-card/80 px-3.5 text-xs font-semibold text-ink shadow-xs hover:bg-paper cursor-pointer"
                onClick={() => {
                  void triggerHaptic("light");
                  nav(bioPath(activeProfile.handle));
                }}
              >
                <ExternalLink size={13} className="text-accent" />
                <span>View Public</span>
              </Button>
            </div>

            {/* Save Button */}
            <Button
              size="sm"
              className={cn(
                "h-10 px-3 sm:px-4 rounded-full font-semibold gap-1.5 shadow-md transition cursor-pointer active:scale-95",
                isBusiness
                  ? "bg-amber-600 hover:bg-amber-700 text-white"
                  : isDirty
                    ? "bg-brand hover:bg-brand-ink text-white ring-2 ring-brand/30 ring-offset-2"
                    : "bg-brand hover:bg-brand-ink text-white",
              )}
              disabled={saving}
              onClick={() => void handleSaveAll()}
            >
              {saving ? (
                <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Check size={15} />
              )}
              <span>{saving ? "Saving…" : isDirty ? "Save" : "Saved"}</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Page Content */}
      <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-5">
        {/* 2. Identity Switcher Strip */}
        <div className="flex items-center justify-between gap-2 rounded-2xl bg-card px-3 py-2.5 ring-1 ring-line shadow-xs border border-line/40">
          {/* Identity Info */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-xs ring-1",
                isBusiness
                  ? "bg-amber-500/15 text-amber-800 dark:text-amber-300 ring-amber-500/20"
                  : "bg-brand/10 text-accent ring-brand/20",
              )}
            >
              {isBusiness ? <Store size={17} /> : <UserRound size={17} />}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-ink">
                {isBusiness ? "Place Profile" : "Personal Bio"} · @{activeProfile.handle}
              </p>
              <p className="truncate text-[11px] text-mute">
                {isBusiness ? "AirPal Pass storefront" : "AirPal Me life handle"}
              </p>
            </div>
          </div>

          {/* Profile Switcher or Creation CTAs */}
          <div className="flex items-center gap-2 shrink-0 max-w-full">
            {mine && business && (
              <div className="inline-flex max-w-full rounded-full bg-paper p-1 ring-1 ring-line">
                <button
                  type="button"
                  onClick={() => {
                    void triggerHaptic("selection");
                    nav("/bio/edit?kind=person");
                  }}
                  className={cn(
                    "inline-flex min-w-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition active:scale-95 cursor-pointer",
                    !isBusiness ? "bg-brand text-white shadow-xs" : "text-mute hover:text-ink",
                  )}
                >
                  <UserRound size={13} className="shrink-0" />
                  <span className="truncate max-w-[130px] sm:max-w-[200px]">@{mine.handle}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void triggerHaptic("selection");
                    nav("/bio/edit?kind=business");
                  }}
                  className={cn(
                    "inline-flex min-w-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition active:scale-95 cursor-pointer",
                    isBusiness ? "bg-amber-600 text-white shadow-xs" : "text-mute hover:text-ink",
                  )}
                >
                  <Store size={13} className="shrink-0" />
                  <span className="truncate max-w-[130px] sm:max-w-[200px]">@{business.handle}</span>
                </button>
              </div>
            )}

            {mine && !business && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 rounded-full border border-line bg-paper text-xs font-semibold text-ink hover:bg-card shadow-xs cursor-pointer"
                onClick={() => {
                  void triggerHaptic("light");
                  nav("/bio/setup?kind=business");
                }}
              >
                <Plus size={13} className="text-accent" />
                <span>Add Business Place</span>
              </Button>
            )}

            {!mine && business && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 rounded-full border border-line bg-paper text-xs font-semibold text-ink hover:bg-card shadow-xs cursor-pointer"
                onClick={() => {
                  void triggerHaptic("light");
                  nav("/bio/setup");
                }}
              >
                <Plus size={13} className="text-accent" />
                <span>Claim Personal @handle</span>
              </Button>
            )}
          </div>
        </div>

        {/* Mobile Edit / Preview switcher */}
        <div className="lg:hidden sticky top-[68px] z-20 mt-4">
          <div className="flex items-center gap-1.5 rounded-2xl bg-paper/95 p-1.5 ring-1 ring-line shadow-xs backdrop-blur-md">
            <div
              className="grid flex-1 grid-cols-2 gap-1 rounded-xl bg-card/60 p-1 ring-1 ring-line/60"
              role="tablist"
              aria-label="Editor view"
            >
              {[
                { id: "edit" as const, label: "Edit", icon: Edit3 },
                { id: "preview" as const, label: "Preview", icon: Eye },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={mobileView === item.id}
                  onClick={() => {
                    void triggerHaptic("selection");
                    setMobileView(item.id);
                  }}
                  className={cn(
                    "flex h-10 items-center justify-center gap-1.5 rounded-lg text-xs font-bold transition active:scale-95 cursor-pointer",
                    mobileView === item.id
                      ? isBusiness
                        ? "bg-amber-600 text-white shadow-xs"
                        : "bg-brand text-white shadow-xs"
                      : "text-mute hover:text-ink",
                  )}
                >
                  <item.icon size={14} className="shrink-0" />
                  <span>{item.label}</span>
                  {item.id === "preview" && (
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 motion-safe:animate-pulse" />
                  )}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                void triggerHaptic("selection");
                setPreviewThemeMode((m) => (m === "dark" ? "light" : "dark"));
              }}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line bg-card text-ink transition active:scale-95 cursor-pointer shadow-xs"
              title={`Switch preview to ${previewThemeMode === "dark" ? "light" : "dark"} mode`}
              aria-label={`Switch preview to ${previewThemeMode === "dark" ? "light" : "dark"} mode`}
            >
              {previewThemeMode === "dark" ? (
                <Sun size={15} className="text-amber-500" />
              ) : (
                <Moon size={15} className="text-brand" />
              )}
            </button>
          </div>
        </div>

        {/* 3. Two-Column Layout: Left Editor Tabs + Right Sticky Live Mirror */}
        <div className="mt-4 lg:mt-6 lg:grid lg:grid-cols-12 lg:gap-8">
          {/* Left Column: Segmented Tabs & Editors */}
          <div className={cn("lg:col-span-7", mobileView === "preview" && "hidden lg:block")}>
            {/* Apple HIG Segmented Navigation Tabs */}
            <div
              className="flex gap-1 overflow-x-auto no-scrollbar rounded-2xl bg-paper p-1.5 ring-1 ring-line shadow-xs lg:sticky lg:top-[76px] lg:z-20"
              role="tablist"
              aria-label="Profile sections"
            >
              {(
                [
                  { id: "profile", label: "Profile", icon: Edit3, count: undefined },
                  { id: "links", label: "Links", icon: Link2, count: links.length },
                  {
                    id: "shop",
                    label: isBusiness ? "Menu & Catalog" : "Shop & Deals",
                    icon: Package,
                    count: products.length + services.length + deals.length,
                  },
                  { id: "share", label: "Share & Pass", icon: QrCode, count: undefined },
                  { id: "insights", label: "Insights", icon: BarChart3, count: undefined },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === item.id}
                  onClick={() => {
                    void triggerHaptic("selection");
                    setTab(item.id);
                  }}
                  className={cn(
                    "flex shrink-0 sm:flex-1 items-center justify-center gap-1.5 h-11 px-3.5 whitespace-nowrap rounded-xl text-xs sm:text-sm font-semibold transition active:scale-95 cursor-pointer",
                    tab === item.id
                      ? isBusiness
                        ? "bg-amber-600 text-white shadow-xs"
                        : "bg-brand text-white shadow-xs"
                      : "text-mute hover:text-ink hover:bg-card",
                  )}
                >
                  <item.icon size={15} className="shrink-0" />
                  <span>{item.label}</span>
                  {typeof item.count === "number" && item.count > 0 && (
                    <span
                      className={cn(
                        "ml-0.5 rounded-full px-1.5 py-0.2 text-[10px] font-bold",
                        tab === item.id ? "bg-white/25 text-white" : "bg-card text-mute ring-1 ring-line",
                      )}
                    >
                      {item.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Edit-section system: profile, links, shop, and handle cards share
                one shell (`rounded-3xl border border-line bg-card p-5 sm:p-6
                shadow-clay`) and one rhythm (`space-y-5` bodies, `space-y-1.5`
                fields, uppercase-mute field labels). Section headers use the
                eyebrow row; visibility and handle keep bespoke interiors
                inside the same shell. The owner pass card and insights panels
                are intentionally bespoke. Keep new sections on this system so
                tabs align. */}
            {/* TAB 1: PROFILE EDITOR */}
            {tab === "profile" && (
              <form className="mt-6 space-y-6" onSubmit={(e) => void handleSaveAll(e)}>
                {/* 1.1 Media & Visual Studio Section */}
                <div className="rounded-3xl border border-line bg-card p-5 sm:p-6 shadow-clay space-y-5">
                  <div className="flex items-center justify-between border-b border-line/60 pb-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-accent flex items-center gap-2">
                      <Camera size={14} />
                      <span>Visual Identity & Photos</span>
                    </p>
                    <span className="text-[11px] text-mute font-medium">
                      {isBusiness ? "Storefront Banner & Logo" : "Cover Photo & Avatar"}
                    </span>
                  </div>

                  <div className="space-y-5">
                    {/* Cover Banner */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-mute">
                          {isBusiness ? "Storefront Hero Banner" : "Cover Banner Photo"}
                        </label>
                        <span className="text-[11px] text-mute">16:9 ratio recommended</span>
                      </div>
                      <ImageField kind="cover" value={cover} onChange={(src) => void onStoredPhoto("cover", src)} />
                    </div>

                    {/* Avatar */}
                    <div className="pt-2 border-t border-line/60">
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-mute">
                          {isBusiness ? "Business Logo / Mark" : "Profile Avatar Picture"}
                        </label>
                        <span className="text-[11px] text-mute">Square portrait photo</span>
                      </div>
                      <ImageField
                        kind="avatar"
                        round
                        value={avatar}
                        onChange={(src) => void onStoredPhoto("avatar", src)}
                      />
                    </div>

                    {/* Page Theme */}
                    <div className="pt-2 border-t border-line/60">
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-mute">
                          Public Page Theme
                        </label>
                        <span className="text-[11px] text-mute">Recolours your public bio instantly</span>
                      </div>
                      <BioThemePicker value={activeProfile.theme} onSelect={(id) => void onSelectTheme(id)} />
                    </div>
                  </div>
                </div>

                {/* 1.2 Basic Profile Info Section */}
                <div className="rounded-3xl border border-line bg-card p-5 sm:p-6 shadow-clay space-y-5">
                  <div className="flex items-center justify-between border-b border-line/60 pb-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-accent flex items-center gap-2">
                      <Edit3 size={14} />
                      <span>Basic Profile Info</span>
                    </p>
                    <span className="font-mono text-[11px] text-mute">@{activeProfile.handle}</span>
                  </div>

                  {/* Display Name */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-mute">
                      {isBusiness ? "Business / Place Name" : "Your Display Name"}
                    </label>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={isBusiness ? "e.g. Harbour Brew Cafe" : "e.g. Alex Morgan"}
                      required
                      className={fieldInput}
                    />
                    <p className="text-[11px] text-mute">
                      {isBusiness
                        ? "The public trading name shown on your place pass and precinct guide."
                        : "Your primary name shown on your digital bio and catch-up invites."}
                    </p>
                  </div>

                  {/* Category / Vibe Badge Selector */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-mute">
                      {isBusiness ? "Business Category" : "Profile Category / Vibe"}
                    </label>
                    <div className="flex flex-wrap gap-2 pt-0.5">
                      {(isBusiness ? BUSINESS_CATEGORY_PRESETS : PERSONAL_CATEGORY_PRESETS).map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => {
                            void triggerHaptic("selection");
                            setCategoryTag(cat.id);
                          }}
                          aria-pressed={categoryTag === cat.id}
                          className={cn(
                            "inline-flex min-h-[44px] items-center rounded-full px-4 text-xs font-medium transition active:scale-95 cursor-pointer",
                            categoryTag === cat.id
                              ? isBusiness
                                ? "bg-amber-600 text-white shadow-xs ring-1 ring-amber-600"
                                : "bg-brand text-white shadow-xs ring-1 ring-brand"
                              : "bg-paper border border-line text-ink hover:border-brand/40",
                          )}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tagline / 1-Line Headline */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-semibold uppercase tracking-wider text-mute">
                        Tagline (1-Line Headline)
                      </label>
                      <span
                        className={cn(
                          "text-[10px] font-mono",
                          shortWhy.length > 90 ? "text-amber-600 font-bold" : "text-mute",
                        )}
                      >
                        {shortWhy.length}/100
                      </span>
                    </div>
                    <input
                      value={shortWhy}
                      maxLength={100}
                      onChange={(e) => setShortWhy(e.target.value)}
                      placeholder={
                        isBusiness
                          ? "e.g. Specialty coffee, artisanal roasts & harbour views"
                          : "e.g. Sydney local, coffee enthusiast & travel companion"
                      }
                      className={fieldInput}
                    />
                    <p className="text-[11px] text-mute">
                      A punchy 1-line headline displayed right under your name across AirPal.
                    </p>
                  </div>

                  {/* Extended Story / About */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-semibold uppercase tracking-wider text-mute">
                        {isBusiness ? "About Your Place / Story" : "About Story / Extended Bio"}
                      </label>
                      <span
                        className={cn(
                          "text-[10px] font-mono",
                          aboutText.length > 250 ? "text-amber-600 font-bold" : "text-mute",
                        )}
                      >
                        {aboutText.length}/280
                      </span>
                    </div>
                    <textarea
                      value={aboutText}
                      maxLength={280}
                      rows={3}
                      onChange={(e) => setAboutText(e.target.value)}
                      placeholder={
                        isBusiness
                          ? "Tell customers what makes your venue, menu, or services special…"
                          : "Share who you are, your background, hobbies, or what you love exploring…"
                      }
                      className="w-full rounded-2xl border border-line bg-paper p-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-brand focus:border-ink placeholder:text-mute/60 resize-none"
                    />
                  </div>

                  {/* Pronouns & Languages (Personal only) */}
                  {!isBusiness && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-line/60">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-mute">
                          Pronouns (Optional)
                        </label>
                        <input
                          value={pronouns}
                          onChange={(e) => setPronouns(e.target.value)}
                          placeholder="e.g. She/Her, They/Them"
                          className={fieldInput}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-mute">
                          Languages Spoken
                        </label>
                        <input
                          value={languages}
                          onChange={(e) => setLanguages(e.target.value)}
                          placeholder="e.g. English, Spanish, Japanese"
                          className={fieldInput}
                        />
                      </div>
                    </div>
                  )}

                  {/* Primary Call to Action Button Picker */}
                  <div className="space-y-2 pt-2 border-t border-line/60">
                    <label className="text-xs font-semibold uppercase tracking-wider text-mute">
                      Primary Profile Action Button
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {(isBusiness ? BUSINESS_CTA_PRESETS : PERSONAL_CTA_PRESETS).map((cta) => (
                        <button
                          key={cta}
                          type="button"
                          onClick={() => {
                            void triggerHaptic("selection");
                            setPrimaryCta(cta);
                          }}
                          aria-pressed={primaryCta === cta}
                          className={cn(
                            "inline-flex min-h-[44px] items-center rounded-full px-4 text-xs font-medium transition active:scale-95 cursor-pointer",
                            primaryCta === cta
                              ? isBusiness
                                ? "bg-amber-600 text-white shadow-xs"
                                : "bg-brand text-white shadow-xs"
                              : "bg-paper border border-line text-ink hover:border-brand/40",
                          )}
                        >
                          {cta}
                        </button>
                      ))}
                    </div>
                    <p className="text-[11px] text-mute">
                      Configures the prominent action button on your public digital card.
                    </p>
                  </div>
                </div>

                {/* 1.3 Live Availability & Presence Section */}
                <div className="rounded-3xl border border-line bg-card p-5 sm:p-6 shadow-clay space-y-5">
                  <div className="flex items-center justify-between border-b border-line/60 pb-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-accent flex items-center gap-2">
                      <Sparkles size={14} />
                      <span>Live Presence & Availability</span>
                    </p>
                    <span className="text-[11px] text-mute font-medium">Real-time status</span>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-mute">
                      Current Availability Status
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {(Object.keys(AVAILABILITY_STATUSES) as AvailabilityStatus[]).map((stKey) => {
                        const st = AVAILABILITY_STATUSES[stKey];
                        const isSelected = availabilityStatus === stKey;
                        return (
                          <button
                            key={stKey}
                            type="button"
                            onClick={() => {
                              void triggerHaptic("selection");
                              setAvailabilityStatus(stKey);
                              setOpenNow(stKey === "available");
                            }}
                            className={cn(
                              "flex items-center gap-2 rounded-2xl p-3 text-left border text-xs font-semibold transition active:scale-95 cursor-pointer",
                              isSelected
                                ? isBusiness
                                  ? "bg-amber-500/10 border-amber-600 text-amber-900 dark:text-amber-300 shadow-xs ring-1 ring-amber-600/30"
                                  : "bg-brand/10 border-brand text-accent shadow-xs ring-1 ring-brand/30"
                                : "bg-paper border-line text-ink hover:bg-card",
                            )}
                          >
                            <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", st.dotColor)} />
                            <span className="truncate">{st.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Custom Status Emoji & Message */}
                  <div className="space-y-1.5 pt-2 border-t border-line/60">
                    <label className="text-xs font-semibold uppercase tracking-wider text-mute">
                      Custom Status Message & Emoji
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        value={customStatusEmoji}
                        onChange={(e) => setCustomStatusEmoji(e.target.value)}
                        placeholder="☕"
                        maxLength={4}
                        aria-label="Status Emoji"
                        className="h-11 w-14 shrink-0 rounded-2xl border border-line bg-paper text-center text-lg outline-none focus:border-ink"
                      />
                      <input
                        value={customStatus}
                        onChange={(e) => setCustomStatus(e.target.value)}
                        placeholder={isBusiness ? "e.g. Fresh pastries today" : "e.g. Coffee at Rocks Cafe"}
                        aria-label="Status message text"
                        className={`flex-1 min-w-0 ${fieldInput}`}
                      />
                    </div>
                    <p className="text-[11px] text-mute">
                      Shown next to your active badge on your profile and digital pass.
                    </p>
                  </div>
                </div>

                {/* 1.4 Location & Hours Section */}
                <div className="rounded-3xl border border-line bg-card p-5 sm:p-6 shadow-clay space-y-5">
                  <div className="flex items-center justify-between border-b border-line/60 pb-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-accent flex items-center gap-2">
                      <MapPin size={14} />
                      <span>Location, Hours & Contact</span>
                    </p>
                  </div>

                  {/* City / Location */}
                  <CitySuburbRegionField value={city} onChange={setCity} inputClassName={fieldInput} />

                  {/* Trading / Opening Hours */}
                  <TradingHoursField value={hours} onChange={setHours} inputClassName={fieldInput} />

                  {/* Contact Phone */}
                  <div className="space-y-1.5 pt-2 border-t border-line/60">
                    <PhoneField value={phone} onChange={setPhone} label="Contact Phone Number" />
                    <p className="text-[11px] text-mute">
                      Used for one-tap WhatsApp messaging and direct calling from your profile card.
                    </p>
                  </div>
                </div>

                {/* 1.5 Virtual Sync & Video Call Platform */}
                <div className="rounded-3xl border border-line bg-card p-5 sm:p-6 shadow-clay space-y-5">
                  <div className="flex items-center justify-between border-b border-line/60 pb-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-accent flex items-center gap-2">
                      <Video size={14} />
                      <span>Meet &amp; Hangout · Video Sync</span>
                    </p>
                    <span className="text-[10px] font-bold text-accent bg-brand/10 rounded-full px-2.5 py-0.5">
                      Calendar Sync
                    </span>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-mute">
                      Preferred Meeting Platform
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {[
                        { id: "in_person" as const, label: "In Person", hint: "Local venues", Icon: MapPin },
                        { id: "google_meet" as const, label: "Google Meet", hint: "meet.google.com", Icon: Video },
                        { id: "facetime" as const, label: "FaceTime", hint: "Apple & Web", Icon: PhoneCall },
                      ].map((opt) => {
                        const Icon = opt.Icon;
                        const isSelected = preferredMeetingPlatform === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              void triggerHaptic("selection");
                              setPreferredMeetingPlatform(opt.id);
                            }}
                            className={cn(
                              "flex min-h-[52px] flex-row sm:flex-col items-center justify-between sm:justify-center gap-2 sm:gap-1 rounded-2xl border px-3.5 py-2.5 sm:p-2 text-left sm:text-center transition active:scale-95 cursor-pointer",
                              isSelected
                                ? isBusiness
                                  ? "bg-amber-500/10 border-amber-600 text-amber-900 dark:text-amber-300 font-bold shadow-xs"
                                  : "bg-brand/10 border-brand text-accent font-bold shadow-xs"
                                : "bg-paper border-line text-ink hover:bg-card",
                            )}
                          >
                            <span className="flex items-center gap-1.5 text-xs font-bold whitespace-nowrap">
                              <Icon size={13} className="shrink-0" />
                              <span>{opt.label}</span>
                            </span>
                            <span className="text-[10px] font-medium opacity-70">{opt.hint}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-line/60">
                    <label className="text-xs font-semibold uppercase tracking-wider text-mute">
                      Default Video Room URL or Apple ID
                    </label>
                    <input
                      type="text"
                      value={meetingUrl}
                      onChange={(e) => setMeetingUrl(e.target.value)}
                      placeholder={
                        preferredMeetingPlatform === "facetime"
                          ? "https://facetime.apple.com/... or Apple ID"
                          : "https://meet.google.com/xxx-yyyy-zzz"
                      }
                      className={fieldInput}
                    />
                    <p className="text-[11px] text-mute leading-relaxed">
                      Pre-fills when visitors schedule a catch-up or hangout, and embeds directly into Apple &amp;
                      Google Calendar invites.
                    </p>
                  </div>
                </div>

                {/* 1.6 Profile Visibility (Personal only) */}
                {!isBusiness && (
                  <section
                    className="rounded-3xl border border-line bg-card p-5 shadow-clay sm:p-6"
                    aria-labelledby="visibility-title"
                  >
                    <div className="flex items-start gap-3">
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand/10 text-accent ring-1 ring-brand/15">
                        <Shield size={19} aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <h2 id="visibility-title" className="text-sm font-bold text-ink">
                          Profile visibility
                        </h2>
                        <p className="mt-0.5 text-xs leading-relaxed text-mute">
                          Choose who can open your @handle page. You can change this any time.
                        </p>
                      </div>
                    </div>

                    <div
                      className="mt-5 rounded-2xl bg-paper/80 p-1 ring-1 ring-line/80"
                      role="radiogroup"
                      aria-label="Profile visibility"
                    >
                      <div className="grid grid-cols-2 gap-1">
                        {(
                          [
                            { id: "public", label: "Public", hint: "Anyone with your link" },
                            { id: "private", label: "Private", hint: "Only you can view" },
                          ] as Array<{ id: Extract<BioVisibility, "public" | "private">; label: string; hint: string }>
                        ).map((opt) => {
                          const isSelected = visibility === opt.id;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              role="radio"
                              aria-checked={isSelected}
                              onClick={() => {
                                void triggerHaptic("selection");
                                setVisibility(opt.id);
                              }}
                              className={cn(
                                "min-h-[60px] rounded-[13px] px-3 py-2 text-left transition-[background-color,color,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
                                isSelected
                                  ? "bg-card text-ink shadow-sm ring-1 ring-line/80"
                                  : "text-mute hover:bg-card/70",
                              )}
                            >
                              <span className="flex items-center gap-2 text-xs font-bold">
                                <span className={cn("h-2 w-2 rounded-full", isSelected ? "bg-brand" : "bg-line")} />
                                {opt.label}
                              </span>
                              <span className="mt-0.5 block pl-4 text-[11px] font-medium leading-tight">
                                {opt.hint}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <p className="mt-3 text-[11px] leading-relaxed text-mute">
                      {visibility === "public"
                        ? "Your bio can be opened by anyone who has its link."
                        : "Your bio, contact details, and links are hidden from everyone else."}
                    </p>
                  </section>
                )}

                {/* 1.7 Business-only Google Place import */}
                {isBusiness && (
                  <GooglePlaceImportCard
                    importedPlaceId={mapsPlaceId}
                    onImport={(place) => {
                      setName(place.name);
                      setCity(place.city || city);
                      setHours(place.hours || hours);
                      setPhone(place.phone || phone);
                      setMapsPlaceId(place.placeId);
                      if (place.photoNames[0]) setCover(place.photoNames[0]);
                      if (place.photoNames[1] || place.photoNames[0])
                        setAvatar(place.photoNames[1] || place.photoNames[0] || "");
                      if (place.shortWhy && shortWhy.length < 10) setShortWhy(place.shortWhy);
                      setLinks((prev) => mergeBioLinks(prev, bioLinksFromGooglePlace(place)));
                      void triggerHaptic("success");
                      toast.success("Imported from Google — save to keep changes");
                    }}
                  />
                )}

                {/* Save All Profile Changes Button */}
                <Button
                  type="submit"
                  disabled={saving}
                  className={cn(
                    "h-13 w-full text-base font-semibold shadow-md gap-2 rounded-2xl cursor-pointer active:scale-98",
                    isBusiness
                      ? "bg-amber-600 hover:bg-amber-700 text-white"
                      : "bg-brand hover:bg-brand-ink text-white",
                  )}
                >
                  {saving ? (
                    <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Check size={18} />
                  )}
                  <span>{saving ? "Saving Changes…" : "Save All Profile Changes"}</span>
                </Button>
              </form>
            )}

            {/* TAB 2: LINKS & SOCIAL MEDIA */}
            {tab === "links" &&
              (() => {
                const social = SOCIAL_CONFIG[type];
                const selectedLabel = BIO_LINK_TYPES.find((t) => t.id === type)?.label || type;
                return (
                  <div className="mt-6 space-y-6">
                    {/* Quick-Pick Trays */}
                    <div className="rounded-3xl border border-line bg-card p-5 sm:p-6 shadow-clay space-y-5">
                      {/* Social Media Networks */}
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent flex items-center gap-1.5">
                          <Globe size={13} />
                          <span>Social Media Networks</span>
                        </p>
                        <div className="mt-2.5 flex flex-wrap gap-2">
                          {BIO_LINK_TYPES.filter((t) => isSocialLinkType(t.id)).map((t) => (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => {
                                void triggerHaptic("selection");
                                setType(t.id);
                                setHref("");
                              }}
                              aria-pressed={type === t.id}
                              className={cn(
                                "inline-flex min-h-[44px] items-center rounded-full px-4 text-xs font-semibold transition active:scale-95 cursor-pointer",
                                type === t.id
                                  ? isBusiness
                                    ? "bg-amber-600 text-white shadow-xs ring-1 ring-amber-600"
                                    : "bg-brand text-white shadow-xs ring-1 ring-brand"
                                  : "bg-paper border border-line text-ink hover:bg-card",
                              )}
                            >
                              {t.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Actions & Direct Links */}
                      <div className="pt-2 border-t border-line/60">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent flex items-center gap-1.5">
                          <Link2 size={13} />
                          <span>Direct Actions &amp; Web Links</span>
                        </p>
                        <div className="mt-2.5 flex flex-wrap gap-2">
                          {BIO_LINK_TYPES.filter((t) => !isSocialLinkType(t.id)).map((t) => (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => {
                                void triggerHaptic("selection");
                                setType(t.id);
                                setHref("");
                              }}
                              aria-pressed={type === t.id}
                              className={cn(
                                "inline-flex min-h-[44px] items-center rounded-full px-4 text-xs font-semibold transition active:scale-95 cursor-pointer",
                                type === t.id
                                  ? isBusiness
                                    ? "bg-amber-600 text-white shadow-xs ring-1 ring-amber-600"
                                    : "bg-brand text-white shadow-xs ring-1 ring-brand"
                                  : "bg-paper border border-line text-ink hover:bg-card",
                              )}
                            >
                              {t.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Add Link Input Box */}
                    <form
                      className="space-y-3 rounded-3xl border border-line bg-card p-5 sm:p-6 shadow-clay"
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (!href.trim()) return;
                        const finalHref = formatFinalLinkHref(type, href);
                        if (!finalHref) return;
                        const next = [
                          ...links,
                          {
                            id: nanoid(6),
                            type,
                            label: selectedLabel,
                            href: finalHref,
                          },
                        ];
                        setLinks(next);
                        setHref("");
                        void updateProfile({ handle: activeProfile.handle, links: next })
                          .then(() => {
                            void triggerHaptic("success");
                            toast.success(`Added ${selectedLabel} link`);
                          })
                          .catch((err) =>
                            toast.error(
                              err instanceof Error ? err.message : "Could not save that link to your account",
                            ),
                          );
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-mute">
                          Add {selectedLabel} Link
                        </span>
                        {social && <span className="text-[11px] text-mute font-mono">{social.example}</span>}
                      </div>

                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center overflow-hidden rounded-2xl bg-paper ring-1 ring-line transition focus-within:ring-2 focus-within:ring-ink">
                        <div className="flex flex-1 items-center min-w-0">
                          {social ? (
                            <span className="flex h-12 shrink-0 select-none items-center border-r border-line bg-black/[0.04] px-3 font-mono text-xs font-medium text-mute">
                              {social.cleanPrefix}
                            </span>
                          ) : type === "call" ? (
                            <span className="flex h-12 shrink-0 select-none items-center border-r border-line bg-black/[0.04] px-3 font-mono text-xs font-medium text-mute">
                              tel:
                            </span>
                          ) : null}

                          <input
                            value={href}
                            onChange={(e) => setHref(e.target.value)}
                            placeholder={
                              social
                                ? social.placeholder
                                : type === "call"
                                  ? "+61 400 123 456"
                                  : "https://yourwebsite.com"
                            }
                            className="h-12 min-w-0 flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-mute/60"
                          />
                        </div>

                        <Button
                          type="submit"
                          size="sm"
                          className="m-1.5 min-h-[44px] justify-center shrink-0 px-4 font-semibold rounded-xl cursor-pointer"
                        >
                          Add Link
                        </Button>
                      </div>

                      <p className="text-[11px] text-mute">
                        {social
                          ? "Enter your username/handle. AirPal formats the destination URL automatically."
                          : type === "call"
                            ? "Enter phone number with international country code."
                            : "Enter complete destination web URL."}
                      </p>
                    </form>

                    {/* Active Links List */}
                    <div className="rounded-3xl border border-line bg-card p-5 sm:p-6 shadow-clay space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-wider text-mute">
                          Active Bio Links ({links.length})
                        </p>
                        {links.length > 0 && (
                          <span className="text-[11px] text-mute">Displayed on your public profile</span>
                        )}
                      </div>

                      {links.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-line p-8 text-center space-y-2">
                          <Link2 size={24} className="mx-auto text-mute/60" />
                          <p className="text-xs font-semibold text-ink">No links added yet</p>
                          <p className="text-xs text-mute">Select any social network or action above to add one.</p>
                        </div>
                      ) : (
                        <ul className="space-y-2.5">
                          {links.map((l) => {
                            const saveLink = (patch: Partial<typeof l>) => {
                              const next = links.map((x) => (x.id === l.id ? { ...x, ...patch } : x));
                              setLinks(next);
                              void updateProfile({ handle: activeProfile.handle, links: next }).catch((err) =>
                                toast.error(err instanceof Error ? err.message : "Could not update your account"),
                              );
                            };
                            return (
                              <li
                                key={l.id}
                                className="rounded-2xl bg-paper px-4 py-3 border border-line/70 shadow-xs hover:border-line transition space-y-2.5"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <span className="rounded-full bg-card px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-mute border border-line">
                                        {l.type}
                                      </span>
                                      <span className="text-sm font-semibold text-ink truncate">{l.label}</span>
                                      {l.featured && (
                                        <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                                          <Star size={10} /> Featured
                                        </span>
                                      )}
                                      {l.archived && (
                                        <span className="rounded-full bg-paper px-2 py-0.5 text-[10px] font-bold text-mute ring-1 ring-line">
                                          Archived
                                        </span>
                                      )}
                                    </div>
                                    <a
                                      href={l.href}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="mt-0.5 block truncate text-xs font-medium text-accent hover:underline"
                                    >
                                      {l.href}
                                    </a>
                                  </div>
                                  <div className="flex items-center gap-0.5 shrink-0">
                                    <button
                                      type="button"
                                      className="inline-flex h-10 w-10 items-center justify-center rounded-full text-mute hover:bg-card hover:text-ink cursor-pointer"
                                      title="Copy link"
                                      onClick={() => {
                                        void navigator.clipboard.writeText(l.href);
                                        void triggerHaptic("light");
                                        toast.success("Link copied");
                                      }}
                                    >
                                      <Copy size={15} />
                                    </button>
                                    <button
                                      type="button"
                                      className={
                                        l.featured
                                          ? "inline-flex h-10 w-10 items-center justify-center rounded-full text-amber-600 cursor-pointer"
                                          : "inline-flex h-10 w-10 items-center justify-center rounded-full text-mute hover:text-amber-600 cursor-pointer"
                                      }
                                      title={l.featured ? "Unpin featured" : "Pin to top"}
                                      onClick={() => saveLink({ featured: l.featured ? undefined : true })}
                                    >
                                      <Star size={15} />
                                    </button>
                                    <button
                                      type="button"
                                      className="inline-flex h-10 w-10 items-center justify-center rounded-full text-mute hover:bg-card hover:text-ink cursor-pointer"
                                      title={l.archived ? "Restore link" : "Archive link"}
                                      onClick={() => {
                                        saveLink({ archived: l.archived ? undefined : true });
                                        toast.success(l.archived ? "Link restored" : "Link archived");
                                      }}
                                    >
                                      <Archive size={15} />
                                    </button>
                                    <button
                                      type="button"
                                      className="inline-flex h-10 w-10 items-center justify-center rounded-full text-mute hover:bg-rose-50 hover:text-rose-600 transition cursor-pointer"
                                      title="Remove link"
                                      onClick={() => {
                                        const next = links.filter((x) => x.id !== l.id);
                                        setLinks(next);
                                        void updateProfile({ handle: activeProfile.handle, links: next })
                                          .then(() => {
                                            void triggerHaptic("light");
                                            toast.success("Link removed");
                                          })
                                          .catch((err) =>
                                            toast.error(
                                              err instanceof Error ? err.message : "Could not update your account",
                                            ),
                                          );
                                      }}
                                    >
                                      <Trash2 size={15} />
                                    </button>
                                  </div>
                                </div>
                                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 border-t border-line/60 pt-2.5">
                                  <CalendarDays size={14} className="shrink-0 text-mute" aria-hidden="true" />
                                  <label className="sr-only" htmlFor={`link-start-${l.id}`}>
                                    Link start date
                                  </label>
                                  <input
                                    id={`link-start-${l.id}`}
                                    type="date"
                                    value={l.startsAt || ""}
                                    onChange={(e) => saveLink({ startsAt: e.target.value || undefined })}
                                    className="h-9 min-w-[125px] flex-1 rounded-xl border border-line bg-card px-2 text-xs outline-none focus:border-brand"
                                  />
                                  <span className="text-xs text-mute">→</span>
                                  <label className="sr-only" htmlFor={`link-end-${l.id}`}>
                                    Link end date
                                  </label>
                                  <input
                                    id={`link-end-${l.id}`}
                                    type="date"
                                    value={l.endsAt || ""}
                                    min={l.startsAt || undefined}
                                    onChange={(e) => saveLink({ endsAt: e.target.value || undefined })}
                                    className="h-9 min-w-[125px] flex-1 rounded-xl border border-line bg-card px-2 text-xs outline-none focus:border-brand"
                                  />
                                  {(l.startsAt || l.endsAt) && (
                                    <button
                                      type="button"
                                      onClick={() => saveLink({ startsAt: undefined, endsAt: undefined })}
                                      className="shrink-0 text-[11px] font-semibold text-mute hover:text-ink"
                                    >
                                      Clear
                                    </button>
                                  )}
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  </div>
                );
              })()}

            {/* TAB 3: SHOP & CATALOG */}
            {tab === "shop" && (
              <div className="mt-6 rounded-3xl border border-line bg-card p-5 sm:p-6 shadow-clay">
                <div className="mb-4 pb-3 border-b border-line/60">
                  <p className="text-xs font-bold uppercase tracking-wider text-accent flex items-center gap-2">
                    <Package size={14} />
                    <span>{isBusiness ? "Business Menu, Deals & Products" : "Bio Recommendations & Deals"}</span>
                  </p>
                  <p className="text-xs text-mute mt-1">
                    {isBusiness
                      ? "Add signature dishes, happy hour deals, or bookable services customers can browse directly."
                      : "Add recommendations, affiliate perks, or services you offer."}
                  </p>
                </div>
                <BioCatalogEditor
                  products={products}
                  services={services}
                  deals={deals}
                  onChange={saveCatalog}
                  tone={isBusiness ? "amber" : "brand"}
                />
              </div>
            )}

            {/* TAB 4: SHARE, PASSBOOK & QR */}
            {tab === "share" && (
              <div className="mt-6 space-y-6">
                <DigitalBioPassCard
                  handle={activeProfile.handle}
                  name={name || activeProfile.name || `@${activeProfile.handle}`}
                  kind={activeProfile.kind}
                  avatar={avatar || activeProfile.avatar}
                  city={city || activeProfile.city}
                  headline={shortWhy || activeProfile.shortWhy}
                  phone={phone || activeProfile.phone}
                  qrDataUrl={qr || undefined}
                  title={isBusiness ? "Place QR & Digital Bio Pass" : "My Digital Bio Pass"}
                  subtitle="Universal Contact Pass · Apple & Google Wallet"
                  tapsTodayCount={tapsToday(activeProfile.handle)}
                  showViewBioLink
                >
                  {/* Australian Air Zoo Collectible Sticker Toggle */}
                  <label className="flex min-h-[44px] items-center justify-between gap-3 rounded-2xl bg-paper p-3.5 text-xs font-medium ring-1 ring-line cursor-pointer hover:ring-brand/30 transition">
                    <span className="text-ink font-semibold">
                      Air Zoo Hunt — display collectible Aussie sticker on pass
                    </span>
                    <input
                      type="checkbox"
                      checked={zooHunt}
                      onChange={(e) => setZooHunt(e.target.checked)}
                      className="h-5 w-5 rounded border-line accent-[#004eff]"
                    />
                  </label>
                </DigitalBioPassCard>

                {/* Handle Configuration */}
                <div className="rounded-3xl border border-line bg-card p-5 sm:p-6 shadow-clay">
                  <ChangeHandleForm current={activeProfile.handle} profileId={activeProfile.id} />
                </div>
              </div>
            )}

            {/* TAB 5: INSIGHTS */}
            {tab === "insights" && (
              <>
                <BioInsightsPanel handle={activeProfile.handle} profileId={activeProfile.id} links={links} />
                <BioSubscribersPanel handle={activeProfile.handle} />
              </>
            )}
          </div>

          {/* Right Column: Sticky Live Mirror (device chrome on desktop, bare inline preview on mobile) */}
          <div className={cn("lg:col-span-5", mobileView === "preview" ? "mt-4 block" : "hidden lg:block")}>
            <div className="lg:sticky lg:top-20">
              <div className="hidden lg:flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-bold uppercase tracking-wider text-mute flex items-center gap-1.5">
                    <Smartphone size={14} className="text-accent" />
                    <span>Live Mirror</span>
                  </p>
                  <span className="text-[10px] font-semibold text-mute/80 bg-paper px-2 py-0.5 rounded-full border border-line">
                    iPhone 16 Pro Max
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      void triggerHaptic("selection");
                      setPreviewThemeMode((m) => (m === "dark" ? "light" : "dark"));
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold border border-line bg-card hover:bg-paper text-ink transition active:scale-95 cursor-pointer shadow-xs"
                    title={`Switch mirror to ${previewThemeMode === "dark" ? "light" : "dark"} mode`}
                    aria-label={`Switch mirror to ${previewThemeMode === "dark" ? "light" : "dark"} mode`}
                  >
                    {previewThemeMode === "dark" ? (
                      <>
                        <Sun size={11} className="text-amber-500" />
                        <span>Light</span>
                      </>
                    ) : (
                      <>
                        <Moon size={11} className="text-brand" />
                        <span>Dark</span>
                      </>
                    )}
                  </button>
                  <span className="text-[10px] font-mono font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    Live
                  </span>
                </div>
              </div>
              {renderLivePhoneMockup(mobileView === "preview")}
            </div>
          </div>
        </div>
      </main>

      {/* Floating Unsaved Changes Pill / Island */}
      {isDirty && (
        <div className="fixed bottom-6 inset-x-0 z-40 flex justify-center px-4 pointer-events-none animate-in slide-in-from-bottom-4 duration-300">
          <div className="pointer-events-auto flex items-center gap-3 rounded-full bg-card/95 border border-line p-2 pl-4 pr-2 shadow-2xl backdrop-blur-md ring-1 ring-black/10">
            <span className="flex items-center gap-2 text-xs font-semibold text-ink">
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              <span>Unsaved changes</span>
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleResetChanges}
                className="h-8 px-3 rounded-full text-xs font-semibold text-mute hover:text-ink hover:bg-paper transition cursor-pointer"
              >
                Discard
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleSaveAll()}
                className={cn(
                  "h-8 px-4 rounded-full text-xs font-semibold text-white shadow-xs transition active:scale-95 cursor-pointer flex items-center gap-1.5",
                  isBusiness ? "bg-amber-600 hover:bg-amber-700" : "bg-brand hover:bg-brand-ink",
                )}
              >
                {saving ? (
                  <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Check size={13} />
                )}
                <span>{saving ? "Saving…" : "Save Now"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
