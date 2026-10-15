import { afterEach, describe, expect, it, vi } from "vitest";

const { fakes, FakeHttpsError } = vi.hoisted(() => {
  class FakeHttpsError extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.code = code;
    }
  }
  return {
    FakeHttpsError,
    fakes: {
      isAdmin: true,
      live: true,
      bookings: {} as Record<string, Record<string, unknown>>,
      payments: {} as Record<string, Record<string, unknown>>,
      payouts: {} as Record<string, Record<string, unknown>>,
      charges: {} as Record<string, Record<string, unknown>>,
      transfers: {} as Record<string, Record<string, unknown>>,
      writes: [] as { id: string; data: Record<string, unknown> }[],
      audits: [] as unknown[],
      releases: [] as string[],
      reversals: [] as string[],
      stripeReads: 0,
    },
  };
});

function storeFor(name: string): Record<string, Record<string, unknown>> {
  if (name === "bookings") return fakes.bookings;
  if (name === "payments") return fakes.payments;
  if (name === "payouts") return fakes.payouts;
  throw new Error(`unexpected collection ${name}`);
}

vi.mock("./admin", () => ({
  requireAccount: (request: { auth?: { uid?: string } }) => {
    const uid = request.auth?.uid;
    if (!uid) throw new FakeHttpsError("unauthenticated", "Sign in.");
    return uid;
  },
  isPlatformAdmin: () => fakes.isAdmin,
  db: {
    collection: (name: string) => ({
      doc: (id: string) => ({
        get: async () => {
          const data = storeFor(name)[id];
          return { exists: Boolean(data), id, data: () => data };
        },
        set: async (data: Record<string, unknown>) => {
          fakes.writes.push({ id: `${name}/${id}`, data });
          storeFor(name)[id] = { ...storeFor(name)[id], ...data };
        },
      }),
      limit: (n: number) => ({
        get: async () => {
          const docs = Object.entries(storeFor(name)).slice(0, n);
          return {
            docs: docs.map(([id, data]) => ({
              id,
              data: () => data,
              ref: {
                update: async (patch: Record<string, unknown>) => {
                  fakes.writes.push({ id: `${name}/${id}`, data: patch });
                  storeFor(name)[id] = { ...storeFor(name)[id], ...patch };
                },
              },
            })),
          };
        },
      }),
      where: (field: string, op: string, value: unknown) => ({
        limit: (n: number) => ({
          get: async () => {
            const docs = Object.entries(storeFor(name))
              .filter(([, data]) => (op === "==" ? data[field] === value : false))
              .slice(0, n);
            return {
              docs: docs.map(([id, data]) => ({
                id,
                data: () => data,
                ref: {
                  update: async (patch: Record<string, unknown>) => {
                    fakes.writes.push({ id: `${name}/${id}`, data: patch });
                    storeFor(name)[id] = { ...storeFor(name)[id], ...patch };
                  },
                },
              })),
            };
          },
        }),
      }),
    }),
  },
}));

vi.mock("./abuse", () => ({
  noteAppCheck: async () => undefined,
  enforceRateLimit: async () => undefined,
  writeAudit: async (row: unknown) => {
    fakes.audits.push(row);
  },
}));

vi.mock("firebase-functions/v2/https", () => ({
  HttpsError: FakeHttpsError,
  onCall: vi.fn((_opts: unknown, handler: unknown) => handler),
}));

function missing(): never {
  throw Object.assign(new Error("No such charge"), { code: "resource_missing" });
}

vi.mock("./stripe", () => ({
  STRIPE_CALLABLE: {},
  stripeLiveConfigured: () => fakes.live,
  makeStripe: () => ({
    charges: {
      retrieve: async (id: string) => {
        fakes.stripeReads += 1;
        const charge = fakes.charges[id];
        if (!charge) missing();
        return { id, ...charge };
      },
    },
    transfers: {
      retrieve: async (id: string) => {
        fakes.stripeReads += 1;
        const transfer = fakes.transfers[id];
        if (!transfer) missing();
        return { id, ...transfer };
      },
    },
  }),
  transferProviderShare: async (booking: { id: string }) => {
    fakes.releases.push(booking.id);
    if (booking.id === "bk-stuck-fail") {
      return { payoutStatus: "held", transferId: "", stripeAccountId: "acct_1", reason: "onboarding" };
    }
    return { payoutStatus: "transferred", transferId: `tr_${booking.id}`, stripeAccountId: "acct_1" };
  },
  reverseTransferForDispute: async (chargeId: string) => {
    fakes.reversals.push(chargeId);
  },
}));

