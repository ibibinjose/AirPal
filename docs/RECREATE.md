# AirPal — Recreate From Scratch

> **Purpose:** rebuild this exact app — same product, same architecture, same rails — on a
> clean foundation.
> **Status:** Self-contained. Follow the phases in order; each phase's gate must pass
> before moving on. No other document is required reading.
> **Product:** AirPal ("Life Made Easy") — unified lifestyle and live-experiences ecosystem
> with two lenses (AirPal.Me and AirPal Pass) off one Firebase identity.

---

## Table of contents

1. [Build order and gates](#build-order-and-gates)
2. [Phase 0 — Scaffold and toolchain](#phase-0--scaffold-and-toolchain)
3. [Phase 1 — Auth, data contract and rules](#phase-1--auth-data-contract-and-rules)
4. [Phase 2 — Events, money, door and wallet](#phase-2--events-money-door-and-wallet)
5. [Phase 3 — Discovery, business and verified redemption](#phase-3--discovery-business-and-verified-redemption)
6. [Phase 4 — Bio, Circle, calendar and comms](#phase-4--bio-circle-calendar-and-comms)
7. [Phase 5 — Design system, native and release](#phase-5--design-system-native-and-release)
8. [Appendix A — Rebuild checklist](#appendix-a--rebuild-checklist-per-milestone)
9. [Appendix B — What NOT to rebuild](#appendix-b--what-not-to-rebuild)

---

## Build order and gates

| Phase | Builds                                                | Gate                                         |
| ----- | ----------------------------------------------------- | -------------------------------------------- |
| 0     | Project scaffolding, toolchain, gates                 | Verify skeleton green                        |
| 1     | Auth plus data contract plus rules                    | Rules suite green, one account everywhere    |
| 2     | Events plus paid ticketing plus door plus wallet      | Last-seat race plus scan plus wallet pass    |
| 3     | Discovery plus business plus deals redemption         | Exactly-once ledger redeem                   |
| 4     | Bio plus friends plus Circle plus calendar plus comms | QR and vCard, radar privacy, inbox and email |
| 5     | Design system, native shells, release                 | 44px audit, native sync, prod deploy         |

Golden rule for every phase: server decides, client displays. If both sides need logic
(pricing, capacity, validation, email shapes, QR codecs, analytics names), it lives in
`shared/`, never duplicated.

Product invariants to preserve in every phase:

1. One universal account — never a second user database, auth partition, booking engine,
   or chat engine.
2. Server-only money — clients never write prices, fees, or payment statuses.
3. Event-level inventory — one transaction gates paid and free against live heads plus
   pending holds; expired checkouts release holds; `bookedHeads` is server-only.
4. Verified-only redemptions — staff-PIN or owner-or-admin scanned verify and consume,
   one ledger event per redemption, idempotent retries.
5. Presence privacy — one-to-one shares go direct plus push only, never the public
   mirror; pin reads owner-or-admin only.
6. Default-deny rules — unmatched collections closed; owner-bound writes; immutable
   organiser and owner IDs.
7. No fake production data — zero synthetic profiles, metrics, or reviews.

---

## Phase 0 — Scaffold and toolchain

1. Web app: Vite plus React 19 plus strict TypeScript plus Wouter plus Tailwind CSS v4
   plus Lucide icons plus Sonner toasts plus Framer Motion. Entry `index.html`, router in
   `src/app/routes.tsx`, canonical route table with aliases and section mapping in
   `src/app/airpal-app.ts`.
2. Toolchain: Prettier, ESLint (zero warnings), Vitest (client plus shared), Playwright,
   esbuild for functions. Recreate every gate script and wire the full chain as
   `npm run verify`:
   `format:check` then client `typecheck` then `functions:typecheck` then `lint` then
   client plus shared `test` then `functions:test` then `build` (Vite plus route
   prerender) then `functions:build` then `rules:check` (rules plus composite-index
   consistency) then clean-slate contract check then `secrets:check` then `seo:check`
   (sitemap vs prerender vs routes) then `check:prod` (secrets manifest, listings, icons,
   native files). Verify must exit 0 on an empty skeleton before Phase 1.
3. Cloud Functions package: separate `functions/` toolchain with its own `node_modules`
   and own vitest. One barrel `functions/src/index.ts` — deployed names stay stable;
   domain logic in sibling modules (stripe, guestlist, deals, bio, and more).
4. Firebase: project plus Hosting (`firebase.json` with `/api/*` rewrites, legacy
   redirects, SPA fallback) plus Firestore plus Storage. Keep `dist/`,
   `functions/lib/`, `.env` files, and signing material ignored and uncommitted from day
   one.
5. Secrets layout from day one:
   - Root `.env`: public client keys only (`VITE_*`). Never a secret — Vite exposes
     `VITE_*` to the bundle.
   - `functions/.env`: non-secret Functions environment config. Never duplicate keys
     bound with secrets.
   - `functions/.secret.local`: local emulator overrides for secret bindings.
   - Production: Secret Manager.
   - Signing material (certificates, keystores, keystore properties, service-account
     JSON): ignored by pattern, backed up off-repo, never in git.
6. Repository layout to create:
   - `src/` (app, pages, components grouped by surface, contexts, hooks, lib, types).
   - `shared/` (pure TypeScript both sides import; no Admin imports).
   - `functions/src/` (callables plus triggers; only server prices, pays, verifies).
   - `scripts/` (every gate is an `npm run` script), `docs/` (with `archive/` for
     retired material), `public/` (icons, manifest, service worker, robots, sitemap),
     `e2e/` (Playwright journeys), `ios/` plus `android/` (Capacitor shells built from
     `dist/`).
7. Source conventions to enforce: routing in one place; one context per domain; one hook
   file per hook; colocated `*.test.ts` next to the module it covers; components grouped
   by surface; debug UI gated behind `?debug` rendering nothing by default.

Gate: `npm run verify` green on skeleton; secrets scanner catches a planted dummy token.

---

## Phase 1 — Auth, data contract and rules

1. One universal account: Firebase Auth only. Prove a session authed on a Me surface is
   authed on Pass surfaces — add a test for it. No second user store, ever.
2. Shared contract first (`shared/`): price-authority inputs plus the authoritative total
   function, capacity gate (`eventHeadsAllowed`), validators, QR and auth URL codecs,
   analytics dictionary, email-template inputs. Pure TypeScript, no Admin imports.
3. Collections to create (default-deny; composite indexes back every multi-filter query):
   - Identity: `users`, `handles` (unique claim), `fcmTokens`, `account_deletions`.
   - Events: `events` (`bookedHeads` server-only), `guestlist` (door rows),
     `guestlist_signups`, `bookings`, `coupons`, `campaigns`, `campaign_rsvps`.
   - Social: `follows`, `followers`, `likes`, `likedBy`, `graph`, `blocks`, `catchups`.
   - Presence: `here_at` (Circle mirror), `here_pins` (owner or admin), `here_shares`
     (direct 1-1 plus push).
   - Business: `businessDeals`, `businessDealSecrets`, `dealClaims`, `deals`,
     `dealSecrets`, `claims`, `business_subscriptions`, `connect_accounts`,
     `businessGuestlists`.
   - Comms: `mail` (outbox, server-only), `notifications` (inbox), `broadcasts`.
   - Trust: `abuseSignals`, `rateLimits`, `admin_audits`, `contentAudits`, safety
     reports, `feedback`, `experience_reviews`.
   - Analytics: `analyticsEvents`, `analyticsDaily`, `analyticsEventRejects`,
     `booking_clicks`.
   - Calendar: `calendar` (owner-bound entries including auto-imported tickets).
4. Rules (`firestore.rules`, default-deny):
   - Unmatched collections cannot be read or written.
   - Strict owner-binding: users write only their own profile, calendar entries,
     feedback, and notifications.
   - Ownership immutable via edit: event organiser ID and listing owner ID never
     reassigned by update (changes go through server flows).
   - Split booking rights: guests cancel only their own bookings with a short validated
     reason; providers move service status; money fields stay server-only.
   - Shaped writes: safety reports accept a fixed field set, new-only, bounded text;
     blocks pin the blocker ID; catch-ups pin both parties with a `pending`,
     `accepted`, `scheduled`, `dismissed` allowlist; public property docs reject
     secret-bearing keys; `bookedHeads` is server-only.
   - Rate limits, abuse signals, guestlist signups, coupons, partner leads, and mail
     outbox locked from client writes.
   - Back every multi-filter query with a composite index entry; the rules gate
     enforces this.
5. Admin and listing flows: ensure platform admin, set property member, backfill owner
   claims, upsert business listing and deal, delete business listing (owner and
   server-checked: place parked inactive, audit plus ledger written; direct client
   deletes denied).

Gate: emulator-backed rules suite green; write one forbidden-write test per rule above
(anon write to `mail`, client write to `bookedHeads`, organiser-ID reassignment, guest
cancelling another guest, unshaped safety report, oversized text, secret-bearing public
doc).

---

## Phase 2 — Events, money, door and wallet

1. Studio plus catalog: `/event` publish (event upsert, stalls via stall upsert),
   `/event/manage` plus `/e/:id/manage` edits, `/events` plus `/pass` discovery with
   search and date filters and live `bookedHeads` sold-out state.
2. Paid path (exact order, no shortcuts):
   - Create-booking runs one Firestore transaction: live event read, authoritative total
     pricing, capacity gate over guestlist heads plus unpaid pending holds, booking
     create. Concurrent checkouts serialize here.
   - Create-checkout-session re-prices from the live row and re-checks headroom before
     minting the Stripe session.
   - Stripe webhook (`/api/stripe/webhook`) completes or refunds; session-expiry
     auto-cancels stale pending bookings and releases holds; refunds and disputes cancel
     guestlist rows via trigger.
   - Tier multipliers (`standard`, `vip` 1.5x, `group` 4-pass bundle) resolve from the
     live row; the client always sends the tier it displayed.
3. Free RSVP: row-write transaction with the same gate; full events skip the row and the
   UI shows Sold out; withdrawal via calendar status.
4. Coupons: upsert, validate, and list event coupons (organiser coupon manager UI):
   fixed-amount or percentage off, caps, expiry, toggle, revoke.
5. Door: `/scan` (verify ticket, admit ticket; target under 3 seconds per scan) plus
   `/e/:id/guests` (check in guest, walk-ins with party size, states `going`,
   `checked-in`, `no-show`, `invited`, CSV export, close guestlist, list door team,
   delete with confirm).
6. Wallet: Apple Wallet pass (`.pkpass` via `/api/wallet/**`) plus Google Wallet pass
   (via `/api/wallet/google/**`) from `/me/tickets` plus `/ticket/:id` with add buttons.
   Only per-guest codes mint scannable `AIRPAL:DEAL:` QRs; static codes stay text-only.
7. Connect payouts: account link, refresh and login links, release held payouts, plus
   reconciliation report and payout reconciliation. Managed products and subscription
   checkout plus portal for recurring revenue.

Gate: last-seat concurrency test (no double-sell) plus held-release test plus Apple and
Google pass generation test plus sub-3-second scan drill on a phone.

---

## Phase 3 — Discovery, business and verified redemption

1. Discovery:
   - `/places`: verified venue directory with trading hours, address, maps, amenities,
     live open state.
   - `/communities`: organiser and creator circles with follow-to-join loops.
   - `/claim`: venue claim flow plus Google Place import.
   - Legacy redirects: `/now`, `/explore`, `/guide`, `/p/:id` to Home (`/`). Covered by
     the SEO gate (sitemap vs prerender vs routes).
2. Business studio:
   - `/business`: unified studio, deal creator, listing manager; onboarding and setup
     plus helpdesk.
   - Live Arrival surfaces: `/join`, `/join/:code`, `/host`, `/host/pulse` (arrival,
     host hub, belonging reports).
   - Legacy redirects: `/partners`, `/concierge`, `/stay` to `/business` or `/events`.
3. Deals (exact order):
   - Publish: merchants create perks, discounts, vouchers via `/business` and the
     promotions creator.
   - Browse: deals directory on `/deals`, voucher card on `/deals/:id`.
   - Claim: members claim idempotently — one claim per member per deal; per-guest codes
     render scannable `AIRPAL:DEAL:` QRs.
   - Redeem at till: staff-PIN redeem transaction, or `/scan` deal gate panel with
     owner-or-admin-only verify and consume calls. Consuming writes a server
     `offer_redeem` ledger event. Redemptions are verified, never eyeballed. Static
     promo and entry codes stay text-only.
   - Delete: pause, expire, or remove deals; cancel unredeemed claims.
4. Promotions and giveaways: create, submit, review, enter, draw winners, set winner
   status, record views and clicks, ending-soon nudges; idempotent points redemption
   (one doc per member per offer; retries and double-taps replay instead of
   re-charging); archive when done.
5. Partners: partner application submit and review; partner deal and claim flows; free
   venue presence claim and review.

Gate: double-tap redeem test (replays, never re-charges); ledger shows exactly one
`offer_redeem`; claim-scan-redeem drill on two phones.

---

## Phase 4 — Bio, Circle, calendar and comms

1. Bio:
   - Handle claim (availability check, transfer support) at `/bio/setup`; edit at
     `/bio/edit`; public card at `/@handle` (plus `/bio/@:handle`); recovery flow;
     bio directory listing.
   - QR plus vCard 3.0 (`.vcf`) download with remote-portrait photo.
   - Public or unlisted privacy toggle.
   - Link tiles: add, reorder, edit, remove with instant sync; per-link tap analytics
     (record tap, link stats).
   - Bio offers: attach member perks to bio; visitor claims; edit terms and quotas;
     archive. Business profile create and update back merchant bios.
2. Friends: `/friends` with Following, Followers, Mutuals, and Going-Together
   co-attendees; follow and like toggles; real-time mutual status; two-way graph delete
   on unfollow or unlike.
3. Circle and presence:
   - `/circle` plus `<HereCheckIn />`: share-here and stop-here. Circle-audience pins
     render on the venue board; one-to-one shares go to direct shares plus push only,
     never the public mirror; board filters legacy person-audience rows.
   - Presence radar of active members; extend duration or switch place; check out to stop
     sharing.
   - Pings: send hangout nudge; incoming and outgoing cards; recipient marks
     `pinged_back`, `hanging_out`, or `dismissed`; sender can cancel. Created and
     updated triggers drive notifications.
   - Venue wave: start, detect, toggle, end broadcast (ultrasonic, BLE, proximity).
   - Connector rank quests plus belonging reports reward real attendance.
4. Calendar plus catch-ups:
   - `/calendar`: auto-import of tickets and RSVPs; custom plans; Agenda, Day, Week,
     Month views; Apple and Google `.ics` export with RFC 5545 line folding and unique
     UIDs; edit and drag-and-drop reschedule; remove entries or cancel attendance.
   - Catch-up proposals from any bio: slot proposals plus conflict check; server agent
     schedules and emails invites; `pending`, `accepted`, `scheduled`, `dismissed`
     allowlist; accept, decline, reschedule, cancel, withdraw; status in calendar and
     inbox. Legacy `/plan/*` and `/invite/:code` redirect to Home.
5. Comms engine:
   - Email suite with PASS, ME, ACCOUNT, CIRCLE branding badges: email-safe nested
     tables, inline CSS, dark-mode media queries, accessible footer with unsubscribe.
   - Templates: ticket confirmation (order ref, spots, venue, 1-tap Wallet link), event
     RSVP confirmation (door list plus calendar actions), catch-up proposal (slots),
     broadcast announcement (to circle followers), welcome orientation, account
     verification, password reset, email change, MFA enrolled, plus paste-ready
     Firebase Console Authentication templates as ready HTML files.
   - Pipeline: template engine renders HTML, Functions outbox queues to `mail`,
     REST delivery (Resend or Postmark) with direct fallback. Marketing requires
     explicit opt-in; transactional notices always deliver.
   - Notifications CRUD: automated dispatch on lifecycle events (`ticket_confirmed`,
     `event_rsvp`, `catchup_proposed`, `security_alert`, `welcome`, broadcast
     published); real-time listeners on `/me/inbox` plus notification bell; mark read,
     unread, bulk mark-all-read; delete single or all.
   - Broadcasts: create, review, announce event to guests, event-published-to-followers
     trigger. Brand-email test send for template checks.
   - Share-meta: server-rendered unfurls for `/e/**`, `/p/**`, `/pulse/**`.
6. Trust and privacy:
   - Safety reports (reporter-bound, new-only, bounded text, never deleted), blocks
     (pin blocker, unblock by deletion), read-only-after-submit feedback with emoji mood
     and reviews, admin triage and audits.
   - GDPR and Australian Privacy Act: self-service JSON data export plus
     account-deletion requests.

Gate: QR-to-vCard import test; one-to-one presence privacy test (never in public
mirror); proposal-email-accept-both-calendars test; `.ics` validity test;
one-inbox-item-per-event test.

---

## Phase 5 — Design system, native and release

1. Design tokens:
   - Apple Liquid Glass: multi-layered glassmorphism (`backdrop-blur-xl`,
     `ring-1 ring-line/80`, `shadow-clay`).
   - Contrast rails: ink `#111827`, brand blue `#004eff`, warning gold `#ffb224`.
   - Touch: every control and row 44px or more (48px email CTAs); dense chips use
     hit-slop instead of growing; extra-large-desktop-only chrome keeps density.
   - Safe areas: bottom safe class, top inset padding, bottom inset calculation,
     bottom-dock clearance.
   - Game feel: one haptic layer per event (`light`, `medium`, `selection`) on state
     changes, dismissals, tab switches, attendance toggles.
   - Keyboard and input: universal backdrop dismiss; Sheet traps Tab focus, focuses on
     open, restores on close; inputs 16px or more (no iOS auto-zoom); clean listeners,
     no double-padding.
2. Native:
   - One bundle to two Capacitor shells: `me.airpal.app` (AirPal, all-in-one) and
     `me.airpal.pass` (Pass: events, tickets, deals, gate check-in).
   - Flavor resolves at boot before first render; explicit environment override wins;
     zero static Capacitor imports in the flavor module so unit tests run in Node.
   - Plugins: Firebase Authentication, App, Geolocation, Haptics, Keyboard, Share,
     Splash-Screen, Status-Bar.
   - After every web build: `npm run cap:sync`. Release: open iOS project for archive
     and distribution; open Android project for release bundle; dual bundles on both
     platforms.
3. Pre-launch: screenshot generators for both flavors; store pack; SEO check (sitemap
   vs prerender vs routes); production-readiness check (secrets manifest, listings,
   icons, native files).
4. Launch commands:
   - `npm run verify` (must be exit 0, no exceptions).
   - `npm run deploy` (verify plus Hosting plus Functions to the Firebase project), or
     slices: `deploy:hosting`, `deploy:functions`, `deploy:rules`.
   - `npm run cap:sync` then shell opens for native.
   - Pre-deploy checklist: verification green; secrets manifest clean; store listings
     and icons current; wallet certificates valid; Stripe webhook and Connect healthy;
     rules diff reviewed line-by-line (never weakened); rollback point tagged.
   - Rollback: redeploy the last green tagged build; data fixes via server functions,
     never hand-edits.

Gate: full `verify` green; 44px, input, and focus audit pass; both shells boot to
correct flavor; unsubscribe plus transactional-mail split verified; rollback drill
completed.

---

## Appendix A — Rebuild checklist (per milestone)

- [ ] Product requirements for this milestone written down (answering: who, what
      surfaces, which routes, which functions, which collections).
- [ ] `shared/` updated before any duplicated logic.
- [ ] Rules plus indexes updated with the feature (never loosened to fit).
- [ ] Colocated `*.test.ts` added; client suite plus functions suite green.
- [ ] `npm run verify` exit 0; emulator rules suite for rules changes.
- [ ] 44px touch, 16px inputs, safe areas, single-haptic, focus-trap checked on every
      new surface.
- [ ] No secrets committed; no synthetic production data; no second user system.

## Appendix B — What NOT to rebuild

Legacy silos (`/now`, `/explore`, `/guide`, `/p/:id`, `/plan/*`, `/invite/:code`,
`/partners`, `/concierge`, `/stay`) redirect — do not reimplement them. Retired material
goes to an archive folder. Never rebuild a second auth, user, booking, or chat system;
never rebuild client-side pricing; never ship synthetic demo data as production content.

---
