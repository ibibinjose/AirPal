import { beforeEach, describe, expect, it, vi } from "vitest";
import { FakeHttpsError, fakes, fakeDb, readDoc, resetFakes, runV3, seedDoc } from "./fakes";

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

import {
  v3ClaimDeal,
  v3CreateCohort,
  v3JoinCohort,
  v3LeaveCohort,
  v3ListPlaceClaims,
  v3PublishDeal,
  v3RedeemDealClaim,
  v3RequestPlaceClaim,
  v3ReviewPlaceClaim,
  v3UpsertPlace,
  v3WithdrawPlaceClaim,
} from "./business";
import { v3BlockUser, v3ListAuditEntries, v3ReportContent, v3UnblockUser } from "./trust";
import { v3FetchHandle, v3ListEvents, v3ListPlaces, v3LookupGooglePlace } from "./discovery";
import { v3SendMessage, v3StartConversation } from "./messaging";

function seedPlace() {
  seedDoc("places/place-1", {
    ownerUid: "owner-1",
    status: "published",
    name: "Harbour Hall",
    description: "",
    city: "Sydney",
    category: "venue",
    address: "1 Harbour Rd",
  });
}

function seedDeal(overrides: Record<string, unknown> = {}) {
  seedPlace();
  seedDoc("deals/deal-1", {
    placeId: "place-1",
    ownerUid: "owner-1",
    status: "published",
    title: "Taco Tuesday",
    detail: "2-for-1",
    redemptionCount: 0,
    ...overrides,
  });
}

describe("v3 business", () => {
  beforeEach(() => {
    resetFakes();
  });

  it("keeps places owner-only", async () => {
    const res = (await runV3(v3UpsertPlace, "owner-1", {
      name: "Harbour Hall",
      city: "Sydney",
      category: "venue",
      address: "1 Harbour Rd",
      status: "published",
    })) as { placeId: string };
    expect(readDoc(`places/${res.placeId}`)).toMatchObject({ ownerUid: "owner-1" });
    await expect(
      runV3(v3UpsertPlace, "uid-9", {
        placeId: res.placeId,
        name: "Hijack",
        city: "Sydney",
        category: "venue",
        address: "x",
      }),
    ).rejects.toMatchObject({ code: "permission-denied" });
  });

  it("publishes deals for the place owner only", async () => {
    seedPlace();
    const res = (await runV3(v3PublishDeal, "owner-1", {
      placeId: "place-1",
      title: "Taco Tuesday",
      detail: "2-for-1",
      status: "published",
    })) as { dealId: string };
    expect(readDoc(`deals/${res.dealId}`)).toMatchObject({ placeId: "place-1", ownerUid: "owner-1" });
    await expect(
      runV3(v3PublishDeal, "uid-9", { placeId: "place-1", title: "Fake", detail: "x" }),
    ).rejects.toMatchObject({ code: "permission-denied" });
  });

  it("claims once per claimant and refuses expired deals", async () => {
    seedDeal();
    const first = (await runV3(v3ClaimDeal, "guest-1", { dealId: "deal-1" })) as { code: string; created: boolean };
    expect(first.created).toBe(true);
    expect(first.code).toMatch(/^[A-Z0-9]{6}$/);
    const retry = await runV3(v3ClaimDeal, "guest-1", { dealId: "deal-1" });
    expect(retry).toMatchObject({ code: first.code, created: false });
    expect(readDoc("deals/deal-1")).toMatchObject({ redemptionCount: 1 });
    seedDeal({ status: "published", expiresAt: "2020-01-01T00:00:00Z" });
    await expect(runV3(v3ClaimDeal, "guest-2", { dealId: "deal-1" })).rejects.toMatchObject({
      code: "failed-precondition",
    });
  });

  it("redeems issuer-only", async () => {
    seedDeal();
    const claim = (await runV3(v3ClaimDeal, "guest-1", { dealId: "deal-1" })) as { claimId: string };
    await expect(runV3(v3RedeemDealClaim, "guest-1", { claimId: claim.claimId })).rejects.toMatchObject({
      code: "permission-denied",
    });
    const res = await runV3(v3RedeemDealClaim, "owner-1", { claimId: claim.claimId });
    expect(res).toMatchObject({ already: false });
    expect(readDoc(`dealClaims/${claim.claimId}`)).toMatchObject({ state: "redeemed" });
  });

  it("joins cohorts idempotently and keeps the host in place", async () => {
    const { cohortId } = (await runV3(v3CreateCohort, "host-1", { title: "Arrival crew", city: "Sydney" })) as {
      cohortId: string;
    };
    const joined = await runV3(v3JoinCohort, "guest-1", { cohortId });
    expect(joined).toMatchObject({ joined: true });
    expect(readDoc(`cohorts/${cohortId}`)).toMatchObject({ memberCount: 2 });
    const again = await runV3(v3JoinCohort, "guest-1", { cohortId });
    expect(again).toMatchObject({ joined: false });
    await expect(runV3(v3LeaveCohort, "host-1", { cohortId })).rejects.toMatchObject({ code: "failed-precondition" });
    const left = await runV3(v3LeaveCohort, "guest-1", { cohortId });
    expect(left).toMatchObject({ left: true });
    expect(readDoc(`cohorts/${cohortId}`)).toMatchObject({ memberCount: 1 });
  });
});

