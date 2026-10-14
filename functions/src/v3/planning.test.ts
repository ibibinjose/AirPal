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

import { v3AddPlanStop, v3CompletePlan, v3CreatePlan, v3InviteToPlan, v3RsvpPlan, v3VotePlanStop } from "./planning";

const PLAN_INPUT = {
  title: "Harbour walk",
  city: "Sydney",
  startsAt: "2026-11-01T09:00:00+11:00",
  visibility: "private",
};

describe("v3 planning", () => {
  beforeEach(() => {
    resetFakes();
  });

  it("creates a plan with the caller as a going owner", async () => {
    const res = (await runV3(v3CreatePlan, "uid-1", PLAN_INPUT)) as { planId: string; inviteCode: string };
    expect(res.planId).toMatch(/^plan-/);
    expect(res.inviteCode).toMatch(/^[A-Z0-9]{6}$/);
    expect(readDoc(`plans/${res.planId}`)).toMatchObject({ ownerUid: "uid-1", state: "open", attendeeCount: 1 });
    expect(readDoc(`plans/${res.planId}/members/uid-1`)).toMatchObject({ role: "owner", rsvp: "going" });
    expect(readDoc("users/uid-1")).toMatchObject({ planIds: [res.planId] });
  });

  it("rejects invalid plan input", async () => {
    await expect(runV3(v3CreatePlan, "uid-1", { ...PLAN_INPUT, title: " " })).rejects.toMatchObject({
      code: "invalid-argument",
    });
    await expect(runV3(v3CreatePlan, "uid-1", { ...PLAN_INPUT, startsAt: "soon" })).rejects.toMatchObject({
      code: "invalid-argument",
    });
  });

  it("invites by handle and blocks non-member inviters", async () => {
    const { planId } = (await runV3(v3CreatePlan, "uid-1", PLAN_INPUT)) as { planId: string };
    seedDoc("handles/bob.by", { ownerUid: "uid-2", active: true });
    const res = await runV3(v3InviteToPlan, "uid-1", { planId, handle: "bob.by" });
    expect(res).toMatchObject({ planId, uid: "uid-2", invited: true });
    expect(readDoc(`plans/${planId}/members/uid-2`)).toMatchObject({ rsvp: "invited" });
    await expect(runV3(v3InviteToPlan, "uid-9", { planId, uid: "uid-3" })).rejects.toMatchObject({
      code: "permission-denied",
    });
    await expect(runV3(v3InviteToPlan, "uid-1", { planId, handle: "ghost.guy" })).rejects.toMatchObject({
      code: "not-found",
    });
  });

  it("lets public plans self-join but keeps private plans closed", async () => {
    const open = (await runV3(v3CreatePlan, "uid-1", { ...PLAN_INPUT, visibility: "public" })) as { planId: string };
    await runV3(v3RsvpPlan, "uid-2", { planId: open.planId, rsvp: "going" });
    expect(readDoc(`plans/${open.planId}/members/uid-2`)).toMatchObject({ rsvp: "going" });
    expect(readDoc(`plans/${open.planId}`)).toMatchObject({ attendeeCount: 2 });
    const closed = (await runV3(v3CreatePlan, "uid-1", PLAN_INPUT)) as { planId: string };
    await expect(runV3(v3RsvpPlan, "uid-2", { planId: closed.planId, rsvp: "going" })).rejects.toMatchObject({
      code: "permission-denied",
    });
    await expect(runV3(v3RsvpPlan, "uid-2", { planId: open.planId, rsvp: "invited" })).rejects.toMatchObject({
      code: "invalid-argument",
    });
  });

  it("adds stops and toggles votes for members only", async () => {
    const { planId } = (await runV3(v3CreatePlan, "uid-1", PLAN_INPUT)) as { planId: string };
    const added = (await runV3(v3AddPlanStop, "uid-1", { planId, name: "Ferry ride" })) as {
      stop: { id: string; votes: number };
    };
    expect(added.stop.votes).toBe(1);
    await expect(runV3(v3AddPlanStop, "uid-9", { planId, name: "Crash" })).rejects.toMatchObject({
      code: "permission-denied",
    });
    seedDoc(`plans/${planId}/members/uid-2`, { uid: "uid-2", role: "member", rsvp: "going" });
    const voted = (await runV3(v3VotePlanStop, "uid-2", { planId, stopId: added.stop.id })) as {
      votes: number;
      voted: boolean;
    };
    expect(voted).toMatchObject({ votes: 2, voted: true });
    const unvoted = (await runV3(v3VotePlanStop, "uid-2", { planId, stopId: added.stop.id })) as {
      votes: number;
      voted: boolean;
    };
    expect(unvoted).toMatchObject({ votes: 1, voted: false });
  });

  it("completes owner-only and closes the plan", async () => {
    const { planId } = (await runV3(v3CreatePlan, "uid-1", PLAN_INPUT)) as { planId: string };
    await expect(runV3(v3CompletePlan, "uid-2", { planId })).rejects.toMatchObject({ code: "permission-denied" });
    const res = await runV3(v3CompletePlan, "uid-1", { planId });
    expect(res).toEqual({ planId, state: "completed" });
    await expect(runV3(v3RsvpPlan, "uid-1", { planId, rsvp: "going" })).rejects.toMatchObject({
      code: "failed-precondition",
    });
  });
});
