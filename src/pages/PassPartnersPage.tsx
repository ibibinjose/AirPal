import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, ArrowRight, Handshake, LogIn, Search, Store, Ticket, UserPlus } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterChips, type FilterChipOption } from "@/components/ui/FilterChips";
import { SearchBar } from "@/components/search/SearchBar";
import { useAuth } from "@/contexts/AuthContext";
import { BUSINESS_CATEGORIES } from "@shared/business";
import type { Partner } from "@shared/partner";
import { fetchApprovedPartners, filterPassPartners, partnerCategoryLabel } from "@/lib/pass-partners";
import { UNCLAIMED_PARTNERS, filterUnclaimedPartners } from "@/lib/partner-directory";

const CATEGORY_OPTIONS: Array<FilterChipOption<string>> = [
  { id: "All", label: "All" },
  ...BUSINESS_CATEGORIES.map((c) => ({ id: c.id as string, label: c.label })),
];

export function PartnerCard({ partner }: { partner: Partner }) {
  const initial = (partner.name.trim()[0] || "P").toUpperCase();
  return (
    <Link
      href={`/pass/partners/${partner.slug}`}
      className="group flex min-h-[44px] items-center gap-3 rounded-3xl bg-card p-4 ring-1 ring-line transition hover:bg-paper"
    >
      <span
        aria-hidden
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand/10 text-lg font-bold text-accent"
      >
        {initial}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="truncate text-[15px] font-semibold text-ink">{partner.name}</span>
          <span className="rounded-full bg-paper px-2 py-0.5 text-[11px] font-semibold text-mute ring-1 ring-line">
            {partnerCategoryLabel(partner.category)}
          </span>
        </span>
        {partner.tagline ? <span className="mt-0.5 block truncate text-sm text-mute">{partner.tagline}</span> : null}
        <span className="mt-1 block text-xs font-semibold text-accent">Learn more →</span>
      </span>
    </Link>
  );
}

