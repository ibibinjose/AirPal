# V3 Local Build — Run Guide

V3 clean-slate implementation for [the V3 contract](./V3_CLEAN_SLATE_CONTRACT.md),
built and tested locally before any production cutover. Production still runs
the V1 rules, indexes, and callables; every V3 artifact is additive and gated.

## What was built (cutover sequence step 1)

| Piece                                  | Files                                                                                     |
| -------------------------------------- | ----------------------------------------------------------------------------------------- |
| Shared contracts + validation          | `shared/v3-contract.ts`, `shared/v3-contract.test.ts`, `shared/abuse.ts` (V3 rate limits) |
| Default-deny rules + canonical indexes | `firestore.rules.v3`, `firestore.indexes.v3.json`, `firebase.v3.json`                     |
| Callable domains (38 callables)        | `functions/src/v3/*.ts` + 5 test files, wired in `functions/src/index.ts`                 |
| Emulator gates                         | `scripts/check-v3.mjs`                                                                    |
| Frontend adapters (local-only gate)    | `src/lib/v3/{gate,client,reads}.ts` + tests                                               |
| Claim UI (evolved brand)               | `src/pages/ClaimVenuePage.tsx` (`/claim`), `src/components/claim/*`, admin Claims tab     |
| Browser rules journeys                 | `e2e/v3-journeys.spec.ts`                                                                 |

Design notes:

- **No `list` rules.** Every collection denies list; the frontend reads its
  private `users/{uid}` id indexes, then fetches each doc by id. Discovery
  lists come from `v3ListPlaces`/`v3ListEvents`/`v3ListDeals` callables, which
  return sanitised projections (no owner, trust, or money state).
- `v3ListDeals` is additive to the contract's Discovery row so published deals
  stay discoverable without list rules.
- Conversational chat is out of scope: there is no messaging callable and no
  `conversations` collection. Catch-up coordination runs on slot proposals plus
  inbox notifications that link back to the bio.
- Commerce without `STRIPE_SECRET_KEY` creates honest `provider: "stub"`
  pending orders (emulator path). The webhook fails closed without a signing
  secret, and paid tickets issue only from a paid order, never browser input.
- `docs/AIRPAL.md` is absent from this checkout, so the V3 contract document
  is the operative source; a brain review against the skill invariants passed
  (single Firebase identity, no parallel engines, experience-loop mapping).

## Venue claims (no bulk import)

Google-sourced venues are looked up per request and claimed — never
bulk-imported (Places ToS forbids building a stored venue database).

- `v3LookupGooglePlace` verifies one Place ID live (honest `stub` without
  `GOOGLE_PLACES_API_KEY`) and returns a sanitised snapshot for the claim form.
- `v3RequestPlaceClaim` files a pending claim in the server-only
  `places/{placeId}/claims` subcollection (one per claimant per venue).
  Claimants need email accounts; proof of association is required.
- `v3ReviewPlaceClaim` (admin) approves — minting the owned draft place — or
  rejects with a reason. Review details override the claimant's.
- `v3WithdrawPlaceClaim` cancels the caller's pending claim;
  `v3ListPlaceClaims` (admin) is the cross-venue review queue.
- States: `pending → approved | rejected`, `pending → withdrawn`; rejected or
  withdrawn claims may re-request with better proof. Every transition is
  audited. Venues already on AirPal refuse fresh claims (ownership transfers
  out of band).
- UI: `/claim` reuses the Google autocomplete import card for venue search,
  then the evolved-brand claim shell (ink masthead, stepper, paper body) with
  shared field styles. Review lives in the admin Claims tab. Everything stays
  behind the V3 gate; without the flags `/claim` shows the locked preview.

## Run it

```bash
# Static gates + unit tests
npm run v3:check
npm test
npm run functions:test

# Emulator stack — V3 rules + indexes, demo project
npm run functions:build
npm run emu:v3
```

No seed step: the emulator starts empty and stays empty.

## Frontend gate

`isV3AdaptersEnabled()` (`src/lib/v3/gate.ts`) requires **both**
`VITE_V3_ADAPTERS=true` and `VITE_USE_FIREBASE_EMULATOR=true`. With the gate
off, every adapter throws before touching Firebase. `scripts/check-v3.mjs`
fails the build if `src/lib/v3/*` ever uses
`setDoc`/`updateDoc`/`deleteDoc`/`addDoc`.

## Cutover mapping (contract steps 3–6 are out of scope locally)

- Step 2 (local verification): this build + the commands above.
- Steps 3–6 (backup, staging, scheduled cutover, post-checks) need production
  access and a maintenance window; no deletion, project replacement, or
  deployment belongs to this phase.

## Follow-ups before staging

1. Consume `src/lib/v3/*` from UI contexts (tickets, bio, places,
   events) behind the gate; add authenticated browser journeys then.
2. Set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `V3_CHECKOUT_BASE_URL`,
   and `ENFORCE_APPCHECK=true` in the staging environment. Note: the local
   test account currently rejects Checkout Sessions until a product tax code /
   Managed Payments choice is configured; with the key unset, checkout
   exercises the honest `stub` path instead. Provider errors are logged
   server-side and return a generic message (no account IDs to callers).
3. Decide host-transfer/close for cohorts (hosts cannot leave today) and
   multi-ticket quantities (one ticket per checkout in V3 local).