describe("v3 venue claims", () => {
  beforeEach(() => {
    resetFakes();
  });

  const CLAIM = {
    googlePlaceId: "ChIJclaimtest000000000001",
    businessName: "Quay Bar",
    city: "Sydney",
    category: "bar",
    address: "1 Quay St",
    proofNote: "I manage this venue; ABN papers on request.",
    contactEmail: "owner@example.com",
  };
  const PLACE_ID = "gp_ChIJclaimtest000000000001";

  it("requests a claim once per claimant and validates input", async () => {
    const res = (await runV3(v3RequestPlaceClaim, "uid-1", CLAIM)) as { placeId: string; created: boolean };
    expect(res).toMatchObject({ placeId: PLACE_ID, created: true });
    expect(readDoc(`places/${PLACE_ID}/claims/uid-1`)).toMatchObject({
      state: "pending",
      claimantUid: "uid-1",
      businessName: "Quay Bar",
    });
    const retry = await runV3(v3RequestPlaceClaim, "uid-1", CLAIM);
    expect(retry).toMatchObject({ created: false });
    await expect(runV3(v3RequestPlaceClaim, "uid-1", { ...CLAIM, googlePlaceId: "bad" })).rejects.toMatchObject({
      code: "invalid-argument",
    });
    await expect(runV3(v3RequestPlaceClaim, "uid-1", { ...CLAIM, proofNote: " " })).rejects.toMatchObject({
      code: "invalid-argument",
    });
    await expect(runV3(v3RequestPlaceClaim, "uid-2", CLAIM, true)).rejects.toMatchObject({
      code: "failed-precondition",
    });
  });

  it("refuses claims for venues already on AirPal", async () => {
    seedDoc(`places/${PLACE_ID}`, { ownerUid: "owner-1", status: "draft" });
    await expect(runV3(v3RequestPlaceClaim, "uid-1", CLAIM)).rejects.toMatchObject({ code: "already-exists" });
  });

  it("approves by minting an owned draft place, once only", async () => {
    await runV3(v3RequestPlaceClaim, "uid-1", CLAIM);
    await expect(
      runV3(v3ReviewPlaceClaim, "uid-9", { placeId: PLACE_ID, claimantUid: "uid-1", decision: "approved" }),
    ).rejects.toMatchObject({ code: "permission-denied" });
    fakes.isAdmin = true;
    const res = await runV3(v3ReviewPlaceClaim, "admin-1", {
      placeId: PLACE_ID,
      claimantUid: "uid-1",
      decision: "approved",
      address: "2 Quay St",
    });
    expect(res).toMatchObject({ state: "approved" });
    expect(readDoc(`places/${PLACE_ID}/claims/uid-1`)).toMatchObject({ state: "approved" });
    expect(readDoc(`places/${PLACE_ID}`)).toMatchObject({
      ownerUid: "uid-1",
      status: "draft",
      name: "Quay Bar",
      address: "2 Quay St",
      googlePlaceId: CLAIM.googlePlaceId,
    });
    await expect(
      runV3(v3ReviewPlaceClaim, "admin-1", { placeId: PLACE_ID, claimantUid: "uid-1", decision: "approved" }),
    ).rejects.toMatchObject({ code: "failed-precondition" });
  });

  it("rejects with a reason and allows re-request with better proof", async () => {
    await runV3(v3RequestPlaceClaim, "uid-1", CLAIM);
    fakes.isAdmin = true;
    await runV3(v3ReviewPlaceClaim, "admin-1", {
      placeId: PLACE_ID,
      claimantUid: "uid-1",
      decision: "rejected",
      reason: "Need stronger proof.",
    });
    expect(readDoc(`places/${PLACE_ID}/claims/uid-1`)).toMatchObject({ state: "rejected" });
    expect(readDoc(`places/${PLACE_ID}`)).toBeUndefined();
    const reopened = (await runV3(v3RequestPlaceClaim, "uid-1", {
      ...CLAIM,
      proofNote: "ABN papers attached via email.",
    })) as { created: boolean };
    expect(reopened.created).toBe(true);
    expect(readDoc(`places/${PLACE_ID}/claims/uid-1`)).toMatchObject({ state: "pending" });
  });

  it("withdraws own pending claims only", async () => {
    await runV3(v3RequestPlaceClaim, "uid-1", CLAIM);
    await expect(runV3(v3WithdrawPlaceClaim, "uid-2", { placeId: PLACE_ID })).rejects.toMatchObject({
      code: "not-found",
    });
    const res = await runV3(v3WithdrawPlaceClaim, "uid-1", { placeId: PLACE_ID });
    expect(res).toMatchObject({ state: "withdrawn" });
    await expect(runV3(v3WithdrawPlaceClaim, "uid-1", { placeId: PLACE_ID })).rejects.toMatchObject({
      code: "failed-precondition",
    });
  });

  it("lists the admin review queue across venues", async () => {
    await runV3(v3RequestPlaceClaim, "uid-1", CLAIM);
    await runV3(v3RequestPlaceClaim, "uid-2", { ...CLAIM, googlePlaceId: "ChIJclaimtest000000000002" });
    await expect(runV3(v3ListPlaceClaims, "uid-1", {})).rejects.toMatchObject({ code: "permission-denied" });
    fakes.isAdmin = true;
    const res = (await runV3(v3ListPlaceClaims, "admin-1", {})) as { claims: Record<string, unknown>[] };
    expect(res.claims).toHaveLength(2);
    expect(res.claims[0]).toHaveProperty("placeId", expect.stringMatching(/^gp_/));
    expect(res.claims.every((row) => row.state === "pending")).toBe(true);
  });
});

