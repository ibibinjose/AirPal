import { Link, useParams } from "wouter";
import { ArrowRight, BadgePercent, Bell, ShieldCheck } from "lucide-react";

/**
 * Promotions studio — one admin surface for business and platform stewards.
 * Listing, review, and redemption all live on the real Deals + Business
 * pillars; this page routes each role to the right place instead of
 * forking a second promotions tool.
 */
export function PromotionsStudioPage({
  scope,
  view,
}: {
  scope: "business" | "admin";
  view: "list" | "new" | "detail" | "notifications";
}) {
  const params = useParams<{ id?: string }>();
  const id = params.id?.trim();
  const isAdmin = scope === "admin";

  const title =
    view === "new"
      ? "New promotion"
      : view === "detail"
        ? "Promotion review"
        : view === "notifications"
          ? "Notifications"
          : isAdmin
            ? "Promotions review"
            : "Promotions";

  const lede =
    view === "new"
      ? "Draft the offer in the Business hub — it goes live on Deals the moment it is approved."
      : view === "detail"
        ? "Review this offer where it lives: on Deals for guests, in the Business hub for edits."
        : view === "notifications"
          ? "Deal alerts and member notifications are managed from the Admin console."
          : isAdmin
            ? "Stewards review offers here. Guests only ever see approved offers on Deals."
            : "Every offer you publish lives on Deals, redeemable with a QR at the venue.";

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-6 sm:px-6">
      <p className="human-eyebrow">{isAdmin ? "Admin" : "Business"} · Promotions</p>
      <h1 className="human-title mt-2 text-2xl sm:text-3xl">{title}</h1>
      <p className="human-lede mt-2 text-sm sm:text-base">{lede}</p>

      <div className="human-card mt-6 p-5">
        <div className="flex items-center gap-3">
          <span
            className="grid h-11 w-11 place-items-center rounded-2xl bg-primary-container text-on-primary-container"
            aria-hidden="true"
          >
            {view === "notifications" ? <Bell size={22} /> : <BadgePercent size={22} />}
          </span>
          <div>
            <h2 className="human-section-title text-base">{view === "detail" && id ? `Offer ${id}` : "Where to go"}</h2>
            <p className="mt-0.5 text-sm text-mute">
              One offer, one home. Pick the surface that matches what you need to do.
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {view === "detail" && id ? (
            <Link
              href={`/deals/${encodeURIComponent(id)}`}
              className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-full bg-brand px-5 text-sm font-semibold text-white transition hover:bg-brand-ink active:scale-95"
            >
              <span>View live offer</span>
              <ArrowRight size={14} />
            </Link>
          ) : (
            <Link
              href="/deals"
              className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-full bg-brand px-5 text-sm font-semibold text-white transition hover:bg-brand-ink active:scale-95"
            >
              <span>Open Deals</span>
              <ArrowRight size={14} />
            </Link>
          )}
          <Link
            href={isAdmin ? "/admin" : "/business"}
            className="inline-flex min-h-[44px] items-center justify-center rounded-full px-5 text-sm font-semibold text-ink ring-1 ring-line hover:bg-card active:scale-95"
          >
            {isAdmin ? "Back to Admin" : "Open Business hub"}
          </Link>
        </div>
        <p className="mt-4 flex items-start gap-1.5 text-xs text-mute">
          <ShieldCheck size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>
            Privileged writes (approvals, payouts, redemptions) run through Cloud Functions on the server — never from
            this page directly.
          </span>
        </p>
      </div>
    </div>
  );
}
