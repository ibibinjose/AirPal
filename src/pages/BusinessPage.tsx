import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useLocation, useSearch, Link } from "wouter";
import { toast } from "sonner";
import { BUSINESS_CATEGORIES, listingToPlace, type BusinessCategoryId } from "@shared/business";
import { Button } from "@/components/ui/Button";
import { PageLoading } from "@/components/ui/PageLoading";
import { PlaceCard } from "@/components/discovery/PlaceCard";
import { BioHandleButton } from "@/components/bio/BioHandleButton";
import { Photo } from "@/components/ui/Photo";
import { AuthGate } from "@/components/auth/AuthGate";
import { useAuth } from "@/contexts/AuthContext";
import { useListings } from "@/contexts/ListingsContext";
import { useBio } from "@/contexts/BioContext";
import { withWalk } from "@/lib/catalog";
import { hrefForPlace } from "@/lib/bio-handle";
import { partnerAccountPath } from "@/lib/partner-account";
import { cn } from "@/lib/cn";
import { GuestListPanel } from "@/components/club/GuestListPanel";
import { AddressFields } from "@/components/forms/AddressFields";
import { PhoneField } from "@/components/forms/PhoneField";
import { TradingHoursField } from "@/components/forms/TradingHoursField";
import {
  addressOk,
  countryByCode,
  emptyAddress,
  formatAddress,
  formatGps,
  isValidPhone,
  type AddressParts,
} from "@shared/geo-address";
import { locateBusiness } from "@/lib/locate";
import { ImageField } from "@/components/media/ImageField";
import { collection, getDocs, query, where } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { HostFreshnessBanner } from "@/components/host/HostFreshnessBanner";
import { fieldInput, fieldTextarea } from "@/components/forms/ValidField";
import { BusinessBookingsSection } from "@/components/booking/BusinessBookingsSection";
import { PayoutSetupCard } from "@/components/connect/PayoutSetupCard";
import { BusinessNavHub, type BusinessNavTab } from "@/components/business/BusinessNavHub";
import { BusinessSubscriptionCard } from "@/components/business/BusinessSubscriptionCard";
import { DeleteVenueDialog } from "@/components/business/DeleteVenueDialog";
import { GooglePlaceImportCard } from "@/components/business/GooglePlaceImport";
import { bioLinksFromGooglePlace, mergeBioLinks } from "@shared/google-place";
import { NAMES } from "@shared/names";
import { WaveHostCard } from "@/components/wave/WaveHostCard";
import { triggerHapticSelection } from "@/lib/native";
import { StatTile } from "@/components/dashboard/StatTile";
import {
  Activity,
  ArrowRight,
  Building2,
  Calendar,
  Compass,
  ExternalLink,
  Eye,
  Gift,
  Globe2,
  Headphones,
  MapPin,
  Percent,
  Plus,
  QrCode,
  Save,
  Settings2,
  ShieldCheck,
  Sparkles,
  Tag,
  Trash2,
  Users,
} from "lucide-react";

const DEAL_PRESETS = [
  { badge: "10% OFF", detail: "10% discount on entire bill for AirPal guests. Show app at till." },
  { badge: "15% OFF", detail: "15% off food and beverages when booking through AirPal." },
  { badge: "2-for-1 Deal", detail: "Buy one main course or entry pass and get the second free." },
  { badge: "Free Drink", detail: "Complimentary house beverage or barista coffee with any meal purchase." },
];

