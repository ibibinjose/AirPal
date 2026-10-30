import { Link } from "wouter";
import { ArrowRight, Gift, QrCode, Sparkles, Star, Tag, Ticket } from "lucide-react";
import type { BioCatalogItem, BioProfile } from "@shared/bio";
import { Button } from "@/components/ui/Button";
import { triggerHaptic } from "@/lib/native";
import { businessCardWalletPassUrl, openAppleWalletPass } from "@/lib/wallet";

interface BioRewardsSectionProps {
  bio: BioProfile;
  pointsBalance: number | null;
  deals: BioCatalogItem[];
  liveOffer?: { badge: string; detail: string; title: string } | null;
  onClaimDeal: (deal: BioCatalogItem) => void;
  isOwner?: boolean;
}

export function BioRewardsSection({
  bio,
  pointsBalance,
  deals,
  liveOffer,
  onClaimDeal,
  isOwner: _isOwner,
}: BioRewardsSectionProps) {
  const activeOffersCount = (liveOffer ? 1 : 0) + (deals.length > 0 ? deals.length : 0);

  return (
    <section
      id="bio-rewards"
      className="mt-8 scroll-mt-24 rounded-[30px] sm:rounded-[36px] bg-gradient-to-br from-paper/90 via-card to-paper/60 p-5 sm:p-7 shadow-xs ring-1 ring-line/80 relative overflow-hidden"
      aria-labelledby="bio-rewards-heading"
    >
      {/* Specular ambient halo */}
      <div className="absolute -top-24 -right-24 h-56 w-56 rounded-full bg-amber-400/10 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-accent flex items-center gap-1.5">
            <Sparkles size={13} className="text-accent" aria-hidden="true" />
            <span>AirPal Rewards &amp; Member Perks</span>
          </p>
          <h2 id="bio-rewards-heading" className="font-display text-lg sm:text-2xl font-bold text-ink mt-0.5">
            Rewards &amp; Perks at {bio.name}
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-mute leading-relaxed max-w-xl">
            Check in at the door, unlock VIP entry, and redeem exclusive perks using your AirPal Pass.
          </p>
        </div>

        {pointsBalance !== null ? (
          <Link
            href="/rewards"
            onClick={() => void triggerHaptic("light")}
            className="neu-card inline-flex min-h-[48px] items-center gap-2.5 px-4 py-2 self-start sm:self-auto rounded-2xl hover:ring-brand/40 transition active:scale-95"
            title="View your full rewards catalog"
          >
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-400">
              <Star size={16} />
            </div>
            <div className="text-left">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-mute">Your Balance</span>
              <span className="block text-sm font-black text-ink font-mono tabular-data">{pointsBalance} pts</span>
            </div>
          </Link>
        ) : null}
      </div>

      {/* 3-Pillar Rewards Matrix */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Pillar 1: Door Check-In */}
        <div className="neu-card p-4 rounded-2xl flex flex-col justify-between transition duration-200 hover:ring-brand/30">
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                <Ticket size={18} />
              </span>
              <span className="neu-chip px-2.5 py-0.5 text-xs font-black text-emerald-700 dark:text-emerald-300 font-mono">
                +10 pts
              </span>
            </div>
            <h3 className="font-display text-sm font-bold text-ink">Door Check-In</h3>
            <p className="mt-1 text-xs text-mute leading-relaxed">
              Earn +10 points automatically whenever you check in or scan your pass at the entrance.
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-line/60 flex items-center justify-between text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
            <span className="flex items-center gap-1.5">
              <QrCode size={12} />
              <span>Door QR Pass</span>
            </span>
            <button
              type="button"
              onClick={() => {
                void triggerHaptic("medium");
                const passUrl = businessCardWalletPassUrl(bio.handle);
                void openAppleWalletPass(passUrl, "@" + bio.handle + "-AirPal-Pass");
              }}
              className="text-accent hover:underline cursor-pointer"
            >
              Add to Wallet &rarr;
            </button>
          </div>
        </div>

        {/* Pillar 2: In-Store Offers */}
        <div className="neu-card p-4 rounded-2xl flex flex-col justify-between transition duration-200 hover:ring-brand/30">
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-400">
                <Tag size={18} />
              </span>
              <span className="neu-chip px-2.5 py-0.5 text-xs font-black text-amber-700 dark:text-amber-300 font-mono">
                +5 pts
              </span>
            </div>
            <h3 className="font-display text-sm font-bold text-ink">In-Store Perks</h3>
            <p className="mt-1 text-xs text-mute leading-relaxed">
              Earn +5 points every time you redeem a special member perk or offer at the till.
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-line/60 flex items-center gap-1.5 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
            <Gift size={12} />
            <span>Staff PIN verified</span>
          </div>
        </div>

        {/* Pillar 3: AirPal Rewards Pass */}
        <div className="neu-card p-4 rounded-2xl flex flex-col justify-between transition duration-200 hover:ring-brand/30">
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand/15 text-brand dark:text-brand-ink">
                <Star size={18} />
              </span>
              <span className="neu-chip px-2.5 py-0.5 text-xs font-black text-accent font-mono">VIP Access</span>
            </div>
            <h3 className="font-display text-sm font-bold text-ink">Member Drops</h3>
            <p className="mt-1 text-xs text-mute leading-relaxed">
              Redeem points for drinks, table upgrades, and member hospitality across Sydney.
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-line/60 flex items-center justify-between">
            <Link
              href="/rewards"
              onClick={() => void triggerHaptic("light")}
              className="text-[11px] font-bold text-accent hover:underline inline-flex items-center gap-1"
            >
              <span>Rewards Catalog</span>
              <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      </div>

      {/* Active Deals from this Business */}
      {(liveOffer || deals.length > 0) && (
        <div className="mt-6 border-t border-line/70 pt-5">
          <div className="flex items-center justify-between mb-3 px-0.5">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.16em] text-accent flex items-center gap-1.5">
              <Gift size={13} className="text-accent" />
              <span>Active Perks at this Venue ({activeOffersCount})</span>
            </h3>
            <span className="text-[10px] font-bold text-mute uppercase tracking-wider">Show to staff</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {liveOffer && (
              <div className="neu-card p-4 rounded-2xl border-l-4 border-l-accent flex flex-col justify-between">
                <div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-accent bg-gold/15 px-2 py-0.5 rounded-full mb-1.5">
                    <Sparkles size={10} />
                    {liveOffer.badge}
                  </span>
                  <h4 className="font-display text-sm font-bold text-ink">{liveOffer.title}</h4>
                  <p className="mt-1 text-xs text-mute leading-relaxed">{liveOffer.detail}</p>
                </div>
                <div className="mt-3 pt-2">
                  <Button
                    size="sm"
                    className="w-full min-h-[44px] gap-1.5 rounded-full bg-brand text-xs font-bold text-white shadow-xs hover:bg-brand-ink active:scale-95 cursor-pointer touch-manipulation"
                    onClick={() => {
                      void triggerHaptic("medium");
                      onClaimDeal({
                        id: "live-offer",
                        kind: "deal",
                        title: liveOffer.title,
                        detail: liveOffer.detail,
                        badge: liveOffer.badge,
                      });
                    }}
                  >
                    <Ticket size={14} />
                    <span>Claim This Perk</span>
                  </Button>
                </div>
              </div>
            )}

            {deals.map((deal) => (
              <div key={deal.id} className="neu-card p-4 rounded-2xl flex flex-col justify-between">
                <div>
                  {deal.badge && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-accent bg-paper px-2 py-0.5 rounded-full mb-1.5">
                      <Tag size={10} />
                      {deal.badge}
                    </span>
                  )}
                  <h4 className="font-display text-sm font-bold text-ink">{deal.title}</h4>
                  <p className="mt-1 text-xs text-mute leading-relaxed">{deal.detail}</p>
                </div>
                <div className="mt-3 pt-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="neu-btn w-full min-h-[44px] gap-1.5 rounded-full text-xs font-semibold text-ink hover:bg-paper active:scale-95 cursor-pointer touch-manipulation"
                    onClick={() => {
                      void triggerHaptic("medium");
                      onClaimDeal(deal);
                    }}
                  >
                    <Ticket size={14} className="text-accent" />
                    <span>Claim Deal</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer Navigation Link to /rewards */}
      <div className="mt-5 pt-4 border-t border-line/60 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-xs text-mute text-center sm:text-left">
          Points earned at {bio.name} can be spent across the entire AirPal Sydney network.
        </p>
        <Link
          href="/rewards"
          onClick={() => void triggerHaptic("light")}
          className="neu-btn inline-flex min-h-[44px] items-center gap-2 px-4 text-xs font-bold text-ink hover:text-accent transition active:scale-95 shrink-0"
        >
          <span>Explore All Sydney Rewards</span>
          <ArrowRight size={13} className="text-accent" />
        </Link>
      </div>
    </section>
  );
}
