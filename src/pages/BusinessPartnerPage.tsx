import { useEffect, useState, type FormEvent } from "react";
import { Link } from "wouter";
import { ArrowLeft, BadgeCheck, Handshake, Loader2, Send, Store, Ticket } from "lucide-react";
import { BUSINESS_CATEGORIES } from "@shared/business";
import { isPartnerCategory, isPartnerWebsite, type Partner, type PartnerApplication } from "@shared/partner";
import type { Promotion } from "@shared/promotions";
import { targetHref } from "@shared/promotions";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageLoading } from "@/components/ui/PageLoading";
import { AuthGate } from "@/components/auth/AuthGate";
import { useAuth } from "@/contexts/AuthContext";
import {
  applicationStepFor,
  applicationStepLabel,
  fetchLivePartnerOffers,
  fetchMyPartnerApplications,
  fetchMyPartners,
  updateMyPartnerProfile,
  withdrawPartnerApplication,
} from "@/lib/partner-dashboard";
import { partnerCategoryLabel } from "@/lib/pass-partners";

const INPUT_CLASS =
  "h-12 w-full rounded-2xl border border-line bg-paper px-4 text-[16px] sm:text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20";
const TEXTAREA_CLASS =
  "w-full rounded-2xl border border-line bg-paper px-4 py-3 text-[16px] sm:text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20";
const LABEL_CLASS = "mb-1 block text-sm font-semibold text-ink";

export function BusinessPartnerEmpty() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:py-10 pb-32">
      <EmptyState
        icon={<Handshake size={32} className="text-accent" aria-hidden />}
        kicker="Pass partner dashboard"
        title="You are not a Pass partner yet"
        body="Apply once and track the review here. Approved partners edit their profile and link member offers from this dashboard."
        actionLabel="Apply to partner"
        action={() => {
          window.location.assign("/pass/partners/apply");
        }}
        secondaryLabel="Browse partners"
        secondary={() => {
          window.location.assign("/pass/partners");
        }}
      />
    </div>
  );
}

