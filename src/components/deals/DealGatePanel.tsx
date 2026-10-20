import { useCallback, useEffect, useRef, useState } from "react";
import { BadgeCheck, Loader2, ScanLine, ShieldAlert, TicketX } from "lucide-react";
import { toast } from "sonner";
import { consumePromotionRedemptionRemote, verifyPromotionRedemptionRemote } from "@/lib/functions";
import { createSubmitGuard } from "@/lib/submit-guard";
import { Button } from "@/components/ui/Button";

type GateDeal = {
  promotionId: string;
  code: string;
  title: string;
  status: string;
  pointsSpent: number;
  redeemedAt: string | null;
  valid: boolean;
  reason: "already_redeemed" | "expired" | "not_found" | null;
};

function callableCode(err: unknown): string {
  return (err as { code?: string } | null)?.code || "";
}

function isSilentDenial(err: unknown): boolean {
  const code = callableCode(err);
  return (
    code === "functions/permission-denied" ||
    code === "permission-denied" ||
    code === "functions/not-found" ||
    code === "not-found" ||
    code === "functions/unauthenticated" ||
    code === "unauthenticated" ||
    code === "functions/invalid-argument" ||
    code === "invalid-argument"
  );
}

/**
 * Merchant-scan card for promotion vouchers. Renders only for staff the
 * server entitles (the promotion owner or an admin); everyone else sees the
 * denial as an answer, never a blank screen.
 */
export function DealGatePanel({
  promotionId,
  code,
  deniedMessage,
}: {
  promotionId: string;
  code: string;
  deniedMessage?: string;
}) {
  const [deal, setDeal] = useState<GateDeal | null>(null);
  const [denied, setDenied] = useState(false);
  const [failed, setFailed] = useState(false);
  const [consuming, setConsuming] = useState(false);
  const guardRef = useRef(createSubmitGuard());

  const verify = useCallback(
    async (isCancelled?: () => boolean) => {
      setFailed(false);
      try {
        const res = await verifyPromotionRedemptionRemote({ promotionId, code });
        if (isCancelled?.()) return;
        setDeal(res);
      } catch (err) {
        if (isCancelled?.()) return;
        if (isSilentDenial(err)) {
          setDenied(true);
          return;
        }
        setFailed(true);
      }
    },
    [promotionId, code],
  );

  useEffect(() => {
    let cancelled = false;
    setDeal(null);
    setDenied(false);
    void verify(() => cancelled);
    return () => {
      cancelled = true;
    };
  }, [verify]);

  async function consume() {
    if (!guardRef.current.tryAcquire()) return;
    setConsuming(true);
    try {
      const res = await consumePromotionRedemptionRemote({ promotionId, code });
      setDeal((prev) => (prev ? { ...prev, valid: false, status: "redeemed", redeemedAt: res.redeemedAt } : prev));
      toast.success(`Code ${code} marked as used.`);
    } catch (err) {
      if (isSilentDenial(err)) {
        setDenied(true);
        return;
      }
      toast.error(err instanceof Error && err.message ? err.message : "Couldn't redeem this code.");
      void verify();
    } finally {
      setConsuming(false);
    }
  }

  return (
    <section aria-label="Voucher check" className="rounded-3xl bg-card p-4 ring-1 ring-line shadow-xs">
      {(denied || deal?.reason === "not_found") && (
        <p className="flex items-center gap-2 text-sm font-semibold leading-5 text-mute">
          <ShieldAlert size={16} className="shrink-0" /> {deniedMessage || "Only this offer's owner can verify codes."}
        </p>
      )}
      {!denied && !deal && !failed && (
        <p className="flex items-center gap-2 text-sm font-semibold text-mute" aria-busy="true">
          <Loader2 size={16} className="animate-spin" /> Verifying voucher…
        </p>
      )}
      {!denied && failed && !deal && (
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-red-500/10 text-red-600">
            <TicketX size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-ink">Couldn&apos;t verify this voucher</p>
            <p className="text-xs text-mute">Check the connection and retry.</p>
          </div>
          <Button size="sm" variant="outlined" onClick={() => void verify()}>
            Retry
          </Button>
        </div>
      )}
      {!denied && deal && deal.reason !== "not_found" && (
        <div>
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-mute">
            <ScanLine size={14} /> Gate · Voucher {code}
          </p>
          <p className="mt-1.5 text-lg font-bold leading-snug text-ink">{deal.title || "Member offer"}</p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {deal.valid ? (
              <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-500/25">
                Valid — ready to redeem
              </span>
            ) : (
              <span className="rounded-full bg-red-500/10 px-2.5 py-1 text-[11px] font-bold text-red-700 ring-1 ring-red-500/25">
                {deal.reason === "already_redeemed" || deal.status === "redeemed"
                  ? `Already used${deal.redeemedAt ? ` ${deal.redeemedAt.slice(0, 10)}` : ""}`
                  : "No entry"}
              </span>
            )}
          </div>
          {deal.valid && (
            <Button className="mt-3 w-full gap-1.5" disabled={consuming} onClick={() => void consume()}>
              <BadgeCheck size={16} />
              {consuming ? "Redeeming…" : "Mark redeemed"}
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
