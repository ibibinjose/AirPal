# AirPal Rewards — Phase 1 Spec (display-only `/rewards` page)

> **Status:** Spec. Self-contained; everything below maps to code and data that exists
> today. No other document is required reading.
> **Goal:** one member-facing Rewards page that shows real points, real history, and
> real redeemable offers — zero new money movement, zero new collections, zero
> fabricated totals.

---

## 1. Goal and non-goals

Goal: a member opens `/rewards` and sees their actual points balance, how they earned
them, what they can spend them on, and a business route to fund more rewards.

Non-goals for phase 1:

- No earn engine (no new point minting beyond the referral bonus that already exists).
- No dollar "you saved $X" total — offers carry display text (`valueText`), not numeric
  values, and inventing dollar totals would break the authenticity rule.
- No card-linked offers, no white-label partner portals, no tiers.
- No changes to redemption, pricing, or payout flows.

---

## 2. Route and canon placement

- New canonical route `/rewards`, section `business` (member deals area, alongside
  `/deals`), registered in `src/app/airpal-app.ts` and declared in `src/app/routes.tsx`
  as a lazy page like every other surface.
- Share unfurl: add `/rewards/**` to the `shareMeta` rewrites in `firebase.json` so
  reward links unfurl like deals do.
- Entry points: Me dashboard (`MeOverview`), Pass hub, and the inbox empty state.
  One line each — no nav restructuring.

---

## 3. Page sections

New page `src/pages/RewardsPage.tsx` plus `src/components/rewards/`:

1. **Balance header** (`RewardsBalance.tsx`): live points from `rewards/{uid}`
   (owner-readable today, server-writes-only), count of offers redeemed, count of
   referrals completed. Empty state for zero balances: what points are plus the first
   earn action.
2. **Earn list** (`RewardsEarnList.tsx`): static list of the earn mechanics that
   actually exist — referral bonus (+5 points per joined mate, live), points-priced
   offers, event attendance counting toward future earn. Each row states the rule
   honestly; nothing listed that is not wired.
3. **Burn catalog** (`RewardsCatalog.tsx`): promotions with a numeric `pointsCost`,
   claimed through the existing `redeemPoints` flow and `PromotionDetailPage`. Shows
   only what the member can currently afford plus what they already claimed.
4. **History** (`RewardsHistory.tsx`): the member's `reward_transactions` rows
   (owner-listable today), newest first, with reason labels.
5. **Business CTA** (`RewardsBusinessCta.tsx`): routes organisers to `/business` to
   fund offers. Copy mirrors the merchant pitch: free to participate, verified
   redemption, no POS hardware.

---

## 4. Data sources (all existing)

| Section        | Source                                                           | Access today                           |
| -------------- | ---------------------------------------------------------------- | -------------------------------------- |
| Balance        | `rewards/{uid}` doc, `points` field                              | Owner get allowed; writes server-only  |
| History        | `reward_transactions` where `uid` equals member                  | Owner list allowed; writes server-only |
| Catalog        | Promotions with `pointsCost`, via existing list and redeem calls | Existing flows reused unchanged        |
| Referral count | Existing referral notifications and points grants                | Read-only display                      |

No new collections. No new callables. No rules changes.

---

## 5. Earn rules (live, server-minted)

- Bring a mate: +5 points when someone joins with your link (referral bonus).
- Get scanned in: +10 points when a ticket or RSVP is verified at the door
  (scanner admit or guestlist check-in — one shared idempotency key per attendance,
  so both paths never double-mint).
- Redeem in-store: +5 points when staff verify a deal at the till (staff PIN or
  promotion scan).
- Spend points: redeem points-priced offers (live points redeem flow).
- All earn grants are idempotent per member, reason, and source reference
  (`reward_grants` guard written in the same transaction as the balance update),
  best-effort (earn errors never fail entry or redemption), and server-side only —
  clients can read balances and history but never write them.

---

## 6. Guardrails

- Every number on the page comes from a member-readable document or existing call.
  No estimates, no projections, no marketing totals.
- Touch targets 44px or more, single haptic layer, safe areas — same rails as every
  surface.
- Marketing opt-in untouched; the page itself is product UI, not a campaign.
- Colocated tests for the new components; `npm run verify` green before ship.

---

## 7. Acceptance criteria

- A1: member with points sees the exact balance the server holds; zero-state member
  sees the honest empty state.
- A2: history matches the member's transaction rows one for one.
- A3: catalog shows only points-priced offers; claiming one follows the existing
  redeem flow unchanged (idempotent, ledger-written).
- A4: no new Firestore collections, no rules diff, no new Cloud Functions.
- A5: `/rewards` link unfurls correctly when shared.

---

## 8. Phase 2 preview (earn engine shipped; remainder not this spec)

- Numeric per-offer savings metadata, enabling an honest lifetime-savings total.
- Organiser-funded reward pools and community leaderboards.
