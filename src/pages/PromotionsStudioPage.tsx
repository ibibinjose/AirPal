import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useParams } from "wouter";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  BadgePercent,
  Bell,
  Building2,
  Check,
  Gift,
  ShieldCheck,
  Sparkles,
  Tag,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useListings } from "@/contexts/ListingsContext";
import { cn } from "@/lib/cn";

const DEAL_PRESETS = [
  {
    label: "2-for-1 Welcome Drink",
    title: "2-for-1 house drink for AirPal Pass holders",
    badge: "2-for-1",
    until: "Thu–Sun · 5pm–8pm",
    terms: "Present AirPal Pass QR on arrival · 1 per member",
  },
  {
    label: "20% Off Bill",
    title: "20% off total bill for local members",
    badge: "20% Off",
    until: "Valid all week",
    terms: "Valid for dine-in · Show QR at counter",
  },
  {
    label: "Free Coffee Upgrade",
    title: "Free pastry or size upgrade with any morning coffee",
    badge: "Morning Perk",
    until: "Daily before 11am",
    terms: "1 redemption per member per day",
  },
  {
    label: "Birthday Freebie",
    title: "Complimentary birthday dessert or signature drink",
    badge: "Birthday Freebie",
    until: "During your birthday week",
    terms: "Show AirPal Pass & ID at the venue",
  },
] as const;

/**
 * Promotions studio — unified promotion & deal studio for business partners
 * and platform stewards. Connects directly to ListingsContext so partners can
 * draft, publish, or update their live neighbourhood perk in one sitting.
 */
