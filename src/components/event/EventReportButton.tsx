import { useEffect, useRef, useState } from "react";
import { addDoc, collection } from "firebase/firestore";
import { Flag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase";
import { triggerHaptic } from "@/lib/native";
import { REPORT_REASONS, REPORT_REASON_LABELS, reportValid, type ReportReason } from "@shared/safety";

/**
 * Report this event to the AirPal trust team. Writes a real `safety_reports`
 * row (target "event") — every report opens a case a person reviews.
 * Signed-in, non-anonymous accounts only (rule-enforced).
 */
export function EventReportButton({ eventId, eventTitle }: { eventId: string; eventTitle: string }) {
  const { user, requireUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>("scam-or-payment");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function fileReport() {
    if (!requireUser("Sign in to report this event.")) return;
    if (!user) return;
    const input = { target: "event" as const, targetUid: eventId, reason, details: details.trim() };
    if (!reportValid(input)) {
      toast.error("Tell us what happened in at least 10 characters so the team can act.");
      return;
    }
    const db = getFirebaseDb();
    if (!db || !isFirebaseConfigured) {
      toast.error("Connect Firebase first — reports go through the live backend.");
      return;
    }
    void triggerHaptic("medium");
    setBusy(true);
    try {
      const now = new Date().toISOString();
      await addDoc(collection(db, "safety_reports"), {
        reporterUid: user.uid,
        target: input.target,
        targetUid: eventId,
        eventTitle,
        reason,
        details: input.details,
        status: "new",
        adminNote: "",
        createdAt: now,
        updatedAt: now,
      });
      toast.success("Report filed — the trust team will review it.");
      setOpen(false);
      setDetails("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't file the report. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => {
          void triggerHaptic("light");
          setOpen((v) => !v);
        }}
        aria-expanded={open}
        className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-mute ring-1 ring-line transition hover:bg-paper hover:text-ink active:scale-95 cursor-pointer touch-manipulation"
      >
        <Flag size={13} aria-hidden="true" />
        <span>Report event</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-72 rounded-2xl border border-line bg-card p-4 shadow-xl">
          <p className="text-xs font-bold uppercase tracking-wider text-ink">Report this event</p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-mute">
            Every report opens a case a person reviews. In danger now? Call local emergency services first.
          </p>
          <label className="mt-3 block text-xs font-semibold">
            Reason
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as ReportReason)}
              className="mt-1 min-h-[44px] w-full rounded-xl border border-line bg-paper px-2.5 text-[16px] sm:text-[13px] outline-none focus:border-brand"
            >
              {REPORT_REASONS.map((r) => (
                <option key={r} value={r}>
                  {REPORT_REASON_LABELS[r]}
                </option>
              ))}
            </select>
          </label>
          <label className="mt-2 block text-xs font-semibold">
            What happened?
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={3}
              placeholder="What happened, in your words (min 10 characters)…"
              className="mt-1 w-full rounded-xl border border-line bg-paper px-2.5 py-2 text-[16px] sm:text-[13px] outline-none placeholder:text-mute focus:border-brand"
            />
          </label>
          <div className="mt-3 flex gap-2">
            <Button size="sm" variant="ghost" className="flex-1" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" className="flex-1" disabled={busy} loading={busy} onClick={() => void fileReport()}>
              File report
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
