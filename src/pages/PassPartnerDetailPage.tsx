import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, BadgePercent, ExternalLink, Globe, Handshake, MapPin, SearchX, Ticket } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Partner } from "@shared/partner";
import type { Promotion } from "@shared/promotions";
import { targetHref } from "@shared/promotions";
import {
  fetchApprovedPartners,
  fetchLivePartnerOffers,
  fetchPartnerBySlug,
  partnerCategoryLabel,
} from "@/lib/pass-partners";
import { PartnerCard } from "./PassPartnersPage";

export function PassPartnerDetailView({
  partner,
  offers,
  related,
}: {
  partner: Partner;
  offers: Promotion[];
  related: Partner[];
}) {
  const initial = (partner.name.trim()[0] || "P").toUpperCase();
  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:py-10 pb-32">
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <Link
          href="/pass/partners"
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-card px-3.5 text-xs font-semibold text-ink ring-1 ring-line hover:bg-paper transition whitespace-nowrap"
        >
          <ArrowLeft size={14} className="shrink-0" />
          <span>All partners</span>
        </Link>
        <Link
          href="/deals"
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-card px-3.5 text-xs font-semibold text-ink ring-1 ring-line hover:bg-paper transition whitespace-nowrap"
        >
          <Ticket size={14} className="shrink-0 text-amber-500" />
          <span>Member deals</span>
        </Link>
      </div>

      <div className="rounded-3xl bg-card p-5 ring-1 ring-line sm:p-6">
        <div className="flex items-start gap-4">
          <span
            aria-hidden
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-brand/10 text-2xl font-bold text-accent"
          >
            {initial}
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
              Pass partner · {partnerCategoryLabel(partner.category)}
            </p>
            <h1 className="font-display mt-0.5 text-2xl font-bold sm:text-3xl">{partner.name}</h1>
            {partner.tagline ? <p className="mt-1 text-sm text-mute">{partner.tagline}</p> : null}
          </div>
        </div>

        {partner.website ? (
          <a
            href={partner.website}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-accent"
          >
            <Globe size={16} className="shrink-0" aria-hidden />
            <span className="break-all">{partner.website.replace(/^https?:\/\//i, "")}</span>
            <ExternalLink size={14} className="shrink-0" aria-hidden />
          </a>
        ) : null}
      </div>

      <section aria-label="About" className="mt-4 rounded-3xl bg-card p-5 ring-1 ring-line sm:p-6">
        <h2 className="text-base font-bold">About</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-ink">
          {partner.description || partner.tagline || `${partner.name} is an AirPal Pass partner.`}
        </p>
      </section>

      <section aria-label="How to earn" className="mt-4 rounded-3xl bg-card p-5 ring-1 ring-line sm:p-6">
        <h2 className="text-base font-bold">How to earn the perk</h2>
        <ol className="mt-2 space-y-2 text-[15px] leading-relaxed text-ink">
          <li className="flex gap-2">
            <span aria-hidden className="font-bold text-accent">
              1.
            </span>
            <span>Open the live offer below and follow its claim step at checkout or the door.</span>
          </li>
          <li className="flex gap-2">
            <span aria-hidden className="font-bold text-accent">
              2.
            </span>
            <span>Show your AirPal Passbook wallet when asked — that is the whole proof.</span>
          </li>
          <li className="flex gap-2">
            <span aria-hidden className="font-bold text-accent">
              3.
            </span>
            <span>Perks apply per visit while the offer is live; ask staff if anything is unclear.</span>
          </li>
        </ol>
      </section>

      <section aria-label="Live offers" className="mt-4 rounded-3xl bg-card p-5 ring-1 ring-line sm:p-6">
        <h2 className="flex items-center gap-2 text-base font-bold">
          <BadgePercent size={18} className="text-accent" aria-hidden />
          Live offers
        </h2>
        {offers.length === 0 ? (
          <p className="mt-2 text-sm text-mute">
            No live offers right now — check back soon or browse all member deals.
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
                  {offer.locationText ? (
                    <p className="mt-1 flex items-center gap-1 text-xs text-mute">
                      <MapPin size={12} className="shrink-0" aria-hidden />
                      {offer.locationText}
                    </p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                      href={`/deals/${offer.id}`}
                      className="inline-flex min-h-[44px] items-center rounded-full bg-brand px-4 text-xs font-bold text-white hover:bg-brand/90 transition"
                    >
                      View deal
                    </Link>
                    {target ? (
                      <Link
                        href={target}
                        className="inline-flex min-h-[44px] items-center rounded-full bg-card px-4 text-xs font-semibold text-ink ring-1 ring-line hover:bg-paper transition"
                      >
                        {offer.targetType === "event" ? "View event" : "Open offer"}
                      </Link>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {related.length > 0 ? (
        <section aria-label="More partners" className="mt-6">
          <h2 className="text-base font-bold">More {partnerCategoryLabel(partner.category)} partners</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {related.map((r) => (
              <PartnerCard key={r.id} partner={r} />
            ))}
          </div>
        </section>
      ) : null}

      <div className="mt-8">
        <Link
          href="/pass/partners/apply"
          className="flex min-h-[44px] items-center justify-center gap-2 rounded-3xl bg-card px-5 py-4 text-sm font-semibold text-ink ring-1 ring-line hover:bg-paper transition"
        >
          <Handshake size={16} className="shrink-0 text-accent" aria-hidden />
          Run {partner.name}? Partner with AirPal Pass
        </Link>
      </div>
    </div>
  );
}

export function PassPartnerNotFound({ slug }: { slug: string }) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:py-10 pb-32">
      <div className="mb-6">
        <Link
          href="/pass/partners"
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-card px-3.5 text-xs font-semibold text-ink ring-1 ring-line hover:bg-paper transition whitespace-nowrap"
        >
          <ArrowLeft size={14} className="shrink-0" />
          <span>All partners</span>
        </Link>
      </div>
      <EmptyState
        icon={<SearchX size={28} className="text-mute" aria-hidden />}
        kicker="Unknown partner"
        title="We could not find that partner"
        body={
          slug
            ? `There is no Pass partner at “${slug}”. It may have been removed or renamed.`
            : "That partner link looks incomplete."
        }
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

export function PassPartnerDetailPage({ slug }: { slug: string }) {
  const [partner, setPartner] = useState<Partner | null>(null);
  const [offers, setOffers] = useState<Promotion[]>([]);
  const [related, setRelated] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const found = await fetchPartnerBySlug(slug);
        if (!live) return;
        setPartner(found);
        if (found) {
          const [liveOffers, all] = await Promise.all([fetchLivePartnerOffers(found.name), fetchApprovedPartners()]);
          if (!live) return;
          setOffers(liveOffers);
          setRelated(all.filter((p) => p.id !== found.id && p.category === found.category).slice(0, 3));
        }
      } catch {
        if (live) setPartner(null);
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => {
      live = false;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24" role="status" aria-live="polite">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      </div>
    );
  }

  if (!partner) return <PassPartnerNotFound slug={slug} />;
  return <PassPartnerDetailView partner={partner} offers={offers} related={related} />;
}