export function PartnerApplicationTracker({ applications }: { applications: PartnerApplication[] }) {
  if (applications.length === 0) return null;
  return (
    <section aria-label="Application status" className="rounded-3xl bg-card p-5 ring-1 ring-line sm:p-6">
      <h2 className="text-base font-bold">Application status</h2>
      <ul className="mt-3 space-y-3">
        {applications.map((app) => {
          const step = applicationStepFor(app.status, app.adminNote);
          const label = applicationStepLabel(app.status, app.adminNote);
          const tone =
            step === "approved"
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 ring-emerald-500/20"
              : step === "rejected"
                ? "bg-red-500/10 text-red-600 dark:text-red-400 ring-red-500/20"
                : step === "needs_info"
                  ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 ring-amber-500/20"
                  : "bg-brand/10 text-accent ring-brand/20";
          return (
            <li key={app.id} className="rounded-2xl bg-paper px-4 py-3 ring-1 ring-line/60">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="min-w-0">
                  <span className="font-semibold text-ink">{app.businessName}</span>{" "}
                  <span className="text-xs text-mute">
                    · applied {app.createdAt ? new Date(app.createdAt).toLocaleDateString() : "recently"}
                    {app.updatedAt ? ` · updated ${new Date(app.updatedAt).toLocaleDateString()}` : ""}
                  </span>
                </span>
                <span
                  role="status"
                  className={`inline-flex min-h-[28px] items-center rounded-full px-2.5 text-[11px] font-bold uppercase tracking-wider ring-1 ${tone}`}
                >
                  {label}
                </span>
              </div>
              {app.adminNote ? (
                <p className="mt-2 text-sm leading-relaxed text-ink">
                  <span className="font-semibold">Reviewer note: </span>
                  {app.adminNote}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function PartnerOfferList({ offers, partnerName }: { offers: Promotion[]; partnerName: string }) {
  return (
    <section aria-label="Partner offers" className="rounded-3xl bg-card p-5 ring-1 ring-line sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-base font-bold">
          <Ticket size={18} className="text-accent" aria-hidden />
          Member offers
        </h2>
        <Link
          href="/business/promotions"
          className="inline-flex min-h-[44px] items-center text-sm font-semibold text-accent hover:underline"
        >
          Manage in promotions
        </Link>
      </div>
      <p className="mt-1 text-sm text-mute">
        Offers stay Promotions — this list only surfaces the live ones sponsored by {partnerName}.
      </p>
      {offers.length === 0 ? (
        <p className="mt-3 text-sm text-mute">
          No live offers right now. Publish one from{" "}
          <Link href="/business/promotions/new" className="font-semibold text-accent hover:underline">
            new promotion
          </Link>{" "}
          and it appears here automatically.
        </p>
      ) : (
        <ul className="mt-3 space-y-3">
          {offers.map((offer) => {
            const target = targetHref(offer.targetType, offer.targetId);
            return (
              <li key={offer.id} className="rounded-2xl bg-paper p-4 ring-1 ring-line">
                <p className="text-[15px] font-semibold">{offer.title}</p>
                {offer.prizeValue ? (
                  <p className="mt-0.5 text-sm font-semibold text-accent">{offer.prizeValue}</p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href={`/deals/${offer.id}`}
                    className="inline-flex min-h-[44px] items-center rounded-full bg-brand px-4 text-xs font-bold text-white hover:bg-brand/90 transition"
                  >
                    View live deal
                  </Link>
                  <Link
                    href="/business/promotions"
                    className="inline-flex min-h-[44px] items-center rounded-full bg-card px-4 text-xs font-semibold text-ink ring-1 ring-line hover:bg-paper transition"
                  >
                    Manage offer
                  </Link>
                  {offer.targetType === "event" && target ? (
                    <Link
                      href={target}
                      className="inline-flex min-h-[44px] items-center rounded-full bg-card px-4 text-xs font-semibold text-ink ring-1 ring-line hover:bg-paper transition"
                    >
                      View event
                    </Link>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function PartnerProfileEditor({ partner }: { partner: Partner }) {
  const [name, setName] = useState(partner.name);
  const [category, setCategory] = useState<string>(partner.category);
  const [tagline, setTagline] = useState(partner.tagline);
  const [description, setDescription] = useState(partner.description);
  const [website, setWebsite] = useState(partner.website || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function onSave(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSaved(false);
    if (!name.trim()) {
      setError("Partner name is required.");
      return;
    }
    if (!isPartnerCategory(category.trim())) {
      setError("Choose a valid business category.");
      return;
    }
    if (!isPartnerWebsite(website)) {
      setError("Website looks invalid.");
      return;
    }
    setSaving(true);
    try {
      await updateMyPartnerProfile(partner.id, { name, category, tagline, description, website });
      setSaved(true);
    } catch {
      setError("Could not save your profile. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section aria-label="Partner profile" className="rounded-3xl bg-card p-5 ring-1 ring-line sm:p-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
        Pass partner · {partnerCategoryLabel(partner.category)}
      </p>
      <h2 className="font-display mt-0.5 text-xl font-bold">Public profile</h2>
      <p className="mt-1 text-sm text-mute">
        Live at{" "}
        <Link href={`/pass/partners/${partner.slug}`} className="font-semibold text-accent hover:underline">
          /pass/partners/{partner.slug}
        </Link>
      </p>
      <form onSubmit={onSave} className="mt-4 space-y-4">
        <div>
          <label htmlFor="partner-name" className={LABEL_CLASS}>
            Partner name
          </label>
          <input
            id="partner-name"
            className={INPUT_CLASS}
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
            autoComplete="organization"
          />
        </div>
        <div>
          <label htmlFor="partner-category" className={LABEL_CLASS}>
            Category
          </label>
          <select
            id="partner-category"
            className={INPUT_CLASS}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {BUSINESS_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="partner-tagline" className={LABEL_CLASS}>
            Tagline
          </label>
          <input
            id="partner-tagline"
            className={INPUT_CLASS}
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            maxLength={140}
          />
        </div>
        <div>
          <label htmlFor="partner-description" className={LABEL_CLASS}>
            About
          </label>
          <textarea
            id="partner-description"
            className={TEXTAREA_CLASS}
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={2000}
          />
        </div>
        <div>
          <label htmlFor="partner-website" className={LABEL_CLASS}>
            Website
          </label>
          <input
            id="partner-website"
            className={INPUT_CLASS}
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            inputMode="url"
            autoComplete="url"
          />
        </div>
        {error ? (
          <p role="alert" className="text-sm font-medium text-red-600 dark:text-red-400">
            {error}
          </p>
        ) : null}
        {saved ? (
          <p
            role="status"
            className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400"
          >
            <BadgeCheck size={16} aria-hidden /> Profile saved.
          </p>
        ) : null}
        <Button type="submit" disabled={saving} className="min-h-[44px] w-full sm:w-auto">
          {saving ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Send size={16} aria-hidden />}
          {saving ? "Saving…" : "Save profile"}
        </Button>
      </form>
    </section>
  );
}

export function BusinessPartnerPage() {
  const { user, authReady } = useAuth();
  const [applications, setApplications] = useState<PartnerApplication[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [offers, setOffers] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [withdrawing, setWithdrawing] = useState(false);

  useEffect(() => {
    if (!authReady || !user) {
      setLoading(false);
      return;
    }
    let live = true;
    (async () => {
      try {
        const [apps, mine] = await Promise.all([fetchMyPartnerApplications(user.uid), fetchMyPartners(user.uid)]);
        if (!live) return;
        setApplications(apps);
        setPartners(mine);
        if (mine[0]) {
          const liveOffers = await fetchLivePartnerOffers(mine[0].name);
          if (live) setOffers(liveOffers);
        }
      } catch {
        if (live) {
          setApplications([]);
          setPartners([]);
        }
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => {
      live = false;
    };
  }, [authReady, user]);

  if (!authReady || loading) return <PageLoading />;
  if (!user) {
    return (
      <AuthGate
        next="/business/partner"
        kicker="Pass Partner Dashboard"
        title="Partner dashboard"
        lede="Sign in to track your Pass partner application, edit your public profile, and link member offers."
      />
    );
  }

  const partner = partners[0];
  const pending = applications.find((a) => a.status === "submitted" || a.status === "under_review");

  async function onWithdraw() {
    if (!pending) return;
    setWithdrawing(true);
    try {
      await withdrawPartnerApplication(pending.id);
      setApplications((list) => list.map((a) => (a.id === pending.id ? { ...a, status: "withdrawn" as const } : a)));
    } finally {
      setWithdrawing(false);
    }
  }

  if (!partner && applications.length === 0) return <BusinessPartnerEmpty />;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:py-10 pb-32">
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Link
          href="/business"
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-card px-3.5 text-xs font-semibold text-ink ring-1 ring-line hover:bg-paper transition whitespace-nowrap"
        >
          <ArrowLeft size={14} className="shrink-0" />
          <span>Business hub</span>
        </Link>
        <Link
          href="/pass/partners"
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-card px-3.5 text-xs font-semibold text-ink ring-1 ring-line hover:bg-paper transition whitespace-nowrap"
        >
          <Store size={14} className="shrink-0 text-accent" />
          <span>Partner directory</span>
        </Link>
      </div>

      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">Pass partner dashboard</p>
      <h1 className="font-display mt-0.5 text-2xl font-bold sm:text-3xl">
        {partner ? `${partner.name} on Pass` : "Your partner application"}
      </h1>

      <div className="mt-6 space-y-4">
        <PartnerApplicationTracker applications={applications} />
        {pending ? (
          <div className="rounded-3xl bg-card p-5 ring-1 ring-line sm:p-6">
            <p className="text-sm text-mute">Applied as {pending.businessName}. Change your mind?</p>
            <Button variant="ghost" size="sm" disabled={withdrawing} onClick={onWithdraw} className="mt-2 min-h-[44px]">
              {withdrawing ? "Withdrawing…" : "Withdraw application"}
            </Button>
          </div>
        ) : null}
        {!partner && applications.length > 0 ? (
          <div className="rounded-3xl bg-card p-5 ring-1 ring-line sm:p-6">
            <p className="text-sm text-mute">
              No public profile yet — it appears here once your application is approved. Meanwhile you can{" "}
              <Link href="/business/promotions" className="font-semibold text-accent hover:underline">
                explore promotion management
              </Link>
              .
            </p>
          </div>
        ) : null}
        {partner ? (
          <>
            <PartnerProfileEditor partner={partner} />
            <PartnerOfferList offers={offers} partnerName={partner.name} />
          </>
        ) : null}
      </div>
    </div>
  );
}
