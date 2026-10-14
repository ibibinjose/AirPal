import { beforeEach, describe, expect, it, vi } from "vitest";
import { FakeHttpsError, fakes, fakeDb, readDoc, resetFakes, runV3, seedDoc } from "./fakes";

const { stripeMock } = vi.hoisted(() => ({
  stripeMock: {
    sessionsCreate: async (..._args: unknown[]) => ({ id: "cs_test_mock", url: "https://checkout.test/cs-mock" }),
  } as { sessionsCreate: (...args: unknown[]) => Promise<Record<string, unknown>> },
}));

vi.mock("stripe", () => ({
  default: class StripeMock {
    checkout = {
      sessions: {
        create: (...args: unknown[]) => stripeMock.sessionsCreate(...args),
        retrieve: async () => ({ payment_status: "unpaid", status: "open" }),
      },
    };
    refunds = { create: async () => ({ id: "re_mock" }) };
    webhooks = { constructEvent: () => ({ type: "unknown", data: { object: {} } }) };
  },
}));

vi.mock("firebase-admin/firestore", () => ({
  FieldValue: {
    serverTimestamp: () => ({ __op: "timestamp" }),
    arrayUnion: (...values: unknown[]) => ({ __op: "union", values }),
    arrayRemove: (...values: unknown[]) => ({ __op: "remove", values }),
    delete: () => ({ __op: "delete" }),
  },
}));

vi.mock("../admin", () => ({
  CALLABLE: {},
  requireAuth: (uid: string | undefined) => {
    if (!uid) throw new FakeHttpsError("unauthenticated", "Sign in required.");
    return uid;
  },
  requireAccount: (request: { auth?: { uid?: string; token?: { firebase?: { sign_in_provider?: string } } } }) => {
    const uid = request.auth?.uid;
    if (!uid) throw new FakeHttpsError("unauthenticated", "Sign in required.");
    if (request.auth?.token?.firebase?.sign_in_provider === "anonymous") {
      throw new FakeHttpsError("failed-precondition", "Create an email account.");
    }
    return uid;
  },
  isPlatformAdmin: () => fakes.isAdmin,
  db: fakeDb,
}));

vi.mock("../abuse", () => ({
  noteAppCheck: async () => undefined,
  isAnonymousAuth: (request: { auth?: { token?: { firebase?: { sign_in_provider?: string } } } }) =>
    request.auth?.token?.firebase?.sign_in_provider === "anonymous",
  enforceRateLimit: async (uid: string, action: string) => {
    fakes.rateLimited.push(`${uid}:${action}`);
  },
}));

vi.mock("firebase-functions/v2/https", () => ({
  HttpsError: FakeHttpsError,
  onCall: vi.fn((_opts: unknown, handler: unknown) => handler),
  onRequest: vi.fn((_handler: unknown) => _handler),
}));

import { v3AdmitTicket, v3IssueTicket, v3UpsertEvent, v3VerifyTicket } from "./events";
import { v3CreateCheckout, v3ReconcileOrder, v3RefundOrder, v3StripeWebhook } from "./commerce";

const EVENT_INPUT = {
  title: "Rooftop Sessions",
  city: "Sydney",
  venueName: "Harbour Hall",
  startsAt: "2026-11-01T19:00:00+11:00",
  capacity: 100,
  ticketing: "complimentary",
  status: "published",
};

function seedEvent(eventId: string, overrides: Record<string, unknown> = {}) {
  seedDoc(`events/${eventId}`, {
    organiserUid: "org-1",
    status: "published",
    title: "Rooftop Sessions",
    description: "",
    city: "Sydney",
    venueName: "Harbour Hall",
    startsAt: "2026-11-01T19:00:00+11:00",
    capacity: 100,
    issuedCount: 0,
    ticketing: "complimentary",
    priceCents: 0,
    currency: "AUD",
    ...overrides,
  });
}