export function PassPartnersDirectory({ partners, loading }: { partners: Partner[]; loading: boolean }) {
  const { user } = useAuth();
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const applyNext = `/start?tab=signin&next=${encodeURIComponent("/pass/partners/apply")}&role=business`;
  const applySignup = `/start?tab=signup&next=${encodeURIComponent("/pass/partners/apply")}&role=business`;

  const filtered = useMemo(() => filterPassPartners(partners, { search, category }), [partners, search, category]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:py-10 pb-32">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <Link
          href="/pass"
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-card px-3.5 text-xs font-semibold text-ink ring-1 ring-line hover:bg-paper transition whitespace-nowrap"
        >
          <ArrowLeft size={14} className="shrink-0" />
          <span>AirPal Pass</span>
        </Link>
        <Link
          href="/pass/partners/apply"
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-brand px-4 text-xs font-bold text-white shadow-xs hover:bg-brand/90 transition active:scale-95 whitespace-nowrap"
        >
          <Handshake size={14} className="shrink-0" />
          <span>Become a partner</span>
        </Link>
      </div>

      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">AirPal Pass · Partners</p>
      <h1 className="font-display mt-1 text-2xl font-bold sm:text-3xl">Partner directory</h1>
      <p className="mt-1 text-sm text-mute">
        {partners.length === 0
          ? "Member perks from local partners."
          : `${partners.length} ${partners.length === 1 ? "partner" : "partners"} and counting.`}
      </p>

      <div className="mt-4">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search partners…"
          aria-label="Search partners"
          icon={<Search size={16} aria-hidden />}
        />
      </div>
      <div className="mt-3">
        <FilterChips
          options={CATEGORY_OPTIONS}
          ariaLabel="Filter partners by category"
          value={category}
          onChange={setCategory}
        />
      </div>

      {loading ? (
        <div className="mt-6 flex items-center justify-center py-12" role="status" aria-live="polite">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={<Store size={28} className="text-mute" aria-hidden />}
            kicker="No matches"
            title={partners.length === 0 ? "No partners yet" : "No partners match"}
            body={
              partners.length === 0
                ? "We are onboarding our first Pass partners. Check back soon — or bring your own business."
                : "Try a different search or category."
            }
            actionLabel="Become a partner"
            action={() => {
              window.location.assign("/pass/partners/apply");
            }}
            secondaryLabel="Browse deals"
            secondary={() => {
              window.location.assign("/deals");
            }}
          />
        </div>
      ) : (
        <>
          <p className="mt-4 text-xs font-semibold text-mute" role="status">
            Showing {filtered.length} of {partners.length}
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {filtered.map((p) => (
              <PartnerCard key={p.id} partner={p} />
            ))}
          </div>
        </>
      )}

      <div className="mt-8 flex flex-wrap gap-2">
        <Link
          href="/me/tickets"
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-card px-3.5 text-xs font-semibold text-ink ring-1 ring-line hover:bg-paper transition"
        >
          <Ticket size={14} className="shrink-0 text-amber-500" />
          <span>My Passbook Wallet</span>
        </Link>
        <Link
          href="/deals"
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-card px-3.5 text-xs font-semibold text-ink ring-1 ring-line hover:bg-paper transition"
        >
          <span>Browse all deals</span>
        </Link>
      </div>

      {!user ? (
        <div className="mt-8 rounded-3xl bg-card p-5 ring-1 ring-line sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">Business owners</p>
              <p className="font-display mt-1 text-lg font-bold">Log in or create your account</p>
              <p className="mt-0.5 text-sm text-mute">
                Sign in first — then claiming a listing and applying takes about a minute.
              </p>
            </div>
            <div className="grid shrink-0 grid-cols-2 gap-2 sm:flex">
              <Link
                href={applyNext}
                className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-full bg-brand px-5 text-sm font-bold text-white shadow-xs transition hover:bg-brand/90 active:scale-95"
              >
                <LogIn size={15} className="shrink-0" aria-hidden />
                <span>Log in</span>
              </Link>
              <Link
                href={applySignup}
                className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-full bg-paper px-5 text-sm font-semibold text-ink ring-1 ring-line transition hover:bg-card active:scale-95"
              >
                <UserPlus size={15} className="shrink-0" aria-hidden />
                <span>Sign up</span>
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      <UnclaimedDirectory />
    </div>
  );
}

/**
 * Sourced business names that are NOT AirPal partners — no offers, no perks,
 * no partnership implied. Each row routes into the partner application flow
 * so an owner can claim the listing.
 */
const UNCLAIMED_INITIAL_LIMIT = 48;

export function UnclaimedDirectory() {
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const matches = useMemo(() => filterUnclaimedPartners(UNCLAIMED_PARTNERS, query), [query]);
  const visible = showAll ? matches : matches.slice(0, UNCLAIMED_INITIAL_LIMIT);

  return (
    <section
      aria-label="Unclaimed business directory"
      className="mt-10 rounded-3xl border border-dashed border-line bg-card/60 p-4 sm:p-6"
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-mute">Unclaimed directory</p>
      <h2 className="font-display mt-1 text-xl font-bold">More businesses</h2>
      <p className="mt-1 text-sm text-mute">
        These businesses aren’t AirPal partners yet — there are no perks here. Own or represent one? Claim its listing
        to apply.
      </p>
      <div className="mt-4">
        <SearchBar
          value={query}
          onChange={(value) => {
            setQuery(value);
            setShowAll(false);
          }}
          placeholder={`Search ${UNCLAIMED_PARTNERS.length} businesses…`}
          aria-label="Search unclaimed businesses"
          icon={<Search size={16} aria-hidden />}
        />
      </div>
      <p className="mt-3 text-xs font-semibold text-mute" role="status">
        {matches.length === 0 ? "No matches" : `Showing ${visible.length} of ${matches.length}`}
      </p>
      {matches.length === 0 ? (
        <p className="mt-2 text-sm text-mute">
          Nothing unclaimed matches “{query}”. Try another name — or skip straight to the application.
        </p>
      ) : (
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {visible.map((name) => (
            <li key={name}>
              <Link
                href={`/pass/partners/apply?business=${encodeURIComponent(name)}`}
                className="flex min-h-[44px] items-center gap-3 rounded-2xl bg-card px-3 py-2 ring-1 ring-line transition hover:bg-paper"
                aria-label={`Claim ${name} on AirPal Pass`}
              >
                <span
                  aria-hidden
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-paper text-sm font-bold text-mute ring-1 ring-line"
                >
                  {(name.trim()[0] || "?").toUpperCase()}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{name}</span>
                <span className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-accent">
                  Claim
                  <ArrowRight size={13} aria-hidden />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {matches.length > UNCLAIMED_INITIAL_LIMIT ? (
        <button
          type="button"
          onClick={() => setShowAll((current) => !current)}
          className="mt-3 inline-flex min-h-[44px] items-center rounded-full bg-paper px-4 text-xs font-semibold text-ink ring-1 ring-line transition hover:bg-card"
        >
          {showAll ? "Show fewer" : `Show all ${matches.length}`}
        </button>
      ) : null}
    </section>
  );
}

export function PassPartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    fetchApprovedPartners()
      .then((list) => {
        if (live) setPartners(list);
      })
      .catch(() => {
        if (live) setPartners([]);
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, []);

  return <PassPartnersDirectory partners={partners} loading={loading} />;
}
