import { describe, expect, it } from "vitest";
import {
  parseV3Cohort,
  parseV3Conversation,
  parseV3DealClaim,
  parseV3Order,
  parseV3Plan,
  parseV3PlanMember,
  parseV3Profile,
  parseV3PublishedDeal,
  parseV3PublishedEvent,
  parseV3PublishedPlace,
  parseV3Ticket,
  parseV3User,
} from "./reads";

describe("V3 read parsers fail closed", () => {
  it("parses the private user doc with id indexes", () => {
    expect(
      parseV3User("uid-1", {
        uid: "uid-1",
        displayName: "Ava",
        preferences: { marketingEmail: true },
        planIds: ["plan-1"],
        cohortIds: [],
        ticketIds: [],
        orderIds: [],
        claimIds: [],
        conversationIds: [],
        blockedUids: ["uid-9"],
      }),
    ).toMatchObject({ id: "uid-1", planIds: ["plan-1"], blockedUids: ["uid-9"] });
    expect(parseV3User("uid-1", { uid: "uid-2", displayName: "X" })).toBeNull();
    expect(parseV3User("uid-1", null)).toBeNull();
  });

  it("accepts published discovery docs only", () => {
    const place = {
      ownerUid: "o",
      status: "published",
      name: "Hall",
      description: "",
      city: "Sydney",
      category: "venue",
      address: "1 Rd",
    };
    expect(parseV3PublishedPlace("p", place)).toMatchObject({ id: "p", name: "Hall" });
    expect(parseV3PublishedPlace("p", { ...place, status: "draft" })).toBeNull();
    const event = {
      organiserUid: "o",
      status: "published",
      title: "Show",
      city: "Sydney",
      venueName: "Hall",
      startsAt: "2026-11-01T19:00:00+11:00",
      ticketing: "paid",
      priceCents: 100,
      currency: "AUD",
    };
    expect(parseV3PublishedEvent("e", event)).toMatchObject({ ticketing: "paid" });
    expect(parseV3PublishedEvent("e", { ...event, ticketing: "free-beer" })).toBeNull();
    const deal = { placeId: "p", ownerUid: "o", status: "published", title: "T", detail: "D" };
    expect(parseV3PublishedDeal("d", deal)).toMatchObject({ id: "d" });
    expect(parseV3PublishedDeal("d", { ...deal, status: "archived" })).toBeNull();
  });

  it("withholds private bios from other viewers", () => {
    const profile = { ownerUid: "uid-1", handle: "ava", visibility: "private", links: [] };
    expect(parseV3Profile("uid-1", "uid-2", profile)).toBeNull();
    expect(parseV3Profile("uid-1", "uid-1", profile)).toMatchObject({ visibility: "private" });
    expect(parseV3Profile("uid-1", null, { ...profile, visibility: "public" })).toMatchObject({
      visibility: "public",
    });
    expect(parseV3Profile("uid-1", null, { ...profile, visibility: "public", links: [{ href: 1 }] })).toBeNull();
  });

  it("validates plans, members, tickets, and orders", () => {
    expect(parseV3Plan("plan-1", { ownerUid: "u", visibility: "public", state: "open", title: "T" })).toMatchObject({
      id: "plan-1",
    });
    expect(parseV3Plan("plan-1", { ownerUid: "u", visibility: "public", state: "lost", title: "T" })).toBeNull();
    expect(parseV3PlanMember("u", { uid: "u", role: "member", rsvp: "going" })).toMatchObject({ rsvp: "going" });
    expect(parseV3PlanMember("u", { uid: "u", role: "member", rsvp: "ghosting" })).toBeNull();
    const ticket = { eventId: "e", holderUid: "h", issuerUid: "i", state: "valid", kind: "paid" };
    expect(parseV3Ticket("t", ticket)).toMatchObject({ id: "t" });
    expect(parseV3Ticket("t", { ...ticket, state: "used" })).toBeNull();
    const order = { purchaserUid: "p", sellerUid: "s", eventId: "e", state: "pending" };
    expect(parseV3Order("o", order)).toMatchObject({ provider: "stub" });
    expect(parseV3Order("o", { ...order, state: "browser-says-paid" })).toBeNull();
  });

  it("validates claims, cohorts, and conversations", () => {
    const claim = { dealId: "d", claimantUid: "c", issuerUid: "i", state: "claimed", code: "ABC123" };
    expect(parseV3DealClaim("c", claim)).toMatchObject({ code: "ABC123" });
    expect(parseV3DealClaim("c", { ...claim, state: "used" })).toBeNull();
    const cohort = { hostUid: "h", status: "open", title: "T", memberUids: ["h"] };
    expect(parseV3Cohort("c", cohort)).toMatchObject({ memberCount: 1 });
    expect(parseV3Cohort("c", { ...cohort, memberUids: "nope" })).toBeNull();
    const chat = { kind: "direct", participantUids: ["a", "b"] };
    expect(parseV3Conversation("c", chat)).toMatchObject({ kind: "direct" });
    expect(parseV3Conversation("c", { ...chat, kind: "broadcast" })).toBeNull();
  });
});
