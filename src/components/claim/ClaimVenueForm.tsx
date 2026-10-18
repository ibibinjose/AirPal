import { useState, type FormEvent } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import { ArrowRight, Building2, Check, ChevronDown, Copy, Edit3, ShieldCheck, Sparkles, Tag } from "lucide-react";
import type { GooglePlaceImport } from "@shared/google-place";
import type { BusinessCategoryId } from "@shared/business";
import { parseV3ContactEmail, requiredV3Text } from "@shared/v3-contract";
import { AuthGate } from "@/components/auth/AuthGate";
import { GooglePlaceImportCard } from "@/components/business/GooglePlaceImport";
import { Button } from "@/components/ui/Button";
import { ValidField, fieldInput, fieldSelect, fieldTextarea } from "@/components/forms/ValidField";
import { useAuth } from "@/contexts/AuthContext";
import { useListings } from "@/contexts/ListingsContext";
import { cn } from "@/lib/cn";
import { isV3AdaptersEnabled } from "@/lib/v3/gate";
import { v3LookupGooglePlace, v3RequestPlaceClaim } from "@/lib/v3/client";
import { claimCategoryLabel, hospitalityClaimCategories, otherClaimCategories } from "@/lib/v3/claim-categories";

type FieldErrors = Partial<
  Record<"businessName" | "city" | "category" | "address" | "proofNote" | "contactEmail", string>
>;

const FIELD_ORDER: Array<keyof FieldErrors> = [
  "businessName",
  "city",
  "category",
  "address",
  "proofNote",
  "contactEmail",
];

function fieldError(_field: keyof FieldErrors, run: () => unknown): string | null {
  try {
    run();
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : "This field is invalid.";
  }
}

/**
 * Venue claim flow: find the Google listing (or enter manually), confirm details,
 * and request ownership. When V3 adapters are enabled, mutations go through V3
 * callables; otherwise it provisions the partner venue directly via ListingsContext.
 */
