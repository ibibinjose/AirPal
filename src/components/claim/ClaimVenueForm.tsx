import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Building2, Check, ChevronDown, Copy, ShieldCheck } from "lucide-react";
import type { GooglePlaceImport } from "@shared/google-place";
import { parseV3ContactEmail, requiredV3Text } from "@shared/v3-contract";
import { AuthGate } from "@/components/auth/AuthGate";
import { GooglePlaceImportCard } from "@/components/business/GooglePlaceImport";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ValidField, fieldInput, fieldSelect, fieldTextarea } from "@/components/forms/ValidField";
import { useAuth } from "@/contexts/AuthContext";
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

function fieldError(field: keyof FieldErrors, run: () => unknown): string | null {
  try {
    run();
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : "This field is invalid.";
  }
}

/**
 * Venue claim flow: find the Google listing, confirm details, request
 * ownership. Mutations go through V3 callables only — this component never
 * writes to Firestore. Rendered only behind the local-only V3 gate.
 */
export function ClaimVenueForm({
  onDone,
  onStep,
}: {
  onDone?: (placeId: string) => void;
  onStep?: (step: number) => void;
}) {
  const { user } = useAuth();
  const [place, setPlace] = useState<GooglePlaceImport | null>(null);
  const [verified, setVerified] = useState<boolean | null>(null);
  const [details, setDetails] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [city, setCity] = useState("");
  const [category, setCategory] = useState("eat");
  const [address, setAddress] = useState("");
  const [proofNote, setProofNote] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ placeId: string; created: boolean } | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isV3AdaptersEnabled()) {
    return (
      <EmptyState
        kicker="Local Preview"
        title="Venue Claims"
        body="Claims run against the local emulator in this build. Set VITE_V3_ADAPTERS=true with VITE_USE_FIREBASE_EMULATOR=true to preview the flow."
      />
    );
  }

  if (!user) {
    return (
      <AuthGate
        next="/claim"
        kicker="Venue Claims"
        title="Claim Your Venue"
        lede="Sign in with an email account to claim your bar, restaurant, café, or stay — then manage it as the verified owner."
      />
    );
  }

  async function handleImport(found: GooglePlaceImport) {
    setPlace(found);
    setBusinessName(found.name || "");
    setAddress(found.address || "");
    setCity(found.city || "");
    setCategory(found.category || "eat");
    setBanner(null);
    setDetails(true);
    onStep?.(1);
    setVerified(null);
    try {
      const lookup = await v3LookupGooglePlace({ placeId: found.placeId });
      setVerified(lookup.provider === "google" ? lookup.verified : null);
    } catch {
      setVerified(null);
    }
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
    const emailError = fieldError("contactEmail", () => parseV3ContactEmail(contactEmail));
    if (emailError) next.contactEmail = `${emailError} Use name@venue.com.au so reviewers can reach you.`;
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
      const res = await v3RequestPlaceClaim({
        googlePlaceId: place.placeId,
        businessName: businessName.trim(),
        city: city.trim(),
        category,
        address: address.trim() || undefined,
        proofNote: proofNote.trim(),
        contactEmail: contactEmail.trim() || undefined,
      });
      setResult({ placeId: res.placeId, created: res.created });
      onDone?.(res.placeId);
      toast.success(res.created ? "Claim requested." : "Claim already pending.");
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
    setContactEmail("");
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
      <section className="rounded-3xl bg-card p-6 ring-1 ring-line shadow-clay sm:p-8" aria-live="polite">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-leaf/15 text-leaf">
          <Check size={22} strokeWidth={3} aria-hidden />
        </div>
        <h2 className="font-display mt-4 text-balance text-2xl font-bold">Claim Requested</h2>
        <p className="mt-2 max-w-md text-pretty text-[15px] leading-relaxed text-mute">
          {result.created
            ? `Reviewers will verify ${place.name} against its public listing. Approval mints your draft venue page.`
            : `${place.name} already has a pending claim on your account. Reviewers will be in touch.`}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl bg-paper px-4 py-3 ring-1 ring-line">
          <span className="min-w-0 flex-1 break-all font-mono text-[13px]">{result.placeId}</span>
          <Button size="sm" variant="ghost" onClick={copyReference} aria-label="Copy claim reference">
            {copied ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
        <div className="mt-5">
          <Button variant="ghost" onClick={reset}>
            Claim Another Venue
          </Button>
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-3xl bg-card p-5 ring-1 ring-line shadow-clay sm:p-6">
        <h2 className="font-display text-lg font-bold">Find Your Venue</h2>
        <p className="mt-1 text-sm leading-relaxed text-mute">
          Search the Google listing first — AirPal verifies against it and never copies listings in bulk.
        </p>
        <GooglePlaceImportCard variant="card" onImport={(found) => void handleImport(found)} />
      </section>

      {details && place ? (
        <section className="rounded-3xl bg-card p-5 ring-1 ring-line shadow-clay sm:p-6" aria-live="polite">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand/10 text-accent">
              <Building2 size={20} aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-display truncate text-lg font-bold">{place.name}</h2>
              <p className="truncate text-sm text-mute">{place.address || "Address from Google listing"}</p>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px]">
                <span className="font-semibold text-ink">{claimCategoryLabel(place.category)}</span>
                <span className="text-mute" aria-hidden>
                  ·
                </span>
                {verified === null ? (
                  <span className="text-mute">Unverified in local preview</span>
                ) : verified ? (
                  <span className="inline-flex items-center gap-1 font-semibold text-leaf">
                    <ShieldCheck size={14} aria-hidden /> Verified live
                  </span>
                ) : (
                  <span className="font-semibold text-ember">Not found on Google</span>
                )}
              </p>
            </div>
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
                placeholder="1 Quay Street"
                autoComplete="street-address"
                maxLength={200}
              />
            </ValidField>
            <ValidField
              label="Proof of association"
              hint="Liquor licence, lease, ABN papers, or a photo of you behind the bar — what should reviewers check?"
              error={errors.proofNote}
            >
              <textarea
                id="claim-proofNote"
                className={cn(fieldTextarea, errors.proofNote && "border-ember focus:border-ember focus:ring-ember/20")}
                value={proofNote}
                onChange={(event) => setProofNote(event.target.value)}
                placeholder="I manage this venue…"
                rows={4}
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
            <Button type="submit" size="lg" className="w-full" loading={submitting}>
              {submitting ? "Requesting…" : "Request Claim"}
            </Button>
          </form>
        </section>
      ) : null}
    </div>
  );
}
