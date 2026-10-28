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
import { venueBioInput } from "@/lib/venue-bio";
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
  formatAddressOneLine,
  formatGps,
  isValidPhone,
  parseAddress,
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
import { BusinessTonight } from "@/components/business/BusinessTonight";
import { OfferForm, dealToDraft, type OfferPayload } from "@/components/business/OfferForm";
import { Sheet } from "@/components/ui/Sheet";
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

export function BusinessPage() {
  const [, nav] = useLocation();
  const search = useSearch();
  const { user, authReady } = useAuth();
  const { mine, myListings, setSelectedListingId, createPlace, savePlace, saveDeal, confirmHours, deleteListing } =
    useListings();
  const { mine: bio, business, createProfile, updateProfile } = useBio();
  const [bioBusy, setBioBusy] = useState(false);
  // `?tab=place` is the legacy id for the venue tab — it resolves to `venue`
  // so old links keep working.
  const [tab, setTab] = useState<BusinessNavTab>(() => {
    const params = new URLSearchParams(search);
    const t = params.get("tab");
    if (t === "place") return "venue";
    if (t === "tonight" || t === "venue" || t === "offer" || t === "bookings" || t === "list") return t;
    return "tonight";
  });

  useEffect(() => {
    const params = new URLSearchParams(search);
    const t = params.get("tab");
    if (t === "place") {
      setTab("venue");
      params.set("tab", "venue");
      nav(`/business?${params.toString()}`, { replace: true });
      return;
    }
    if (t === "tonight" || t === "venue" || t === "offer" || t === "bookings" || t === "list") {
      setTab(t);
    }
  }, [search, nav]);

  // Pills write the tab back to the URL (replace, no history spam) so
  // ?tab= links, bookmarks and refreshes always land on the right tab.
  const handleTabChange = (next: BusinessNavTab) => {
    setTab(next);
    const params = new URLSearchParams(search);
    if (params.get("tab") !== next) {
      params.set("tab", next);
      nav(`/business?${params.toString()}`, { replace: true });
    }
  };

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
  const [offerSheet, setOfferSheet] = useState(false);
  const [offerBusy, setOfferBusy] = useState(false);

  useEffect(() => {
    if (!mine) return;
    setName(mine.name);
    setAddress(parseAddress(mine.address));
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

  // Every hook must run on every render, including the first loading render.
  // These stay above the auth/listing early returns so a hard load never
  // changes the hook order (Rules of Hooks).
  const handle = mine?.handle || bio?.handle;
  // Guest preview recomputes only when edited fields change — not on every keystroke render.
  const preview = useMemo(
    () =>
      mine
        ? withWalk(
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
          )
        : null,
    [mine, name, category, address, hours, shortWhy, description, badge, detail, handle, hero, geo, phone],
  );

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
      <div className="page-wrap-narrow space-y-8 pt-6 sm:pt-10">
        <div>
          <div className="flex items-start gap-4">
            <div className="neu-tint-brand flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-accent">
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
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full neu-chip text-xs font-bold text-ink">
                2
              </span>
              <div className="min-w-0 pt-0.5">
                <h3 className="text-sm font-semibold text-ink">Publish a member perk</h3>
                <p className="text-sm text-mute">Give nearby guests a reason to walk in today.</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full neu-chip text-xs font-bold text-ink">
                3
              </span>
              <div className="min-w-0 pt-0.5">
                <h3 className="text-sm font-semibold text-ink">Get paid directly</h3>
                <p className="text-sm text-mute">Stripe payouts go straight to your bank.</p>
              </div>
            </li>
          </ol>

          {/* 1-Click Inline Google Place Import */}
          <section aria-label="Import from Google Maps" className="mt-8">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-accent">Fastest start</p>
                <h2 className="font-display mt-0.5 text-base font-bold text-ink">Import from Google Maps</h2>
                <p className="mt-1 text-sm text-mute">Search your venue — we fill in address, hours, and photos.</p>
              </div>
              <Globe2 className="mt-1 h-5 w-5 shrink-0 text-accent" aria-hidden />
            </div>
            <GooglePlaceImportCard
              variant="bare"
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
          </section>

          <div className="space-y-2.5">
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
              <Button variant="ghost" size="lg" className="w-full gap-2" onClick={() => nav("/claim")}>
                <ShieldCheck className="h-4 w-4 text-accent" aria-hidden />
                <span>Claim existing venue</span>
              </Button>
              <Button variant="ghost" size="lg" className="w-full gap-2" onClick={() => nav("/event")}>
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
        // Runs only after the listing guard above, so mine is set here.
        handle: mine!.handle,
        heroImage: hero,
      });
      // Sync the VENUE bio only — never the owner's personal profile.
      if (
        business?.handle &&
        (business.aboutText !== description || business.shortWhy !== shortWhy || business.name !== name)
      ) {
        await updateProfile({
          handle: business.handle,
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

  // One shared creation path: the same form the Promotions Studio uses.
  // Runs only after the listing guard above, so mine is set here.
  async function publishOffer(payload: OfferPayload) {
    setOfferBusy(true);
    try {
      await saveDeal(mine!.id, payload);
      setBadge(payload.badge);
      setDetail(payload.detail);
      setOfferSheet(false);
      toast.success("Offer live on /deals");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to publish deal");
    } finally {
      setOfferBusy(false);
    }
  }

  async function handleCreateVenueBio() {
    if (!mine || bioBusy) return;
    const input = venueBioInput(mine);
    if (!input) {
      toast.error("Could not derive a venue handle for this listing");
      return;
    }
    setBioBusy(true);
    try {
      const created = await createProfile(input);
      toast.success(`Venue bio created (@${created.handle})`);
      nav(`/bio/edit?kind=business&handle=${encodeURIComponent(created.handle)}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create venue bio");
    } finally {
      setBioBusy(false);
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
                className="neu-inset py-1.5 pl-3 pr-8 text-[16px] sm:text-xs font-bold text-ink focus:outline-none focus:ring-2 focus:ring-brand/40 min-h-[44px]"
              >
                {myListings.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} ({formatAddressOneLine(l.address).split(",")[0] || "Sydney"})
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
            className="neu-btn inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-ink transition active:scale-[0.98] whitespace-nowrap sm:flex-initial"
          >
            <Plus className="h-4 w-4 shrink-0 text-accent" />
            <span>Add Venue</span>
          </Link>
          <Link
            href="/claim"
            className="neu-btn inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-ink transition active:scale-[0.98] whitespace-nowrap sm:flex-initial"
          >
            <ShieldCheck className="h-4 w-4 shrink-0 text-accent" />
            <span>Claim Venue</span>
          </Link>
          <Link
            href="/business/promotions/new"
            className="neu-btn inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-ink transition active:scale-[0.98] whitespace-nowrap sm:flex-initial"
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
      <header className="neu-section overflow-hidden">
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
              className="neu-btn inline-flex min-h-[44px] shrink-0 items-center gap-1.5 px-3.5 py-1.5 font-semibold text-accent transition whitespace-nowrap"
            >
              <Settings2 className="h-3.5 w-3.5 shrink-0" />
              <span>Setup Checklist</span>
            </Link>
            <Link
              href="/help"
              className="neu-btn inline-flex min-h-[44px] shrink-0 items-center gap-1.5 px-3.5 py-1.5 font-semibold text-ink/85 transition hover:text-accent whitespace-nowrap"
            >
              <Headphones className="h-3.5 w-3.5 shrink-0 text-accent" />
              <span>Help Centre</span>
            </Link>
            <Link
              href="/host/pulse"
              className="neu-btn inline-flex min-h-[44px] shrink-0 items-center gap-1.5 px-3.5 py-1.5 font-semibold text-ink/85 transition hover:text-accent whitespace-nowrap"
            >
              <Activity className="h-3.5 w-3.5 shrink-0 text-accent" />
              <span>Belonging &amp; Pulse</span>
            </Link>
            <Link
              href="/business/promotions"
              className="neu-btn inline-flex min-h-[44px] shrink-0 items-center gap-1.5 px-3.5 py-1.5 font-semibold text-ink/85 transition hover:text-accent whitespace-nowrap"
            >
              <Gift className="h-3.5 w-3.5 shrink-0 text-amber-500" />
              <span>Promotions Studio</span>
            </Link>
          </div>
          {business?.handle ? (
            <Link
              href="/bio/edit?kind=business"
              className="neu-btn inline-flex min-h-[44px] shrink-0 items-center gap-1 px-3.5 py-1.5 font-semibold text-mute transition hover:text-ink whitespace-nowrap"
            >
              <span>Edit Venue Bio &amp; Links</span>
              <ArrowRight className="h-3 w-3 shrink-0" />
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => void handleCreateVenueBio()}
              disabled={bioBusy}
              className="neu-btn inline-flex min-h-[44px] shrink-0 cursor-pointer items-center gap-1 px-3.5 py-1.5 font-semibold text-mute transition hover:text-ink whitespace-nowrap disabled:opacity-60"
            >
              <span>{bioBusy ? "Creating venue bio…" : "Create venue bio"}</span>
              <ArrowRight className="h-3 w-3 shrink-0" />
            </button>
          )}
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
          <div className="neu-section p-4 sm:p-5">
            <WaveHostCard placeName={mine.name} placeId={mine.placeId} listingId={mine.id} handle={handle} />
          </div>

          {/* Navigation Hub & Tab Selector */}
          <BusinessNavHub
            activeTab={tab}
            onTabChange={handleTabChange}
            listingActive={mine.status === "active"}
            dealLive={Boolean(mine.deal)}
            campaignCount={stats.campaigns}
            bookingCount={stats.rsvps}
          />

          {/* TAB 1: TONIGHT — service briefing, the hub landing */}
          {tab === "tonight" && (
            <BusinessTonight
              listingName={mine.name}
              status={mine.status}
              hours={mine.hours}
              dealLive={Boolean(mine.deal)}
              dealBadge={mine.deal?.badge}
              campaigns={stats.campaigns}
              rsvps={stats.rsvps}
            />
          )}

          {/* TAB 2: VENUE PROFILE & DETAILS */}
          {tab === "venue" && (
            <div className="space-y-6">
              {/* Google Place Quick Sync Card */}
              <section className="neu-section p-5 sm:p-6">
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
                    const parsed = parseAddress(place.address);
                    setAddress({ ...parsed, city: place.city || parsed.city });
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
                    // Sync the VENUE bio only — never the owner's personal profile.
                    if (business?.handle) {
                      void updateProfile({
                        handle: business.handle,
                        name: place.name,
                        shortWhy: place.shortWhy || business.shortWhy,
                        aboutText: description || business.aboutText,
                        hours: place.hours || business.hours,
                        phone: place.phone || business.phone,
                        city: place.city || business.city,
                        avatar: place.photoNames[1] || place.photoNames[0] || business.avatar,
                        cover: place.photoNames[0] || business.cover,
                        mapsPlaceId: place.placeId,
                        links: mergeBioLinks(business.links, bioLinksFromGooglePlace(place)),
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
              <form className="neu-section p-5 sm:p-6 space-y-5" onSubmit={onPlace}>
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
                          category === c.id ? "bg-brand text-white shadow-sm" : "bg-paper text-ink hover:bg-card",
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
                                postal: found.fields?.postcode || a.postal,
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
                  {!address.line1.trim() && (
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      Add your street address — the suburb alone is not enough to save.
                    </p>
                  )}
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
            <div className="neu-section p-5 sm:p-6">
              <GuestListPanel clubId={handle || mine.id} clubName={mine.name} />
            </div>
          )}

          {/* TAB 4: OFFERS — one shared creation sheet with the Promotions Studio */}
          {tab === "offer" && (
            <div className="neu-section p-5 sm:p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-display text-base font-bold text-ink">Neighbourhood Offer</h2>
                  <p className="text-xs text-mute mt-0.5">
                    {mine.deal
                      ? "Live on /deals with QR verification."
                      : "Exclusive perks appear on the Explore map, What's On, and your verified page."}
                  </p>
                </div>
                <span
                  className={
                    mine.deal
                      ? "neu-chip neu-tint-emerald inline-flex min-h-[44px] items-center px-3.5 text-xs font-bold text-emerald-600 dark:text-emerald-400"
                      : "neu-chip inline-flex min-h-[44px] items-center px-3.5 text-xs font-bold text-mute"
                  }
                >
                  {mine.deal ? mine.deal.badge : "No offer live"}
                </span>
              </div>

              {mine.deal && <p className="neu-row px-4 py-3 text-sm text-ink">{mine.deal.detail}</p>}

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button type="button" size="lg" className="flex-1 gap-2" onClick={() => setOfferSheet(true)}>
                  <Tag className="h-4 w-4" aria-hidden="true" />
                  <span>{mine.deal ? "Edit offer" : "New offer"}</span>
                </Button>
                <Link
                  href="/business/promotions"
                  className="neu-btn inline-flex min-h-[48px] items-center justify-center gap-1.5 px-5 text-sm font-semibold text-ink transition"
                >
                  <span>Promotions Studio</span>
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </div>

              <Sheet
                open={offerSheet}
                onClose={() => setOfferSheet(false)}
                title={mine.deal ? "Edit offer" : "New offer"}
              >
                <OfferForm
                  key={mine.deal?.badge || "new"}
                  initial={dealToDraft(mine.deal)}
                  submitLabel={mine.deal ? "Update live offer" : "Publish to /deals"}
                  busy={offerBusy}
                  onSubmit={(payload) => void publishOffer(payload)}
                />
              </Sheet>
            </div>
          )}
        </main>

        {/* Right Column: Live Guest Preview, Visibility Score & Subscription (4-5 cols on desktop) */}
        <aside className="space-y-6 lg:col-span-5 xl:col-span-4">
          {/* Live Guest Preview Card */}
          <section className="neu-section p-5">
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
              {preview && <PlaceCard place={preview} walk={preview.walk} />}
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
            <section className="neu-section p-5">
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
                <span>Complete Setup Checklist</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </section>
          )}

          {/* Subscription & Partner Tier */}
          <BusinessSubscriptionCard />

          {/* Quick Operations Links */}
          <section className="neu-section p-5 space-y-2">
            <h3 className="font-display text-xs font-bold uppercase tracking-wider text-mute">Operations Hub</h3>
            <Link
              href="/business/setup"
              className="neu-row flex min-h-[44px] items-center justify-between px-3.5 py-2.5 text-xs font-semibold text-ink transition"
            >
              <span className="flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-accent" />
                Partner Readiness Checklist
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-mute" />
            </Link>
            <Link
              href="/claim"
              className="neu-row flex min-h-[44px] items-center justify-between px-3.5 py-2.5 text-xs font-semibold text-ink transition"
            >
              <span className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                Claim &amp; Verify Venue
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-mute" />
            </Link>
            <Link
              href="/business/promotions"
              className="neu-row flex min-h-[44px] items-center justify-between px-3.5 py-2.5 text-xs font-semibold text-ink transition"
            >
              <span className="flex items-center gap-2">
                <Compass className="h-4 w-4 text-accent" />
                Promotions &amp; Offers Studio
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-mute" />
            </Link>
            <Link
              href="/events/new"
              className="neu-row flex min-h-[44px] items-center justify-between px-3.5 py-2.5 text-xs font-semibold text-ink transition"
            >
              <span className="flex items-center gap-2">
                <Plus className="h-4 w-4 text-amber-500" />
                Host an Event or Market
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-mute" />
            </Link>
            <Link
              href="/scan"
              className="neu-row flex min-h-[44px] items-center justify-between px-3.5 py-2.5 text-xs font-semibold text-ink transition"
            >
              <span className="flex items-center gap-2">
                <QrCode className="h-4 w-4 text-accent" />
                Door &amp; Pass Scanner
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-mute" />
            </Link>
            <Link
              href="/join"
              className="neu-row flex min-h-[44px] items-center justify-between px-3.5 py-2.5 text-xs font-semibold text-ink transition"
            >
              <span className="flex items-center gap-2">
                <Users className="h-4 w-4 text-emerald-600" />
                Arrival &amp; Cohort Engine
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-mute" />
            </Link>
            <Link
              href="/host/pulse"
              className="neu-row flex min-h-[44px] items-center justify-between px-3.5 py-2.5 text-xs font-semibold text-ink transition"
            >
              <span className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-accent" />
                Belonging &amp; Pulse Reports
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-mute" />
            </Link>
            <Link
              href="/help"
              className="neu-row flex min-h-[44px] items-center justify-between px-3.5 py-2.5 text-xs font-semibold text-ink transition"
            >
              <span className="flex items-center gap-2">
                <Headphones className="h-4 w-4 text-accent" />
                Help Centre
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