import {
  firestoreFindings,
  payoutReconciliationReport,
  reconcilePayouts,
  stripeFindings,
  type MoneyBooking,
} from "./reconcile";

type Handler = (request: unknown) => Promise<Record<string, unknown>>;

function run(handler: unknown, uid: string | undefined, admin: boolean) {
  return (handler as unknown as Handler)({ auth: uid ? { uid, token: { platform_admin: admin } } : {}, data: {} });
}

const PAID = {
  status: "confirmed",
  paymentStatus: "paid",
  payoutStatus: "held",
  priceCents: 5000,
  providerUid: "org-1",
  eventId: "evt-1",
  stripeChargeId: "ch_1",
};

function charge(overrides: Record<string, unknown> = {}) {
  return { amount: 5000, refunded: false, amount_refunded: 0, disputed: false, dispute: null, ...overrides };
}

describe("reconcile classifiers", () => {
  it("flags stuck held payouts, ledger gaps, drift, and missing charges", () => {
    expect(firestoreFindings({ id: "b", ...PAID, status: "completed" } as never, false)).toContain("stuck_held");
    expect(
      firestoreFindings(
        { id: "b", ...PAID, payoutStatus: "transferred", stripeTransferId: "tr_1" } as never,
        false,
      ),
    ).toContain("missing_ledger");
    expect(firestoreFindings({ id: "b", ...PAID, payoutStatus: "held" } as never, true)).toContain("status_drift");
    expect(firestoreFindings({ id: "b", ...PAID, stripeChargeId: undefined } as never, false)).toContain(
      "no_charge_id",
    );
  });

  it("ignores unpaid and free bookings", () => {
    expect(firestoreFindings({ id: "b", ...PAID, paymentStatus: "unpaid" } as never, false)).toEqual([]);
    expect(firestoreFindings({ id: "b", ...PAID, priceCents: 0 } as never, false)).toEqual([]);
  });

  it("routes held bookings with a transfer id to drift verification, not re-release", () => {
    const kinds = firestoreFindings(
      { id: "b", ...PAID, status: "completed", stripeTransferId: "tr_1" } as never,
      true,
    );
    expect(kinds).not.toContain("stuck_held");
    expect(kinds).toContain("status_drift");
  });

  it("classifies Stripe truth without ever auto-correcting money facts", () => {
    const booking = { id: "b", ...PAID } as MoneyBooking;
    expect(stripeFindings(booking, null)).toEqual(["stripe_missing"]);
    expect(stripeFindings(booking, charge({ refunded: true }) as never)).toEqual(["stripe_refunded"]);
    expect(
      stripeFindings(
        { ...booking, stripeTransferId: "tr_1" },
        charge({ refunded: true }) as never,
      ),
    ).toEqual(["refunded_after_transfer"]);
    expect(stripeFindings(booking, charge({ amount_refunded: 100 }) as never)).toEqual(["partial_refund"]);
    expect(stripeFindings(booking, charge({ disputed: true }) as never)).toEqual(["stripe_disputed"]);
    expect(stripeFindings(booking, charge({ amount: 4999 }) as never)).toEqual(["amount_mismatch"]);
  });
});

