import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { deleteDoc, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

/**
 * Firestore rules regression suite for the trust rails hardened in
 * `firestore.rules`. Runs ONLY against the local emulator
 * (`npm run test:rules`), and skips everywhere else so the default gates
 * stay hermetic.
 */
describe.skipIf(!process.env.FIRESTORE_EMULATOR_HOST)("firestore rules", () => {
  let testEnv: RulesTestEnvironment;

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({ projectId: "demo-rules-test" });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
  });

  function authed(uid: string) {
    return testEnv.authenticatedContext(uid).firestore();
  }

  async function seed(path: string, data: Record<string, unknown>): Promise<void> {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), path), data);
    });
  }

  describe("events ownership", () => {
    beforeEach(async () => {
      await seed("events/evt-1", { organiserUid: "alice", name: "Rocks Live", status: "live" });
    });

    it("lets the organiser edit but never reassign ownership", async () => {
      const db = authed("alice");
      await assertSucceeds(updateDoc(doc(db, "events/evt-1"), { name: "Rocks Live!" }));
      await assertFails(updateDoc(doc(db, "events/evt-1"), { organiserUid: "bob" }));
    });

    it("denies stranger writes but keeps discovery reads public", async () => {
      const db = authed("mallory");
      await assertFails(updateDoc(doc(db, "events/evt-1"), { name: "Hijacked" }));
      await assertSucceeds(getDoc(doc(db, "events/evt-1")));
    });

    it("lets co-hosts touch capacity only", async () => {
      await seed("events/evt-2", { organiserUid: "alice", coHostUids: ["carol"], capacity: 100 });
      const db = authed("carol");
      await assertSucceeds(updateDoc(doc(db, "events/evt-2"), { capacity: 120, updatedAt: "t" }));
      await assertFails(updateDoc(doc(db, "events/evt-2"), { name: "Hijacked" }));
    });

    it("floors capacity at seated heads", async () => {
      await seed("events/evt-3", { organiserUid: "alice", capacity: 100, bookedHeads: 90 });
      const db = authed("alice");
      await assertFails(updateDoc(doc(db, "events/evt-3"), { capacity: 80 }));
      await assertSucceeds(updateDoc(doc(db, "events/evt-3"), { capacity: 120 }));
    });
  });

  describe("listings ownership", () => {
    beforeEach(async () => {
      await seed("listings/lst-1", { ownerUid: "alice", status: "active", updatedAt: "t" });
    });

    it("pins ownerUid on edit", async () => {
      const db = authed("alice");
      await assertSucceeds(updateDoc(doc(db, "listings/lst-1"), { title: "New" }));
      await assertFails(updateDoc(doc(db, "listings/lst-1"), { ownerUid: "mallory" }));
    });

    it("routes deletes through the server callable, never the client", async () => {
      await assertFails(deleteDoc(doc(authed("alice"), "listings/lst-1")));
    });

    it("denies strangers", async () => {
      await assertFails(updateDoc(doc(authed("mallory"), "listings/lst-1"), { title: "X" }));
    });
  });

  describe("bookings split rights", () => {
    beforeEach(async () => {
      await seed("bookings/bk-1", {
        customerUid: "guest-9",
        providerUid: "org-1",
        status: "pending",
        priceCents: 2000,
        feeCents: 0,
        paymentStatus: "unpaid",
        cancelReason: "",
      });
    });

    it("lets guests cancel their own booking with a short reason", async () => {
      const db = authed("guest-9");
      await assertSucceeds(updateDoc(doc(db, "bookings/bk-1"), { status: "cancelled", cancelReason: "plans" }));
    });

    it("stops guests confirming and stops reason stuffing", async () => {
      const db = authed("guest-9");
      await assertFails(updateDoc(doc(db, "bookings/bk-1"), { status: "confirmed" }));
      await assertFails(updateDoc(doc(db, "bookings/bk-1"), { status: "cancelled", cancelReason: "x".repeat(501) }));
    });

    it("lets providers move service status", async () => {
      await assertSucceeds(updateDoc(doc(authed("org-1"), "bookings/bk-1"), { status: "confirmed" }));
    });
  });

  describe("safety reports shape", () => {
    const good = {
      reporterUid: "alice",
      target: "event",
      targetUid: "evt-1",
      eventTitle: "Rocks Live",
      reason: "spam",
      details: "Repeated scam links in comments.",
      status: "new",
      adminNote: "",
      createdAt: "t",
      updatedAt: "t",
    };

    it("accepts a well-shaped reporter-bound report", async () => {
      await assertSucceeds(setDoc(doc(authed("alice"), "safety_reports/r1"), good));
    });

    it("rejects wrong reporters, wrong states, and short details", async () => {
      await assertFails(setDoc(doc(authed("mallory"), "safety_reports/r2"), good));
      await assertFails(setDoc(doc(authed("alice"), "safety_reports/r3"), { ...good, status: "triaged" }));
      await assertFails(setDoc(doc(authed("alice"), "safety_reports/r4"), { ...good, details: "short" }));
    });
  });

  describe("catchups, blocks, trips", () => {
    it("pins catchup parties with a status allowlist", async () => {
      await seed("catchups/c1", { requesterUid: "r1", targetOwnerUid: "o1", status: "pending" });
      await assertSucceeds(updateDoc(doc(authed("r1"), "catchups/c1"), { status: "accepted" }));
      await assertFails(updateDoc(doc(authed("r1"), "catchups/c1"), { requesterUid: "mallory" }));
      await assertFails(updateDoc(doc(authed("o1"), "catchups/c1"), { status: "whatever" }));
    });

    it("pins blockerUid", async () => {
      await seed("blocks/b1", { blockerUid: "b1", reason: "spam" });
      await assertSucceeds(updateDoc(doc(authed("b1"), "blocks/b1"), { reason: "scam" }));
      await assertFails(updateDoc(doc(authed("b1"), "blocks/b1"), { blockerUid: "mallory" }));
    });

    it("restricts trips to the owner", async () => {
      await seed("trips/t1", { ownerId: "t1", name: "Bali" });
      await assertSucceeds(getDoc(doc(authed("t1"), "trips/t1")));
      await assertFails(getDoc(doc(authed("mallory"), "trips/t1")));
    });
  });

  describe("saved account data", () => {
    it("restricts birthday offer saves to their account owner", async () => {
      const owner = authed("alice");
      const stranger = authed("mallory");
      const path = "users/alice/savedBirthdayOffers/offer-1";
      await assertSucceeds(setDoc(doc(owner, path), { offerId: "offer-1", savedAt: "2026-01-01" }));
      await assertSucceeds(getDoc(doc(owner, path)));
      await assertFails(getDoc(doc(stranger, path)));
      await assertFails(setDoc(doc(stranger, path), { offerId: "offer-2", savedAt: "2026-01-01" }));
    });

    it("restricts business guest records to the account owner and validates their shape", async () => {
      const owner = authed("alice");
      const stranger = authed("mallory");
      const path = "users/alice/businessGuestlists/biz-1/guests/guest-1";
      const guest = {
        id: "guest-1",
        email: "guest@example.com",
        name: "Guest",
        note: "",
        source: "manual",
        addedAt: "2026-01-01T00:00:00.000Z",
      };
      await assertSucceeds(setDoc(doc(owner, path), guest));
      await assertSucceeds(getDoc(doc(owner, path)));
      await assertFails(getDoc(doc(stranger, path)));
      await assertFails(setDoc(doc(stranger, path), guest));
      await assertFails(updateDoc(doc(owner, path), { name: "Changed" }));
      await assertFails(
        setDoc(doc(owner, "users/alice/businessGuestlists/biz-1/guests/guest-2"), {
          ...guest,
          id: "guest-2",
          source: "external",
        }),
      );
      await assertSucceeds(deleteDoc(doc(owner, path)));
    });
  });

  describe("properties secrets", () => {
    it("rejects secret-bearing keys on the public doc", async () => {
      await seed("properties/p1", { ownerId: "p1", members: [], capacity: 50 });
      await assertFails(updateDoc(doc(authed("p1"), "properties/p1"), { wifi: { password: "x" } }));
      await assertSucceeds(updateDoc(doc(authed("p1"), "properties/p1"), { capacity: 60 }));
    });
  });

  it("sanity: suite ran against the emulator", () => {
    expect(process.env.FIRESTORE_EMULATOR_HOST).toBeTruthy();
  });
});
