import { describe, expect, it } from "vitest";
import {
  activeGuestHeads,
  eventHeadsAllowed,
  guestEntryIdForRsvp,
  guestEntryIdForTicket,
  guestEntryIsActive,
  guestEntryValid,
  guestScopeCollection,
  isGuestScope,
  isListManager,
  summarizeGuestlist,
  type GuestEntry,
} from "./guestlist";

const base: GuestEntry = {
  name: "Ava",
  status: "going",
  partySize: 2,
  source: "rsvp",
  addedBy: "uid1",
  addedAt: "2026-10-02T00:00:00.000Z",
};

describe("guestlist model", () => {
  it("builds deterministic entry ids per source", () => {
    expect(guestEntryIdForRsvp("abc")).toBe("rsvp_abc");
    expect(guestEntryIdForTicket("t1")).toBe("t_t1");
  });

  it("accepts a well-formed entry", () => {
    expect(guestEntryValid(base)).toBe(true);
    expect(guestEntryValid({ ...base, name: "  Ava  " })).toBe(true);
  });

  it("rejects bad names, parties, and enums", () => {
    expect(guestEntryValid({ ...base, name: "   " })).toBe(false);
    expect(guestEntryValid({ ...base, name: "x".repeat(81) })).toBe(false);
    expect(guestEntryValid({ ...base, partySize: 0 })).toBe(false);
    expect(guestEntryValid({ ...base, partySize: 21 })).toBe(false);
    expect(guestEntryValid({ ...base, partySize: 1.5 })).toBe(false);
    expect(guestEntryValid({ ...base, status: "maybe" as never })).toBe(false);
    expect(guestEntryValid({ ...base, source: "email" as never })).toBe(false);
    expect(guestEntryValid({ ...base, addedBy: "" })).toBe(false);
  });

  it("counts heads per status and skips cancelled rows", () => {
    const counts = summarizeGuestlist([
      { status: "going", partySize: 2 },
      { status: "invited", partySize: 1 },
      { status: "checked-in", partySize: 4 },
      { status: "no-show", partySize: 2 },
      { status: "cancelled", partySize: 9 },
    ]);
    expect(counts).toEqual({ goingHeads: 3, checkedInHeads: 4, noshowHeads: 2, listedHeads: 9, entries: 5 });
  });

  it("maps scopes to collections", () => {
    expect(isGuestScope("event")).toBe(true);
    expect(isGuestScope("plan")).toBe(false);
    expect(isGuestScope("venue")).toBe(false);
    expect(guestScopeCollection("event")).toBe("events");
  });

  it("treats the owner and co-hosts as managers", () => {
    const doc = { ownerUid: "own-1", coHostUids: ["co-1", "co-2"] };
    expect(isListManager(doc, "own-1")).toBe(true);
    expect(isListManager(doc, "co-2")).toBe(true);
    expect(isListManager(doc, "stranger")).toBe(false);
    expect(isListManager(doc, undefined)).toBe(false);
    expect(isListManager(null, "own-1")).toBe(false);
    expect(isListManager({ ownerUid: "own-1" }, "own-1")).toBe(true);
  });

  it("marks invited/going/checked-in as active", () => {
    expect(guestEntryIsActive("going")).toBe(true);
    expect(guestEntryIsActive("checked-in")).toBe(true);
    expect(guestEntryIsActive("no-show")).toBe(false);
    expect(guestEntryIsActive("cancelled")).toBe(false);
  });

  it("counts admitted plus holding-a-spot heads as inventory", () => {
    expect(activeGuestHeads({ goingHeads: 90, checkedInHeads: 10 })).toBe(100);
    expect(activeGuestHeads({ goingHeads: 0, checkedInHeads: 0 })).toBe(0);
  });

  it("allows bookings while heads fit and rejects oversell", () => {
    expect(eventHeadsAllowed(null, 500, 2)).toEqual({ ok: true });
    expect(eventHeadsAllowed(0, 500, 2)).toEqual({ ok: true });
    expect(eventHeadsAllowed(100, 98, 2)).toEqual({ ok: true });
    expect(eventHeadsAllowed(100, 99, 2)).toEqual({ ok: false, reason: "This event is sold out." });
    expect(eventHeadsAllowed(100, 100, 1).ok).toBe(false);
  });
});
