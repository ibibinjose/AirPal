import { useCallback, useEffect, useState } from "react";
import { BadgePercent, Plus } from "lucide-react";
import { toast } from "sonner";
import { listEventCouponsRemote, upsertEventCouponRemote } from "@/lib/functions";
import { normalizeCouponCode } from "@shared/event";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

interface CouponRow {
  code: string;
  percentOff: number;
  active: boolean;
  maxRedemptions: number | null;
  redemptions: number;
}

/**
 * Organiser coupon manager: create codes, toggle them, watch redemptions.
 * Guests can never read codes here — validation runs server-side at checkout.
 */
export function EventCouponManager({ eventId }: { eventId: string }) {
  const [coupons, setCoupons] = useState<CouponRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [code, setCode] = useState("");
  const [percent, setPercent] = useState("10");
  const [cap, setCap] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await listEventCouponsRemote({ eventId });
      setCoupons(res.coupons);
    } catch {
      /* backend unreachable — manager stays empty rather than guessing */
    } finally {
      setLoaded(true);
    }
  }, [eventId]);

  useEffect(() => {
    setLoaded(false);
    setCoupons([]);
    void load();
  }, [load]);

  const create = async () => {
    const normalized = normalizeCouponCode(code);
    if (!normalized) {
      toast.error("Code must be 3–16 letters or numbers.");
      return;
    }
    setSaving(true);
    try {
      await upsertEventCouponRemote({
        eventId,
        code: normalized,
        percentOff: Number(percent),
        active: true,
        maxRedemptions: cap.trim() ? Number(cap) : null,
      });
      toast.success(`Coupon ${normalized} is live.`);
      setCode("");
      setPercent("10");
      setCap("");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save coupon.");
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (row: CouponRow) => {
    try {
      await upsertEventCouponRemote({
        eventId,
        code: row.code,
        percentOff: row.percentOff,
        active: !row.active,
        maxRedemptions: row.maxRedemptions,
      });
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't update coupon.");
    }
  };

  return (
    <div className="rounded-[28px] bg-card p-5 ring-1 ring-line shadow-clay space-y-4">
      <div className="flex items-center gap-2.5">
        <span className="grid h-9 w-9 place-items-center rounded-2xl bg-brand/10 text-accent">
          <BadgePercent size={18} aria-hidden="true" />
        </span>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-accent">Discount codes</p>
          <p className="text-[11px] text-mute">Validated server-side at checkout — never client math.</p>
        </div>
      </div>

      {loaded && coupons.length > 0 && (
        <ul className="space-y-2">
          {coupons.map((row) => (
            <li
              key={row.code}
              className="flex flex-wrap items-center gap-3 rounded-2xl bg-paper px-3.5 py-2.5 ring-1 ring-line/70 sm:flex-nowrap"
            >
              <span className="font-mono text-sm font-bold tracking-widest text-ink">{row.code}</span>
              <span className="text-xs font-semibold text-emerald-700">{row.percentOff}% off</span>
              <span className="text-[11px] text-mute">
                {row.redemptions} used{row.maxRedemptions ? ` / ${row.maxRedemptions}` : ""}
              </span>
              <button
                type="button"
                onClick={() => void toggle(row)}
                aria-pressed={row.active}
                className={cn(
                  "ml-auto whitespace-nowrap rounded-full px-3 py-1.5 text-[11px] font-bold transition active:scale-95",
                  row.active
                    ? "bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/30"
                    : "bg-paper text-mute ring-1 ring-line",
                )}
              >
                {row.active ? "Live" : "Off"}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="grid grid-cols-2 items-end gap-2 sm:grid-cols-[1fr_76px_76px_auto]">
        <div className="col-span-2 sm:col-span-1">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-mute mb-1 block">Code</label>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="MATES10"
            maxLength={16}
            className="h-11 w-full rounded-xl border border-line bg-paper px-3 font-mono text-sm font-bold tracking-widest outline-none transition focus:border-brand"
          />
        </div>
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wider text-mute mb-1 block">% off</label>
          <input
            value={percent}
            onChange={(e) => setPercent(e.target.value)}
            placeholder="10"
            inputMode="numeric"
            className="h-11 w-full rounded-xl border border-line bg-paper px-3 text-sm outline-none transition focus:border-brand"
          />
        </div>
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wider text-mute mb-1 block">Cap</label>
          <input
            value={cap}
            onChange={(e) => setCap(e.target.value)}
            placeholder="—"
            inputMode="numeric"
            className="h-11 w-full rounded-xl border border-line bg-paper px-3 text-sm outline-none transition focus:border-brand"
          />
        </div>
        <Button
          type="button"
          variant="tonal"
          disabled={saving}
          onClick={() => void create()}
          className="col-span-2 h-11 justify-center gap-1 px-3.5 sm:col-span-1"
        >
          <Plus size={15} aria-hidden="true" />
          <span>{saving ? "…" : "Add"}</span>
        </Button>
      </div>
    </div>
  );
}
