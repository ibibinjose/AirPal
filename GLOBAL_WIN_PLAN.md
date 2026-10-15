# AirPal Global Win Plan

Source: full reverse-engineering of this repo (routes, contexts, money rails,
SEO, analytics). Scope locked by user: plan + Phase-1 code, cut `/join`
cohorts, safe paths only (no Stripe, payout, or `firestore.rules` changes).

## 1. What the app really is

- React 19 + Vite + wouter SPA, Firebase Auth/Firestore/Functions, Capacitor
  iOS/Android shells (`me.airpal.app`, `me.airpal.pass`).
- Live loop: `/events` -> `/e/:id` Stripe checkout -> `/me/tickets` wallet
  pass -> `/scan` + `TicketGatePanel` door admit -> `/event` organiser tools.
- Single universal account; money writes via Cloud Functions only
  (`firestore.rules` default-deny).
- North Star: **Completed Experiences per Active User** (verified ticket scan,
  checked-in RSVP, saved vCard). Supporting: TTFV > 35% in 60s, viral K > 1.2,
  host repeat > 40% in 60 days.

## 2. Canon decisions (conflicts resolved)

1. `docs/AIRPAL.md` is **missing**; AGENTS.md names it binding. Until restored,
   shipped `src/app/routes.tsx` + this plan are the working canon.
2. STRATEGY.md MoSCoW cuts `/join` cohorts; AGENTS.md retains an Arrival
   Engine. **Decision: STRATEGY wins.** Cohort-code joining, seed institutions,
   fabricated belonging %, and PBSA arrival marketing are cut. Partner/host
   entry moves to `/business`; newcomer entry moves to `/events`.
3. The brain-reviewer skill still lists `/now` and `/plan` as AirPal.Me
   surfaces, but shipped routes redirect them Home. **Decision: shipped routes
   win**; Discovery/Planning stay removed.

## 3. Fundamental duty (the one loop to win)

Help any community gather in real life without platform tax or chaos:

`Want -> Book -> Go/Scan -> Repeat`

- People: 60-second ticket buy, wallet pass, fast door entry.
- Community: free events free forever; 5% honest fee on paid; phone-as-scanner.
- Business: event footfall -> `/deals` perks -> `/business` repeat; Pro bios
  for hosts/creators ($9/mo).

## 4. Phase-1 (this build, safe paths only)

- `/join`, `/join/:code` -> `/business`; `/arrival`, `/arrival/:code` ->
  `/events`; `/g/*` -> `/business`; `/c/*` -> `/events`. `JoinPage` deleted.
- Partner links (`Become a partner`, `Stay Host`, footers, search, settings)
  repointed to `/business`; organiser links to `/event`; newcomer links to
  `/events`. Broken stay-bio arrival button removed.
- Circle shows cohort contacts only for legacy stored-code members (seed
  fallback removed); Me badge removed.
- Sitemap/prerender/llms/manifest/share-meta/noscript purged of `/concierge`,
  `/stay`, `/join`, `/partners`, `/assist` (pure SPA redirects). Alternatives
  comparison pages kept (real prerendered content).
- Door-admit success emits `content_action/experience_completed` (client
  telemetry, consent-gated, server-verified admit only). No fake IDs:
  `event_check_in` stays un-emitted until a server `checkInId` exists.

## 5. Phase-2 (safe slices: DONE)

- DONE: removed `CohortProvider`, `shared/cohort`, `cohort-store`, and dead
  `BelongingReportPanel`/`HostTodaySummary`/`HostActivationChecklist`/
  `HostPlaceForm`. Stored cohort codes sunset silently (ignored, badges gone).
- DONE: Circle honesty pass — fabricated in-common counts removed, founder
  auto-follow assertion removed (founder stays as a real followable contact),
  seed venues gated to offline-empty catalog only.
- DONE (telemetry only, no payout logic): `admitTicket` emits server-side
  `event_check_in` on fresh admits. Verify checks, denials, and re-scans
  intentionally emit nothing (read-only / idempotent by `checkInId`).
- DONE: payout reconciliation (`payoutReconciliationReport` read-only GMV +
  health report, `reconcilePayouts` admin-only safe auto-corrections:
  stuck-held release, ledger recreate, drift sync, Stripe-refund sync,
  dispute reversal). Never auto-touches: amount mismatches, missing charges,
  partial refunds, refunded-after-transfer, ledger orphans (all flagged for
  human review). No rules changes; all writes idempotent + audited.
- OPEN (needs live data + deploy approval): $500 GMV validation milestone.
  Run the report callable post-deploy; not verifiable locally (test Stripe
  key rejected by API, no live key present).

## 6. Acquisition bets (in order)

1. Hosts bring crowds: 3-host playbook per city (1 cultural festival, 1 tech
   meetup, 1 creator). Free scanner onboarding. K > 1.2.
2. Wallet pass as billboard: every ticket shareable with `/@handle`. TTFV > 35%.
3. Deals close the loop: ticket -> nearby perk -> business pays for footfall.

## 7. Kill list (done in Phase-1 unless noted)

Done: cohort joining, cohort provider/store, dead host panels, arrival engine
marketing, concierge/stay SEO, PBSA help article (rewritten), arrival
search/FAB entries, fabricated Circle counts and auto-follow, server-side
check-in emission, payout reconciliation. Open: live deploy + $500 GMV
validation (needs live data).
