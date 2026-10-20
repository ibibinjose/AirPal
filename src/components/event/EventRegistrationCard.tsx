import { useState } from "react";
import { Check, QrCode, ShieldCheck, Sparkles, Tag, Ticket } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import { triggerHaptic } from "@/lib/native";
import { couponPrice, normalizeCouponCode } from "@shared/event";
import { liveBackendEnabled, validateEventCouponRemote } from "@/lib/functions";

export interface EventRegistrationCardProps {
  eventId: string;
  paidCents?: number;
  capacity?: number;
  requireApproval?: boolean;
  isGoing: boolean;
  buying: boolean;
  /** Selected tier id, or legacy "standard" | "vip" | "group". */
  tier: string;
  /** Named tiers from the event. Absent = legacy standard/vip/group pricing. */
  tiers?: { id: string; name: string; priceCents: number; capacity?: number }[];
  spots: number;
  onTierChange: (tier: string) => void;
  onSpotsChange: (spots: number) => void;
  onSubmit: (coupon?: string, finalPriceCents?: number, tierId?: string) => void;
  onToggleGoing?: () => void;
  /** Capacity reached and the viewer holds no seat — server enforces the same. */
  soldOut?: boolean;
  className?: string;
}

export function EventRegistrationCard({
  eventId,
  paidCents = 0,
  capacity,
  requireApproval,
  isGoing,
  buying,
  tier,
  tiers,
  spots,
  onTierChange,
  onSpotsChange,
  onSubmit,
  soldOut,
  className,
}: EventRegistrationCardProps) {
  const isSoldOut = soldOut === true && !isGoing;
  const isPaid = paidCents > 0;
  const namedTiers = tiers && tiers.length > 0 ? tiers : null;
  const activeNamedTier = namedTiers?.find((t) => t.id === tier) ?? null;
  const effectiveSpots = !namedTiers && tier === "group" ? 4 : spots;

  const [couponDraft, setCouponDraft] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);

  const unitPriceCents = activeNamedTier
    ? activeNamedTier.priceCents
    : tier === "vip"
      ? Math.round(paidCents * 1.5)
      : !namedTiers && tier === "group"
        ? Math.round(paidCents * 0.9)
        : paidCents;

  const rawTotalPriceCents = isPaid
    ? activeNamedTier
      ? activeNamedTier.priceCents * spots
      : !namedTiers && tier === "group"
        ? Math.round(paidCents * 4 * 0.9)
        : unitPriceCents * spots
    : 0;
  // Display estimate only — the server re-validates the code and re-prices
  // from the event row at checkout, so this can never mint a discount.
  const totalPriceCents =
    isPaid && appliedCoupon ? couponPrice(rawTotalPriceCents, discountPercent) : rawTotalPriceCents;
  const discountCents = rawTotalPriceCents - totalPriceCents;

  const handleApplyCoupon = async () => {
    if (appliedCoupon) {
      setAppliedCoupon(null);
      setDiscountPercent(0);
      setCouponDraft("");
      setCouponError(null);
      void triggerHaptic("light");
      return;
    }
    const code = normalizeCouponCode(couponDraft);
    if (!code) {
      setCouponError("Enter a valid coupon code.");
      return;
    }
    if (!liveBackendEnabled()) {
      setCouponError("Coupons need a connection — try again online.");
      return;
    }
    void triggerHaptic("medium");
    setValidating(true);
    try {
      const res = await validateEventCouponRemote({ eventId, code });
      setAppliedCoupon(res.code);
      setDiscountPercent(res.percentOff);
      setCouponError(null);
      toast.success(`${res.code} applied — ${res.percentOff}% off.`);
    } catch (err) {
      setCouponError(err instanceof Error ? err.message : "Invalid or expired coupon code.");
    } finally {
      setValidating(false);
    }
  };

  const handleTierClick = (newTier: string) => {
    void triggerHaptic("selection");
    onTierChange(newTier);
  };

  const handleSpotClick = (qty: number) => {
    void triggerHaptic("selection");
    onSpotsChange(qty);
  };

  return (
    <div className={cn("rounded-3xl bg-card p-5 sm:p-6 ring-1 ring-line space-y-5", className)}>
      {/* Card Header & Price Pill */}
      <div className="flex items-center justify-between border-b border-line/60 pb-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-brand/10 text-accent ring-1 ring-brand/20">
            <Ticket size={17} aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-ink">Registration &amp; Passes</h3>
            <p className="text-xs text-mute">Reserve your entry into the event</p>
          </div>
        </div>

        <div className="text-right">
          <span className="inline-block rounded-full bg-amber-500/15 px-3 py-1 text-xs font-extrabold text-amber-900 dark:text-amber-300 ring-1 ring-amber-400/30">
            {isPaid ? `$${(paidCents / 100).toFixed(0)} AUD` : "Free Pass"}
          </span>
        </div>
      </div>

      {/* Tier Selector Chips */}
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-mute mb-2 block">Select Tier</span>
        <div
          className={cn(
            "grid gap-2",
            namedTiers && namedTiers.length === 1
              ? "grid-cols-1"
              : namedTiers && namedTiers.length === 2
                ? "grid-cols-2"
                : namedTiers && namedTiers.length === 4
                  ? "grid-cols-2 sm:grid-cols-4"
                  : "grid-cols-3",
          )}
        >
          {(namedTiers
            ? namedTiers.map((t) => ({
                id: t.id,
                label: t.name,
                desc: isPaid ? `$${(t.priceCents / 100).toFixed(0)}` : "Free RSVP",
              }))
            : ([
                { id: "standard", label: "General", desc: isPaid ? `$${(paidCents / 100).toFixed(0)}` : "Free RSVP" },
                {
                  id: "vip",
                  label: "VIP Pass",
                  desc: isPaid ? `$${(Math.round(paidCents * 1.5) / 100).toFixed(0)}` : "VIP Entry",
                },
                { id: "group", label: "Group (4)", desc: isPaid ? "10% Off" : "4 Passes" },
              ] as const)
          ).map((t) => {
            const active = tier === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => handleTierClick(t.id)}
                aria-pressed={active}
                className={cn(
                  "flex min-h-[52px] min-w-0 flex-col items-center justify-center rounded-2xl p-2 text-center transition active:scale-95 cursor-pointer ring-1",
                  active
                    ? "bg-brand text-white ring-brand shadow-sm"
                    : "bg-paper text-ink ring-line hover:bg-card hover:ring-brand/30",
                )}
              >
                <span className="w-full truncate text-center text-xs sm:text-sm font-bold">{t.label}</span>
                <span className={cn("text-[11px] mt-0.5", active ? "text-amber-300 font-semibold" : "text-mute")}>
                  {t.desc}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Quantity Selector for single/multi passes */}
      {tier !== "group" && (
        <div className="flex items-center justify-between pt-1">
          <span className="text-sm font-semibold text-mute">Number of passes:</span>
          <div className="flex items-center gap-2">
            {[1, 2, 4].map((qty) => (
              <button
                key={qty}
                type="button"
                onClick={() => handleSpotClick(qty)}
                aria-pressed={spots === qty}
                aria-label={`${qty} ${qty === 1 ? "pass" : "passes"}`}
                className={cn(
                  "h-11 w-11 rounded-xl text-sm font-bold transition active:scale-95 ring-1 cursor-pointer touch-manipulation",
                  spots === qty
                    ? "bg-brand text-white ring-brand shadow-2xs"
                    : "bg-paper text-ink ring-line hover:bg-card",
                )}
              >
                {qty}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Coupon Code Input — server-validated, never client math */}
      {isPaid && (
        <div className="pt-0.5">
          <div className="flex gap-2">
            <input
              type="text"
              value={couponDraft}
              onChange={(e) => {
                setCouponDraft(e.target.value.toUpperCase());
                setCouponError(null);
              }}
              disabled={Boolean(appliedCoupon) || validating}
              placeholder="Coupon or promo code"
              aria-label="Coupon or promo code"
              className="h-11 flex-1 rounded-xl bg-paper px-3 text-xs uppercase tracking-wider font-semibold text-ink ring-1 ring-line outline-none focus:ring-2 focus:ring-brand/30 disabled:opacity-75"
            />
            <button
              type="button"
              onClick={() => void handleApplyCoupon()}
              disabled={validating}
              className="h-11 px-4 rounded-xl bg-paper ring-1 ring-line text-sm font-bold text-accent hover:bg-card active:scale-95 cursor-pointer shrink-0 touch-manipulation disabled:opacity-60"
            >
              {appliedCoupon ? "Remove" : validating ? "…" : "Apply"}
            </button>
          </div>
          {couponError && (
            <p role="alert" className="text-xs text-red-500 font-medium mt-1">
              {couponError}
            </p>
          )}
          {appliedCoupon && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-1 flex items-center gap-1">
              <Check size={12} strokeWidth={3} aria-hidden="true" /> {appliedCoupon} applied ({discountPercent}%
              discount)
            </p>
          )}
        </div>
      )}

      {/* Capacity & Price Breakdown */}
      <div className="rounded-2xl bg-paper p-4 border border-line/60 space-y-1.5 text-sm tabular-data">
        {capacity && capacity > 0 && (
          <div className="flex items-center justify-between text-mute">
            <span>Capacity:</span>
            <span className="font-semibold text-ink">{capacity} guests max</span>
          </div>
        )}
        <div className="flex items-center justify-between text-mute">
          <span>Tickets:</span>
          <span className="font-semibold text-ink">
            {effectiveSpots} {effectiveSpots === 1 ? "pass" : "passes"}
          </span>
        </div>
        {requireApproval && (
          <div className="flex items-center justify-between text-amber-700 dark:text-amber-400 font-semibold pt-1 border-t border-line/40">
            <span className="flex items-center gap-1">
              <ShieldCheck size={13} /> Guest Screening:
            </span>
            <span>Host Review Required</span>
          </div>
        )}
        {isPaid && appliedCoupon && discountCents > 0 && (
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 font-semibold pt-1 border-t border-line/40">
            <span className="flex items-center gap-1">
              <Tag size={12} /> Coupon ({appliedCoupon}):
            </span>
            <span>-${(discountCents / 100).toFixed(2)} AUD</span>
          </div>
        )}
        {isPaid && (
          <div className="flex items-center justify-between pt-1 border-t border-line/50 text-ink font-bold">
            <span>Total:</span>
            <span className="text-sm text-accent">${(totalPriceCents / 100).toFixed(2)} AUD</span>
          </div>
        )}
      </div>

      {/* Primary Action Button */}
      <div>
        <button
          type="button"
          onClick={() => {
            void triggerHaptic("medium");
            onSubmit(appliedCoupon || undefined, totalPriceCents, activeNamedTier?.id);
          }}
          disabled={buying || validating || isSoldOut}
          aria-disabled={buying || validating || isSoldOut}
          className={cn(
            "w-full h-[52px] rounded-full text-sm sm:text-base font-bold shadow-md transition active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer touch-manipulation disabled:opacity-60 disabled:cursor-wait",
            isGoing
              ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-600/20"
              : "bg-brand text-white hover:brightness-105 shadow-brand/20",
          )}
        >
          {buying ? (
            <span>Processing…</span>
          ) : isSoldOut ? (
            <>
              <Ticket size={18} />
              <span>Sold out — join the next one</span>
            </>
          ) : isGoing ? (
            <>
              <Check size={18} strokeWidth={3} />
              <span>You&apos;re Going ✓</span>
            </>
          ) : requireApproval ? (
            <>
              <ShieldCheck size={18} />
              <span>Request to Join (Approval Required)</span>
            </>
          ) : isPaid ? (
            <>
              <Ticket size={18} />
              <span>
                Get {effectiveSpots > 1 ? `${effectiveSpots} Passes` : "Pass"} · ${(totalPriceCents / 100).toFixed(2)}
              </span>
            </>
          ) : (
            <>
              <Sparkles size={17} />
              <span>Register Free Pass</span>
            </>
          )}
        </button>
      </div>

      <div className="flex items-center justify-center gap-1.5 text-xs text-mute text-center pt-0.5">
        <QrCode size={12} className="text-amber-500" aria-hidden="true" />
        <span>1-tap Apple &amp; Google Wallet pass · Gate QR check-in</span>
      </div>
    </div>
  );
}
