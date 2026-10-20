import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase";
import type { PartnerApplication, PartnerApplicationStatus } from "@shared/partner";
import {
  fetchPartnerApplicationsByStatus,
  reviewPartnerApplicationRemote,
  type ReviewDecision,
} from "@/lib/partner-dashboard";

const STATUS_FILTERS: Array<{ id: PartnerApplicationStatus | "all"; label: string }> = [
  { id: "submitted", label: "Submitted" },
  { id: "under_review", label: "Under review" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
  { id: "withdrawn", label: "Withdrawn" },
];

export function PartnerApplicationQueue({
  rows,
  loading,
  busyId,
  onReview,
}: {
  rows: PartnerApplication[];
  loading: boolean;
  busyId: string | null;
  onReview: (applicationId: string, decision: ReviewDecision, reason: string) => void;
}) {
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  if (loading) {
    return (
      <p role="status" className="mt-3 text-sm text-mute">
        Loading applications…
      </p>
    );
  }
  if (rows.length === 0) {
    return <p className="mt-3 text-sm text-mute">No applications in this state.</p>;
  }

  return (
    <div>
      {error ? (
        <p role="alert" className="mt-3 text-sm font-medium text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
      <ul className="mt-3 space-y-3">
        {rows.map((row) => (
          <li key={row.id} className="rounded-2xl bg-paper px-4 py-3 ring-1 ring-line/60">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="min-w-0">
                <span className="font-semibold text-ink">{row.businessName}</span>
                <span className="text-mute">
                  {" "}
                  · {row.category} · {row.contactName} · {row.contactEmail}
                </span>
              </span>
              <span className="text-xs text-mute">
                filed {row.createdAt ? new Date(row.createdAt).toLocaleString() : "recently"}
                {row.updatedAt ? ` · updated ${new Date(row.updatedAt).toLocaleString()}` : ""}
              </span>
            </div>
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink">{row.pitch}</p>
            {row.website || row.listingId ? (
              <p className="mt-1 text-xs text-mute">
                {[row.website, row.listingId ? `listing ${row.listingId}` : ""].filter(Boolean).join(" · ")}
              </p>
            ) : null}
            {row.adminNote ? (
              <p className="mt-1 text-xs text-mute">
                <span className="font-semibold">Reviewer note: </span>
                {row.adminNote}
              </p>
            ) : null}
            {(row.status === "submitted" || row.status === "under_review") && (
              <div className="mt-3 space-y-2">
                <label htmlFor={`reason-${row.id}`} className="block text-xs font-semibold text-ink">
                  Reviewer note{" "}
                  <span className="font-normal text-mute">(required for rejection, shown to applicant)</span>
                </label>
                <textarea
                  id={`reason-${row.id}`}
                  rows={2}
                  value={reasons[row.id] || ""}
                  onChange={(e) => setReasons((prev) => ({ ...prev, [row.id]: e.target.value }))}
                  placeholder="e.g. Approved — welcome aboard. / Rejected — outside coverage area."
                  className="w-full rounded-2xl border border-line bg-card px-3 py-2 text-[16px] sm:text-[13px] outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    disabled={busyId === row.id}
                    onClick={() => {
                      setError("");
                      onReview(row.id, "approve", (reasons[row.id] || "").slice(0, 500));
                    }}
                    className="min-h-[44px]"
                  >
                    {busyId === row.id ? "Working…" : "Approve"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busyId === row.id}
                    onClick={() => {
                      const reason = (reasons[row.id] || "").trim();
                      if (!reason) {
                        setError("Add a reason before rejecting — the applicant sees it.");
                        return;
                      }
                      setError("");
                      onReview(row.id, "reject", reason.slice(0, 500));
                    }}
                    className="min-h-[44px]"
                  >
                    {busyId === row.id ? "Working…" : "Reject with reason"}
                  </Button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Pass partner application review queue: approve/reject via the callable (audited server-side). */
export function PartnerApplicationsAdmin() {
  const { isAdmin } = useAuth();
  const [filter, setFilter] = useState<PartnerApplicationStatus>("submitted");
  const [rows, setRows] = useState<PartnerApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    const db = getFirebaseDb();
    if (!db || !isFirebaseConfigured || !isAdmin) {
      setLoading(false);
      return;
    }
    setLoading(true);
    void fetchPartnerApplicationsByStatus(filter)
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [filter, isAdmin]);

  async function onReview(applicationId: string, decision: ReviewDecision, reason: string) {
    setBusyId(applicationId);
    setActionError("");
    try {
      const res = await reviewPartnerApplicationRemote({ applicationId, decision, reason });
      setRows((list) =>
        list
          .map((r) =>
            r.id === applicationId
              ? { ...r, status: res.status as PartnerApplicationStatus, adminNote: reason || r.adminNote }
              : r,
          )
          .filter((r) => r.status === filter),
      );
    } catch {
      setActionError("Review failed — the application may have moved already. Refresh and try again.");
    } finally {
      setBusyId(null);
    }
  }

  if (!isAdmin) return null;

  return (
    <section className="mt-8 rounded-[28px] bg-card p-4 ring-1 ring-line" aria-label="Partner applications">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-accent">Pass partners</p>
      <h2 className="font-display mt-1 text-lg font-semibold">Partner applications</h2>
      <p className="mt-1 text-xs text-mute">
        Approve mints the public Partner profile; every decision is audit-logged server-side with timestamps.
      </p>
      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Filter by status">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setFilter(s.id as PartnerApplicationStatus)}
            aria-pressed={filter === s.id}
            className={`inline-flex min-h-[44px] items-center rounded-full px-4 text-xs font-bold transition ${
              filter === s.id ? "bg-brand text-white" : "bg-paper text-ink ring-1 ring-line hover:bg-paper/70"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
      {actionError ? (
        <p role="alert" className="mt-3 text-sm font-medium text-red-600 dark:text-red-400">
          {actionError}
        </p>
      ) : null}
      <PartnerApplicationQueue rows={rows} loading={loading} busyId={busyId} onReview={onReview} />
    </section>
  );
}