describe("v3 events and access", () => {
  beforeEach(() => {
    resetFakes();
  });

  it("upserts organiser-owned events and audits publishing", async () => {
    const res = (await runV3(v3UpsertEvent, "org-1", EVENT_INPUT)) as { eventId: string; status: string };
    expect(res.status).toBe("published");
    expect(readDoc(`events/${res.eventId}`)).toMatchObject({ organiserUid: "org-1", issuedCount: 0 });
    await expect(runV3(v3UpsertEvent, "uid-9", { ...EVENT_INPUT, eventId: res.eventId })).rejects.toMatchObject({
      code: "permission-denied",
    });
  });

  it("issues complimentary tickets idempotently and enforces capacity", async () => {
    seedEvent("evt-1", { capacity: 1 });
    const first = (await runV3(v3IssueTicket, "org-1", {
      eventId: "evt-1",
      holderUid: "guest-1",
      idempotencyKey: "key-00001",
    })) as { ticketId: string; created: boolean };
    expect(first.created).toBe(true);
    const retry = (await runV3(v3IssueTicket, "org-1", {
      eventId: "evt-1",
      holderUid: "guest-1",
      idempotencyKey: "key-00001",
    })) as { ticketId: string; created: boolean };
    expect(retry).toEqual({ ticketId: first.ticketId, created: false });
    expect(readDoc(`events/evt-1`)).toMatchObject({ issuedCount: 1 });
    await expect(
      runV3(v3IssueTicket, "org-1", { eventId: "evt-1", holderUid: "guest-2", idempotencyKey: "key-00002" }),
    ).rejects.toMatchObject({ code: "failed-precondition" });
  });

  it("issues paid tickets only against a matching paid order", async () => {
    seedEvent("evt-paid", { ticketing: "paid", priceCents: 4500 });
    seedDoc("orders/order-1", { state: "pending", purchaserUid: "guest-1", eventId: "evt-paid" });
    await expect(
      runV3(v3IssueTicket, "org-1", { eventId: "evt-paid", holderUid: "guest-1", kind: "paid", orderId: "order-1" }),
    ).rejects.toMatchObject({ code: "failed-precondition" });
    seedDoc("orders/order-1", { state: "paid", purchaserUid: "guest-1", eventId: "evt-paid" });
    const res = await runV3(v3IssueTicket, "org-1", {
      eventId: "evt-paid",
      holderUid: "guest-1",
      kind: "paid",
      orderId: "order-1",
    });
    expect(res).toMatchObject({ created: true });
  });

  it("verifies for the door team and never for the holder", async () => {
    seedEvent("evt-1");
    seedDoc("tickets/t-1", {
      eventId: "evt-1",
      holderUid: "guest-1",
      issuerUid: "org-1",
      state: "valid",
      kind: "complimentary",
    });
    const card = await runV3(v3VerifyTicket, "org-1", { ticketId: "t-1" });
    expect(card).toMatchObject({ ticketId: "t-1", valid: true, reason: null });
    expect(card).not.toHaveProperty("holderUid");
    await expect(runV3(v3VerifyTicket, "guest-1", { ticketId: "t-1" })).rejects.toMatchObject({
      code: "permission-denied",
    });
    await expect(runV3(v3VerifyTicket, "stranger", { ticketId: "t-1" })).rejects.toMatchObject({
      code: "permission-denied",
    });
  });

  it("admits once and keeps the first stamp on rescan", async () => {
    seedEvent("evt-1");
    seedDoc("tickets/t-1", {
      eventId: "evt-1",
      holderUid: "guest-1",
      issuerUid: "org-1",
      state: "valid",
      kind: "complimentary",
    });
    const first = (await runV3(v3AdmitTicket, "org-1", { ticketId: "t-1" })) as { already: boolean };
    expect(first.already).toBe(false);
    expect(readDoc("tickets/t-1")).toMatchObject({ state: "admitted", admittedByUid: "org-1" });
    const second = (await runV3(v3AdmitTicket, "org-1", { ticketId: "t-1" })) as { already: boolean };
    expect(second).toMatchObject({ already: true });
    seedDoc("tickets/t-2", {
      eventId: "evt-1",
      holderUid: "guest-2",
      issuerUid: "org-1",
      state: "void",
      kind: "complimentary",
    });
    await expect(runV3(v3AdmitTicket, "org-1", { ticketId: "t-2" })).rejects.toMatchObject({
      code: "failed-precondition",
    });
  });
});