export function ClaimVenueForm({
  onDone,
  onStep,
}: {
  onDone?: (placeId: string) => void;
  onStep?: (step: number) => void;
}) {
  const { user } = useAuth();
  const { createPlace } = useListings();
  const [place, setPlace] = useState<GooglePlaceImport | null>(null);
  const [verified, setVerified] = useState<boolean | null>(null);
  const [details, setDetails] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [city, setCity] = useState("Sydney");
  const [category, setCategory] = useState("eat");
  const [address, setAddress] = useState("");
  const [proofNote, setProofNote] = useState("");
  const [contactEmail, setContactEmail] = useState(user?.email || "");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ placeId: string; created: boolean } | null>(null);
  const [copied, setCopied] = useState(false);

  if (!user) {
    return (
      <AuthGate
        next="/claim"
        kicker="Venue Claims"
        title="Claim Your Venue"
        lede="Sign in with an email account to claim your bar, restaurant, or café — then manage it as the verified owner."
      />
    );
  }

  async function handleImport(found: GooglePlaceImport) {
    setPlace(found);
    setBusinessName(found.name || "");
    setAddress(found.address || "");
    setCity(found.city || "Sydney");
    setCategory(found.category || "eat");
    if (!contactEmail && user?.email) setContactEmail(user.email);
    setBanner(null);
    setDetails(true);
    onStep?.(1);
    setVerified(null);
    if (isV3AdaptersEnabled()) {
      try {
        const lookup = await v3LookupGooglePlace({ placeId: found.placeId });
        setVerified(lookup.provider === "google" ? lookup.verified : null);
      } catch {
        setVerified(null);
      }
    } else {
      setVerified(Boolean(found.placeId));
    }
  }

  function startManualEntry() {
    const syntheticId = `manual-${Date.now().toString(36)}`;
    setPlace({
      placeId: syntheticId,
      name: businessName || "Your Venue",
      address: address || "",
      city: city || "Sydney",
      category: (category as BusinessCategoryId) || "eat",
      hours: "Mon–Sun · 9am–9pm",
      shortWhy: "Local partner venue on AirPal.",
      geo: { lat: -33.8688, lng: 151.2093 },
      phone: "",
      website: "",
      googleMapsUri: "",
      photoNames: [],
      menuUrl: "",
      socials: [],
    });
    if (!contactEmail && user?.email) setContactEmail(user.email);
    setBanner(null);
    setDetails(true);
    setVerified(null);
    onStep?.(1);
  }

  function validate(): FieldErrors {
    const next: FieldErrors = {};
    const businessNameError = fieldError("businessName", () => requiredV3Text(businessName, "Business name", 140));
    if (businessNameError) next.businessName = businessNameError;
    const cityError = fieldError("city", () => requiredV3Text(city, "City", 80));
    if (cityError) next.city = cityError;
    if (!category) next.category = "Choose a category.";
    const proofError = fieldError("proofNote", () => requiredV3Text(proofNote, "Proof of association", 2000));
    if (proofError) next.proofNote = `${proofError} Tell us how you are linked to this venue.`;
    if (contactEmail.trim()) {
      const emailError = fieldError("contactEmail", () => parseV3ContactEmail(contactEmail));
      if (emailError) next.contactEmail = `${emailError} Use name@venue.com.au so reviewers can reach you.`;
    }
    return next;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!place || submitting) return;
    const next = validate();
    setErrors(next);
    const firstBad = FIELD_ORDER.find((field) => next[field]);
    if (firstBad) {
      document.getElementById(`claim-${firstBad}`)?.focus();
      return;
    }
    setSubmitting(true);
    setBanner(null);
    try {
      let claimedPlaceId = place.placeId;
      let wasCreated = true;

      if (isV3AdaptersEnabled()) {
        const res = await v3RequestPlaceClaim({
          googlePlaceId: place.placeId,
          businessName: businessName.trim(),
          city: city.trim(),
          category,
          address: address.trim() || undefined,
          proofNote: proofNote.trim(),
          contactEmail: contactEmail.trim() || undefined,
        });
        claimedPlaceId = res.placeId;
        wasCreated = res.created;
      }

      const createdListing = await createPlace({
        name: businessName.trim(),
        category: (category as BusinessCategoryId) || "eat",
        address: address.trim() || city.trim() || "Sydney",
        hours: place.hours || "Mon–Sun · 9am–9pm",
        shortWhy: place.shortWhy || `Official AirPal partner venue in ${city.trim() || "Sydney"}.`,
        phone: place.phone,
        website: place.website,
        heroImage: place.photoNames[0],
        mapsPlaceId: place.placeId.startsWith("manual-") ? undefined : place.placeId,
        geo: place.geo,
      });

      if (!isV3AdaptersEnabled()) {
        claimedPlaceId = createdListing.id;
      }

      setResult({ placeId: claimedPlaceId, created: wasCreated });
      onDone?.(claimedPlaceId);
      toast.success(wasCreated ? "Venue claimed & added to your Business Hub!" : "Claim already pending.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not request this claim.";
      setBanner(`${message} Check the details and try again.`);
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setPlace(null);
    setDetails(false);
    onStep?.(0);
    setResult(null);
    setErrors({});
    setBanner(null);
    setProofNote("");
    setVerified(null);
  }

  async function copyReference() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.placeId);
      setCopied(true);
      toast.success("Reference copied.");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy. Long-press the reference instead.");
    }
  }

  if (result && place) {
    return (
      <section className="surface-card p-5 sm:p-7 space-y-5" aria-live="polite">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-leaf/15 text-leaf">
          <Check size={22} strokeWidth={3} aria-hidden />
        </div>
        <div>
          <h2 className="font-display text-balance text-2xl font-bold text-ink">
            {businessName.trim() || place.name} is Ready
          </h2>
          <p className="mt-2 max-w-md text-pretty text-[15px] leading-relaxed text-mute">
            {result.created
              ? `Your venue workspace is live in your Business Hub. You can now publish a member perk, confirm trading hours, or launch an event.`
              : `${place.name} already has a pending claim on your account. Reviewers will be in touch.`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-paper px-4 py-3 ring-1 ring-line">
          <span className="text-xs font-semibold uppercase tracking-wider text-mute">Ref:</span>
          <span className="min-w-0 flex-1 break-all font-mono text-[13px] text-ink">{result.placeId}</span>
          <Button size="sm" variant="ghost" onClick={copyReference} aria-label="Copy claim reference">
            {copied ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
          <Link
            href="/business"
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-brand px-4 text-sm font-bold text-white shadow-sm transition hover:bg-brand-ink active:scale-[0.99]"
          >
            <Building2 size={16} />
            <span>Open Business Hub</span>
            <ArrowRight size={15} />
          </Link>
          <Link
            href="/business?tab=offer"
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-paper px-4 text-sm font-semibold text-ink ring-1 ring-line transition hover:bg-card"
          >
            <Tag size={16} className="text-accent" />
            <span>Publish Member Perk</span>
          </Link>
          <Link
            href="/business/setup"
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-paper px-4 text-sm font-semibold text-ink ring-1 ring-line transition hover:bg-card"
          >
            <Sparkles size={16} className="text-accent" />
            <span>Readiness Checklist</span>
          </Link>
          <Button variant="ghost" className="min-h-[48px] rounded-2xl border border-line" onClick={reset}>
            Claim Another Venue
          </Button>
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      <section className="surface-card p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold text-ink">1. Find Your Venue on Google</h2>
            <p className="mt-1 text-sm leading-relaxed text-mute">
              Search your Google Maps listing first — AirPal imports your address, hours, and map coordinates in one
              tap.
            </p>
          </div>
          {!details && (
            <button
              type="button"
              onClick={startManualEntry}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-paper px-3.5 text-xs font-semibold text-ink ring-1 ring-line transition hover:bg-card"
            >
              <Edit3 size={13} className="text-accent" />
              <span>Enter Details Manually</span>
            </button>
          )}
        </div>

        <GooglePlaceImportCard variant="card" onImport={(found) => void handleImport(found)} />
      </section>

      {details && place ? (
        <section className="surface-card p-5 sm:p-6" aria-live="polite">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand/10 text-accent">
                <Building2 size={20} aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-display truncate text-lg font-bold text-ink">
                  {businessName || place.name || "Confirm Venue Details"}
                </h2>
                <p className="truncate text-sm text-mute">{address || place.address || "Enter street address below"}</p>
                <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px]">
                  <span className="font-semibold text-ink">{claimCategoryLabel(category || place.category)}</span>
                  <span className="text-mute" aria-hidden>
                    ·
                  </span>
                  {verified ? (
                    <span className="inline-flex items-center gap-1 font-semibold text-leaf">
                      <ShieldCheck size={14} aria-hidden /> Google Place Linked
                    </span>
                  ) : (
                    <span className="text-mute">Direct partner verification</span>
                  )}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={reset}
              className="inline-flex min-h-[44px] shrink-0 items-center rounded-full bg-paper px-3.5 text-sm font-semibold text-mute ring-1 ring-line hover:text-ink"
            >
              Change
            </button>
          </div>

          <form onSubmit={(event) => void handleSubmit(event)} className="mt-5 space-y-4" noValidate>
            {banner ? (
              <p role="alert" className="rounded-2xl bg-ember/10 px-4 py-3 text-sm font-medium text-ember">
                {banner}
              </p>
            ) : null}
            <ValidField
              label="Business name"
              error={errors.businessName}
              ok={!errors.businessName && businessName.trim().length > 1}
            >
              <input
                id="claim-businessName"
                className={cn(fieldInput, errors.businessName && "border-ember focus:border-ember focus:ring-ember/20")}
                value={businessName}
                onChange={(event) => setBusinessName(event.target.value)}
                placeholder="Quay Bar"
                autoComplete="organization"
                maxLength={140}
              />
            </ValidField>
            <div className="grid gap-4 sm:grid-cols-2">
              <ValidField label="City" error={errors.city} ok={!errors.city && city.trim().length > 1}>
                <input
                  id="claim-city"
                  className={cn(fieldInput, errors.city && "border-ember focus:border-ember focus:ring-ember/20")}
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                  placeholder="Sydney"
                  autoComplete="address-level2"
                  maxLength={80}
                />
              </ValidField>
              <ValidField label="Category" error={errors.category}>
                <span className="relative block">
                  <select
                    id="claim-category"
                    className={cn(fieldSelect, "appearance-none pr-10")}
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                  >
                    <optgroup label="Food, drink & stay">
                      {hospitalityClaimCategories().map((row) => (
                        <option key={row.id} value={row.id}>
                          {row.label} — {row.line}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Everything else">
                      {otherClaimCategories().map((row) => (
                        <option key={row.id} value={row.id}>
                          {row.label} — {row.line}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                  <ChevronDown
                    size={18}
                    aria-hidden
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-mute"
                  />
                </span>
              </ValidField>
            </div>
            <ValidField label="Street address" hint="From the Google listing — fix it if the listing is stale.">
              <input
                id="claim-address"
                className={fieldInput}
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                placeholder="1 Quay Street, Sydney NSW 2000"
                autoComplete="street-address"
                maxLength={200}
              />
            </ValidField>
            <ValidField
              label="Proof of association"
              hint="Liquor licence, lease, ABN papers, role at the venue, or official website/Instagram link."
              error={errors.proofNote}
            >
              <textarea
                id="claim-proofNote"
                className={cn(fieldTextarea, errors.proofNote && "border-ember focus:border-ember focus:ring-ember/20")}
                value={proofNote}
                onChange={(event) => setProofNote(event.target.value)}
                placeholder="I am the owner / general manager of this venue…"
                rows={3}
                maxLength={2000}
              />
            </ValidField>
            <ValidField label="Contact email (optional)" error={errors.contactEmail}>
              <input
                id="claim-contactEmail"
                className={cn(fieldInput, errors.contactEmail && "border-ember focus:border-ember focus:ring-ember/20")}
                value={contactEmail}
                onChange={(event) => setContactEmail(event.target.value)}
                placeholder="owner@venue.com.au"
                autoComplete="email"
                inputMode="email"
                maxLength={254}
              />
            </ValidField>
            <Button type="submit" size="lg" className="w-full min-h-[48px]" loading={submitting}>
              {submitting ? "Claiming & Setting Up Workspace…" : "Claim Venue & Open Workspace"}
            </Button>
          </form>
        </section>
      ) : null}
    </div>
  );
}
