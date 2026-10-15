# Deploy Runbook — Global Win Plan (Phase-1 + Phase-2 + Reconciliation)

Target project: `airpalme-app` (see `.firebaserc`).
Prepared 2026-10-15. No deploy, commit, or secret access was executed.

## 0. Blocker (must clear first)

The tree currently contains in-progress work outside this plan that does
**not compile**:

- `src/pages/ManageEventPage.tsx` (new, untracked): bad `lucide-react`
  import (`CalendarSync`), missing `downloadSingleIcs` export, `flavour` /
  `name` property mismatches on `EventRecord | CalendarEvent`.
- `src/app/routes.tsx` (modified): `/e/:id/manage` rerouted to the new page.

`tsc --noEmit` fails on those files alone. Settle or revert them first,
then re-run the gate in §2. Everything else in the tree (commit `e13625e`
plus the 3-file Prettier/plan reflow) was verified green before those
files landed.

## 1. Pre-deploy

1. `git status --short` — tree contains only intended changes.
2. `git diff --stat -- firestore.rules functions/` — confirm `firestore.rules`
   is untouched (it was never modified in this plan; skip `deploy:rules`).
3. Secrets exist in Secret Manager (values never leave the console):
   `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`. Confirm via the Firebase
   console or `functions:secrets:describe` for project `airpalme-app`.
4. Stripe webhook endpoint points at production:
   `https://airpalme-app.web.app/api/stripe/webhook`
   (see `firebase.json` rewrites) with events: `checkout.session.completed`,
   `checkout.session.async_payment_*`, `charge.dispute.created`,
   `customer.subscription.*`, `account.updated`.

## 2. Certify (must pass)

```sh
npm run verify
```

This runs format, both typechecks, lint, both unit suites, both builds,
rules/v3/secrets/seo checks. Do not deploy on red.

## 3. Deploy (exact commands)

Full (runs `verify` first, then everything):

```sh
npm run deploy
```

Staged (recommended — functions first so callables exist before web traffic):

```sh
npm run verify
npm run deploy:functions
npm run deploy:hosting
```

Rules: skip — unchanged in this plan. If rules ever change, use
`npm run deploy:rules` separately and re-run `npm run rules:check`.

Native shells (per AGENTS.md, after web builds):

```sh
npm run cap:sync
```

## 4. Post-deploy checklist

- [ ] Hosting serves `/`, `/events`, `/pass` (spot-check + one wallet pass render).
- [ ] Functions log shows no errors on boot (`admitTicket`, `stripeWebhook`,
      `payoutReconciliationReport`, `reconcilePayouts` present).
- [ ] Admin-only: invoke `payoutReconciliationReport` from the Firebase
      console. Record `totals.gmvCents` as the GMV baseline. Review
      `findings`; every entry must be understood before the next step.
- [ ] Only if the report shows safe findings (`stuck_held`,
      `missing_ledger`, `status_drift`, clean `stripe_refunded`,
      `stripe_disputed`): invoke `reconcilePayouts`, then re-run the report
      and confirm findings cleared with `corrected: true` + audit rows.
- [ ] Test checkout end-to-end in **live mode with a real $1 transaction**
      (or test-mode first if a staging project exists): buy → webhook marks
      paid → door admit → `event_check_in` appears in `analyticsEvents`.
- [ ] Refund the test transaction; confirm booking flips to refunded and no
      transfer exists.
- [ ] GMV milestone: onboard host 1 (cultural festival), host 2 (tech
      meetup), creator 3 per `GLOBAL_WIN_PLAN.md`. Re-run the report weekly;
      target $500 GMV ($25 net at 5%).

## 5. Rollback

- Hosting: `npx -y firebase-tools@latest hosting:rollback --project airpalme-app`
  (or redeploy the previous green commit).
- Functions: redeploy from the previous green commit; caller-visible
  callable names are unchanged, so rollback is client-safe.
- Data: reconciliation writes are idempotent and audited (`contentAudits`
  rows with `note: reconcile:<kind>`); ledger docs can be re-derived by
  re-running `reconcilePayouts`.

## 6. What this runbook does not cover

- The `$500 GMV` milestone itself (real sales, not code).
- `ManageEventPage` (in-progress, §0) — deploy it only once it compiles,
  is tested, and is reviewed by its author.
- Live Stripe reads from this machine (no live key present; test key is
  rejected by the API).
