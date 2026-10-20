import { useState, type FormEvent } from "react";
import { Link, useSearch } from "wouter";
import { ArrowLeft, BadgeCheck, Handshake, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { AuthGate } from "@/components/auth/AuthGate";
import { useAuth } from "@/contexts/AuthContext";
import { BUSINESS_CATEGORIES } from "@shared/business";
import { normalizePartnerApplication, validatePartnerApplication } from "@shared/partner";
import { submitPartnerApplicationRemote } from "@/lib/pass-partners";

const INPUT_CLASS =
  "h-12 w-full rounded-2xl border border-line bg-paper px-4 text-[16px] sm:text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20";
const ERROR_CLASS = "mt-1 text-xs font-medium text-red-600 dark:text-red-400";
const LABEL_CLASS = "mb-1 block text-sm font-semibold text-ink";

type FieldErrors = Partial<
  Record<"businessName" | "category" | "contactName" | "contactEmail" | "website" | "pitch", string>
>;

function fieldErrorFor(problems: string[]): FieldErrors {
  const out: FieldErrors = {};
  for (const p of problems) {
    if (p.includes("Business name")) out.businessName = p;
    else if (p.includes("business category")) out.category = p;
    else if (p.includes("Contact name")) out.contactName = p;
    else if (p.includes("contact email")) out.contactEmail = p;
    else if (p.includes("Website")) out.website = p;
    else if (p.includes("10+ characters") || p.includes("Pitch")) out.pitch = p;
  }
  return out;
}

export function PassPartnerApplyPage() {
  const { user } = useAuth();
  const search = useSearch();
  const claimedBusiness = (new URLSearchParams(search).get("business") || "").trim().slice(0, 80);
  const [businessName, setBusinessName] = useState(claimedBusiness);
  const [category, setCategory] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [pitch, setPitch] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reference, setReference] = useState("");

  if (!user) {
    return (
      <AuthGate
        next="/pass/partners/apply"
        kicker="Pass partners"
        title="Partner with AirPal Pass"
        lede="Sign in to apply as a Pass partner. Member perks, event tie-ins, and door-ready discovery."
      />
    );
  }

  if (reference) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-6 md:py-10 pb-32">
        <EmptyState
          icon={<BadgeCheck size={32} className="text-emerald-600" aria-hidden />}
          kicker="Application received"
          title="Thanks — your application is in"
          body={`Your reference is ${reference}. Our team reviews every application and will reply by email. You can keep exploring partners and deals meanwhile.`}
          actionLabel="Browse partners"
          action={() => {
            window.location.assign("/pass/partners");
          }}
          secondaryLabel="Browse deals"
          secondary={() => {
            window.location.assign("/deals");
          }}
        />
      </div>
    );
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const raw = {
      businessName,
      category,
      contactName,
      contactEmail,
      website,
      pitch,
      listingId: "",
    };
    const problems = validatePartnerApplication(raw);
    if (problems.length > 0) {
      setErrors(fieldErrorFor(problems));
      setFormError(problems[0] || "Please fix the highlighted fields.");
      return;
    }
    setErrors({});
    setFormError("");
    setSubmitting(true);
    try {
      const clean = normalizePartnerApplication(raw);
      const res = await submitPartnerApplicationRemote({ ...clean });
      setReference(res.applicationId);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:py-10 pb-32">
      <div className="mb-6">
        <Link
          href="/pass/partners"
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-card px-3.5 text-xs font-semibold text-ink ring-1 ring-line hover:bg-paper transition whitespace-nowrap"
        >
          <ArrowLeft size={14} className="shrink-0" />
          <span>All partners</span>
        </Link>
      </div>

      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">AirPal Pass · Partners</p>
      <h1 className="font-display mt-1 flex items-center gap-2 text-2xl font-bold sm:text-3xl">
        <Handshake size={26} className="shrink-0 text-accent" aria-hidden />
        Become a partner
      </h1>
      <p className="mt-1 text-sm text-mute">
        Tell us about your business. Approved partners get a public directory profile and live offer slots on Pass.
      </p>
      {claimedBusiness ? (
        <p className="mt-3 rounded-2xl bg-brand/10 px-4 py-3 text-sm text-ink ring-1 ring-brand/25">
          You’re claiming <strong>{claimedBusiness}</strong> — finish the details below and we’ll be in touch.
        </p>
      ) : null}

      <form onSubmit={(e) => void onSubmit(e)} noValidate className="mt-6 space-y-4">
        <div>
          <label htmlFor="pp-business" className={LABEL_CLASS}>
            Business name
          </label>
          <input
            id="pp-business"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="e.g. Demo Coffee House"
            autoComplete="organization"
            className={INPUT_CLASS}
            aria-invalid={Boolean(errors.businessName)}
            aria-describedby={errors.businessName ? "pp-business-err" : undefined}
          />
          {errors.businessName ? (
            <p id="pp-business-err" role="alert" className={ERROR_CLASS}>
              {errors.businessName}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="pp-category" className={LABEL_CLASS}>
            Category
          </label>
          <select
            id="pp-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={`${INPUT_CLASS} min-h-[44px]`}
            aria-invalid={Boolean(errors.category)}
            aria-describedby={errors.category ? "pp-category-err" : undefined}
          >
            <option value="">Choose a category…</option>
            {BUSINESS_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label} — {c.line}
              </option>
            ))}
          </select>
          {errors.category ? (
            <p id="pp-category-err" role="alert" className={ERROR_CLASS}>
              {errors.category}
            </p>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="pp-contact" className={LABEL_CLASS}>
              Contact name
            </label>
            <input
              id="pp-contact"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="e.g. Alex Lee"
              autoComplete="name"
              className={INPUT_CLASS}
              aria-invalid={Boolean(errors.contactName)}
              aria-describedby={errors.contactName ? "pp-contact-err" : undefined}
            />
            {errors.contactName ? (
              <p id="pp-contact-err" role="alert" className={ERROR_CLASS}>
                {errors.contactName}
              </p>
            ) : null}
          </div>
          <div>
            <label htmlFor="pp-email" className={LABEL_CLASS}>
              Contact email
            </label>
            <input
              id="pp-email"
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="you@business.com"
              autoComplete="email"
              className={INPUT_CLASS}
              aria-invalid={Boolean(errors.contactEmail)}
              aria-describedby={errors.contactEmail ? "pp-email-err" : undefined}
            />
            {errors.contactEmail ? (
              <p id="pp-email-err" role="alert" className={ERROR_CLASS}>
                {errors.contactEmail}
              </p>
            ) : null}
          </div>
        </div>

        <div>
          <label htmlFor="pp-website" className={LABEL_CLASS}>
            Website <span className="font-normal text-mute">(optional)</span>
          </label>
          <input
            id="pp-website"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="yourbusiness.com"
            autoComplete="url"
            inputMode="url"
            className={INPUT_CLASS}
            aria-invalid={Boolean(errors.website)}
            aria-describedby={errors.website ? "pp-website-err" : undefined}
          />
          {errors.website ? (
            <p id="pp-website-err" role="alert" className={ERROR_CLASS}>
              {errors.website}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="pp-pitch" className={LABEL_CLASS}>
            Why should Pass members visit?
          </label>
          <textarea
            id="pp-pitch"
            value={pitch}
            onChange={(e) => setPitch(e.target.value)}
            placeholder="What makes your place special, and what perk could you offer members?"
            rows={4}
            className="min-h-[96px] w-full rounded-2xl border border-line bg-paper px-4 py-3 text-[16px] sm:text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
            aria-invalid={Boolean(errors.pitch)}
            aria-describedby={errors.pitch ? "pp-pitch-err" : undefined}
          />
          {errors.pitch ? (
            <p id="pp-pitch-err" role="alert" className={ERROR_CLASS}>
              {errors.pitch}
            </p>
          ) : null}
        </div>

        {formError ? (
          <p
            role="alert"
            className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm font-medium text-red-600 dark:text-red-400"
          >
            {formError}
          </p>
        ) : null}

        <Button type="submit" size="lg" loading={submitting} className="w-full min-h-[48px]">
          {submitting ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Send size={16} aria-hidden />}
          Submit application
        </Button>
        <p className="text-center text-xs text-mute">
          No real-brand claims needed — just tell us what you run. Reviews usually take a few days.
        </p>
      </form>
    </div>
  );
}
