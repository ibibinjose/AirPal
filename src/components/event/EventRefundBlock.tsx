import { ReceiptText } from "lucide-react";

/** Refund & transfer policy. Hidden when the host set none. */
export function EventRefundBlock({ policy }: { policy?: string }) {
  if (!policy || !policy.trim()) return null;
  return (
    <section aria-label="Refunds and transfers" className="rounded-3xl bg-card p-5 ring-1 ring-line space-y-2">
      <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-ink">
        <ReceiptText size={14} className="text-accent" aria-hidden="true" />
        <span>Refunds & Transfers</span>
      </h3>
      <p className="text-sm leading-relaxed text-ink/90 whitespace-pre-line">{policy.trim()}</p>
    </section>
  );
}