export function PromotionsStudioPage({
  scope,
  view,
}: {
  scope: "business" | "admin";
  view: "list" | "new" | "detail" | "notifications";
}) {
  const [, nav] = useLocation();
  const params = useParams<{ id?: string }>();
  const id = params.id?.trim();
  const isAdmin = scope === "admin";
  const { mine, saveDeal } = useListings();

  const [dealTitle, setDealTitle] = useState(mine?.deal?.detail || "");
  const [dealBadge, setDealBadge] = useState(mine?.deal?.badge || "Member Perk");
  const [dealUntil, setDealUntil] = useState(mine?.deal?.claimHint || "Show AirPal Pass QR at counter");
  const [dealTerms, setDealTerms] = useState("Valid for AirPal members · 1 per visit");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (mine?.deal) {
      setDealTitle(mine.deal.detail || "");
      setDealBadge(mine.deal.badge || "Member Perk");
      setDealUntil(mine.deal.claimHint || "Show AirPal Pass QR at counter");
    }
  }, [mine?.id, mine?.deal]);

  const title =
    view === "new"
      ? "Create a Member Promotion"
      : view === "detail"
        ? "Promotion Details & Review"
        : view === "notifications"
          ? "Member Deal Alerts"
          : isAdmin
            ? "Promotions Steward Review"
            : "Promotions & Member Perks Studio";

  const lede =
    view === "new"
      ? "Pick a high-converting template or write your own offer — it goes live on /deals with QR verification."
      : view === "detail"
        ? "Inspect and manage this live promotion across Deals and your Business Hub."
        : view === "notifications"
          ? "Deal alerts and neighbourhood drop notifications are managed with full privacy guardrails."
          : isAdmin
            ? "Stewards review partner offers here. Guests only ever see verified offers on Deals."
            : "Every offer you publish lives on /deals, /giveaways, or /birthday-freebies and is redeemable by QR at your venue.";

  async function handlePublishDeal(e: FormEvent) {
    e.preventDefault();
    if (!mine) {
      toast.error("Set up your venue first to publish a promotion");
      nav("/business/onboard");
      return;
    }
    const trimmed = dealTitle.trim();
    if (trimmed.length < 3) {
      toast.error("Enter a clear promotion headline");
      return;
    }
    setSaving(true);
    try {
      await saveDeal(mine.id, {
        badge: dealBadge.trim() || "Member Perk",
        detail: dealTerms.trim() ? `${trimmed} — ${dealTerms.trim()}` : trimmed,
        claimHint: dealUntil.trim() || "Show AirPal Pass QR at counter",
      });
      toast.success("Promotion published live to /deals!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not publish promotion");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveDeal() {
    if (!mine) return;
    setSaving(true);
    try {
      await saveDeal(mine.id, null);
      setDealTitle("");
      toast.success("Promotion removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove promotion");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-wrap-narrow pt-6 space-y-6">
      {/* Top Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={isAdmin ? "/admin" : "/business"}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-card px-3.5 text-xs font-semibold text-mute ring-1 ring-line transition hover:bg-paper hover:text-ink"
          >
            <ArrowLeft size={14} />
            <span>{isAdmin ? "Admin Console" : "Business Hub"}</span>
          </Link>
          <Link
            href="/deals"
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-card px-3.5 text-xs font-semibold text-mute ring-1 ring-line transition hover:bg-paper hover:text-ink"
          >
            <Tag size={13} className="text-accent" />
            <span>Live Deals</span>
          </Link>
          <Link
            href="/giveaways"
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-card px-3.5 text-xs font-semibold text-mute ring-1 ring-line transition hover:bg-paper hover:text-ink"
          >
            <Gift size={13} className="text-accent" />
            <span>Giveaways</span>
          </Link>
          <Link
            href="/birthday-freebies"
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-card px-3.5 text-xs font-semibold text-mute ring-1 ring-line transition hover:bg-paper hover:text-ink"
          >
            <Sparkles size={13} className="text-accent" />
            <span>Birthday Freebies</span>
          </Link>
        </div>

        {!isAdmin && (
          <div className="flex items-center gap-1.5 rounded-2xl bg-paper p-1 ring-1 ring-line">
            <Link
              href="/business/promotions"
              className={cn(
                "inline-flex min-h-[44px] items-center rounded-xl px-3 text-xs font-bold transition",
                view === "list" ? "bg-brand text-white shadow-xs" : "text-mute hover:text-ink",
              )}
            >
              Overview
            </Link>
            <Link
              href="/business/promotions/new"
              className={cn(
                "inline-flex min-h-[44px] items-center rounded-xl px-3 text-xs font-bold transition",
                view === "new" ? "bg-brand text-white shadow-xs" : "text-mute hover:text-ink",
              )}
            >
              + New Perk
            </Link>
          </div>
        )}
      </div>

      {/* Header Card */}
      <div className="rounded-[28px] bg-card p-6 ring-1 ring-line shadow-clay">
        <div className="flex items-start gap-3.5">
          <span
            className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand/10 text-accent ring-1 ring-brand/20"
            aria-hidden="true"
          >
            {view === "notifications" ? <Bell size={22} /> : <BadgePercent size={22} />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-accent">
              {isAdmin ? "Admin" : "Business"} · Promotions
            </p>
            <h1 className="human-title mt-1 text-2xl sm:text-3xl">{title}</h1>
            <p className="human-lede mt-1.5 text-sm sm:text-base">{lede}</p>
          </div>
        </div>
      </div>

      {/* Business Partner Deal Composer */}
      {!isAdmin && (
        <>
          {!mine ? (
            <div className="rounded-3xl bg-card p-6 ring-1 ring-line shadow-clay space-y-4">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand/10 text-accent">
                  <Building2 size={20} />
                </span>
                <div>
                  <h2 className="font-display text-lg font-bold text-ink">Connect your venue first</h2>
                  <p className="text-xs text-mute">
                    Every promotion is tied to a verified venue so guests know where to redeem their pass.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <Link
                  href="/business/onboard"
                  className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-brand px-5 text-sm font-bold text-white shadow-xs transition hover:bg-brand-ink"
                >
                  <span>Onboard Your Venue</span>
                  <ArrowRight size={15} />
                </Link>
                <Link
                  href="/claim"
                  className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-paper px-5 text-sm font-semibold text-ink ring-1 ring-line transition hover:bg-card"
                >
                  <span>Claim Existing Venue</span>
                </Link>
              </div>
            </div>
          ) : (
            <form
              onSubmit={(e) => void handlePublishDeal(e)}
              className="rounded-3xl bg-card p-5 sm:p-6 ring-1 ring-line shadow-clay space-y-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/60 pb-4">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-accent">
                    Active Venue · {mine.name}
                  </span>
                  <h2 className="font-display text-lg font-bold text-ink mt-0.5">
                    {mine.deal?.detail ? "Active Member Perk" : "Launch a Neighbourhood Deal"}
                  </h2>
                </div>
                {mine.deal?.detail && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/30">
                    <Check size={13} strokeWidth={3} /> Live on /deals
                  </span>
                )}
              </div>

              {/* 1-Tap Preset Templates */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-mute mb-2">
                  1-Tap High-Converting Templates
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {DEAL_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        setDealTitle(preset.title);
                        setDealBadge(preset.badge);
                        setDealUntil(preset.until);
                        setDealTerms(preset.terms);
                        toast.success(`Applied "${preset.label}" template`);
                      }}
                      className="rounded-2xl bg-paper p-3.5 text-left ring-1 ring-line transition hover:border-brand/40 hover:bg-card"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-ink">{preset.label}</span>
                        <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-bold text-accent">
                          {preset.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-mute mt-1 line-clamp-1">{preset.title}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-mute mb-1.5 block">
                    Offer Headline *
                  </label>
                  <input
                    value={dealTitle}
                    onChange={(e) => setDealTitle(e.target.value)}
                    placeholder="e.g. 2-for-1 house drink for AirPal Pass holders"
                    required
                    maxLength={120}
                    className="h-12 w-full rounded-2xl border border-line bg-paper px-4 text-[16px] sm:text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-mute mb-1.5 block">
                      Badge Pill
                    </label>
                    <input
                      value={dealBadge}
                      onChange={(e) => setDealBadge(e.target.value)}
                      placeholder="e.g. Member Perk, 20% Off, Birthday"
                      maxLength={32}
                      className="h-12 w-full rounded-2xl border border-line bg-paper px-4 text-[16px] sm:text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-mute mb-1.5 block">
                      Redemption Window
                    </label>
                    <input
                      value={dealUntil}
                      onChange={(e) => setDealUntil(e.target.value)}
                      placeholder="e.g. Thu–Sun · 5pm–8pm"
                      maxLength={80}
                      className="h-12 w-full rounded-2xl border border-line bg-paper px-4 text-[16px] sm:text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-mute mb-1.5 block">
                    Terms & Counter Instructions
                  </label>
                  <input
                    value={dealTerms}
                    onChange={(e) => setDealTerms(e.target.value)}
                    placeholder="e.g. Present AirPal Pass QR on arrival · 1 redemption per member"
                    maxLength={160}
                    className="h-12 w-full rounded-2xl border border-line bg-paper px-4 text-[16px] sm:text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                <Button type="submit" size="lg" className="flex-1 min-h-[48px] gap-2" disabled={saving}>
                  <Sparkles size={16} />
                  <span>
                    {saving ? "Publishing…" : mine.deal?.detail ? "Update Live Promotion" : "Publish to /deals"}
                  </span>
                </Button>
                {mine.deal?.detail && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="min-h-[48px] gap-1.5 border border-rose-500/30 text-rose-600 hover:bg-rose-500/10"
                    disabled={saving}
                    onClick={() => void handleRemoveDeal()}
                  >
                    <Trash2 size={15} />
                    <span>Remove Offer</span>
                  </Button>
                )}
              </div>
            </form>
          )}
        </>
      )}

      {/* Navigation & Trust Footer Card */}
      <div className="rounded-3xl bg-card p-5 ring-1 ring-line shadow-clay space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <h2 className="font-display text-base font-bold text-ink">
              {view === "detail" && id ? `Offer ${id}` : "Explore Promotion Surfaces"}
            </h2>
            <p className="text-xs text-mute mt-0.5">
              Jump directly to the guest discovery feeds or your full Business Hub.
            </p>
          </div>
        </div>
        <div className="grid gap-2.5 sm:grid-cols-3">
          {view === "detail" && id ? (
            <Link
              href={`/deals/${encodeURIComponent(id)}`}
              className="inline-flex min-h-[48px] items-center justify-center gap-1.5 rounded-2xl bg-brand px-4 text-xs sm:text-sm font-bold text-white transition hover:bg-brand-ink"
            >
              <span>View Live Offer</span>
              <ArrowRight size={14} />
            </Link>
          ) : (
            <Link
              href="/deals"
              className="inline-flex min-h-[48px] items-center justify-center gap-1.5 rounded-2xl bg-brand px-4 text-xs sm:text-sm font-bold text-white transition hover:bg-brand-ink"
            >
              <span>Browse Live Deals</span>
              <ArrowRight size={14} />
            </Link>
          )}
          <Link
            href={isAdmin ? "/admin" : "/business?tab=offer"}
            className="inline-flex min-h-[48px] items-center justify-center gap-1.5 rounded-2xl bg-paper px-4 text-xs sm:text-sm font-semibold text-ink ring-1 ring-line transition hover:bg-card"
          >
            <span>{isAdmin ? "Back to Admin" : "Business Offer Tab"}</span>
          </Link>
          <Link
            href="/scan"
            className="inline-flex min-h-[48px] items-center justify-center gap-1.5 rounded-2xl bg-paper px-4 text-xs sm:text-sm font-semibold text-ink ring-1 ring-line transition hover:bg-card"
          >
            <span>Open QR Door Scanner</span>
          </Link>
        </div>
        <p className="flex items-start gap-2 text-xs text-mute pt-1 border-t border-line/60">
          <ShieldCheck size={14} className="mt-0.5 shrink-0 text-accent" aria-hidden="true" />
          <span>
            Privileged writes (steward approvals, payouts, and pass redemptions) run through Cloud Functions on the
            server.
          </span>
        </p>
      </div>
    </div>
  );
}