describe("payout reconciliation callables", () => {
  afterEach(() => {
    fakes.isAdmin = true;
    fakes.live = true;
    fakes.bookings = {};
    fakes.payments = {};
    fakes.payouts = {};
    fakes.charges = {};
    fakes.transfers = {};
    fakes.writes.length = 0;
    fakes.audits.length = 0;
    fakes.releases.length = 0;
    fakes.reversals.length = 0;
    fakes.stripeReads = 0;
  });

  it("denies anonymous callers and non-admins", async () => {
    await expect(run(payoutReconciliationReport, undefined, false)).rejects.toMatchObject({
      code: "unauthenticated",
    });
    fakes.isAdmin = false;
    await expect(run(payoutReconciliationReport, "org-1", false)).rejects.toMatchObject({
      code: "permission-denied",
    });
    await expect(run(reconcilePayouts, "org-1", false)).rejects.toMatchObject({ code: "permission-denied" });
  });

  it("reports GMV totals without writing anything", async () => {
    fakes.bookings = {
      "bk-held": { ...PAID, status: "completed" },
      "bk-open": { ...PAID },
    };
    fakes.payments = {
      "cs_1": { amountTotal: 5000, currency: "aud" },
      "cs_2": { amountTotal: 2500, currency: "aud" },
      "cs_fx": { amountTotal: 9999, currency: "usd" },
      "cs_bad": { amountTotal: "oops", currency: "aud" },
    };
    fakes.payouts = { "tr_9": { amountCents: 4000, feeCents: 1000 } };
    fakes.charges = { ch_1: charge() };

    const res = (await run(payoutReconciliationReport, "admin-1", true)) as unknown as {
      totals: Record<string, number>;
      findings: { kind: string; bookingId: string }[];
    };
    expect(res.totals).toMatchObject({
      gmvCents: 7500,
      paymentsCount: 2,
      paidBookings: 2,
      paidCents: 10000,
      heldCents: 10000,
      heldCount: 2,
      providerPaidCents: 4000,
      feesCents: 1000,
    });
    expect(res.findings).toContainEqual(expect.objectContaining({ kind: "stuck_held", bookingId: "bk-held" }));
    expect(fakes.writes).toEqual([]);
    expect(fakes.audits).toEqual([]);
    expect(fakes.releases).toEqual([]);
  });

  it("releases stuck held payouts and audits the correction", async () => {
    fakes.bookings = { "bk-held": { ...PAID, status: "completed" } };
    fakes.charges = { ch_1: charge() };

    const res = (await run(reconcilePayouts, "admin-1", true)) as unknown as {
      findings: { kind: string; bookingId: string; corrected?: boolean }[];
    };
    expect(fakes.releases).toEqual(["bk-held"]);
    expect(res.findings).toContainEqual({ kind: "stuck_held", bookingId: "bk-held", corrected: true });
    expect(fakes.bookings["bk-held"]).toMatchObject({ payoutStatus: "transferred", stripeTransferId: "tr_bk-held" });
    expect(fakes.audits).toHaveLength(1);
  });

  it("reports held_waiting when the transfer cannot release", async () => {
    fakes.bookings = { "bk-stuck-fail": { ...PAID, status: "completed" } };
    fakes.charges = { ch_1: charge() };

    const res = (await run(reconcilePayouts, "admin-1", true)) as unknown as {
      findings: { kind: string; bookingId: string }[];
    };
    expect(res.findings).toContainEqual({ kind: "held_waiting", bookingId: "bk-stuck-fail" });
    expect(fakes.bookings["bk-stuck-fail"]?.payoutStatus).toBe("held");
  });

  it("recreates a missing ledger doc from Stripe truth, or flags an orphan", async () => {
    fakes.bookings = {
      "bk-gap": { ...PAID, status: "completed", payoutStatus: "transferred", stripeTransferId: "tr_gap" },
      "bk-orphan": { ...PAID, status: "completed", payoutStatus: "transferred", stripeTransferId: "tr_nope" },
    };
    fakes.charges = { ch_1: charge() };
    fakes.transfers = { tr_gap: { amount: 4250, currency: "aud" } };

    const res = (await run(reconcilePayouts, "admin-1", true)) as unknown as {
      findings: { kind: string; bookingId: string; corrected?: boolean }[];
    };
    expect(res.findings).toContainEqual({ kind: "missing_ledger", bookingId: "bk-gap", corrected: true });
    expect(fakes.payouts["tr_gap"]).toMatchObject({ bookingId: "bk-gap", amountCents: 4250, feeCents: 750 });
    expect(res.findings).toContainEqual(
      expect.objectContaining({ kind: "ledger_orphan", bookingId: "bk-orphan" }),
    );
    expect(fakes.payouts["tr_nope"]).toBeUndefined();
  });

  it("syncs drifted statuses and Stripe-refunded bookings without touching Stripe money", async () => {
    fakes.bookings = {
      "bk-drift": { ...PAID, status: "completed", payoutStatus: "held", stripeTransferId: "tr_d" },
      "bk-ref": { ...PAID, status: "confirmed", stripeChargeId: "ch_ref" },
      "bk-ref-tx": { ...PAID, status: "confirmed", stripeChargeId: "ch_ref2", stripeTransferId: "tr_x" },
    };
    fakes.payouts = { tr_d: { amountCents: 4250, feeCents: 750 } };
    fakes.charges = {
      ch_1: charge(),
      ch_ref: charge({ refunded: true }),
      ch_ref2: charge({ refunded: true }),
    };
    fakes.transfers = { tr_d: { amount: 4250, currency: "aud" } };

    const res = (await run(reconcilePayouts, "admin-1", true)) as unknown as {
      findings: { kind: string; bookingId: string; corrected?: boolean }[];
    };
    expect(res.findings).toContainEqual({ kind: "status_drift", bookingId: "bk-drift", corrected: true });
    expect(fakes.bookings["bk-drift"]).toMatchObject({ payoutStatus: "transferred" });
    expect(res.findings).toContainEqual({ kind: "stripe_refunded", bookingId: "bk-ref", corrected: true });
    expect(fakes.bookings["bk-ref"]).toMatchObject({ paymentStatus: "refunded", status: "refunded" });
    expect(res.findings).toContainEqual(
      expect.objectContaining({ kind: "refunded_after_transfer", bookingId: "bk-ref-tx" }),
    );
    expect(fakes.bookings["bk-ref-tx"]?.paymentStatus).toBe("paid");
  });

  it("routes Stripe disputes through the guarded reversal path", async () => {
    fakes.bookings = { "bk-d": { ...PAID, status: "confirmed", stripeChargeId: "ch_d" } };
    fakes.charges = { ch_d: charge({ disputed: true }) };

    const res = (await run(reconcilePayouts, "admin-1", true)) as unknown as {
      findings: { kind: string; bookingId: string; corrected?: boolean }[];
    };
    expect(fakes.reversals).toEqual(["ch_d"]);
    expect(res.findings).toContainEqual({ kind: "stripe_disputed", bookingId: "bk-d", corrected: true });
  });

  it("flags mismatches and missing charges without correcting them", async () => {
    fakes.bookings = {
      "bk-mm": { ...PAID, stripeChargeId: "ch_mm" },
      "bk-gone": { ...PAID, stripeChargeId: "ch_gone" },
    };
    fakes.charges = { ch_mm: charge({ amount: 4999 }) };

    const res = (await run(reconcilePayouts, "admin-1", true)) as unknown as {
      findings: { kind: string; bookingId: string; corrected?: boolean }[];
    };
    expect(res.findings).toContainEqual(expect.objectContaining({ kind: "amount_mismatch", bookingId: "bk-mm" }));
    expect(res.findings).toContainEqual(expect.objectContaining({ kind: "stripe_missing", bookingId: "bk-gone" }));
    expect(fakes.writes).toEqual([]);
  });

  it("degrades to Firestore-only findings when Stripe is unconfigured", async () => {
    fakes.live = false;
    fakes.bookings = { "bk-held": { ...PAID, status: "completed" } };
    fakes.payments = { "cs_1": { amountTotal: 5000, currency: "aud" } };

    const res = (await run(payoutReconciliationReport, "admin-1", true)) as unknown as {
      stripeLive: boolean;
      totals: Record<string, number>;
      findings: { kind: string }[];
    };
    expect(res.stripeLive).toBe(false);
    expect(fakes.stripeReads).toBe(0);
    expect(res.totals.gmvCents).toBe(5000);
    expect(res.findings).toContainEqual(expect.objectContaining({ kind: "stuck_held" }));
  });
});
