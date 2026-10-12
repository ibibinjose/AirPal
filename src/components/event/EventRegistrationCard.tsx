import { useState } from "react";
import { Check, QrCode, ShieldCheck, Sparkles, Tag, Ticket } from "lucide-react";
import { cn } from "@/lib/cn";
import { triggerHaptic } from "@/lib/native";

export interface EventRegistrationCardProps {
  paidCents?: number;
  capacity?: number;
  requireApproval?: boolean;
  isGoing: boolean;
  buying: boolean;
  tier: "standard" | "vip" | "group";
  spots: number;
  onTierChange: (tier: "standard" | "vip" | "group") => void;
  onSpotsChange: (spots: number) => void;
  onSubmit: (coupon?: string, finalPriceCents?: number) => void;
  onToggleGoing?: () => void;
  className?: string;
}

export function EventRegistrationCard({
  paidCents = 0,
  capacity,
  requireApproval,
  isGoing,
  buying,
  tier,
  spots,
  onTierChange,
  onSpotsChange,
  onSubmit,
  className,
}: EventRegistrationCardProps) {
  const isPaid = paidCents > 0;
  const effectiveSpots = tier === "group" ? 4 : spots;

  const [couponDraft, setCouponDraft] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [couponError, setCouponError] = useState<string | null>(null);

  const unitPriceCents =
    tier === "vip" ? Math.round(paidCents * 1.5) : tier === "group" ? Math.round(paidCents * 0.9) : paidCents;

  const rawTotalPriceCents = isPaid ? (tier === "group" ? Math.round(paidCents * 4 * 0.9) : unitPriceCents * spots) : 0;
  const discountCents = isPaid && appliedCoupon ? Math.round(rawTotalPriceCents * (discountPercent / 100)) : 0;
  const totalPriceCents = Math.max(0, rawTotalPriceCents - discountCents);

  const handleApplyCoupon = () => {
    if (appliedCoupon) {
      setAppliedCoupon(null);
      setDiscountPercent(0);
      setCouponDraft("");
      setCouponError(null);
      void triggerHaptic("light");
      return;
    }
    const code = couponDraft.trim().toUpperCase();
    if (!code) return;
    void triggerHaptic("medium");
    if (code === "AIRPAL5") {
      setAppliedCoupon("AIRPAL5");
      setDiscountPercent(5);
      setCouponError(null);
    } else if (code === "VIP10") {
      setAppliedCoupon("VIP10");
      setDiscountPercent(10);
      setCouponError(null);
    } else if (code === "EARLYBIRD") {
      setAppliedCoupon("EARLYBIRD");
      setDiscountPercent(15);
      setCouponError(null);
    } else if (code === "COMMUNITY20") {
      setAppliedCoupon("COMMUNITY20");
      setDiscountPercent(20);
      setCouponError(null);
    } else {
      setCouponError("Invalid or expired coupon code");
    }
  };

  const handleTierClick = (newTier: "standard" | "vip" | "group") => {
    void triggerHaptic("selection");
    onTierChange(newTier);
  };

  const handleSpotClick = (qty: number) => {
    void triggerHaptic("selection");
    onSpotsChange(qty);
  };

  return (
    <div
      className={cn(
        "rounded-[28px] bg-card/95 p-5 ring-1 ring-line/80 shadow-clay backdrop-blur-xl space-y-4",
        className,
      )}
    >
      {/* Card Header & Price Pill */}
      <div className="flex items-center justify-between border-b border-line/60 pb-3">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-xl bg-brand/10 text-accent ring-1 ring-brand/20">
            <Ticket size={16} />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink">Registration &amp; Passes</h3>
            <p className="text-[11px] text-mute">Reserve your entry into the event</p>
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
        <label className="text-[11px] font-bold uppercase tracking-wider text-mute mb-2 block">Select Tier</label>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              { id: "standard", label: "General", desc: isPaid ? `$${(paidCents / 100).toFixed(0)}` : "Free RSVP" },
              {
                id: "vip",
                label: "VIP Pass",
                desc: isPaid ? `$${(Math.round(paidCents * 1.5) / 100).toFixed(0)}` : "VIP Entry",
              },
              { id: "group", label: "Group (4)", desc: isPaid ? "10% Off" : "4 Passes" },
            ] as const
          ).map((t) => {
            const active = tier === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => handleTierClick(t.id)}
                className={cn(
                  "flex flex-col items-center justify-center rounded-2xl p-2.5 text-center transition active:scale-95 cursor-pointer ring-1",
                  active
                    ? "bg-brand text-white ring-brand shadow-sm"
                    : "bg-paper text-ink ring-line hover:bg-card hover:ring-brand/30",
                )}
              >
                <span className="text-xs font-bold">{t.label}</span>
                <span className={cn("text-[10px] mt-0.5", active ? "text-amber-300 font-semibold" : "text-mute")}>
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
          <span className="text-xs font-semibold text-mute">Number of passes:</span>
          <div className="flex items-center gap-1.5">
            {[1, 2, 4].map((qty) => (
              <button
                key={qty}
                type="button"
                onClick={() => handleSpotClick(qty)}
                className={cn(
                  "h-8 w-8 rounded-xl text-xs font-bold transition active:scale-95 ring-1 cursor-pointer",
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

      {/* Coupon Code Input */}
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
              disabled={Boolean(appliedCoupon)}
              placeholder="Coupon or promo code"
              aria-label="Coupon or promo code"
              className="h-10 flex-1 rounded-xl bg-paper px-3 text-xs uppercase tracking-wider font-semibold text-ink ring-1 ring-line outline-none focus:ring-2 focus:ring-brand/30 disabled:opacity-75"
            />
            <button
              type="button"
              onClick={handleApplyCoupon}
              className="h-10 px-3.5 rounded-xl bg-paper ring-1 ring-line text-xs font-bold text-accent hover:bg-card active:scale-95 cursor-pointer shrink-0"
            >
              {appliedCoupon ? "Remove" : "Apply"}
            </button>
          </div>
          {couponError && <p className="text-[11px] text-red-500 font-medium mt-1">{couponError}</p>}
          {appliedCoupon && (
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1 flex items-center gap-1">
              <Check size={12} strokeWidth={3} /> {appliedCoupon} applied ({discountPercent}% discount)
            </p>
          )}
        </div>
      )}

      {/* Capacity & Price Breakdown */}
      <div className="rounded-2xl bg-paper p-3 border border-line/60 space-y-1.5 text-xs">
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
            onSubmit(appliedCoupon || undefined, totalPriceCents);
          }}
          disabled={buying}
          className={cn(
            "w-full h-13 rounded-full text-sm sm:text-base font-bold shadow-md transition active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60",
            isGoing
              ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-600/20"
              : "bg-brand text-white hover:brightness-105 shadow-brand/20",
          )}
        >
          {buying ? (
            <span>Processing…</span>
          ) : isGoing ? (
            <>
              <Check size={18} strokeWidth={3} />
              <span>You're Going ✓</span>
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

      <div className="flex items-center justify-center gap-1.5 text-[11px] text-mute text-center pt-0.5">
        <QrCode size={12} className="text-amber-500" />
        <span>1-tap Apple &amp; Google Wallet pass · Gate QR check-in</span>
      </div>
    </div>
  );
}