describe("v3 trust", () => {
  beforeEach(() => {
    resetFakes();
  });

  it("records reports, blocks, and unblocks", async () => {
    const reported = await runV3(v3ReportContent, "uid-1", {
      subjectType: "event",
      subjectId: "event-1",
      reason: "Spam",
    });
    expect(reported).toEqual({ reported: true });
    await expect(
      runV3(v3ReportContent, "uid-1", { subjectType: "planet", subjectId: "event-1", reason: "x" }),
    ).rejects.toMatchObject({ code: "invalid-argument" });
    await runV3(v3BlockUser, "uid-1", { uid: "uid-2" });
    expect(readDoc("users/uid-1/blocks/uid-2")).toMatchObject({ blockedUid: "uid-2" });
    expect(readDoc("users/uid-1")).toMatchObject({ blockedUids: ["uid-2"] });
    await runV3(v3UnblockUser, "uid-1", { uid: "uid-2" });
    expect(readDoc("users/uid-1/blocks/uid-2")).toBeUndefined();
    expect(readDoc("users/uid-1")).toMatchObject({ blockedUids: [] });
    await expect(runV3(v3BlockUser, "uid-1", { uid: "uid-1" })).rejects.toMatchObject({ code: "invalid-argument" });
  });

  it("keeps audit search admin-only", async () => {
    await expect(runV3(v3ListAuditEntries, "uid-1", {})).rejects.toMatchObject({ code: "permission-denied" });
    fakes.isAdmin = true;
    const res = (await runV3(v3ListAuditEntries, "admin-1", {})) as { entries: unknown[] };
    expect(res.entries).toEqual([]);
  });
});

