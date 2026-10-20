# AirPal V3 Clean-Slate Contract

## Decision

V3 replaces the Firestore data model, security rules, callable API, and
frontend data layer in the existing Firebase project. Firebase Authentication
remains the only identity system. There is no parallel account database and no
client-side authority for money, tickets, trust, or membership state.

This document is the contract to build and test locally before a production
cutover. It is intentionally independent of any V1 collection shape. V3 is a
rebuild sandbox: production runs the V1 app described in `docs/AIRPAL.md`,
and every V3 artifact is additive and gated until cutover.

## Product Boundary

V3 serves the AirPal pillars:

1. Events and access.
2. Business and arrival.
3. Personal bio and Networking Circle.

V3 scope does not include Discovery or Planning surfaces (in V1 those live
at `/places`, `/communities`, `/calendar`, and `/circle`; their V1 routes,
collections, and callables are outside this contract).

It excludes a chat engine, a second booking engine, and any separate
identity partition.

## Canonical Collections

| Collection                          | Reader                                   | Writer                    | Purpose                                                    |
| ----------------------------------- | ---------------------------------------- | ------------------------- | ---------------------------------------------------------- |
| `users/{uid}`                       | owner                                    | identity callable         | Private account, preferences, consent, roles.              |
| `handles/{handle}`                  | public only when active                  | identity callable         | Handle-to-profile lookup; no private contact data.         |
| `profiles/{uid}`                    | public only when published; owner always | profile callable          | Sanitised public bio and owner-controlled visibility.      |
| `places/{placeId}`                  | public when published                    | business/admin callable   | Discoverable businesses and venues.                        |
| `places/{placeId}/claims/{claimId}` | claimant, admin                          | business callable         | One venue-claim request per claimant per venue.            |
| `events/{eventId}`                  | public when published                    | event callable            | Events, availability, host identity, access configuration. |
| `tickets/{ticketId}`                | holder, issuer, door staff               | commerce/access callable  | Issued access record; never client-written.                |
| `orders/{orderId}`                  | purchaser, seller, admin                 | commerce callable/webhook | Payment and fulfilment projection.                         |
| `deals/{dealId}`                    | public when active                       | business callable         | Published business benefit.                                |
| `dealClaims/{claimId}`              | claimant, issuer, admin                  | deal callable             | Single-use deal claim.                                     |
| `cohorts/{cohortId}`                | member or host                           | arrival callable          | Arrival engine and cohort membership.                      |
| `audits/{id}` and `rateLimits/{id}` | admin only                               | Functions only            | Trust, abuse, and payment audit trail.                     |

Implemented in `firestore.rules.v3` (+ `firestore.indexes.v3.json`,
`firebase.v3.json`). Subcollections not listed above are server-only unless
explicitly added to the rules and contract. A document must not duplicate a
person record; references use Firebase `uid` and small display snapshots only
where a read requires it.

## Rule Posture

- Default deny every collection and subcollection.
- Public reads expose published discovery content and public profiles only.
- No `list` rules: the frontend reads its private `users/{uid}` id indexes,
  then fetches each doc by id; discovery lists come from callables that
  return sanitised projections (no owner, trust, or money state).
- A signed-in user may read their own account and private membership records.
- All writes to profiles, places, events, tickets, orders, deals,
  cohorts, audits, and access state go through Cloud Functions.
- Firestore rules never infer payment completion from browser input;
  commerce without `STRIPE_SECRET_KEY` creates honest `provider: "stub"`
  pending orders, the webhook fails closed without a signing secret, and
  paid tickets issue only from a paid order, never browser input.
- Door access, role grants, handle claims, profile visibility, and deal claims
  are validated in Functions and recorded in `audits`.

## Callable Domains

Implemented in `functions/src/v3/*.ts` (32 callables, 4 test files), wired
in `functions/src/index.ts`:

| Domain            | Callables                                                                                                                                                                                                          |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Identity          | `v3BootstrapAccount`, `v3ClaimHandle`, `v3UpdateProfile`, `v3SetProfileVisibility`.                                                                                                                                |
| Discovery         | `v3ListPlaces`, `v3ListEvents`, `v3ListDeals`, `v3FetchHandle`, `v3LookupGooglePlace` (live per-request).                                                                                                          |
| Events and access | `v3UpsertEvent`, `v3IssueTicket`, `v3VerifyTicket`, `v3AdmitTicket`.                                                                                                                                               |
| Business          | `v3UpsertPlace`, `v3PublishDeal`, `v3ClaimDeal`, `v3RedeemDealClaim`, `v3CreateCohort`, `v3JoinCohort`, `v3LeaveCohort`, `v3RequestPlaceClaim`, `v3ReviewPlaceClaim`, `v3WithdrawPlaceClaim`, `v3ListPlaceClaims`. |
| Commerce          | `v3CreateCheckout`, `v3StripeWebhook`, `v3RefundOrder`, `v3ReconcileOrder`.                                                                                                                                        |
| Trust             | `v3ReportContent`, `v3BlockUser`, `v3UnblockUser`, `v3ListAuditEntries` (rate limits live in shared guards).                                                                                                       |

Each callable requires App Check where it is available, authentication for
account-affecting work, request validation, ownership/role checks, and
idempotency for payment or issue operations.

## Frontend Boundary

The frontend reads only published discovery data and its own private
projections. It invokes callables for mutations; it does not use `setDoc`,
`updateDoc`, or `deleteDoc` for domain records (`scripts/check-v3.mjs`
fails the build on any direct write in `src/lib/v3/*`). UI contexts become
query/cache adapters over these contracts rather than independent local
databases. V3 adapters (`src/lib/v3/{gate,client,reads}.ts`) stay behind the
local-only gate (`isV3AdaptersEnabled()` requires `VITE_V3_ADAPTERS=true`
plus the emulator); UI contexts do not consume them yet.

## Cutover Sequence

1. Build V3 contracts, callable modules, rules, indexes, emulator seed, and
   frontend adapters behind a local-only feature gate.
2. Run rules, Functions, unit, integration, and browser journeys against the
   Firebase Emulator Suite.
3. Export the current production Firestore and Storage state; validate the
   backup can be read. This is mandatory even for a clean slate.
4. Deploy V3 code and rules to staging; run authenticated and anonymous smoke
   tests there.
5. At a scheduled cutover, disable writes, export one final backup, reset the
   explicitly approved Firestore/Storage targets, deploy V3, then seed only
   reviewed real content and admin access.
6. Re-enable writes after post-cutover checks for account bootstrap, public
   bio visibility, event ticket issuance, and payment webhook
   reconciliation.

No production deletion, Firebase project replacement, or deployment belongs to
the local implementation phase.
