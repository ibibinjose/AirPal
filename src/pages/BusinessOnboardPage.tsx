import { useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Calendar,
  Check,
  Clock,
  HelpCircle,
  LifeBuoy,
  MapPin,
  QrCode,
  Rocket,
  Settings2,
  ShieldCheck,
  Sparkles,
  Tag,
  UserCheck,
  Users,
} from "lucide-react";
import { BUSINESS_CATEGORIES, type BusinessCategoryId } from "@shared/business";
import type { GooglePlaceImport } from "@shared/google-place";
import { GooglePlaceImportCard } from "@/components/business/GooglePlaceImport";
import { AuthGate } from "@/components/auth/AuthGate";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { useListings } from "@/contexts/ListingsContext";
import { useBio } from "@/contexts/BioContext";
import { cn } from "@/lib/cn";

/**
 * Business onboarding / setup / helpdesk — full interactive 3-stage partner
 * studio connected directly to ListingsContext & BioContext so partners never
 * hit a circular loop or dead-end stub.
 */
export function BusinessOnboardPage({ step }: { step: "onboard" | "setup" | "helpdesk" }) {
  const [, nav] = useLocation();
  const { user } = useAuth();
  const { mine, createPlace, confirmHours, saveDeal } = useListings();
  const { business } = useBio();

  const [name, setName] = useState(mine?.name || "");
  const [category, setCategory] = useState<BusinessCategoryId>(mine?.category || "eat");
  const [address, setAddress] = useState(mine?.address || "");
  const [hours, setHours] = useState(mine?.hours || "Mon–Sun · 9am–9pm");
  const [shortWhy, setShortWhy] = useState(mine?.shortWhy || "");
  const [handle, setHandle] = useState(mine?.handle || business?.handle || "");
  const [saving, setSaving] = useState(false);

  const [quickDealTitle, setQuickDealTitle] = useState(
    mine?.deal?.detail || "2-for-1 welcome drink for AirPal members",
  );
  const [savingDeal, setSavingDeal] = useState(false);

  const copy = {
    onboard: {
      eyebrow: "Business · Step 1 of 3 · Onboard",
      title: "Put your venue on AirPal.",
      lede: "Import your Google Place in one tap or enter your details below — your venue goes live in your Business Hub immediately.",
      icon: Rocket,
    },
    setup: {
      eyebrow: "Business · Step 2 of 3 · Setup Checklist",
      title: "Finish your venue readiness.",
      lede: "Verify your hours, publish a member perk, and connect your public @handle and arrival tools.",
      icon: Settings2,
    },
    helpdesk: {
      eyebrow: "Business · Step 3 of 3 · Partner Helpdesk",
      title: "Partner operations & support.",
      lede: "Guides and direct links for venue claims, member perks, QR redemptions, door scanning, and arrival cohorts.",
      icon: LifeBuoy,
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
      await createPlace({
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
      await createPlace({
        name: trimmed,
        category,
        address: address.trim() || "Sydney NSW",
        hours: hours.trim() || "Mon–Sun · 9am–9pm",
        shortWhy: shortWhy.trim() || `Local ${category} partner on AirPal.`,
        handle: cleanHandle,
      });
      toast.success(`${trimmed} created! Let's finish your readiness checklist.`);
      nav("/business/setup");
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

  const checklist = [
    {
      id: "venue",
      title: "1. Venue profile & address",
      detail: mine ? `${mine.name} · ${mine.address}` : "Import from Google Maps or create your venue listing.",
      done: Boolean(mine?.name && mine?.address),
      href: mine ? "/business?tab=place" : "/business/onboard",
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
      href: "/business?tab=place",
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
      detail:
        business?.handle || mine?.handle
          ? `Live at /@${business?.handle || mine?.handle}`
          : "Claim your @handle so guests can follow your venue and share your card.",
      done: Boolean(business?.handle || mine?.handle),
      href: business?.handle || mine?.handle ? `/@${business?.handle || mine?.handle}` : "/bio/setup?kind=business",
      cta: business?.handle || mine?.handle ? "View Public Bio" : "Setup Business Bio",
    },
    {
      id: "events",
      title: "5. Events, Arrival Engine & Door Scanner",
      detail: "Host ticketed nights, scan passes at the door, or onboard a cohort.",
      done: Boolean(mine),
      href: "/event",
      cta: "Open Event Studio",
    },
  ];
  const completedCount = checklist.filter((c) => c.done).length;

  const stepIndex = step === "onboard" ? 0 : step === "setup" ? 1 : 2;
  return (
    <div className="page-wrap-narrow space-y-5 pt-4 sm:pt-6">
      {/* Flow header: back, title, and honest 3-step progress in one card */}
      <div className="surface-card p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/business"
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-paper px-3.5 text-sm font-semibold text-ink ring-1 ring-line transition hover:bg-card"
          >
            <ArrowLeft size={15} aria-hidden />
            <span>Business Hub</span>
          </Link>
          <Link
            href="/claim"
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-paper px-3.5 text-sm font-semibold text-ink ring-1 ring-line transition hover:bg-card"
          >
            <ShieldCheck size={15} className="text-accent" aria-hidden />
            <span>Claim venue</span>
          </Link>
          <Link
            href="/business/promotions"
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-paper px-3.5 text-sm font-semibold text-ink ring-1 ring-line transition hover:bg-card"
          >
            <Tag size={15} className="text-accent" aria-hidden />
            <span>Promotions</span>
          </Link>
        </div>

        <div className="mt-5 flex items-start gap-3.5">
          <span
            className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand/10 text-accent ring-1 ring-brand/20"
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
          <ol className="grid grid-cols-3 gap-1.5 rounded-2xl bg-paper p-1 ring-1 ring-line">
            {(
              [
                { id: "onboard", label: "Onboard", href: "/business/onboard" },
                { id: "setup", label: "Setup", href: "/business/setup" },
                { id: "helpdesk", label: "Helpdesk", href: "/business/helpdesk" },
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
                        active
                          ? "bg-white/25 text-white"
                          : done
                            ? "bg-brand/15 text-accent"
                            : "bg-card text-mute ring-1 ring-line",
                      )}
                      aria-hidden
                    >
                      {done ? <Check size={12} strokeWidth={3} /> : i + 1}
                    </span>
                    <span className="truncate">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ol>
          <div className="flow-progress mt-3" aria-hidden>
            <span style={{ width: `${((stepIndex + 1) / 3) * 100}%` }} />
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
                <div className="rounded-3xl bg-emerald-500/10 p-5 ring-1 ring-emerald-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                      <Check size={14} strokeWidth={3} /> Active Venue Connected
                    </span>
                    <h2 className="font-display text-lg font-bold text-ink">{mine.name}</h2>
                    <p className="text-xs text-mute">{mine.address}</p>
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
                      className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-2xl bg-card px-4 text-xs font-semibold text-ink ring-1 ring-line transition hover:bg-paper"
                    >
                      <span>Open Business Hub</span>
                    </Link>
                  </div>
                </div>
              )}

              {/* Option A: 1-Click Google Place Import */}
              <section className="rounded-3xl bg-card p-5 sm:p-6 ring-1 ring-line shadow-clay space-y-3">
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
              <form
                onSubmit={(e) => void handleManualCreate(e)}
                className="rounded-3xl bg-card p-5 sm:p-6 ring-1 ring-line shadow-clay space-y-4"
              >
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
                      className="h-12 w-full rounded-2xl border border-line bg-paper px-4 text-[16px] sm:text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
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
                      className="h-12 w-full rounded-2xl border border-line bg-paper px-4 text-[16px] sm:text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
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
                            on ? "bg-brand text-white shadow-xs" : "bg-paper text-mute ring-1 ring-line hover:text-ink",
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
                      className="h-12 w-full rounded-2xl border border-line bg-paper px-4 text-[16px] sm:text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
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
                      className="h-12 w-full rounded-2xl border border-line bg-paper px-4 text-[16px] sm:text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
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
                    className="h-12 w-full rounded-2xl border border-line bg-paper px-4 text-[16px] sm:text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                  />
                </div>

                <Button type="submit" size="lg" className="w-full min-h-[48px] gap-2" disabled={saving}>
                  <span>{saving ? "Creating Venue Workspace…" : "Launch Venue & Continue to Setup"}</span>
                  <ArrowRight size={16} />
                </Button>
              </form>

              {/* More Partner Pathways */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Link
                  href="/claim"
                  className="rounded-3xl bg-card p-4 ring-1 ring-line shadow-clay transition hover:border-brand/40 flex flex-col justify-between gap-2"
                >
                  <div className="flex items-center gap-2 text-accent">
                    <ShieldCheck size={16} />
                    <span className="text-xs font-bold uppercase tracking-wider">Official Verification</span>
                  </div>
                  <p className="text-sm font-bold text-ink">Claim an Existing Venue</p>
                  <p className="text-xs text-mute">Submit ownership proof for a verified partner badge.</p>
                </Link>
                <Link
                  href="/bio/setup?kind=business"
                  className="rounded-3xl bg-card p-4 ring-1 ring-line shadow-clay transition hover:border-brand/40 flex flex-col justify-between gap-2"
                >
                  <div className="flex items-center gap-2 text-accent">
                    <UserCheck size={16} />
                    <span className="text-xs font-bold uppercase tracking-wider">Public Identity</span>
                  </div>
                  <p className="text-sm font-bold text-ink">Business Bio Wizard</p>
                  <p className="text-xs text-mute">Design your shareable /@handle digital business card.</p>
                </Link>
                <Link
                  href="/event"
                  className="rounded-3xl bg-card p-4 ring-1 ring-line shadow-clay transition hover:border-brand/40 flex flex-col justify-between gap-2"
                >
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
          <div className="rounded-3xl bg-card p-5 ring-1 ring-line shadow-clay space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-accent">Partner Readiness</p>
                <h2 className="font-display text-lg font-bold text-ink mt-0.5">
                  {completedCount} of {checklist.length} steps complete
                </h2>
              </div>
              <Link
                href="/business"
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-brand px-4 text-xs font-bold text-white shadow-xs transition hover:bg-brand-ink"
              >
                <span>Open Business Hub</span>
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
              {Math.round((completedCount / checklist.length) * 100)}% ready — finish the open steps to go fully live.
            </p>
          </div>

          {/* Checklist Cards */}
          <div className="space-y-3">
            {checklist.map((item) => (
              <div
                key={item.id}
                className="rounded-3xl bg-card p-5 ring-1 ring-line shadow-clay flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <span
                    className={cn(
                      "grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-bold ring-1",
                      item.done
                        ? "bg-emerald-500/15 text-emerald-700 ring-emerald-500/30"
                        : "bg-paper text-mute ring-line",
                    )}
                  >
                    {item.done ? <Check size={16} strokeWidth={3} /> : <Clock size={15} />}
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
                          ? "bg-paper text-ink ring-1 ring-line hover:bg-card"
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
            <div className="rounded-3xl bg-card p-5 sm:p-6 ring-1 ring-line shadow-clay space-y-3">
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
                  className="h-12 flex-1 rounded-2xl border border-line bg-paper px-4 text-[16px] sm:text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
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

      {/* STEP 3: HELPDESK */}
      {step === "helpdesk" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              {
                icon: ShieldCheck,
                title: "Venue Claims & Verification",
                body: "Match your Google Maps listing and verify ownership to unlock the official Verified Partner badge.",
                href: "/claim",
                cta: "Open Venue Claim Flow",
              },
              {
                icon: Tag,
                title: "Member Perks & QR Redemptions",
                body: "Publish a deal to /deals. Guests present their dynamic AirPal Pass QR code at your counter.",
                href: "/business/promotions",
                cta: "Open Promotions Studio",
              },
              {
                icon: QrCode,
                title: "Door Scanner & Event Ticketing",
                body: "Sell Stripe-backed tickets or issue free passes, then scan attendees in at the door.",
                href: "/scan",
                cta: "Open Door Scanner",
              },
              {
                icon: Users,
                title: "B2B2C Arrival & Cohort Engine",
                body: "Onboard university, corporate, or residential cohorts with curated welcome passes.",
                href: "/join",
                cta: "Open Arrival Engine",
              },
              {
                icon: Building2,
                title: "Belonging & Cohort Pulse Reports",
                body: "Track cohort activation, venue check-ins, and aggregate belonging metrics.",
                href: "/host/pulse",
                cta: "View Belonging Reports",
              },
              {
                icon: HelpCircle,
                title: "Help Centre & Human Support",
                body: "Browse partner FAQs or message our team directly with your venue name and @handle.",
                href: "/help",
                cta: "Visit Help Centre",
              },
            ].map((card) => (
              <div
                key={card.title}
                className="rounded-3xl bg-card p-5 ring-1 ring-line shadow-clay flex flex-col justify-between gap-4"
              >
                <div className="space-y-2">
                  <span className="grid h-10 w-10 place-items-center rounded-2xl bg-brand/10 text-accent ring-1 ring-brand/20">
                    <card.icon size={18} />
                  </span>
                  <h3 className="font-display text-base font-bold text-ink">{card.title}</h3>
                  <p className="text-xs text-mute leading-relaxed">{card.body}</p>
                </div>
                <Link
                  href={card.href}
                  className="inline-flex min-h-[44px] items-center justify-between rounded-2xl bg-paper px-4 text-xs font-bold text-ink ring-1 ring-line transition hover:bg-brand hover:text-white hover:ring-brand"
                >
                  <span>{card.cta}</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            ))}
          </div>

          <div className="rounded-3xl bg-card p-5 ring-1 ring-line shadow-clay flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-base font-bold text-ink">Need direct human assistance?</h3>
              <p className="text-xs text-mute mt-0.5">
                Reach our partner support desk and mention your venue name or @handle for priority routing.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/contact"
                className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-full bg-brand px-5 text-xs font-bold text-white shadow-xs transition hover:bg-brand-ink"
              >
                <span>Contact Partner Support</span>
                <ArrowRight size={14} />
              </Link>
              <Link
                href="/business"
                className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-full bg-paper px-4 text-xs font-semibold text-ink ring-1 ring-line transition hover:bg-card"
              >
                <MapPin size={13} className="text-accent" />
                <span>Back to Business Hub</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
