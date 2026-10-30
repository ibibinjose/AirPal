import { useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Check,
  Clock,
  Rocket,
  Settings2,
  ShieldCheck,
  Sparkles,
  Tag,
  UserCheck,
} from "lucide-react";
import { BUSINESS_CATEGORIES, type BusinessCategoryId } from "@shared/business";
import { formatAddressOneLine } from "@shared/geo-address";
import { venueStreetReady } from "@/lib/venue-readiness";
import type { GooglePlaceImport } from "@shared/google-place";
import { GooglePlaceImportCard } from "@/components/business/GooglePlaceImport";
import { AuthGate } from "@/components/auth/AuthGate";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { useListings } from "@/contexts/ListingsContext";
import { useBio } from "@/contexts/BioContext";
import { useEvents } from "@/contexts/EventsContext";
import { venueBioHandle, venueBioInput } from "@/lib/venue-bio";
import { cn } from "@/lib/cn";

/**
 * Business onboarding / setup — full interactive 2-stage partner studio
 * connected directly to ListingsContext & BioContext so partners never
 * hit a circular loop or dead-end stub.
 */
export function BusinessOnboardPage({ step }: { step: "onboard" | "setup" }) {
  const [, nav] = useLocation();
  const { user } = useAuth();
  const { mine, createPlace, confirmHours, saveDeal } = useListings();
  const { business, createProfile } = useBio();
  const { events } = useEvents();

  // Best-effort venue bio alongside the new listing, using the handle the
  // user chose. A failure here is non-fatal: the checklist step below
  // offers the same one-click creation.
  async function ensureVenueBio(listing: Parameters<typeof venueBioInput>[0]) {
    try {
      const input = venueBioInput(listing);
      if (!input) return;
      await createProfile(input);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Venue saved — create the venue bio in Step 4.");
    }
  }

  // Onboard is create-only: always start blank. Prefilling from the owner's
  // existing listing leaks venue 1's name, address, hours, and handle into the
  // venue 2 form (first-time owners have no listing, so they already see blanks).
  const [name, setName] = useState("");
  const [category, setCategory] = useState<BusinessCategoryId>("eat");
  const [address, setAddress] = useState("");
  const [hours, setHours] = useState("Mon–Sun · 9am–9pm");
  const [shortWhy, setShortWhy] = useState("");
  const [handle, setHandle] = useState("");
  const [saving, setSaving] = useState(false);

  const [quickDealTitle, setQuickDealTitle] = useState(
    mine?.deal?.detail || "2-for-1 welcome drink for AirPal members",
  );
  const [savingDeal, setSavingDeal] = useState(false);

  const copy = {
    onboard: {
      eyebrow: "Business · Step 1 of 2 · Onboard",
      title: "Put your venue on AirPal.",
      lede: "Import your Google Place in one tap or enter your details below — your venue goes live in your Business Hub immediately.",
      icon: Rocket,
    },
    setup: {
      eyebrow: "Business · Venue Readiness Checklist",
      title: "Finish your venue readiness.",
      lede: "Verify your hours, publish a member perk, and connect your public @handle and arrival tools.",
      icon: Settings2,
    },
  }[step];
  const Icon = copy.icon;

  async function handleGoogleImport(found: GooglePlaceImport) {
    setSaving(true);
    try {
      const cleanHandle =
        handle.trim().replace(/^@+/, "").toLowerCase() ||
        found.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "")
          .slice(0, 24);
      const created = await createPlace({
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
        handle: cleanHandle,
      });
      toast.success(`${found.name} imported! Opening your setup checklist…`);
      nav("/business/setup");
      // Venue bio builds in the background and never blocks setup: a slow
      // profile chain used to strand owners on step 1 with the venue already
      // created. Failures surface their own toast via ensureVenueBio.
      void ensureVenueBio(created);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not import venue");
    } finally {
      setSaving(false);
    }
  }

  async function handleManualCreate(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      toast.error("Enter your business or venue name");
      return;
    }
    setSaving(true);
    try {
      const cleanHandle =
        handle.trim().replace(/^@+/, "").toLowerCase() ||
        trimmed
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "")
          .slice(0, 24);
      const created = await createPlace({
        name: trimmed,
        category,
        address: address.trim() || "Sydney NSW",
        hours: hours.trim() || "Mon–Sun · 9am–9pm",
        shortWhy: shortWhy.trim() || `Local ${category} partner on AirPal.`,
        handle: cleanHandle,
      });
      toast.success(`${trimmed} created! Let's finish your readiness checklist.`);
      nav("/business/setup");
      // Venue bio builds in the background and never blocks setup: a slow
      // profile chain used to strand owners on step 1 with the venue already
      // created. Failures surface their own toast via ensureVenueBio.
      void ensureVenueBio(created);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create venue");
    } finally {
      setSaving(false);
    }
  }

  async function handleQuickPublishDeal() {
    if (!mine) {
      toast.error("Add your venue in Step 1 first");
      nav("/business/onboard");
      return;
    }
    if (!quickDealTitle.trim()) {
      toast.error("Enter a perk title");
      return;
    }
    setSavingDeal(true);
    try {
      await saveDeal(mine.id, {
        badge: "Member Perk",
        detail: quickDealTitle.trim(),
        claimHint: "Show AirPal Pass QR at counter",
      });
      toast.success("Member perk published to /deals!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not publish perk");
    } finally {
      setSavingDeal(false);
    }
  }

  // Step 1 counts complete only with a street-level address — a bare suburb
  // never marks the venue ready (finding 14).
  const venueAddressOk = venueStreetReady(mine?.address);
  const hasEvents = Boolean(
    mine &&
    events.some(
      (e) =>
        (mine.handle && e.hostHandle === mine.handle) ||
        (mine.name && e.venue?.toLowerCase() === mine.name.toLowerCase()),
    ),
  );
  const checklist = [
    {
      id: "venue",
      title: "1. Venue profile & street address",
      detail:
        mine && venueAddressOk
          ? `${mine.name} · ${formatAddressOneLine(mine.address)}`
          : "Import from Google Maps or add your street address — suburb alone is not enough.",
      done: Boolean(mine?.name) && venueAddressOk,
      href: mine ? "/business?tab=venue" : "/business/onboard",
      cta: mine ? "Edit Venue" : "Add Venue",
    },
    {
      id: "hours",
      title: "2. Confirm live trading hours",
      detail: mine?.hoursVerifiedAt
        ? `Hours confirmed (${mine.hours})`
        : "Guests see an 'Open Now' badge once you confirm your trading hours.",
      done: Boolean(mine?.hoursVerifiedAt),
      action: mine
        ? async () => {
            await confirmHours();
            toast.success("Trading hours confirmed!");
          }
        : undefined,
      href: "/business?tab=venue",
      cta: mine?.hoursVerifiedAt ? "Update Hours" : "Confirm Hours Now",
    },
    {
      id: "deal",
      title: "3. Publish a neighbourhood member perk",
      detail: mine?.deal?.detail
        ? `Active perk: "${mine.deal.detail}"`
        : "Give locals a reason to walk in today — redeemable via QR on /deals.",
      done: Boolean(mine?.deal?.detail),
      href: "/business?tab=offer",
      cta: mine?.deal?.detail ? "Edit Perk" : "Configure Perk",
    },
    {
      id: "bio",
      title: "4. Public Business Bio (@handle)",
      // Only the venue BIO counts as live — the listing handle alone is not a page.
      detail: business?.handle
        ? `Live at /@${business.handle}`
        : "Claim your @handle so guests can follow your venue and share your card.",
      done: Boolean(business?.handle),
      href: business?.handle
        ? `/@${business.handle}`
        : `/bio/setup?kind=business${
            mine && venueBioHandle(mine) ? `&handle=${encodeURIComponent(venueBioHandle(mine))}` : ""
          }`,
      cta: business?.handle ? "View Public Bio" : "Create Venue Bio",
      action:
        mine && !business?.handle
          ? async () => {
              const input = venueBioInput(mine);
              if (!input) {
                toast.error("Could not derive a venue handle for this listing");
                return;
              }
              try {
                const created = await createProfile(input);
                toast.success(`Venue bio live at /@${created.handle}`);
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Could not create venue bio");
              }
            }
          : undefined,
    },
    {
      id: "events",
      title: "5. Events, Arrival Engine & Door Scanner",
      detail: hasEvents
        ? "Active events connected to door scanner and arrival pass."
        : "Host ticketed nights, scan passes at the door, or onboard a cohort.",
      done: hasEvents,
      href: "/event",
      cta: hasEvents ? "Manage Events" : "Open Event Studio",
    },
  ];
  const completedCount = checklist.filter((c) => c.done).length;
  const allDone = completedCount === checklist.length;

  const stepIndex = step === "onboard" ? 0 : 1;
  return (
    <div className="page-wrap-narrow space-y-5 pt-4 sm:pt-6">
      {/* Flow header: back, title, and honest 3-step progress in one card */}
      <div className="surface-card p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/business"
            className="neu-btn inline-flex min-h-[44px] items-center gap-1.5 px-3.5 text-sm font-semibold text-ink transition"
          >
            <ArrowLeft size={15} aria-hidden />
            <span>Business Hub</span>
          </Link>
          <Link
            href="/claim"
            className="neu-btn inline-flex min-h-[44px] items-center gap-1.5 px-3.5 text-sm font-semibold text-ink transition"
          >
            <ShieldCheck size={15} className="text-accent" aria-hidden />
            <span>Claim venue</span>
          </Link>
          <Link
            href="/business/promotions"
            className="neu-btn inline-flex min-h-[44px] items-center gap-1.5 px-3.5 text-sm font-semibold text-ink transition"
          >
            <Tag size={15} className="text-accent" aria-hidden />
            <span>Promotions</span>
          </Link>
        </div>

        <div className="mt-5 flex items-start gap-3.5">
          <span
            className="neu-tint-brand grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-accent"
            aria-hidden="true"
          >
            <Icon size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-accent">{copy.eyebrow}</p>
            <h1 className="human-title mt-1 text-2xl sm:text-3xl">{copy.title}</h1>
            <p className="mt-1.5 text-sm leading-relaxed text-mute sm:text-base">{copy.lede}</p>
          </div>
        </div>

        <nav aria-label="Onboarding steps" className="mt-5">
          <ol className="neu-inset grid grid-cols-2 gap-1.5 p-1">
            {(
              [
                { id: "onboard", label: "Onboard", href: "/business/onboard" },
                { id: "setup", label: "Setup", href: "/business/setup" },
              ] as const
            ).map((item, i) => {
              const active = step === item.id;
              const done = i < stepIndex;
              return (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    aria-current={active ? "step" : undefined}
                    className={cn(
                      "flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl px-2 text-sm font-semibold transition",
                      active ? "bg-brand text-white" : done ? "text-ink hover:bg-card" : "text-mute hover:text-ink",
                    )}
                  >
                    <span
                      className={cn(
                        "grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-bold",
                        active ? "bg-white/25 text-white" : done ? "bg-brand/15 text-accent" : "bg-card text-mute",
                      )}
                      aria-hidden="true"
                    >
                      {done ? <Check size={12} strokeWidth={3} /> : i + 1}
                    </span>
                    <span className="truncate">{item.label}</span>
                    <span className="sr-only">{done ? " (Completed)" : active ? " (Current)" : ""}</span>
                  </Link>
                </li>
              );
            })}
          </ol>
          <div className="flow-progress mt-3" aria-hidden>
            <span style={{ width: `${((stepIndex + 1) / 2) * 100}%` }} />
          </div>
        </nav>
      </div>

      {/* STEP 1: ONBOARD */}
      {step === "onboard" && (
        <>
          {!user ? (
            <AuthGate
              next="/business/onboard"
              kicker="Partner Onboarding"
              title="Sign in to onboard your venue"
              lede="Use your single AirPal account to import your Google Place, publish member perks, and manage events."
            />
          ) : (
            <div className="space-y-5">
              {mine && (
                <div className="rounded-3xl bg-emerald-500/10 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                      <Check size={14} strokeWidth={3} /> Active Venue Connected
                    </span>
                    <h2 className="font-display text-lg font-bold text-ink">{mine.name}</h2>
                    <p className="text-xs text-mute">{formatAddressOneLine(mine.address)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href="/business/setup"
                      className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-2xl bg-brand px-4 text-xs font-bold text-white shadow-xs transition hover:bg-brand-ink"
                    >
                      <span>Continue to Step 2: Setup</span>
                      <ArrowRight size={14} />
                    </Link>
                    <Link
                      href="/business"
                      className="neu-btn inline-flex min-h-[44px] items-center justify-center gap-1.5 px-4 text-xs font-semibold text-ink transition"
                    >
                      <span>Open Business Hub</span>
                    </Link>
                  </div>
                </div>
              )}

              {/* Option A: 1-Click Google Place Import */}
              <section className="neu-section p-5 sm:p-6 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-accent">
                      Fastest · Recommended
                    </span>
                    <h2 className="font-display text-lg font-bold text-ink mt-0.5">
                      Option A: 1-Click Google Maps Import
                    </h2>
                    <p className="text-xs text-mute mt-0.5">
                      Search your venue name and suburb — we auto-fill your address, category, hours, and map pin.
                    </p>
                  </div>
                </div>
                <GooglePlaceImportCard variant="card" onImport={(found) => void handleGoogleImport(found)} />
              </section>

              {/* Option B: Manual Quick Launch Form */}
              <form onSubmit={(e) => void handleManualCreate(e)} className="neu-section p-5 sm:p-6 space-y-4">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-mute">
                    No Google listing yet?
                  </span>
                  <h2 className="font-display text-lg font-bold text-ink mt-0.5">Option B: Quick Venue Launch</h2>
                  <p className="text-xs text-mute mt-0.5">
                    Create your partner workspace directly and start publishing deals or events right away.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-mute mb-1.5 block">
                      Business / Venue Name *
                    </label>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Reuben Hills Roastery"
                      required
                      className="neu-inset h-12 w-full px-4 text-[16px] sm:text-sm outline-none transition focus:ring-2 focus:ring-brand/20"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-mute mb-1.5 block">
                      Public @handle
                    </label>
                    <input
                      value={handle}
                      onChange={(e) => setHandle(e.target.value)}
                      placeholder="e.g. reubenhills"
                      className="neu-inset h-12 w-full px-4 text-[16px] sm:text-sm outline-none transition focus:ring-2 focus:ring-brand/20"
                    />
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-mute mb-1.5">Category</p>
                  <div className="flex flex-wrap gap-1.5">
                    {BUSINESS_CATEGORIES.map((c) => {
                      const on = category === c.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setCategory(c.id)}
                          className={cn(
                            "min-h-[44px] rounded-full px-3.5 text-sm font-semibold transition",
                            on ? "bg-brand text-white shadow-xs" : "bg-paper text-mute hover:text-ink",
                          )}
                        >
                          {c.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-mute mb-1.5 block">
                      Street Address & Suburb
                    </label>
                    <input
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="61 Albion St, Surry Hills NSW 2010"
                      className="neu-inset h-12 w-full px-4 text-[16px] sm:text-sm outline-none transition focus:ring-2 focus:ring-brand/20"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-mute mb-1.5 block">
                      Trading Hours
                    </label>
                    <input
                      value={hours}
                      onChange={(e) => setHours(e.target.value)}
                      placeholder="Mon–Sun · 7am–4pm"
                      className="neu-inset h-12 w-full px-4 text-[16px] sm:text-sm outline-none transition focus:ring-2 focus:ring-brand/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-mute mb-1.5 block">
                    One-Line Guest Pitch
                  </label>
                  <input
                    value={shortWhy}
                    onChange={(e) => setShortWhy(e.target.value)}
                    placeholder="What makes locals love your spot? e.g. Specialty single-origin espresso & weekend brunch."
                    maxLength={140}
                    className="neu-inset h-12 w-full px-4 text-[16px] sm:text-sm outline-none transition focus:ring-2 focus:ring-brand/20"
                  />
                </div>

                <Button type="submit" size="lg" className="w-full min-h-[48px] gap-2" disabled={saving}>
                  <span>{saving ? "Creating Venue Workspace…" : "Launch Venue & Continue to Setup"}</span>
                  <ArrowRight size={16} />
                </Button>
              </form>

              {/* More Partner Pathways */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Link href="/claim" className="neu-card p-4 transition flex flex-col justify-between gap-2">
                  <div className="flex items-center gap-2 text-accent">
                    <ShieldCheck size={16} />
                    <span className="text-xs font-bold uppercase tracking-wider">Official Verification</span>
                  </div>
                  <p className="text-sm font-bold text-ink">Claim an Existing Venue</p>
                  <p className="text-xs text-mute">Submit ownership proof for a verified partner badge.</p>
                </Link>
                <Link
                  href="/bio/setup?kind=business"
                  className="neu-card p-4 transition flex flex-col justify-between gap-2"
                >
                  <div className="flex items-center gap-2 text-accent">
                    <UserCheck size={16} />
                    <span className="text-xs font-bold uppercase tracking-wider">Public Identity</span>
                  </div>
                  <p className="text-sm font-bold text-ink">Business Bio Wizard</p>
                  <p className="text-xs text-mute">Design your shareable /@handle digital business card.</p>
                </Link>
                <Link href="/event" className="neu-card p-4 transition flex flex-col justify-between gap-2">
                  <div className="flex items-center gap-2 text-accent">
                    <Calendar size={16} />
                    <span className="text-xs font-bold uppercase tracking-wider">Events & Tickets</span>
                  </div>
                  <p className="text-sm font-bold text-ink">Open Event Studio</p>
                  <p className="text-xs text-mute">Host a market, expo, or ticketed night with Gate QR.</p>
                </Link>
              </div>
            </div>
          )}
        </>
      )}

      {/* STEP 2: SETUP CHECKLIST */}
      {step === "setup" && (
        <div className="space-y-5">
          {/* Readiness Progress Bar */}
          <div className="neu-section p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-accent">Partner Readiness</p>
                <h2 className="font-display text-lg font-bold text-ink mt-0.5">
                  {allDone ? "You're live — see tonight" : `${completedCount} of ${checklist.length} steps complete`}
                </h2>
              </div>
              <Link
                href="/business"
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-brand px-4 text-xs font-bold text-white shadow-xs transition hover:bg-brand-ink"
              >
                <span>{allDone ? "Open Tonight" : "Open Business Hub"}</span>
                <ArrowRight size={14} />
              </Link>
            </div>
            <div
              className="flow-progress"
              role="progressbar"
              aria-valuenow={completedCount}
              aria-valuemin={0}
              aria-valuemax={checklist.length}
              aria-label="Setup progress"
            >
              <span style={{ width: `${Math.round((completedCount / checklist.length) * 100)}%` }} />
            </div>
            <p className="text-sm text-mute tabular-nums">
              {allDone
                ? "100% ready — your Tonight briefing, door list, and offers are live in the Hub."
                : `${Math.round((completedCount / checklist.length) * 100)}% ready — finish the open steps to go fully live.`}
            </p>
          </div>

          {/* Checklist Cards */}
          <div className="space-y-3">
            {checklist.map((item) => (
              <div
                key={item.id}
                className="neu-section p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <span
                    role="img"
                    aria-label={item.done ? "Completed step" : "Incomplete step"}
                    className={cn(
                      "grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-bold",
                      item.done ? "bg-emerald-500/15 text-emerald-700" : "bg-paper text-mute",
                    )}
                  >
                    {item.done ? (
                      <Check size={16} strokeWidth={3} aria-hidden="true" />
                    ) : (
                      <Clock size={15} aria-hidden="true" />
                    )}
                    <span className="sr-only">{item.done ? "Completed" : "Incomplete"}</span>
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-display text-base font-bold text-ink">{item.title}</h3>
                    <p className="text-xs text-mute mt-0.5 leading-relaxed">{item.detail}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {item.action && !item.done ? (
                    <Button
                      size="sm"
                      variant="primary"
                      className="min-h-[44px] rounded-2xl px-4 text-xs font-bold"
                      onClick={() => void item.action?.()}
                    >
                      {item.cta}
                    </Button>
                  ) : (
                    <Link
                      href={item.href}
                      className={cn(
                        "inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-2xl px-4 text-xs font-bold transition",
                        item.done
                          ? "bg-paper text-ink hover:bg-card"
                          : "bg-brand text-white shadow-xs hover:bg-brand-ink",
                      )}
                    >
                      <span>{item.cta}</span>
                      <ArrowRight size={13} />
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Inline 1-Click Perk Publisher */}
          {mine && (
            <div className="neu-section p-5 sm:p-6 space-y-3">
              <div className="flex items-center gap-2 text-accent">
                <Sparkles size={16} />
                <span className="text-xs font-bold uppercase tracking-wider">Instant Member Offer</span>
              </div>
              <h3 className="font-display text-lg font-bold text-ink">
                Publish or update your neighbourhood perk right here
              </h3>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  value={quickDealTitle}
                  onChange={(e) => setQuickDealTitle(e.target.value)}
                  placeholder="e.g. Free pastry with any morning coffee"
                  aria-label="Instant member offer title"
                  className="neu-inset h-12 flex-1 px-4 text-[16px] sm:text-sm outline-none transition focus:ring-2 focus:ring-brand/20"
                />
                <Button
                  type="button"
                  className="min-h-[48px] px-5 font-bold"
                  disabled={savingDeal}
                  onClick={() => void handleQuickPublishDeal()}
                >
                  {savingDeal ? "Publishing…" : "Publish Perk Live"}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
