import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Building2, Check, ChevronDown, ShieldAlert, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { TabPills } from "@/components/ui/TabPills";
import { ValidField, fieldInput } from "@/components/forms/ValidField";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/cn";
import { isV3AdaptersEnabled } from "@/lib/v3/gate";
import { v3ListPlaceClaims, v3ReviewPlaceClaim } from "@/lib/v3/client";
import { claimCategoryLabel } from "@/lib/v3/claim-categories";

type ClaimRow = {
  id: string;
  placeId: string;
  googlePlaceId: string;
  businessName: string;
  city: string;
  category: string;
  address: string;
  proofNote: string;
  contactEmail: string;
  state: string;
  reason: string;
};

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function parseRow(raw: Record<string, unknown>): ClaimRow {
  return {
    id: asString(raw.id),
    placeId: asString(raw.placeId),
    googlePlaceId: asString(raw.googlePlaceId),
    businessName: asString(raw.businessName),
    city: asString(raw.city),
    category: asString(raw.category),
    address: asString(raw.address),
    proofNote: asString(raw.proofNote),
    contactEmail: asString(raw.contactEmail),
    state: asString(raw.state),
    reason: asString(raw.reason),
  };
}

const STATE_FILTERS = [
  { id: "pending", label: "Pending" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
];

/**
 * Admin venue-claim review queue. Lists server-filtered claims and decides
 * them through V3 callables — the queue never touches Firestore directly.
 */
export function ClaimReviewQueue() {
  const { isAdmin } = useAuth();
  const [filter, setFilter] = useState("pending");
  const [rows, setRows] = useState<ClaimRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [overrides, setOverrides] = useState({ businessName: "", city: "", category: "", address: "" });
  const [deciding, setDeciding] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await v3ListPlaceClaims({ state: filter as "pending" | "approved" | "rejected" });
      setRows(res.claims.map(parseRow));
    } catch (err) {
      setRows([]);
      setError(err instanceof Error ? err.message : "Could not load claims.");
    }
  }, [filter]);

  useEffect(() => {
    if (isV3AdaptersEnabled() && isAdmin) void load();
  }, [isAdmin, load]);

  if (!isV3AdaptersEnabled()) {
    return (
      <EmptyState
        kicker="Local Preview"
        title="Claim Reviews"
        body="The review queue runs against the local emulator in this build."
      />
    );
  }

  if (!isAdmin) {
    return (
      <EmptyState
        kicker="Admins Only"
        title="Claim Reviews"
        body="Venue claim decisions need a platform admin account."
      />
    );
  }

  function resetDecision() {
    setOpenId(null);
    setReason("");
    setReasonError(null);
    setOverrides({ businessName: "", city: "", category: "", address: "" });
  }

  async function decide(row: ClaimRow, decision: "approved" | "rejected") {
    if (decision === "rejected" && !reason.trim()) {
      setReasonError("Add a reason so the claimant knows what proof to bring next time.");
      return;
    }
    setDeciding(`${row.placeId}:${decision}`);
    try {
      await v3ReviewPlaceClaim({
        placeId: row.placeId,
        claimantUid: row.id,
        decision,
        reason: reason.trim() || undefined,
        businessName: overrides.businessName.trim() || undefined,
        city: overrides.city.trim() || undefined,
        category: overrides.category.trim() || undefined,
        address: overrides.address.trim() || undefined,
      });
      toast.success(decision === "approved" ? "Claim approved. Draft venue minted." : "Claim rejected.");
      resetDecision();
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not decide this claim.");
    } finally {
      setDeciding(null);
    }
  }

  return (
    <div className="space-y-4">
      <TabPills ariaLabel="Claim states" items={STATE_FILTERS} active={filter} onChange={setFilter} />
      {error ? (
        <p role="alert" className="rounded-2xl bg-ember/10 px-4 py-3 text-sm font-medium text-ember">
          {error}
        </p>
      ) : null}
      {rows === null ? (
        <div className="space-y-3" aria-label="Loading claims">
          {[0, 1, 2].map((row) => (
            <div key={row} className="h-28 animate-pulse rounded-3xl bg-card ring-1 ring-line" aria-hidden />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState title={`No ${filter} claims`} body="New venue claims land here for review." />
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => {
            const open = openId === row.id;
            return (
              <li key={`${row.placeId}:${row.id}`} className="rounded-3xl bg-card p-5 ring-1 ring-line shadow-clay">
                <div className="flex items-start gap-3">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand/10 text-accent">
                    <Building2 size={20} aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-display truncate text-[17px] font-bold">{row.businessName || "Unnamed venue"}</p>
                    <p className="mt-0.5 truncate text-sm text-mute">
                      {row.city || "Unknown city"} · {claimCategoryLabel(row.category)}
                    </p>
                    <p className="mt-1 break-all font-mono text-[12px] text-mute">{row.googlePlaceId}</p>
                  </div>
                  <span
                    className={cn(
                      "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-bold",
                      row.state === "approved" && "bg-leaf/15 text-leaf",
                      row.state === "rejected" && "bg-ember/10 text-ember",
                      row.state === "pending" && "bg-mango/20 text-espresso",
                    )}
                  >
                    {row.state === "approved" ? <Check size={13} strokeWidth={3} aria-hidden /> : null}
                    {row.state === "rejected" ? <X size={13} strokeWidth={3} aria-hidden /> : null}
                    {row.state === "pending" ? "Pending" : row.state === "approved" ? "Approved" : "Rejected"}
                  </span>
                </div>
                <p className="mt-3 line-clamp-3 text-sm leading-relaxed">{row.proofNote || "No proof note."}</p>
                {row.contactEmail ? <p className="mt-1 truncate text-[13px] text-mute">{row.contactEmail}</p> : null}
                {filter === "pending" ? (
                  <div className="mt-4">
                    {open ? (
                      <div className="space-y-3 rounded-2xl bg-paper p-4 ring-1 ring-line">
                        <ValidField
                          label="Decision note"
                          error={reasonError}
                          hint="Required to reject; kept with the audit trail."
                        >
                          <input
                            className={cn(
                              fieldInput,
                              reasonError && "border-ember focus:border-ember focus:ring-ember/20",
                            )}
                            value={reason}
                            onChange={(event) => {
                              setReason(event.target.value);
                              setReasonError(null);
                            }}
                            placeholder="Verified against the Google listing…"
                            maxLength={500}
                          />
                        </ValidField>
                        <details className="rounded-2xl bg-card px-4 py-3 ring-1 ring-line">
                          <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between text-sm font-semibold">
                            Correct the venue details
                            <ChevronDown size={16} aria-hidden className="text-mute" />
                          </summary>
                          <div className="grid gap-3 pb-1 pt-3 sm:grid-cols-2">
                            {(
                              [
                                ["businessName", "Business name"],
                                ["city", "City"],
                                ["category", "Category"],
                                ["address", "Address"],
                              ] as const
                            ).map(([key, label]) => (
                              <ValidField key={key} label={label}>
                                <input
                                  className={fieldInput}
                                  value={overrides[key]}
                                  onChange={(event) => setOverrides({ ...overrides, [key]: event.target.value })}
                                  placeholder={row[key === "businessName" ? "businessName" : key] || "—"}
                                  maxLength={200}
                                />
                              </ValidField>
                            ))}
                          </div>
                        </details>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            onClick={() => void decide(row, "approved")}
                            loading={deciding === `${row.placeId}:approved`}
                          >
                            <ShieldCheck size={16} aria-hidden /> Approve Claim
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => void decide(row, "rejected")}
                            loading={deciding === `${row.placeId}:rejected`}
                          >
                            <ShieldAlert size={16} aria-hidden /> Reject Claim
                          </Button>
                          <Button size="sm" variant="ghost" onClick={resetDecision}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button size="sm" variant="outlined" onClick={() => setOpenId(row.id)}>
                        Review Claim
                      </Button>
                    )}
                  </div>
                ) : row.reason ? (
                  <p className="mt-2 text-[13px] text-mute">Decision note: {row.reason}</p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