export function BusinessPage() {
  const [, nav] = useLocation();
  const search = useSearch();
  const { user, authReady } = useAuth();
  const { mine, myListings, setSelectedListingId, createPlace, savePlace, saveDeal, confirmHours, deleteListing } =
    useListings();
  const { mine: bio, business, updateProfile } = useBio();
  const [tab, setTab] = useState<BusinessNavTab>(() => {
    const params = new URLSearchParams(search);
    const t = params.get("tab");
    if (t === "place" || t === "offer" || t === "bookings" || t === "list") return t;
    return "place";
  });

  useEffect(() => {
    const params = new URLSearchParams(search);
    const t = params.get("tab");
    if (t === "place" || t === "offer" || t === "bookings" || t === "list") {
      setTab(t);
    }
  }, [search]);

  const [name, setName] = useState("");
  const [address, setAddress] = useState<AddressParts>(emptyAddress("AU"));
  const [hours, setHours] = useState("");
  const [shortWhy, setShortWhy] = useState("");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [geo, setGeo] = useState<{ lat: number; lng: number }>();
  const [locating, setLocating] = useState(false);
  const [category, setCategory] = useState<BusinessCategoryId>("eat");
  const [badge, setBadge] = useState("");
  const [detail, setDetail] = useState("");
  const [busy, setBusy] = useState(false);
  const [hero, setHero] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!mine) return;
    setName(mine.name);
    const lines = (mine.address || "").split("\n");
    setAddress({
      ...emptyAddress("AU"),
      line1: lines[0] || mine.address || "",
      city: lines[1]?.split(" ")[0] || "",
    });
    setHours(mine.hours);
    setShortWhy(mine.shortWhy);
    setDescription(mine.description || "");
    setPhone(mine.phone || "");
    setGeo(mine.geo);
    setCategory(mine.category);
    setBadge(mine.deal?.badge || "");
    setDetail(mine.deal?.detail || "");
    setHero(mine.heroImage || "");
  }, [mine]);

  const [stats, setStats] = useState<{ campaigns: number; rsvps: number }>({ campaigns: 0, rsvps: 0 });

  useEffect(() => {
    const db = getFirebaseDb();
    if (!db || !user) return;
    void (async () => {
      try {
        const csnap = await getDocs(query(collection(db, "campaigns"), where("ownerUid", "==", user.uid)));
        let rsvps = 0;
        for (const c of csnap.docs) {
          try {
            const rsnap = await getDocs(query(collection(db, "campaign_rsvps"), where("campaignId", "==", c.id)));
            for (const r of rsnap.docs) rsvps += Number((r.data() as { seats?: number }).seats || 1);
          } catch {
            // roster reads need campaign ownership; skip silently.
          }
        }
        setStats({ campaigns: csnap.size, rsvps });
      } catch {
        setStats({ campaigns: 0, rsvps: 0 });
      }
    })();
  }, [user]);

  if (!authReady) {
    return <PageLoading />;
  }

  if (!user) {
    return (
      <AuthGate
        next="/business"
        kicker="Local Business Partner"
        title="AirPal Business Studio"
        lede="Sign in or create a partner account. Claim your verified business @handle, publish neighbourhood offers, host group experiences, and accept bookings."
      />
    );
  }

  if (!mine) {
    return (
      <div className="page-wrap-narrow pt-6 sm:pt-10">
        <div className="surface-card p-5 sm:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand/10 text-accent ring-1 ring-brand/20">
              <Building2 className="h-6 w-6" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-accent">{NAMES.partnerAccount}</p>
              <h1 className="human-title mt-1 text-2xl sm:text-3xl">Launch your business on AirPal</h1>
              <p className="mt-2 text-sm leading-relaxed text-mute sm:text-base">
                One account for your venue. Import from Google Places, publish a member perk, and manage bookings — no
                separate logins.
              </p>
            </div>
          </div>

          <ol className="mt-6 space-y-3">
            <li className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
                1
              </span>
              <div className="min-w-0 pt-0.5">
                <h3 className="text-sm font-semibold text-ink">Import your place</h3>
                <p className="text-sm text-mute">Hours, photos, and address in one tap.</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-card text-xs font-bold text-ink ring-1 ring-line">
                2
              </span>
              <div className="min-w-0 pt-0.5">
                <h3 className="text-sm font-semibold text-ink">Publish a member perk</h3>
                <p className="text-sm text-mute">Give nearby guests a reason to walk in today.</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-card text-xs font-bold text-ink ring-1 ring-line">
                3
              </span>
              <div className="min-w-0 pt-0.5">
                <h3 className="text-sm font-semibold text-ink">Get paid directly</h3>
                <p className="text-sm text-mute">Stripe payouts go straight to your bank.</p>
              </div>
            </li>
          </ol>

          {/* 1-Click Inline Google Place Import */}
          <div className="mt-6 rounded-2xl bg-paper p-4 ring-1 ring-line sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-accent">Fastest start</p>
                <h2 className="font-display mt-0.5 text-base font-bold text-ink">Import from Google Maps</h2>
                <p className="mt-1 text-sm text-mute">Search your venue — we fill in address, hours, and photos.</p>
              </div>
              <Globe2 className="mt-1 h-5 w-5 shrink-0 text-accent" aria-hidden />
            </div>
            <GooglePlaceImportCard
              variant="card"
              onImport={(found) => {
                void createPlace({
                  name: found.name,
                  category: found.category || "eat",
                  address: found.address || found.city || "Sydney",
                  hours: found.hours || "Mon–Sun · 9am–9pm",
                  shortWhy: found.shortWhy || `Verified partner venue in ${found.city || "Sydney"}.`,
                  phone: found.phone,
                  website: found.website,
                  heroImage: found.photoNames[0],
                  mapsPlaceId: found.placeId,
                  geo: found.geo,
                }).then(() => {
                  toast.success(`${found.name} imported into your Business Hub!`);
                });
              }}
            />
          </div>

          <div className="mt-5 space-y-2.5">
            <Button
              size="lg"
              className="w-full gap-2"
              onClick={() => nav(partnerAccountPath({ signedIn: true, hasPlace: false }))}
            >
              <Sparkles className="h-4 w-4" aria-hidden />
              <span>Continue to guided onboarding</span>
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
            <div className="grid grid-cols-1 gap-2.5 min-[420px]:grid-cols-2">
              <Button variant="ghost" size="lg" className="w-full gap-2 ring-1 ring-line" onClick={() => nav("/claim")}>
                <ShieldCheck className="h-4 w-4 text-accent" aria-hidden />
                <span>Claim existing venue</span>
              </Button>
              <Button variant="ghost" size="lg" className="w-full gap-2 ring-1 ring-line" onClick={() => nav("/event")}>
                <Calendar className="h-4 w-4 text-accent" aria-hidden />
                <span>Host an event</span>
              </Button>
            </div>
            <p className="text-left text-sm text-mute">
              Prefer a public profile first?{" "}
              <Link
                href="/bio/setup?kind=business"
                className="font-semibold text-accent underline-offset-2 hover:underline"
              >
                Claim your business @handle
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  async function onPlace(e: FormEvent) {
    e.preventDefault();
    if (!addressOk(address) || (phone && !isValidPhone(phone))) {
      toast.error("Please verify the street address and contact phone number");
      return;
    }
    setBusy(true);
    try {
      await savePlace({
        name,
        category,
        address: formatAddress(address),
        hours,
        shortWhy,
        description,
        phone,
        geo,
        handle: mine!.handle,
        heroImage: hero,
      });
      if (bio?.handle && (bio.aboutText !== description || bio.shortWhy !== shortWhy || bio.name !== name)) {
        await updateProfile({
          handle: bio.handle,
          name,
          shortWhy,
          aboutText: description,
          hours,
          phone,
          geo,
        });
      }
      toast.success("Venue profile saved successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save place");
    } finally {
      setBusy(false);
    }
  }

  async function onDeal(e: FormEvent) {
    e.preventDefault();
    if (!badge.trim() || !detail.trim()) {
      toast.error("Please fill in both the offer badge and deal details");
      return;
    }
    setBusy(true);
    try {
      await saveDeal(mine!.id, { badge: badge.trim(), detail: detail.trim(), claimHint: "Show AirPal" });
      toast.success("Exclusive deal published to Deals");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to publish deal");
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteVenue() {
    if (!mine) return;
    setDeleting(true);
    try {
      await deleteListing(mine.id);
      toast.success(`Removed venue "${mine.name}" from your partner account`);
      setShowDeleteModal(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove venue");
    } finally {
      setDeleting(false);
    }
  }

  const handle = mine.handle || bio?.handle;
  // Guest preview recomputes only when edited fields change — not on every keystroke render.
  const preview = useMemo(
    () =>
      withWalk(
        listingToPlace({
          ...mine,
          name,
          category,
          placeCategory: mine.placeCategory,
          address: formatAddress(address),
          hours,
          shortWhy,
          description,
          deal: badge ? { badge, detail } : mine.deal,
          handle,
          heroImage: hero || mine.heroImage,
          geo: geo || mine.geo,
          phone,
        }),
      ),
    [mine, name, category, address, hours, shortWhy, description, badge, detail, handle, hero, geo, phone],
  );

  return (
    <div className="page-wrap pt-4 sm:pt-6">
      {/* Top Venue Switcher & Multi-Location Toolbar */}
      <div className="surface-card mb-4 flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-mute">Active Venue:</span>
          {myListings.length > 1 ? (
            <div className="relative">
              <select
                value={mine.id}
                onChange={(e) => setSelectedListingId(e.target.value)}
                aria-label="Select active venue"
                className="rounded-xl bg-paper py-1.5 pl-3 pr-8 text-[16px] sm:text-xs font-bold text-ink ring-1 ring-line focus:outline-none focus:ring-2 focus:ring-brand/40 min-h-[44px]"
              >
                {myListings.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} ({l.address.split(",")[0] || "Sydney"})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <span className="font-bold text-xs text-ink">{mine.name}</span>
          )}
        </div>

        <div className="flex w-full sm:w-auto flex-wrap items-center gap-2">
          <Link
            href="/business/onboard"
            className="inline-flex min-h-[44px] flex-1 sm:flex-initial items-center justify-center gap-1.5 rounded-xl bg-paper px-3.5 py-2 text-xs font-semibold text-ink ring-1 ring-line transition hover:bg-card hover:ring-brand/40 shadow-2xs active:scale-[0.98] whitespace-nowrap"
          >
            <Plus className="h-4 w-4 shrink-0 text-accent" />
            <span>Add Venue</span>
          </Link>
          <Link
            href="/claim"
            className="inline-flex min-h-[44px] flex-1 sm:flex-initial items-center justify-center gap-1.5 rounded-xl bg-paper px-3.5 py-2 text-xs font-semibold text-ink ring-1 ring-line transition hover:bg-card hover:ring-brand/40 shadow-2xs active:scale-[0.98] whitespace-nowrap"
          >
            <ShieldCheck className="h-4 w-4 shrink-0 text-accent" />
            <span>Claim Venue</span>
          </Link>
          <Link
            href="/business/promotions/new"
            className="inline-flex min-h-[44px] flex-1 sm:flex-initial items-center justify-center gap-1.5 rounded-xl bg-paper px-3.5 py-2 text-xs font-semibold text-ink ring-1 ring-line transition hover:bg-card hover:ring-brand/40 shadow-2xs active:scale-[0.98] whitespace-nowrap"
          >
            <Tag className="h-4 w-4 shrink-0 text-accent" />
            <span>Create Offer</span>
          </Link>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowDeleteModal(true)}
            title="Remove / Unlink this venue"
            className="min-h-[44px] shrink-0 whitespace-nowrap"
          >
            <Trash2 className="h-4 w-4 shrink-0" />
            <span>
              Remove<span className="hidden sm:inline"> Venue</span>
            </span>
          </Button>
        </div>
      </div>

      {/* Top Header Card with Cover & Fast Action Hub */}
      <header className="overflow-hidden rounded-[32px] bg-card ring-1 ring-line shadow-clay">
        <div className="relative min-h-[12rem] sm:h-56 w-full overflow-hidden bg-zinc-900">
          <Photo
            src={hero || mine.heroImage || "/media/harbour.jpg"}
            className="absolute inset-0 h-full w-full object-cover opacity-85"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/20" />

          <div className="relative z-10 flex h-full min-h-[12rem] sm:min-h-[14rem] flex-col justify-between p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-black/40 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white backdrop-blur-md ring-1 ring-white/20 whitespace-nowrap">
                {NAMES.yourPlace} · Partner Hub
              </span>
              <span className="rounded-full bg-emerald-500/80 px-2.5 py-0.5 text-[11px] font-bold uppercase text-white backdrop-blur-md whitespace-nowrap">
                {mine.status === "active" ? "Live on Map" : "Draft"}
              </span>
            </div>

            <div className="mt-6 flex flex-wrap items-end justify-between gap-3">
              <div className="min-w-0">
                <h1 className="font-display text-2xl sm:text-3xl font-bold text-white drop-shadow-sm text-balance">
                  {mine.name}
                </h1>
                <p className="text-sm text-white/80 flex flex-wrap items-center gap-1.5 mt-0.5">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-amber-300" aria-hidden="true" />
                  <span>{address.city || "Sydney"}, Australia · Category:</span>
                  <span className="capitalize font-semibold">{category}</span>
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <BioHandleButton handle={handle} className="shadow-md" />
                <button
                  type="button"
                  onClick={() => nav(hrefForPlace(listingToPlace(mine)))}
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-white/90 px-4 py-2 text-xs font-bold text-ink backdrop-blur-md hover:bg-white transition shadow-sm active:scale-95 cursor-pointer whitespace-nowrap"
                >
                  <Eye className="h-3.5 w-3.5 shrink-0 text-accent" />
                  <span>Guest View</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Global Business Quick Action Bar */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar sm:flex-wrap border-t border-line/60 bg-paper/50 px-4 sm:px-5 py-2.5 text-xs">
          <div className="flex items-center gap-2 sm:flex-wrap sm:gap-2.5">
            <Link
              href="/business/setup"
              className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-full bg-card px-3.5 py-1.5 font-semibold text-accent ring-1 ring-line/60 hover:ring-brand/40 transition whitespace-nowrap"
            >
              <Settings2 className="h-3.5 w-3.5 shrink-0" />
              <span>Setup Checklist</span>
            </Link>
            <Link
              href="/business/helpdesk"
              className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-full bg-card px-3.5 py-1.5 font-semibold text-ink/85 ring-1 ring-line/60 hover:text-accent hover:ring-brand/40 transition whitespace-nowrap"
            >
              <Headphones className="h-3.5 w-3.5 shrink-0 text-accent" />
              <span>Partner Helpdesk</span>
            </Link>
            <Link
              href="/host/pulse"
              className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-full bg-card px-3.5 py-1.5 font-semibold text-ink/85 ring-1 ring-line/60 hover:text-accent hover:ring-brand/40 transition whitespace-nowrap"
            >
              <Activity className="h-3.5 w-3.5 shrink-0 text-accent" />
              <span>Belonging &amp; Pulse</span>
            </Link>
            <Link
              href="/business/promotions"
              className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-full bg-card px-3.5 py-1.5 font-semibold text-ink/85 ring-1 ring-line/60 hover:text-accent hover:ring-brand/40 transition whitespace-nowrap"
            >
              <Gift className="h-3.5 w-3.5 shrink-0 text-amber-500" />
              <span>Promotions Studio</span>
            </Link>
          </div>
          <Link
            href="/bio/edit"
            className="inline-flex min-h-[44px] shrink-0 items-center gap-1 rounded-full bg-card px-3.5 py-1.5 font-semibold text-mute ring-1 ring-line/60 hover:text-ink transition whitespace-nowrap"
          >
            <span>Edit Link-in-Bio</span>
            <ArrowRight className="h-3 w-3 shrink-0" />
          </Link>
        </div>
      </header>

      {/* Business health at a glance — real counts, no placeholders */}
      <section aria-label="Business overview" className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Campaigns" value={String(stats.campaigns)} hint="Active promotions" icon={Tag} />
        <StatTile
          label="RSVPs"
          value={String(stats.rsvps)}
          hint="Guest reservations"
          icon={Activity}
          tone={stats.rsvps > 0 ? "green" : "brand"}
        />
        <StatTile
          label="Venues"
          value={String(myListings.length)}
          hint={myListings.length > 1 ? "Switch above" : "Partner account"}
          icon={Building2}
        />
        <StatTile
          label="Offer"
          value={mine.deal ? "Live" : "None"}
          hint={mine.deal ? mine.deal.badge : "Publish one below"}
          icon={Gift}
          tone={mine.deal ? "green" : "amber"}
        />
      </section>

      {/* Main 12-Column Responsive Cockpit */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
        {/* Left Column: Primary Management Subsystems (7-8 cols on desktop) */}
        <main className="space-y-6 lg:col-span-7 xl:col-span-8">
          {/* Wave NFC Check-in & Host Station */}
          <div className="rounded-[28px] bg-card p-4 sm:p-5 ring-1 ring-line shadow-clay">
            <WaveHostCard placeName={mine.name} placeId={mine.placeId} listingId={mine.id} handle={handle} />
          </div>

          {/* Navigation Hub & Tab Selector */}
          <BusinessNavHub
            activeTab={tab}
            onTabChange={setTab}
            listingActive={mine.status === "active"}
            dealLive={Boolean(mine.deal)}
            campaignCount={stats.campaigns}
            bookingCount={stats.rsvps}
          />

          {/* TAB 1: VENUE PROFILE & DETAILS */}
          {tab === "place" && (
            <div className="space-y-6">
              {/* Google Place Quick Sync Card */}
              <section className="rounded-[28px] bg-card p-5 sm:p-6 ring-1 ring-line shadow-clay">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="font-display text-base font-bold text-ink">Google Place Sync</h2>
                    <p className="text-xs text-mute">Instantly import hours, GPS coordinates, photos, and address</p>
                  </div>
                  <Globe2 className="h-4 w-4 text-accent" />
                </div>
                <GooglePlaceImportCard
                  importedPlaceId={mine.mapsPlaceId}
                  onImport={(place) => {
                    setName(place.name);
                    setHours(place.hours || hours);
                    setShortWhy(place.shortWhy || shortWhy);
                    setPhone(place.phone || phone);
                    setCategory(place.category);
                    if (place.geo) setGeo(place.geo);
                    if (place.photoNames[0]) setHero(place.photoNames[0]);
                    const parts = place.address.split(",").map((p) => p.trim());
                    setAddress({
                      ...emptyAddress("AU"),
                      line1: parts[0] || place.address,
                      city: place.city || parts[1] || "",
                    });
                    void savePlace({
                      name: place.name,
                      category: place.category,
                      address: place.address,
                      hours: place.hours || hours,
                      shortWhy: place.shortWhy || shortWhy,
                      description,
                      phone: place.phone || phone,
                      geo: place.geo,
                      handle: mine.handle,
                      heroImage: place.photoNames[0] || hero,
                      mapsPlaceId: place.placeId,
                      website: place.website,
                    }).then(() => toast.success("Imported and saved from Google Places"));
                    if (bio?.handle) {
                      void updateProfile({
                        handle: bio.handle,
                        name: place.name,
                        shortWhy: place.shortWhy || bio.shortWhy,
                        aboutText: description || bio.aboutText,
                        hours: place.hours || bio.hours,
                        phone: place.phone || bio.phone,
                        city: place.city || bio.city,
                        avatar: place.photoNames[1] || place.photoNames[0] || bio.avatar,
                        cover: place.photoNames[0] || bio.cover,
                        mapsPlaceId: place.placeId,
                        links: mergeBioLinks(bio.links, bioLinksFromGooglePlace(place)),
                      });
                    }
                  }}
                />
                <p className="mt-3 text-xs sm:text-sm text-mute">
                  Managing an existing public listing?{" "}
                  <Link href="/claim" className="font-semibold text-accent underline-offset-2 hover:underline">
                    Claim &amp; verify ownership
                  </Link>{" "}
                  for the official Verified Partner badge.
                </p>
              </section>

              {/* Venue Form */}
              <form
                className="rounded-[28px] bg-card p-5 sm:p-6 ring-1 ring-line shadow-clay space-y-5"
                onSubmit={onPlace}
              >
                <div>
                  <h2 className="font-display text-base font-bold text-ink">Venue Details & Media</h2>
                  <p className="text-xs text-mute">Showcase your venue to neighbourhood visitors and locals</p>
                </div>

                {/* Hero Image */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-mute mb-2">
                    Hero Cover Photo
                  </label>
                  <ImageField
                    kind="hero"
                    folder="listings"
                    value={hero}
                    onChange={(src) => {
                      setHero(src || "");
                      void savePlace({
                        name,
                        category,
                        address: formatAddress(address),
                        hours,
                        shortWhy,
                        description,
                        phone,
                        geo,
                        handle: mine.handle,
                        heroImage: src || "",
                      });
                    }}
                  />
                </div>

                {/* Name */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-mute mb-1">
                    Business / Venue Name
                  </label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. The Rocks Cafe"
                    className={fieldInput}
                    required
                  />
                </div>

                {/* Category Pills */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-mute mb-2">
                    Primary Category
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {BUSINESS_CATEGORIES.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          if (category !== c.id) void triggerHapticSelection();
                          setCategory(c.id);
                        }}
                        className={cn(
                          "min-h-[44px] rounded-2xl px-3.5 text-xs font-semibold transition active:scale-95 shadow-2xs cursor-pointer",
                          category === c.id
                            ? "bg-brand text-white shadow-sm ring-2 ring-brand/30"
                            : "bg-paper text-ink ring-1 ring-line hover:bg-card",
                        )}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Location & GPS */}
                <div className="border-t border-line/60 pt-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2.5">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-mute">
                        Physical Location & GPS
                      </label>
                      <p className="text-[11px] text-mute">Used for neighbourhood search and walking distances</p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outlined"
                      disabled={locating}
                      onClick={() => {
                        setLocating(true);
                        void locateBusiness()
                          .then((found) => {
                            setGeo(found.geo);
                            if (found.fields) {
                              const code = found.fields.countryCode || address.countryCode;
                              setAddress((a) => ({
                                ...a,
                                countryCode: code || a.countryCode,
                                line1: found.fields?.address || a.line1,
                                city: found.fields?.city || a.city,
                                region: found.fields?.state || a.region,
                              }));
                              const dial = countryByCode(code)?.dial;
                              if (dial && !isValidPhone(phone)) setPhone(dial + " ");
                              toast.success(`Pinned GPS: ${formatGps(found.geo.lat, found.geo.lng)}`);
                            } else toast.success(`Pinned GPS: ${formatGps(found.geo.lat, found.geo.lng)}`);
                          })
                          .catch((err) => toast.error(err instanceof Error ? err.message : "Location pin failed"))
                          .finally(() => setLocating(false));
                      }}
                      className="gap-1.5 shrink-0 whitespace-nowrap"
                    >
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-accent" />
                      {locating ? "Locating…" : geo ? `GPS Pinned (${formatGps(geo.lat, geo.lng)})` : "Use My Location"}
                    </Button>
                  </div>
                  <AddressFields value={address} onChange={setAddress} />
                </div>

                {/* Hours & Freshness */}
                <div className="border-t border-line/60 pt-4 space-y-3">
                  <label className="block text-xs font-bold uppercase tracking-wider text-mute">
                    Trading Hours & Freshness
                  </label>
                  <TradingHoursField value={hours} onChange={setHours} inputClassName={fieldInput} />
                  <HostFreshnessBanner
                    kind="hours"
                    at={mine.hoursVerifiedAt || mine.updatedAt}
                    onConfirm={async () => {
                      await confirmHours();
                      toast.success("Hours marked verified and fresh for this week");
                    }}
                  />
                </div>

                {/* Pitch, Description & Phone */}
                <div className="border-t border-line/60 pt-4 space-y-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-mute mb-1">
                      Short Tagline / Why Visit
                    </label>
                    <input
                      value={shortWhy}
                      onChange={(e) => setShortWhy(e.target.value)}
                      placeholder="e.g. Award-winning waterfront dining in Circular Quay"
                      className={fieldInput}
                    />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs font-bold uppercase tracking-wider text-mute">
                        Business Description / About Venue
                      </label>
                      <span className="text-[10px] text-mute">{description.length}/500</span>
                    </div>
                    <textarea
                      value={description}
                      maxLength={500}
                      rows={3}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Tell visitors about your venue's story, specialty dishes, ambiance, or services…"
                      className={fieldTextarea}
                    />
                    <p className="text-[11px] text-mute mt-1">
                      Detailed overview displayed on your public place page and digital bio profile.
                    </p>
                  </div>
                  <div>
                    <PhoneField value={phone} onChange={setPhone} label="Direct Inquiries Phone" />
                  </div>
                </div>

                <Button type="submit" size="lg" className="w-full gap-2 mt-4" disabled={busy} loading={busy}>
                  <Save className="h-4 w-4" />
                  Save Venue Changes
                </Button>
              </form>
            </div>
          )}

          {/* TAB 2: BOOKINGS & PAYOUTS */}
          {tab === "bookings" && (
            <div className="space-y-6">
              <PayoutSetupCard />
              <BusinessBookingsSection />
            </div>
          )}

          {/* TAB 3: DOOR & GUEST LIST */}
          {tab === "list" && (
            <div className="rounded-[28px] bg-card p-5 sm:p-6 ring-1 ring-line shadow-clay">
              <GuestListPanel clubId={handle || mine.id} clubName={mine.name} />
            </div>
          )}

          {/* TAB 4: OFFERS & EXCLUSIVE DEALS */}
          {tab === "offer" && (
            <div className="rounded-[28px] bg-card p-5 sm:p-6 ring-1 ring-line shadow-clay space-y-6">
              <div>
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-base font-bold text-ink">Publish Neighbourhood Offer</h2>
                  <Tag className="h-4 w-4 text-accent" />
                </div>
                <p className="text-xs text-mute mt-0.5">
                  Exclusive perks appear prominently on the Explore map, What&apos;s On, and your verified page.
                </p>
              </div>

              {/* Preset Deal Templates */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-mute mb-2">
                  Quick Preset Templates
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {DEAL_PRESETS.map((p) => (
                    <button
                      key={p.badge}
                      type="button"
                      onClick={() => {
                        setBadge(p.badge);
                        setDetail(p.detail);
                      }}
                      className="flex flex-col items-start rounded-2xl bg-paper p-3 text-left ring-1 ring-line transition hover:bg-card hover:ring-brand/40 shadow-2xs"
                    >
                      <span className="inline-flex items-center gap-1 rounded-lg bg-brand/10 px-2 py-0.5 text-xs font-bold text-accent">
                        <Percent className="h-3 w-3" />
                        {p.badge}
                      </span>
                      <p className="text-[11px] text-mute mt-1.5 line-clamp-2">{p.detail}</p>
                    </button>
                  ))}
                </div>
              </div>

              <form className="space-y-4 border-t border-line/60 pt-4" onSubmit={onDeal}>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-mute mb-1">
                    Offer Badge / Headline
                  </label>
                  <input
                    value={badge}
                    onChange={(e) => setBadge(e.target.value)}
                    placeholder="e.g. 15% OFF or Free Barista Coffee"
                    className={fieldInput}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-mute mb-1">
                    Conditions & Redemption Details
                  </label>
                  <textarea
                    value={detail}
                    onChange={(e) => setDetail(e.target.value)}
                    placeholder="e.g. Show active AirPal screen at till. Valid Monday to Friday before 5pm."
                    rows={3}
                    className={fieldTextarea}
                    required
                  />
                </div>

                <Button type="submit" size="lg" className="w-full gap-2" disabled={busy} loading={busy}>
                  <Tag className="h-4 w-4" />
                  Publish Live Offer
                </Button>
              </form>
            </div>
          )}
        </main>

        {/* Right Column: Live Guest Preview, Visibility Score & Subscription (4-5 cols on desktop) */}
        <aside className="space-y-6 lg:col-span-5 xl:col-span-4">
          {/* Live Guest Preview Card */}
          <section className="rounded-[28px] bg-card p-5 ring-1 ring-line shadow-clay">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-accent">Live Guest View</span>
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                Live Preview
              </span>
            </div>
            <p className="text-xs text-mute mb-3">
              This is how your place card renders in search results and on your public bio:
            </p>
            <div className="mx-auto max-w-sm overflow-hidden rounded-2xl shadow-2xs">
              <PlaceCard place={preview} walk={preview.walk} />
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-line/60 pt-3 text-xs">
              <span className="text-mute font-medium">Public URL:</span>
              <button
                type="button"
                onClick={() => nav(hrefForPlace(listingToPlace(mine)))}
                className="font-semibold text-accent hover:underline inline-flex min-h-[44px] items-center gap-1"
              >
                Open Bio Page <ExternalLink className="h-3 w-3" />
              </button>
            </div>
          </section>

          {/* Partner Visibility Checklist */}
          {!(business?.products?.length || business?.services?.length || business?.deals?.length) && (
            <section className="rounded-[28px] bg-card p-5 ring-1 ring-brand/20 shadow-clay">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-brand/10 text-accent">
                  <Sparkles className="h-4 w-4" />
                </span>
                <h3 className="font-display text-sm font-bold text-ink">Boost Your Visibility</h3>
              </div>
              <p className="text-xs text-mute mt-1.5 leading-relaxed">
                Venues with products, bookable services, and active deals receive 3x more guest impressions.
              </p>
              <Button
                size="sm"
                variant="outlined"
                onClick={() => nav("/business/setup")}
                className="mt-3.5 w-full justify-between"
              >
                <span>Complete 3-Step Setup</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </section>
          )}

          {/* Subscription & Partner Tier */}
          <BusinessSubscriptionCard />

          {/* Quick Operations Links */}
          <section className="rounded-[28px] bg-card p-5 ring-1 ring-line shadow-clay space-y-2">
            <h3 className="font-display text-xs font-bold uppercase tracking-wider text-mute">Operations Hub</h3>
            <Link
              href="/business/setup"
              className="flex min-h-[44px] items-center justify-between rounded-xl bg-paper px-3.5 py-2.5 text-xs font-semibold text-ink transition hover:bg-card hover:ring-1 hover:ring-brand/30"
            >
              <span className="flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-accent" />
                Partner Readiness Checklist
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-mute" />
            </Link>
            <Link
              href="/claim"
              className="flex min-h-[44px] items-center justify-between rounded-xl bg-paper px-3.5 py-2.5 text-xs font-semibold text-ink transition hover:bg-card hover:ring-1 hover:ring-brand/30"
            >
              <span className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                Claim &amp; Verify Venue
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-mute" />
            </Link>
            <Link
              href="/business/promotions"
              className="flex min-h-[44px] items-center justify-between rounded-xl bg-paper px-3.5 py-2.5 text-xs font-semibold text-ink transition hover:bg-card hover:ring-1 hover:ring-brand/30"
            >
              <span className="flex items-center gap-2">
                <Compass className="h-4 w-4 text-accent" />
                Promotions &amp; Offers Studio
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-mute" />
            </Link>
            <Link
              href="/events/new"
              className="flex min-h-[44px] items-center justify-between rounded-xl bg-paper px-3.5 py-2.5 text-xs font-semibold text-ink transition hover:bg-card hover:ring-1 hover:ring-brand/30"
            >
              <span className="flex items-center gap-2">
                <Plus className="h-4 w-4 text-amber-500" />
                Host an Event or Market
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-mute" />
            </Link>
            <Link
              href="/scan"
              className="flex min-h-[44px] items-center justify-between rounded-xl bg-paper px-3.5 py-2.5 text-xs font-semibold text-ink transition hover:bg-card hover:ring-1 hover:ring-brand/30"
            >
              <span className="flex items-center gap-2">
                <QrCode className="h-4 w-4 text-accent" />
                Door &amp; Pass Scanner
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-mute" />
            </Link>
            <Link
              href="/join"
              className="flex min-h-[44px] items-center justify-between rounded-xl bg-paper px-3.5 py-2.5 text-xs font-semibold text-ink transition hover:bg-card hover:ring-1 hover:ring-brand/30"
            >
              <span className="flex items-center gap-2">
                <Users className="h-4 w-4 text-emerald-600" />
                Arrival &amp; Cohort Engine
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-mute" />
            </Link>
            <Link
              href="/host/pulse"
              className="flex min-h-[44px] items-center justify-between rounded-xl bg-paper px-3.5 py-2.5 text-xs font-semibold text-ink transition hover:bg-card hover:ring-1 hover:ring-brand/30"
            >
              <span className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-accent" />
                Belonging &amp; Pulse Reports
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-mute" />
            </Link>
            <Link
              href="/business/helpdesk"
              className="flex min-h-[44px] items-center justify-between rounded-xl bg-paper px-3.5 py-2.5 text-xs font-semibold text-ink transition hover:bg-card hover:ring-1 hover:ring-brand/30"
            >
              <span className="flex items-center gap-2">
                <Headphones className="h-4 w-4 text-accent" />
                Partner Help Desk
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-mute" />
            </Link>
          </section>
        </aside>
      </div>

      {/* Delete / Unlink Confirmation Modal */}
      {showDeleteModal && (
        <DeleteVenueDialog
          venueName={mine.name}
          deleting={deleting}
          onCancel={() => setShowDeleteModal(false)}
          onConfirm={() => void handleDeleteVenue()}
        />
      )}
    </div>
  );
}