describe("v3 commerce", () => {
  beforeEach(() => {
    resetFakes();
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;
  });

  it("creates stub checkouts idempotently without Stripe configured", async () => {
    seedEvent("evt-paid", { ticketing: "paid", priceCents: 4500 });
    const first = (await runV3(v3CreateCheckout, "guest-1", {
      eventId: "evt-paid",
      idempotencyKey: "checkout-001",
    })) as { orderId: string; provider: string; created: boolean };
    expect(first).toMatchObject({ provider: "stub", created: true });
    expect(readDoc(`orders/${first.orderId}`)).toMatchObject({
      purchaserUid: "guest-1",
      sellerUid: "org-1",
      amountCents: 4500,
      state: "pending",
    });
    const retry = await runV3(v3CreateCheckout, "guest-1", { eventId: "evt-paid", idempotencyKey: "checkout-001" });
    expect(retry).toMatchObject({ orderId: first.orderId, created: false });
  });

  it("sanitizes Stripe failures without leaking account details", async () => {
    seedEvent("evt-paid", { ticketing: "paid", priceCents: 4500 });
    process.env.STRIPE_SECRET_KEY = "sk_test_mock";
    stripeMock.sessionsCreate = async () => {
      throw new Error("Invalid line_items: see https://dashboard.stripe.com/acct_123/test/settings");
    };
    const err = await runV3(v3CreateCheckout, "guest-1", {
      eventId: "evt-paid",
      idempotencyKey: "checkout-err",
    }).catch((caught: unknown) => caught as { code?: string; message?: string });
    expect(err.code).toBe("internal");
    expect(String(err.message)).toBe("Checkout failed. Try again shortly.");
    stripeMock.sessionsCreate = async () => ({ id: "cs_test_mock", url: "https://checkout.test/cs-mock" });
    delete process.env.STRIPE_SECRET_KEY;
  });

  it("refuses checkout for unpublished or non-paid events", async () => {
    seedEvent("evt-draft", { status: "draft", ticketing: "paid", priceCents: 100 });
    await expect(
      runV3(v3CreateCheckout, "guest-1", { eventId: "evt-draft", idempotencyKey: "checkout-002" }),
    ).rejects.toMatchObject({
      code: "failed-precondition",
    });
    seedEvent("evt-free");
    await expect(
      runV3(v3CreateCheckout, "guest-1", { eventId: "evt-free", idempotencyKey: "checkout-003" }),
    ).rejects.toMatchObject({
      code: "failed-precondition",
    });
  });

  it("refunds seller-only and voids the paid tickets", async () => {
    seedDoc("orders/order-9", {
      purchaserUid: "guest-1",
      sellerUid: "org-1",
      eventId: "evt-paid",
      amountCents: 4500,
      currency: "AUD",
      state: "paid",
      idempotencyKey: "checkout-009",
      provider: "stub",
    });
    seedDoc("tickets/t-9", {
      eventId: "evt-paid",
      holderUid: "guest-1",
      issuerUid: "org-1",
      orderId: "order-9",
      state: "valid",
      kind: "paid",
    });
    await expect(runV3(v3RefundOrder, "guest-1", { orderId: "order-9" })).rejects.toMatchObject({
      code: "permission-denied",
    });
    const res = await runV3(v3RefundOrder, "org-1", { orderId: "order-9", reason: "Rain check" });
    expect(res).toMatchObject({ state: "refunded", already: false });
    expect(readDoc("orders/order-9")).toMatchObject({ state: "refunded" });
    expect(readDoc("tickets/t-9")).toMatchObject({ state: "void" });
  });

  it("reconciles admin-only and reports state without Stripe", async () => {
    seedDoc("orders/order-7", {
      purchaserUid: "guest-1",
      sellerUid: "org-1",
      eventId: "evt-paid",
      amountCents: 4500,
      currency: "AUD",
      state: "pending",
      idempotencyKey: "checkout-007",
      provider: "stub",
    });
    await expect(runV3(v3ReconcileOrder, "org-1", { orderId: "order-7" })).rejects.toMatchObject({
      code: "permission-denied",
    });
    fakes.isAdmin = true;
    const res = await runV3(v3ReconcileOrder, "admin-1", { orderId: "order-7" });
    expect(res).toMatchObject({ orderId: "order-7", state: "pending" });
  });

  it("fails the webhook closed without a signing secret", async () => {
    const statuses: number[] = [];
    const bodies: unknown[] = [];
    const res = {
      status: (code: number) => ({
        send: (body: unknown) => {
          statuses.push(code);
          bodies.push(body);
        },
      }),
    };
    await (v3StripeWebhook as unknown as (req: unknown, res: unknown) => Promise<void>)(
      { headers: {}, rawBody: Buffer.from("x") },
      res,
    );
    expect(statuses).toEqual([500]);
    expect(bodies).toEqual(["webhook not configured"]);
  });
});
