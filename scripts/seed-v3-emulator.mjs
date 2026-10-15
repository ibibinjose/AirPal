/**
 * Seed the V3 canonical collections in the Firestore emulator.
 *
 * Local-only: aborts unless FIRESTORE_EMULATOR_HOST is set, so it can never
 * touch production. Every document is labelled seed "v3-local" with obviously
 * fake names. Run: npm run emu:v3:seed (with the V3 emulator stack running).
 */
import { createRequire } from "node:module";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  console.error("Refusing to seed: FIRESTORE_EMULATOR_HOST is not set (production guard).");
  process.exit(1);
}

const projectId = process.env.GCLOUD_PROJECT || "demo-v3local";
const functionsRequire = createRequire(resolve(root, "functions", "package.json"));
const { initializeApp } = functionsRequire("firebase-admin/app");
const { getFirestore, FieldValue } = functionsRequire("firebase-admin/firestore");

initializeApp({ projectId });
const db = getFirestore();
db.settings({ ignoreUndefinedProperties: true });

const SEED = "v3-local";
const now = FieldValue.serverTimestamp();

const OWNER = "v3-owner-1";
const GUEST = "v3-guest-1";

const writes = [
  [
    "users/" + OWNER,
    {
      uid: OWNER,
      displayName: "Emulator Host",
      handle: "emulator.host",
      preferences: { marketingEmail: false },
      cohortIds: ["v3-cohort-open"],
      ticketIds: [],
      orderIds: [],
      claimIds: [],
      conversationIds: ["v3-chat-1"],
      blockedUids: [],
      seed: SEED,
      createdAt: now,
      updatedAt: now,
    },
  ],
  [
    "users/" + GUEST,
    {
      uid: GUEST,
      displayName: "Emulator Guest",
      handle: "emulator.guest",
      preferences: { marketingEmail: false },
      cohortIds: ["v3-cohort-open"],
      ticketIds: ["v3-ticket-1"],
      orderIds: ["v3-order-pending"],
      claimIds: ["v3-claim-1"],
      conversationIds: ["v3-chat-1"],
      blockedUids: [],
      seed: SEED,
      createdAt: now,
      updatedAt: now,
    },
  ],
  ["handles/emulator.host", { handle: "emulator.host", ownerUid: OWNER, active: true, seed: SEED, updatedAt: now }],
  ["handles/emulator.guest", { handle: "emulator.guest", ownerUid: GUEST, active: true, seed: SEED, updatedAt: now }],
  [
    "profiles/" + OWNER,
    {
      ownerUid: OWNER,
      handle: "emulator.host",
      visibility: "public",
      displayName: "Emulator Host",
      headline: "Local seed profile",
      about: "Seeded for emulator journeys.",
      city: "Sydney",
      links: [],
      seed: SEED,
      updatedAt: now,
    },
  ],
  [
    "profiles/" + GUEST,
    {
      ownerUid: GUEST,
      handle: "emulator.guest",
      visibility: "private",
      displayName: "Emulator Guest",
      headline: "",
      about: "",
      city: "Sydney",
      links: [],
      seed: SEED,
      updatedAt: now,
    },
  ],
  [
    "places/v3-place-pub",
    {
      ownerUid: OWNER,
      status: "published",
      name: "Emulator Harbour Hall",
      description: "Seed venue.",
      city: "Sydney",
      category: "venue",
      address: "1 Emulator Quay",
      seed: SEED,
      createdAt: now,
      updatedAt: now,
    },
  ],
  [
    "places/v3-place-draft",
    {
      ownerUid: OWNER,
      status: "draft",
      name: "Emulator Draft Hall",
      description: "Unpublished seed.",
      city: "Sydney",
      category: "venue",
      address: "2 Emulator Quay",
      seed: SEED,
      createdAt: now,
      updatedAt: now,
    },
  ],
  [
    "places/gp_ChIJseedclaim000000000001/claims/" + GUEST,
    {
      placeId: "gp_ChIJseedclaim000000000001",
      googlePlaceId: "ChIJseedclaim000000000001",
      claimantUid: GUEST,
      state: "pending",
      businessName: "Emulator Quay Bar",
      city: "Sydney",
      category: "bar",
      address: "3 Emulator Quay",
      proofNote: "Seed claim for emulator journeys.",
      contactEmail: "seed-claim@example.com",
      seed: SEED,
      createdAt: now,
      updatedAt: now,
    },
  ],
  [
    "events/v3-event-pub",
    {
      organiserUid: OWNER,
      status: "published",
      title: "Emulator Rooftop Sessions",
      description: "Seed event.",
      city: "Sydney",
      venueName: "Emulator Harbour Hall",
      startsAt: "2026-11-01T19:00:00+11:00",
      capacity: 100,
      issuedCount: 1,
      ticketing: "complimentary",
      priceCents: 0,
      currency: "AUD",
      seed: SEED,
      createdAt: now,
      updatedAt: now,
    },
  ],
  [
    "events/v3-event-paid",
    {
      organiserUid: OWNER,
      status: "published",
      title: "Emulator Paid Show",
      description: "Seed paid event.",
      city: "Sydney",
      venueName: "Emulator Harbour Hall",
      startsAt: "2026-11-08T19:00:00+11:00",
      capacity: 50,
      issuedCount: 0,
      ticketing: "paid",
      priceCents: 4500,
      currency: "AUD",
      seed: SEED,
      createdAt: now,
      updatedAt: now,
    },
  ],
  [
    "events/v3-event-draft",
    {
      organiserUid: OWNER,
      status: "draft",
      title: "Emulator Draft Night",
      description: "Unpublished seed.",
      city: "Sydney",
      venueName: "Emulator Harbour Hall",
      startsAt: "2026-12-01T19:00:00+11:00",
      capacity: 10,
      issuedCount: 0,
      ticketing: "none",
      priceCents: 0,
      currency: "AUD",
      seed: SEED,
      createdAt: now,
      updatedAt: now,
    },
  ],
  [
    "tickets/v3-ticket-1",
    {
      eventId: "v3-event-pub",
      holderUid: GUEST,
      issuerUid: OWNER,
      state: "valid",
      kind: "complimentary",
      seed: SEED,
      issuedAt: now,
    },
  ],
  [
    "orders/v3-order-pending",
    {
      purchaserUid: GUEST,
      sellerUid: OWNER,
      eventId: "v3-event-paid",
      amountCents: 4500,
      currency: "AUD",
      state: "pending",
      idempotencyKey: "seed-checkout-001",
      provider: "stub",
      seed: SEED,
      createdAt: now,
      updatedAt: now,
    },
  ],
  [
    "deals/v3-deal-pub",
    {
      placeId: "v3-place-pub",
      ownerUid: OWNER,
      status: "published",
      title: "Emulator taco night",
      detail: "Seed deal.",
      redemptionCount: 1,
      seed: SEED,
      createdAt: now,
      updatedAt: now,
    },
  ],
  [
    "dealClaims/v3-claim-1",
    {
      dealId: "v3-deal-pub",
      placeId: "v3-place-pub",
      claimantUid: GUEST,
      issuerUid: OWNER,
      state: "claimed",
      code: "SEED1A",
      seed: SEED,
      claimedAt: now,
    },
  ],
  [
    "cohorts/v3-cohort-open",
    {
      hostUid: OWNER,
      status: "open",
      title: "Emulator arrival crew",
      description: "Seed cohort.",
      city: "Sydney",
      memberUids: [OWNER, GUEST],
      memberCount: 2,
      seed: SEED,
      createdAt: now,
      updatedAt: now,
    },
  ],
  [
    "conversations/v3-chat-1",
    {
      kind: "direct",
      participantUids: [OWNER, GUEST],
      lastMessageAt: now,
      lastMessagePreview: "Seed hello",
      seed: SEED,
      createdAt: now,
      updatedAt: now,
    },
  ],
  ["conversations/v3-chat-1/messages/seed-m1", { senderUid: OWNER, text: "Seed hello", seed: SEED, sentAt: now }],
  [
    "audits/v3-audit-seed",
    {
      action: "seed.marker",
      actorUid: OWNER,
      subjectType: "seed",
      subjectId: SEED,
      detail: "Emulator seed marker.",
      seed: SEED,
      at: now,
      createdAt: now,
    },
  ],
  [
    "rateLimits/v3-seed_v3Discovery",
    {
      uid: "v3-seed",
      action: "v3Discovery",
      count: 0,
      windowStart: 0,
      windowMs: 60000,
      seed: SEED,
      updatedAt: now,
    },
  ],
];

const batch = db.batch();
for (const [path, data] of writes) {
  batch.set(db.doc(path), data, { merge: true });
}
await batch.commit();
console.log(`Seeded ${writes.length} V3 documents into ${projectId} (emulator).`);