describe("v3 discovery", () => {
  beforeEach(() => {
    resetFakes();
  });

  it("lists published places and events without owner fields", async () => {
    seedPlace();
    seedDoc("places/place-draft", {
      ownerUid: "owner-1",
      status: "draft",
      name: "Draft",
      description: "",
      city: "Sydney",
      category: "venue",
      address: "x",
      createdAt: "2026-01-01T00:00:00Z",
    });
    seedDoc("events/event-1", {
      organiserUid: "org-1",
      status: "published",
      title: "Show",
      description: "",
      city: "Sydney",
      venueName: "Hall",
      startsAt: "2026-11-01T19:00:00+11:00",
      capacity: 10,
      ticketing: "none",
      priceCents: 0,
      currency: "AUD",
    });
    const places = (await runV3(v3ListPlaces, undefined, {})) as { places: Record<string, unknown>[] };
    expect(places.places).toHaveLength(1);
    expect(places.places[0]).not.toHaveProperty("ownerUid");
    const events = (await runV3(v3ListEvents, undefined, { city: "Sydney" })) as { events: Record<string, unknown>[] };
    expect(events.events).toHaveLength(1);
    expect(events.events[0]).not.toHaveProperty("organiserUid");
    expect(fakes.rateLimited).toContain("anonymous:v3Discovery");
  });

  it("fetches handles with private bios withheld", async () => {
    seedDoc("handles/ava", { ownerUid: "uid-1", active: true });
    seedDoc("profiles/uid-1", { ownerUid: "uid-1", handle: "ava", visibility: "private" });
    const hidden = (await runV3(v3FetchHandle, undefined, { handle: "ava" })) as { profile: unknown };
    expect(hidden.profile).toBeNull();
    seedDoc("profiles/uid-1", {
      ownerUid: "uid-1",
      handle: "ava",
      visibility: "public",
      displayName: "Ava",
      headline: "Hi",
      about: "",
      city: "Sydney",
      links: [],
    });
    const shown = (await runV3(v3FetchHandle, undefined, { handle: "ava" })) as {
      profile: Record<string, unknown>;
    };
    expect(shown.profile).toMatchObject({ displayName: "Ava" });
    const missing = await runV3(v3FetchHandle, undefined, { handle: "ghost.guy" });
    expect(missing).toMatchObject({ found: false });
  });

  it("reports an honest stub lookup without an API key", async () => {
    delete process.env.GOOGLE_PLACES_API_KEY;
    const res = await runV3(v3LookupGooglePlace, undefined, { placeId: "ChIJN1t_tDeuEmsRUsoyG83frY4" });
    expect(res).toMatchObject({ provider: "stub", verified: false, place: null });
    await expect(runV3(v3LookupGooglePlace, undefined, { placeId: "bad" })).rejects.toMatchObject({
      code: "invalid-argument",
    });
  });
});

describe("v3 messaging", () => {
  beforeEach(() => {
    resetFakes();
  });

  it("starts direct chats and refuses blocked pairs", async () => {
    const res = (await runV3(v3StartConversation, "uid-1", { kind: "direct", participantUids: ["uid-2"] })) as {
      conversationId: string;
    };
    expect(readDoc(`conversations/${res.conversationId}`)).toMatchObject({
      kind: "direct",
      participantUids: ["uid-1", "uid-2"],
    });
    expect(readDoc("users/uid-2")).toMatchObject({ conversationIds: [res.conversationId] });
    seedDoc("users/uid-2/blocks/uid-1", { blockedUid: "uid-1" });
    await expect(
      runV3(v3StartConversation, "uid-1", { kind: "direct", participantUids: ["uid-2"] }),
    ).rejects.toMatchObject({
      code: "permission-denied",
    });
  });

  it("sends participant-only messages with previews", async () => {
    seedDoc("conversations/chat-1", {
      kind: "direct",
      participantUids: ["uid-1", "uid-2"],
      lastMessagePreview: "",
    });
    await expect(runV3(v3SendMessage, "uid-9", { conversationId: "chat-1", text: "Hi" })).rejects.toMatchObject({
      code: "permission-denied",
    });
    const res = await runV3(v3SendMessage, "uid-1", { conversationId: "chat-1", text: "See you at 7" });
    expect(res).toEqual({ conversationId: "chat-1", sent: true });
    expect(readDoc("conversations/chat-1")).toMatchObject({ lastMessagePreview: "See you at 7" });
  });
});
