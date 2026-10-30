# AirPal — Full Product Requirements Document (PRD)

> **Status:** Self-contained. Everything needed to understand, build, and ship AirPal is in
> this file. No other document is required reading.
> **Version:** 2.0.1 · **Last updated:** 2026-10-29 · **Owner:** AirPal team
> **Product:** AirPal ("Life Made Easy") — unified lifestyle and live-experiences ecosystem.

---

## Table of contents

1. [Executive summary](#1-executive-summary)
2. [Goals, non-goals & North Star](#2-goals-non-goals--north-star)
3. [Users & personas](#3-users--personas)
4. [Dual-lens product architecture](#4-dual-lens-product-architecture)
5. [Pillar 1 — Events & Access](#5-pillar-1--events--access)
6. [Pillar 2 — Discovery: Place & Community](#6-pillar-2--discovery-place--community)
7. [Pillar 3 — Personal Calendar & Catch-Ups](#7-pillar-3--personal-calendar--catch-ups)
8. [Pillar 4 — Business & Merchant Hub](#8-pillar-4--business--merchant-hub)
9. [Pillar 5 — Bio, Friends & Networking Circle](#9-pillar-5--bio-friends--networking-circle)
10. [Communications engine](#10-communications-engine)
11. [Trust, safety, privacy & money rails](#11-trust-safety-privacy--money-rails)
12. [Design system & mobile ergonomics](#12-design-system--mobile-ergonomics)
13. [Tech stack & repository map](#13-tech-stack--repository-map)
14. [Data model (Firestore)](#14-data-model-firestore)
15. [Server API (Cloud Functions)](#15-server-api-cloud-functions)
16. [Route canon](#16-route-canon)
17. [Native apps](#17-native-apps)
18. [Analytics & experimentation](#18-analytics--experimentation)
19. [Verification & quality gates](#19-verification--quality-gates)
20. [Release & deployment runbook](#20-release--deployment-runbook)
21. [Agent & developer rules](#21-agent--developer-rules)
22. [Open risks & decisions log](#22-open-risks--decisions-log)
23. [Appendix — acceptance criteria index](#23-appendix--acceptance-criteria-index)

---

## 1. Executive summary

AirPal ("Life Made Easy") is a unified lifestyle and live-experiences ecosystem. Its mission
is to turn _"I want to do something"_ into a completed, real-world experience — without
ticketing chaos, platform bloat, or parallel accounts.

Two focused lenses share one universal Firebase Auth identity, one Firestore database, and
one trust engine:

| Lens                                 | Job to be done                                             | Flagship surfaces                                                           |
| ------------------------------------ | ---------------------------------------------------------- | --------------------------------------------------------------------------- |
| AirPal.Me (personal life & identity) | Organise schedule, share digital bio, connect in real life | `/@handle`, `/bio/*`, `/friends`, `/circle`, `/calendar`, `/me`             |
| AirPal Pass (events, access & perks) | Discover shows, carry wallet tickets, enjoy local deals    | `/pass`, `/events`, `/me/tickets`, `/deals`, `/scan`, `/event`, `/business` |

A ticket booked on Pass automatically enriches the Me calendar. A bio shared on Me drives
attendance on Pass. Every change must move the North Star: Completed Experiences per
Active User.

---

## 2. Goals, non-goals & North Star

### 2.1 Goals (V1)

- G1. End-to-end paid ticketing with zero oversell: publish, buy via Stripe, wallet pass,
  door scan.
- G2. Free RSVP door-list flow with the same inventory guarantees as paid.
- G3. Digital bio (`/@handle`) that works as a modern business card (QR plus `.vcf` export).
- G4. Personal calendar merging tickets, RSVPs, and catch-ups with `.ics` export.
- G5. Merchant self-service: list venue, publish deal, verify redemption at the till.
- G6. Trust rails: server-priced money, default-deny rules, GDPR export and delete, no fake
  data.

### 2.2 Non-goals (V1)

- No second user system, booking engine, or chat engine. No parallel auth partitions.
- No client-side pricing, payout, or verification authority. Display math may mirror the
  server for UX, but `functions/` re-derives every money, inventory, and trust decision.
- No synthetic seed profiles, fabricated metrics, or mock reviews in production.
- No new top-level discovery silos. Legacy `/now`, `/explore`, `/guide`, `/p/:id` redirect
  to Home (`/`).

### 2.3 North Star & guardrails

- North Star: Completed Experiences per Active User. A completed experience is a ticket
  scanned in, an RSVP honoured, a catch-up held, or a deal redeemed.
- Guardrails: payment integrity incidents = 0, oversell incidents = 0, secrets committed = 0,
  rules weakened = 0, `npm run verify` green before every deploy.

---

## 3. Users & personas

| Persona         | Who                               | Core loop                                                   | Success                                         |
| --------------- | --------------------------------- | ----------------------------------------------------------- | ----------------------------------------------- |
| Attendee Ava    | Goes to gigs, festivals, meetups  | Discovers event, buys or RSVPs, wallet pass, scanned in     | Ticket scans first try, calendar auto-updates   |
| Organiser Omar  | Runs concerts, festivals, meetups | Publishes event, sells tiers, manages guestlist, scans door | Sold-out show, zero oversell, clean payouts     |
| Merchant Mia    | Owns venue, restaurant, activity  | Lists venue, publishes perk, staff redeems at till          | Verified redemptions, no coupon fraud           |
| Networker Nate  | Builds relationships in real life | Claims handle, shares bio, checks in, pings and waves       | New mutual plus held catch-up after event       |
| Door-staff Dana | Scans at the gate                 | Opens `/scan`, scans QR, admits                             | Under 3 seconds per admission, works on a phone |
| Admin Ash       | Trust and safety                  | Triages reports, reviews claims and broadcasts              | Every report actionable, PII never leaked       |

Accessibility baseline for all personas: 44px touch targets, 16px-plus inputs, safe-area
insets, focus-trapped sheets, haptic confirmation on state changes.

---

## 4. Dual-lens product architecture

One web bundle serves both lenses. Native shells select a flavor at boot
(`src/lib/app-flavor.ts`). Web defaults to the full AirPal app. There is no web gating.

```
                        ┌────────────────────────┐
                        │         AIRPAL         │
                        │    ("Life Made Easy")   │
                        │  Unified Auth, DB, Tr  │
                        └───────────┬────────────┘
                                    │
          ┌─────────────────────────┴─────────────────────────┐
          ▼                                                   ▼
┌───────────────────────────────┐               ┌───────────────────────────────┐
│          AirPal.Me            │               │          AirPal Pass          │
│   Personal Life & Identity    │               │  Events, Deals & Experiences  │
├───────────────────────────────┤               ├───────────────────────────────┤
│ • Link-in-Bio: /@handle       │               │ • What's On: /pass, /events  │
│ • Bio Setup & Edit: /bio/*    │               │ • Apple/Google Pass: /ticket  │
│ • Friends Hub: /friends       │               │ • Dining & Perks: /deals      │
│ • Network Circle: /circle     │               │ • Door Scanner: /scan         │
│ • Live Presence: HereCheckIn  │               │ • Host Studio: /event         │
│ • Calendar: /calendar         │               │ • Business Hub: /business     │
└───────────────────────────────┘               └───────────────────────────────┘
```

AirPal.Me (personal life and identity):

- Job to be done: "Organise your schedule, share your digital bio, and connect with people
  in real life."
- Core surfaces: digital bio (`/@handle`, `/bio/setup`, `/bio/edit`), Friends Hub
  (`/friends`), Networking Circle (`/circle` with live presence `<HereCheckIn />`), personal
  calendar (`/calendar`), Me dashboard (`/me`).

AirPal Pass (events, access and perks):

- Job to be done: "Discover concerts and festivals, access mobile wallet tickets, and enjoy
  local merchant deals."
- Core surfaces: What's On and passes (`/pass`, `/events`), Apple and Google Wallet passes
  (`/me/tickets`), dining vouchers (`/deals`), door scanner (`/scan`), organiser event
  studio (`/event`), business hub (`/business`).

The single universal account invariant: under no circumstances is a second user database,
partition, or duplicate auth system created. A user authenticated on AirPal.Me is
identically authenticated on AirPal Pass. Every ticket booked enriches the personal
schedule. Any proposal that forks users, bookings, or auth state into a second system must
be rejected outright.

---

## 5. Pillar 1 — Events & Access

User value: live concerts, cultural and community festivals (for example Diwali, Dandiya,
live music), and creator meetups — with native Stripe ticketing and scannable wallet
passes.

### 5.1 Event lifecycle

| Stage          | Surface                          | Requirements                                                                       |
| -------------- | -------------------------------- | ---------------------------------------------------------------------------------- |
| Publish        | `/event` studio                  | Title, media, location, run dates, capacity, tiers; organiser becomes owner        |
| Discover       | `/events`, `/pass`               | Search plus date filters, live attendee preview, sold-out state from server counts |
| Detail and buy | `/e/:id` registration card       | Tier select, paid Stripe Checkout or 1-tap free RSVP; full events show Sold out    |
| Manage         | `/event/manage`, `/e/:id/manage` | Edit details, reschedule run dates, adjust capacity, manage co-hosts               |
| Door           | `/scan`, `/e/:id/guests`         | Guestlist search, party-size walk-ins, check-in states, CSV export                 |
| End            | Manage panel                     | Cancel or unpublish sets `status: "ended"` — never hard-delete live history        |

### 5.2 Ticket tiers, stalls & coupons

- Multi-tier tickets (Early Bird, VIP, General) and merchant stalls. Per-tier capacity is
  display-only. Enforcement is event-level (see 5.3).
- Promo coupons: fixed-amount or percentage off, max redemptions, expiry, active toggle,
  revoke. Organiser dashboard manages codes.
- Legacy tier multipliers (`standard`, `vip` at 1.5x, `group` 4-pass bundle) must match the
  client display. The client always sends the tier it displayed and the server re-prices.

### 5.3 Paid ticketing (hard requirements)

1. Client sends tier plus quantity. The server is the price authority
   (`authoritativeEventTotal()`): named tiers resolve from the live event row, so a booking
   can never be charged a bare 1x unit price.
2. Booking creation runs in one Firestore transaction: live event read, authoritative
   pricing, capacity gate over guestlist heads plus unpaid pending holds, booking create.
   Concurrent checkouts serialize here, so the last seats cannot double-sell.
3. Checkout-session creation re-prices from the live row and re-checks headroom before
   minting a Stripe session.
4. `checkout.session.expired` auto-cancels stale pending bookings so abandoned checkouts
   release their inventory holds. Refunds and disputes cancel guestlist rows via trigger.
5. Money calculations, Stripe Checkout sessions, Connect account onboarding, and refunds
   occur exclusively via server Cloud Functions. Clients never write prices, fee
   calculations, or payment statuses directly to Firestore.
6. Providers move service status; guests may only cancel their own bookings (short
   validated reason). Money fields are server-only.

### 5.4 Free RSVP (same guarantees, lighter path)

- Row-write transaction gates on live inventory. Full events skip the row.
- Withdrawal via calendar status. The door list is the source of truth and the UI shows
  Sold out.

### 5.5 Door operations

- Door team adds walk-in guests or manual door entries with party size.
- Real-time door guestlist with search by name or reference, plus CSV export.
- Check-in states: `going`, `checked-in`, `no-show`, `invited`.
- Manual or cancelled entries removed with confirmation.
- Ticket admission via server verify and admit calls on `/scan`. Target under 3 seconds per
  scan.

### 5.6 Wallet passes

- Apple Wallet (`.pkpass`) and Google Wallet integration with scannable QR passes.
- Personal passbook on `/me/tickets`, single-ticket pass on `/ticket/:id`, each with Wallet
  add buttons.
- Only per-guest redemption codes mint scannable `AIRPAL:DEAL:` QRs. Static promo or entry
  codes stay text because they cannot be verified at the till.

Acceptance: publish, buy two tiers, add to wallet, scan at door, reconcile payout — with a
concurrent last-seat race proving no double-sell.

### 5.7 Pillar 1 full CRUD checklist

- Live Events: create via studio; read via catalog, search, filters, live attendee preview;
  update details, dates, capacity, co-hosts; delete by cancel or unpublish (`ended`).
- Ticket Tiers and Stalls: create multi-tier tickets and stalls with pricing; read tier
  selection, capacity, sold-out state; update names, pricing, allocations, sales windows;
  delete unsold tiers.
- Promo Coupons: create discount codes; read live coupon dashboard; update active state and
  limits; delete by deactivation or revocation.
- Guestlist and Door Check-In: create walk-ins with party size; read real-time guestlist
  with search and CSV export; update check-in states; delete manual entries with confirm.
- Tickets and RSVPs: create via Stripe purchase or 1-tap RSVP; read via passbook and wallet
  export; update via gate admission; delete via RSVP withdrawal, expired-checkout
  auto-cancel, refund-triggered cancellation.

---

## 6. Pillar 2 — Discovery: Place & Community

User value: curated venue discovery and organiser communities with follow-to-join loops.
No empty discovery silos.

| Surface        | Requirements                                            |
| -------------- | ------------------------------------------------------- |
| `/places`      | Verified venue directory with live operating hours      |
| `/communities` | Organiser and creator circles with follow-to-join loops |
| `/claim`       | Venue claim flow plus Google Place import               |

Legacy redirects: `/now`, `/explore`, `/guide`, `/p/:id` redirect directly to Home (`/`).
This eliminates empty discovery silos. The SEO gate enforces sitemap, prerender, and
route-table consistency.

Full CRUD checklist:

- Places and Venues: create by listing a business or venue, importing from Google Places,
  or claiming a venue; read the verified public directory with trading hours, address,
  maps, and amenities; update trading hours, photos, tags, contact info, and amenities;
  delete via the server-checked listing-delete flow only (place parked inactive, audit and
  ledger written; direct client deletes denied), or deactivate via the venue dialog.
- Communities: create organiser and creator circles; read community pages and follower
  lists; update community details and settings; delete or archive circles.
- Claims: create venue claim requests; read claim status; update claim evidence; delete or
  withdraw claims.

Acceptance: import venue, claim approved, shows live hours on `/places`; follow community,
receives broadcast in `/me/inbox`.

---

## 7. Pillar 3 — Personal Calendar & Catch-Ups

User value: one personal agenda with ICS exports and schedule sync, plus personal 1-on-1
networking proposals with automatic email invites.

### 7.1 Personal schedule (`/calendar`)

- Universal personal schedule combining booked tickets, RSVPs, and catch-ups.
- Auto-import of booked passes and RSVPs, plus custom plans via the schedule modal.
- Agenda, Day, Week, and Month views.
- Apple and Google `.ics` export with RFC 5545 line folding and unique UIDs per event.
- Edit details, drag-and-drop reschedule across days, adjust times.
- Remove personal entries or cancel attendance.

### 7.2 Catch-up proposals (1-on-1)

- Propose coffee, meeting, or hangout directly from any `/@handle` bio via the catch-up
  modal with slot proposals and conflict check.
- Automatic email invites to both parties.
- Lifecycle: `pending`, `accepted`, `scheduled`, `dismissed`. Rules pin both parties with
  a status allowlist.
- Accept, decline, or reschedule. Cancel or withdraw proposals.
- Proposal status visible in calendar and notifications inbox.

Legacy redirects: `/plan/*` and `/invite/:code` redirect to Home (`/`). Co-planning lives
natively in `/circle` and `/@handle`.

Full CRUD checklist:

- Personal Schedule Entries: create via auto-import or custom plan modal; read via Agenda,
  Day, Week, Month views plus `.ics` export; update via edit and drag-and-drop reschedule;
  delete via entry removal or attendance cancellation.
- 1-on-1 Catch-Up Proposals: create from any bio with slot proposals; read status in
  calendar and inbox; update via accept, decline, reschedule; delete via cancel or
  withdraw.

Acceptance: book ticket, appears on calendar; propose catch-up, invite email arrives,
accept, both calendars and inbox update; `.ics` imports cleanly into Apple and Google
Calendar.

---

## 8. Pillar 4 — Business & Merchant Hub

User value: one B2B portal for event organisers, venue owners, and merchant partners, with
member dining perks, voucher redemptions, and self-service listing management.

### 8.1 Business studio (`/business`)

- Unified business studio, deal creator, and listing manager.
- Setup and onboarding (`/business/onboard`, `/business/setup`) plus helpdesk
  (`/business/helpdesk`).
- Live Arrival surfaces: `/join`, `/join/:code`, `/host`, `/host/pulse` (arrival, host hub,
  belonging reports).
- Legacy redirects: `/partners`, `/concierge`, `/stay` redirect cleanly to `/business` or
  `/events`.

### 8.2 Places and venues (CRUD)

- Create: list a business or venue, import from Google Places, or claim a venue.
- Read: verified public venue directory with trading hours, address, maps, amenities.
- Update: trading hours, photos, tags, contact info, amenities on `/business`.
- Delete: listing removal runs through the server-checked delete flow only (owner and
  server checked, place parked inactive, audit plus ledger written; direct client deletes
  denied). Deactivate a place via the venue dialog.

### 8.3 Deals, claims and vouchers (CRUD)

- Create: merchants create member perks, discounts, or vouchers via `/business` and the
  promotions creator.
- Read: browse deals directory on `/deals` and voucher redemption card on `/deals/:id`.
- Claim: members claim dining and activity deal vouchers idempotently (one claim per
  member per deal).
- Redeem: merchants scan and redeem inline in `/scan` via the deal gate panel (owner or
  admin only verify and consume calls). Deal vouchers redeem via staff-PIN transaction.
  Redemptions are verified, never eyeballed. Consuming writes a server `offer_redeem`
  ledger event.
- Per-guest redemption codes render scannable `AIRPAL:DEAL:` QRs. Static promo and entry
  codes stay text-only.
- Delete: pause, expire, or remove deals; cancel unredeemed claims.

### 8.4 Promotions and giveaways

- Host promotional campaigns, contests, or giveaways with entry criteria.
- Public giveaway entry cards, prize summaries, winner announcements.
- Update contest rules, draw winners, notify entrants.
- Promotion points redemptions are idempotent (one doc per member per offer; retries and
  double-taps replay instead of re-charging).
- Close or archive campaigns.

Acceptance: onboard business, list venue, publish deal, member claims, staff scans and
redeems in `/scan`, ledger and analytics reflect exactly one redemption (double-tap
replays, never re-charges).

---

## 9. Pillar 5 — Bio, Friends & Networking Circle

### 9.1 Digital bio and handle (`/@handle`, `/bio/setup`, `/bio/edit`)

- Digital identity at `/@handle` acting as a modern digital business card with vCard 3.0
  (`.vcf`) export including remote-portrait photo and QR code pass.
- Claim unique username handle, set avatar, bio, headline, and location.
- Bio configuration and social link management.
- Privacy toggle: public or unlisted. Handle recovery and bio directory.
- Social and custom links: add custom link tiles, portfolio links, social accounts; edit
  labels, URLs, icons; reorder links; remove tiles with instant sync. Tap analytics
  recorded per link.
- Bio perks and offers: attach member perks, discounts, or services directly to the digital
  bio; visitors view and claim perks; edit offer details, terms, redemption quotas; remove
  or archive perks.
- Account wipe via self-service export first, then the account-deletion request flow.

Full CRUD checklist:

- Digital Bio and Handle: create by claiming handle and profile; read via public bio,
  vCard download, QR pass; update bio, handle, contact numbers, privacy; delete via
  account wipe.
- Social and Custom Links: create tiles and accounts; read on public link stack; update by
  reorder, edit, re-icon; delete tiles with instant sync.
- Bio Perks and Offers: create member perks on bio; read as visitor claims; update terms
  and quotas; delete or archive perks.

### 9.2 Friends hub (`/friends`)

- Following, followers, mutuals, and co-attendees going together to booked events.
- Follow members, connect with mutuals, like profiles.
- Real-time mutual connection status updates.
- Unfollow or unlike with two-way graph deletion.

### 9.3 Networking Circle (`/circle`) and live presence

- Dedicated networking circle with live presence check-in (`<HereCheckIn />`), connector
  rank quests, and ultrasonic/BLE wave handshakes.
- Check in at venue or event space with active duration. Circle-audience pins render on
  the venue board; one-person shares stay direct (push only, never the public mirror).
- View presence radar and active AirPals in the room or city. Extend duration or switch
  active place key. Check out to stop sharing live presence.
- AirPal pings (hangout nudges): send instant "let's catch up" ping; view incoming and
  outgoing ping cards; recipient marks `pinged_back`, `hanging_out`, or `dismissed`;
  sender can cancel; dismiss or close ping thread.
- Venue wave: broadcast ultrasonic, BLE, or proximity greeting; detect nearby waves;
  toggle broadcast; end broadcast.
- Connector rank quests plus belonging reports reward real attendance.

### 9.4 Me dashboard and inbox (`/me`, `/me/inbox`)

- `/me`: central user dashboard. Attending (from bookings) plus hosting (from studio) in
  one place.
- `/me/inbox`: unified notification and updates inbox (see section 10).

Acceptance: claim handle, share bio, QR scan, vCard import; check in, appears on radar
(but 1-1 share stays private); ping, hangout; unfollow removes both graph edges.

---

## 10. Communications engine

### 10.1 Email architecture

- Dual-lens design: dynamic `PASS`, `ME`, `ACCOUNT`, `CIRCLE` branding badges in one
  shared responsive HTML template suite.
- Client resilience: email-safe nested tables, inline CSS styles, dark-mode media queries,
  accessible legal footer with unsubscribe links.
- Standard templates, each with a fixed purpose:
  - Ticket confirmation: order ref, spots, venue, 1-tap Wallet pass link.
  - Event RSVP confirmation: door-list confirmation with calendar actions.
  - Catch-up proposal: personal networking invitation with suggested meeting slots.
  - Broadcast announcement: organiser updates to circle followers.
  - Welcome: dual-lens welcome orientation for new accounts.
  - Account verification: universal account email address verification.
  - Password reset: time-sensitive reset with security alerts.
  - Email change: primary email update verification with warning rails.
  - MFA enrolled: multi-factor authentication enrolment alert.
  - Firebase Console templates: paste-ready Authentication email templates shipped as
    ready HTML files.
- Pipeline: shared template engine renders HTML, Cloud Functions outbox queues to the
  Firestore `mail` collection, delivery via direct REST (Resend or Postmark).
- Marketing emails require explicit opt-in. Transactional notices (ticket receipts,
  security alerts, catch-up proposals) always deliver reliably.

### 10.2 Notifications CRUD

- Create: automated in-app notification dispatch on lifecycle events (`ticket_confirmed`,
  `event_rsvp`, `catchup_proposed`, `security_alert`, `welcome`, broadcast published).
- Read: real-time Firestore snapshot listeners on `/me/inbox` and the notification bell.
- Update: mark single notification read or unread, bulk mark-all-read.
- Delete and dismiss: permanent dismissal of single or all notifications.

### 10.3 Feedback, safety reports and blocks

- Event and venue feedback: submit emoji mood and review feedback after attending.
  Organisers and guests view sentiment. Read-only once submitted to prevent review
  tampering.
- Safety reports: submit confidential reporter-bound reports with a fixed field set,
  new-only, bounded text. Admin triage inbox for reports; reports are never deleted.
- Blocks: block problematic users. Block records readable only by the blocker, pin the
  blocker ID, and can never be re-pointed. Unblock by deleting the block record.

Acceptance: every lifecycle event produces exactly one inbox item plus one email; read,
unread, and delete sync in real time across tabs; unsubscribe stops marketing but never
transactional mail.

---

## 11. Trust, safety, privacy & money rails

Safety, security, privacy, and payment integrity outrank everything else. Any conflict
between velocity and this section resolves in favour of this section.

1. Payment integrity (the server is the price authority):
   - Single price authority: named tiers resolve from the live event row; legacy
     `standard`, `vip` (1.5x), `group` (4-pass bundle) multipliers match the client
     display, so a booking can never be charged a bare 1x unit price. The client always
     sends the tier it displayed.
   - Booking creation runs in one Firestore transaction: live event read, authoritative
     pricing, capacity gate over guestlist heads plus unpaid pending holds, booking
     create. Concurrent checkouts serialize here.
   - Checkout-session creation re-prices from the live row and re-checks headroom before
     minting a Stripe session. `checkout.session.expired` auto-cancels stale pending
     bookings so abandoned checkouts release inventory holds. Refunds and disputes cancel
     guestlist rows via trigger.
   - Money calculations, Stripe Checkout sessions, Connect account onboarding, and refunds
     occur exclusively via server Cloud Functions. Clients never write prices, fee
     calculations, or payment statuses directly to Firestore.
2. Inventory and capacity (no oversell):
   - A server trigger maintains authoritative `bookedHeads` (active guestlist heads) on
     every event document: display and fast checks, recomputed from rows so it never
     drifts, never client-written.
   - Paid bookings and free RSVPs both gate on live inventory. Full events skip the row.
     The door list is the source of truth and the UI shows Sold out.
   - Rules pin `bookedHeads` client-immutable and forbid lowering capacity below seated
     heads (organiser and co-host branches). Honoured payments always win over capacity
     in the rare post-pay race.
3. Redemptions are verified, never eyeballed:
   - Deal vouchers redeem via staff-PIN transaction.
   - Promotion points redemptions are idempotent (one doc per member per offer;
     transactional; retries and double-taps replay instead of re-charging) and are
     verified and consumed via owner-or-admin-only calls, scanned inline in `/scan`.
     Consuming writes a server `offer_redeem` ledger event.
   - Only per-guest redemption codes mint scannable `AIRPAL:DEAL:` QRs. Static promo and
     entry codes stay text because they cannot be verified at the till.
4. Presence privacy:
   - One-person shares never enter the public `here_at` venue mirror. They deliver via
     direct shares plus push only.
   - The map toggle renders for Circle audience only.
   - Pin reads are owner-or-admin only. The board additionally filters any legacy
     person-audience rows.
5. Security rules (default-deny architecture):
   - Unmatched collections cannot be read or written.
   - Strict owner-binding: users can only write their own profile, calendar entries,
     feedback, and notifications.
   - Ownership is immutable via edit: event organiser ID and listing owner ID can never
     be reassigned by update (changes go through server flows).
   - Split booking rights: guests can only cancel their own bookings (short validated
     reason); providers move service status; money fields stay server-only.
   - Shaped writes: safety reports accept a fixed field set, new-only, with bounded
     text; blocks pin the blocker ID; catch-ups pin both parties with a status
     allowlist; trips are owner or admin only; public property docs reject
     secret-bearing keys; `bookedHeads` is server-only.
   - Rate-limiting documents, abuse signals, guestlist signups, coupons, partner leads,
     and mail outbox are locked from client writes.
   - Per-collection composite indexes back every multi-filter query.
6. Privacy and data portability:
   - GDPR and Australian Privacy Act compliance with self-service JSON data export and
     account deletion requests.
   - Marketing emails require explicit opt-in; transactional notices (ticket receipts,
     security alerts, catch-up proposals) always deliver reliably.
7. Authenticity:
   - Zero synthetic seed profiles, fabricated metrics, or mock review data in
     production. Store-review demo fixtures are sandbox-only and never ship as
     production content.
8. Abuse and moderation:
   - Server-only abuse signals and rate limits guard coupons, claims, and mail.
   - Confidential safety reports are reporter-bound and never deleted.
   - Blocks pin the blocker and unblock by record deletion.
   - Feedback is read-only after submit.

---

## 12. Design system & mobile ergonomics

1. Materials and aesthetics:
   - Apple Liquid Glass materials architecture: multi-layered glassmorphism
     (`backdrop-blur-xl`, `ring-1 ring-line/80`, `shadow-clay`).
   - Contrast rails: high-contrast ink text (`#111827`), brand blue (`#004eff`), warning
     gold (`#ffb224`).
2. Touch ergonomics:
   - Every interactive control, button, and list row provides a minimum touch target of
     44px or more (48px for email CTAs). Visually dense chips may use hit-slop instead
     of growing.
   - Extra-large-desktop-only chrome keeps its density. Every touch-reachable surface
     meets 44px.
3. Safe areas: safe-area insets enforced (bottom safe class, top inset padding, bottom
   inset calculation, bottom-dock clearance).
4. Tactile game feel: tactile haptic feedback (`light`, `medium`, `selection`) on state
   changes, dismissals, tab switches, and attendance toggles. Exactly one haptic layer
   fires per event.
5. Keyboard and input handling:
   - Universal backdrop dismiss on modals, popovers, and bottom sheets.
   - Sheet traps Tab focus, focuses on open, restores focus on close.
   - Input font sizes 16px or more to prevent iOS Safari auto-zooming.
   - Clean keyboard listeners without double-padding.

---

## 13. Tech stack & repository map

| Layer               | Choice                                                                                                                                                            |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend            | React 19, strict TypeScript, Vite, Wouter routing, Tailwind CSS v4, Lucide icons, Sonner toasts, Framer Motion                                                    |
| Backend             | Firebase Auth, Cloud Firestore, Cloud Functions v2 (HTTPS callables and Firestore triggers), Firebase Storage                                                     |
| Shared contract     | `shared/` — pricing, capacity gate, validators, email templates, QR intents, analytics dictionary. No Firebase Admin imports                                      |
| Client/server split | `src/` displays; `functions/src/` decides money, inventory, and trust                                                                                             |
| Mobile              | Dual Capacitor shells from a single codebase (see section 17)                                                                                                     |
| Email               | Shared responsive template engine plus Cloud Functions outbox queueing to the Firestore `mail` collection with direct REST delivery fallback (Resend or Postmark) |
| Tests               | Vitest client and shared suite (over 1,110 tests), Vitest Cloud Functions suite (over 200 tests), Playwright journeys, emulator-backed rules suite                |
| Gates               | Repo gate scripts, each an `npm run` script, chained by `npm run verify` (see section 19)                                                                         |

Repository layout (source versus generated versus secrets):

| Path                                                                        | Kind         | Committed | Notes                                                                                                                                                |
| --------------------------------------------------------------------------- | ------------ | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/`                                                                      | source       | yes       | Vite SPA: `app/` (routes and canon), `pages/`, `components/*`, `contexts/`, `hooks/`, `lib/`, `types/`                                               |
| `shared/`                                                                   | source       | yes       | Client and server contract: pricing, capacity, validation, email templates, QR intents. No Admin imports                                             |
| `functions/src/`                                                            | source       | yes       | Cloud Functions callables and triggers. Only server code may price, pay out, or verify                                                               |
| `functions/package.json`                                                    | config       | yes       | Separate functions toolchain with own `node_modules` and own vitest                                                                                  |
| `scripts/`                                                                  | source       | yes       | Repo gates, prerender, screenshots. Every gate is an `npm run` script                                                                                |
| `docs/`                                                                     | source       | yes       | Canon, contracts, runbooks, store pack, `archive/` for retired material                                                                              |
| `public/`                                                                   | source       | yes       | Static web assets: icons, manifest, service worker, `robots.txt`, `sitemap.xml`                                                                      |
| `e2e/`                                                                      | source       | yes       | Playwright journeys                                                                                                                                  |
| `ios/`, `android/`                                                          | shells       | yes       | Capacitor native shells built from `dist/` via `cap:sync`. Generated subdirs (Pods, Gradle caches, app build outputs, synced web assets) are ignored |
| `index.html`, `vite.config.ts`, `capacitor.config.ts`                       | config       | yes       | Web entry, build, native shell config                                                                                                                |
| `firebase.json`, `.firebaserc`, `firestore.rules`, `firestore.indexes.json` | config       | yes       | Hosting rewrites and headers, project, security rules, composite indexes                                                                             |
| `package.json`, lockfiles                                                   | config       | yes       | Toolchain and dependency pins                                                                                                                        |
| `dist/`                                                                     | build output | no        | Vite production bundle. Deployed to Hosting, never committed                                                                                         |
| `functions/lib/`                                                            | build output | no        | Bundled functions. Deployed to Cloud Functions, never committed                                                                                      |
| `.firebase/`                                                                | deploy cache | no        | Hosting deploy cache, never committed                                                                                                                |
| `node_modules/`, `functions/node_modules/`                                  | toolchain    | no        | Installed, never committed                                                                                                                           |
| `playwright-report/`, `test-results/`                                       | test output  | no        | Local only, never committed                                                                                                                          |
| `*.log`                                                                     | logs         | no        | Emulator and debug logs, never committed                                                                                                             |
| `.env`                                                                      | secrets      | no        | Root: client keys only (`VITE_*`). See section 11                                                                                                    |
| `functions/.env`                                                            | local config | no        | Non-secret Functions environment config; never duplicate keys bound with secrets                                                                     |
| `functions/.secret.local`                                                   | secrets      | no        | Local emulator overrides for secret bindings; production uses Secret Manager                                                                         |
| Signing files, service-account JSON                                         | secrets      | no        | Local signing and credentials. Ignored by pattern. Backed up off-repo                                                                                |

Source conventions:

- Routing lives in one place: `src/app/routes.tsx` declares pages; `src/app/airpal-app.ts`
  holds the canonical route table, aliases, and section mapping. QR intents that resolve
  in-app go through the QR lib (`pathForIntent`). Merchant voucher QRs verify inline
  instead of routing.
- One context per domain (`src/contexts/`), one hook file per hook (`src/hooks/`),
  colocated `*.test.ts` next to the module it covers.
- Components group by surface (`event/`, `booking/`, `calendar/`, `circle/`, `deals/`,
  `ui/`, and more). Debug components are support tooling only: gated behind `?debug`,
  render nothing by default.
- Client never prices, pays, or verifies: display math may mirror the server for UX, but
  `functions/` re-derives every money, inventory, and trust decision from live documents.
- If both client and server need it, it lives in `shared/` — never duplicated. Adding a
  two-`where` query in `functions/src` requires a composite index entry; the rules gate
  enforces this.

Secrets discipline:

1. Root `.env` holds public client config only, and even there never a secret. Non-secret
   Functions config lives in `functions/.env`. Local secret overrides for secret bindings
   go in `functions/.secret.local`, while production secrets live in Secret Manager. Never
   put a secret-bound key in a plain `.env` file.
2. Vite exposes only `VITE_*` to the bundle — but never put a secret in root `.env` at
   all.
3. Signing material (certificates, keystores, keystore properties, service-account JSON)
   stays on signing machines, never in git.
4. The secrets scanner checks tracked files. `npm run verify` runs it plus format, types,
   lint, both unit suites, both builds, rules, clean-slate contract, SEO, and
   production-readiness checks.

---

## 14. Data model (Firestore)

Default-deny: unmatched collections cannot be read or written. Composite indexes back
every multi-filter query.

| Domain    | Collections                                                                                                                                                | Access shape                                                                       |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Identity  | `users`, `handles`, `fcmTokens`, `account_deletions`                                                                                                       | Owner-bound; handles uniquely claimed; deletions via request flow                  |
| Events    | `events`, `guestlist`, `guestlist_signups`, `bookings`, `coupons`, `campaigns`, `campaign_rsvps`                                                           | Organiser-owned events; `bookedHeads` server-only; guests cancel own bookings only |
| Social    | `follows`, `followers`, `likes`, `likedBy`, `graph`, `blocks`, `catchups`                                                                                  | Owner-bound; blocks pin blocker; catch-ups pin both parties with status allowlist  |
| Presence  | `here_at`, `here_pins`, `here_shares`                                                                                                                      | Public Circle mirror vs direct 1-1 shares; pins owner-or-admin only                |
| Business  | `businessDeals`, `businessDealSecrets`, `dealClaims`, `deals`, `dealSecrets`, `claims`, `business_subscriptions`, `connect_accounts`, `businessGuestlists` | Owner and server-checked; secrets never client-readable                            |
| Comms     | `mail`, `notifications`, `broadcasts`                                                                                                                      | Outbox and inbox server-written; users read and dismiss own inbox                  |
| Trust     | `abuseSignals`, `rateLimits`, `admin_audits`, `contentAudits`, safety reports, `feedback`, `experience_reviews`                                            | Server and admin only; reports new-only; feedback read-only after submit           |
| Analytics | `analyticsEvents`, `analyticsDaily`, `analyticsEventRejects`, `booking_clicks`                                                                             | Server-aggregated; rejects quarantined                                             |
| Calendar  | `calendar`                                                                                                                                                 | Owner-bound entries including auto-imported tickets                                |

---

## 15. Server API (Cloud Functions)

One barrel (`functions/src/index.ts`): every callable keeps its deployed name. Domain
logic lives in sibling modules. Only server code may price, pay out, or verify.

| Domain                | Functions                                                                                                                                                                                                                                                                                      |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Accounts and access   | Complete and confirm signup, phone-password login, ensure user profile, ensure platform admin, set property member, backfill owner claims                                                                                                                                                      |
| Ticketing and money   | Create event booking, create booking checkout session, complete paid booking, refund paid booking, Stripe webhook, Connect account link, refresh and login links, release held payouts, managed products and checkout sessions, subscription checkout and portal, payout reconciliation report |
| Events and guestlist  | Upsert event, upsert event stall, save attendee stall, submit venue rating, check in guest, close guestlist, list door team, add door guest, guest-booking, RSVP, and entry triggers, guest-count refresh trigger                                                                              |
| Coupons               | Upsert, validate, and list event coupons                                                                                                                                                                                                                                                       |
| Gate                  | Verify ticket, admit ticket                                                                                                                                                                                                                                                                    |
| Wallet                | Apple Wallet pass, Google Wallet pass                                                                                                                                                                                                                                                          |
| Deals and promotions  | Claim deal, redeem voucher, partner deal and claim flows, free venue presence, promotion create/update/submit/review/enter/draw/winner/record-view/record-click, redeem points, verify and consume promotion redemption, ending-soon nudges                                                    |
| Listings and partners | Upsert business listing and deal, delete business listing (server-checked), partner application submit and review                                                                                                                                                                              |
| Bio                   | Check handle availability, create and update business profile, set bio offer, record bio tap, bio link stats, claim bio offer, transfer handle, list bio directory                                                                                                                             |
| Social and presence   | Ping created and updated triggers, share here, stop here, start wave, wave at, stop wave, schedule catch-up                                                                                                                                                                                    |
| Comms                 | Brand-email test send, announce event to guests, create and review broadcast, event-published-to-followers trigger, share-meta unfurls                                                                                                                                                         |
| Pulse and ops         | Pulse by token, bio pulse, pulse responses, create and publish pulse, acknowledge and resolve pulse issues, pulse status, pulse follow-ups, birthday alert prefs and monthly alerts                                                                                                            |
| Analytics             | Record analytics batch, aggregate hourly, run aggregation                                                                                                                                                                                                                                      |
| Clean-slate API       | Versioned `v3` namespace (bootstrap, handles, places, events, tickets, deals, cohorts, claims): local cutover candidate behind its own contract gate                                                                                                                                           |

---

## 16. Route canon

Canonical route table plus declarations live in `src/app/` (canon table, aliases, section
mapping). Hosting rewrites for `/api/*` and the SPA fallback live in `firebase.json`.

| Pillar            | Routes                                                                                                                                                                                                                                                 |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Events and access | `/pass`, `/events`, `/e/:id`, `/e/:id/guests`, `/e/:id/manage`, `/event`, `/event/manage`, `/event/new`, `/events/new`, `/me/tickets`, `/ticket/:id`, `/scan`                                                                                          |
| Discovery         | `/places`, `/communities`, `/claim`, `/discover`, `/discovery`                                                                                                                                                                                         |
| Calendar          | `/calendar`                                                                                                                                                                                                                                            |
| Business          | `/business`, `/business/onboard`, `/business/setup`, `/business/partner`, `/business/promotions`, `/business/promotions/new`, `/business/promotions/:id`, `/business/helpdesk`, `/deals`, `/deals/:id`, `/join`, `/join/:code`, `/host`, `/host/pulse` |
| Bio and circle    | `/@handle`, `/bio/@:handle`, `/bio/setup`, `/bio/edit`, `/bio/recover`, `/friends`, `/circle`, `/me`, `/me/inbox`, `/inbox`                                                                                                                            |
| System            | `/`, `/start`, `/auth/action`, `/settings`, `/admin`, `/admin/*`, `/help`, `/contact`, `/about`, `/trust`, `/privacy`, `/terms`, `/cookies`, `/getAirPal`, `/arrival`, `/birthday-freebies`, `/giveaways`, `/promotions`, `/pulse/*`                   |

Legacy redirects (permanent, SEO-safe):

- `/now`, `/explore`, `/guide`, `/p/:id` redirect to Home (`/`).
- `/plan/*`, `/invite/:code` redirect to Home (`/`).
- `/partners`, `/concierge`, `/stay` redirect to `/business` or `/events`.
- `/auth` redirects to `/start` with signin tab; `/reset` redirects to `/start` with reset
  tab.

Share unfurls: server-rendered crawler HTML for `/e/**`, `/p/**`, `/pulse/**`. Wallet
endpoints: `/api/wallet/**` (Apple), `/api/wallet/google/**` (Google). Stripe webhook:
`/api/stripe/webhook`.

---

## 17. Native apps

- One web bundle serves two Capacitor shells from a single codebase:
  - `me.airpal.app`: AirPal (all-in-one companion).
  - `me.airpal.pass`: AirPal Pass (events, tickets, deals, gate check-in).
- Flavor resolves at boot before first render. An explicit environment override wins;
  native Pass shell resolves from its app id; web and everything else get the full AirPal
  app. Zero static Capacitor imports in the flavor module so unit tests run in Node.
- After every web build, sync native mobile containers before opening or shipping shells.
- Release paths: open iOS project for archive and distribution; open Android project for
  release bundle; dual Android bundles and dual iOS archives supported (AirPal plus Pass).
- Native plugins: Firebase Authentication, App, Geolocation, Haptics, Keyboard, Share,
  Splash-Screen, Status-Bar.
- Safe-area insets, haptics, and 44px touch rails apply inside shells exactly as on web.

---

## 18. Analytics & experimentation

- Shared analytics dictionary: event names, aggregates, and validation live in `shared/`
  so client and server can never disagree on spelling or shape.
- Client batches events; server records the batch, aggregates hourly, and rolls up daily
  rows for dashboards.
- Rejected events quarantine in a rejects collection for inspection, never silently
  dropped.
- Search analytics surface for admins; booking-click stream feeds funnel analysis.
- North-Star reporting builds on Completed Experiences (scans, honoured RSVPs, held
  catch-ups, till redemptions) per active user — never on vanity counts or synthetic data.

---

## 19. Verification & quality gates

Before committing code or deploying to production, the full verification suite must pass
cleanly:

```bash
npm run verify
```

This single command executes and enforces, in order:

1. `format:check`: Prettier formatting compliance across all code files.
2. `typecheck`: TypeScript strict typecheck on the client app.
3. `functions:typecheck`: TypeScript strict typecheck on Cloud Functions.
4. `lint`: ESLint rules with zero errors and zero warnings.
5. `test`: Vitest client and shared unit test suite (over 1,110 tests).
6. `functions:test`: Vitest Cloud Functions unit test suite (over 200 tests).
7. `build`: production Vite build and route prerender.
8. `functions:build`: bundler build for Cloud Functions.
9. `rules:check`: security rules consistency and composite index check.
10. `v3:check`: clean-slate API contract verification.
11. `secrets:check`: secret scanner ensuring no tokens or `.env` leak.
12. `seo:check`: route integrity check across sitemap and prerender paths.
13. `check:prod`: production and App Store readiness (secrets manifest, listings, icons,
    native files).
14. `test:rules`: Firestore rules regression suite against the local emulator
    (hermetic; skipped by default gates, run explicitly).

After any web build, sync native mobile containers:

```bash
npm run cap:sync
```

Supporting commands: end-to-end Playwright journeys (plus Pass-flavor config), screenshot
generators for both flavors, audit check, emulator-backed rules suite, production
readiness check.

---

## 20. Release & deployment runbook

1. Full verification: ensure `npm run verify` exits with code 0.
2. Deploy Hosting and Functions:
   - Everything: `npm run deploy` (verify plus Hosting plus Functions).
   - Hosting only: `npm run deploy:hosting` (build plus Hosting deploy).
   - Functions only: `npm run deploy:functions` (functions build plus deploy).
   - Security rules: `npm run deploy:rules` (Firestore rules and indexes deploy).
3. Native builds:
   - iOS: open the iOS project (creates archive and distribution builds in Xcode).
   - Android: open the Android project (creates release bundle in Android Studio).
   - Dual bundles supported: AirPal plus Pass on both platforms.

Pre-deploy checklist: verification green; secrets manifest clean; store listings and
icons current; wallet certificates valid; Stripe webhook and Connect healthy; security
rules diff reviewed line-by-line (never weakened); rollback point tagged.

Rollback: redeploy the last green tagged build. Data fixes go through server functions,
never hand-edits. Keep the dated operations runbook and changelog current.

---

## 21. Agent & developer rules

1. Smallest change that solves: do not introduce sprawling refactors or invent parallel
   account or database schemas.
2. Strict TypeScript: no `any` bypasses without explicit justification.
3. Preserve documentation integrity: never overwrite existing comments, docstrings, or
   test files unrelated to the current task.
4. Never commit secrets: `.env` and API keys stay strictly uncommitted.
5. Honor the North Star: every code change must directly support Completed Experiences
   per Active User.
6. Never weaken `firestore.rules`. Never create a second user system, booking engine, or
   chat engine. Privileged writes go via Cloud Functions.
7. `npm test` and `npm run verify` pass before commits or deployment. Sync native shells
   after web builds.

---

## 22. Open risks & decisions log

| #   | Risk or decision                           | Status     | Mitigation or outcome                                                    |
| --- | ------------------------------------------ | ---------- | ------------------------------------------------------------------------ |
| R1  | Last-seat double-sell under concurrency    | Controlled | Single-transaction booking plus pre-session re-price; race test in suite |
| R2  | Stale pending holds blocking inventory     | Controlled | Expiry auto-cancel releases holds                                        |
| R3  | Coupon or points double-redeem             | Controlled | Idempotent redemption IDs plus ledger; double-tap replays                |
| R4  | Presence leak (1-1 share on public map)    | Controlled | Direct-only delivery plus board filter plus owner and admin pin reads    |
| R5  | Secret leak via `.env` or signing material | Controlled | Secrets scanner gate; signing material off-repo, ignored by pattern      |
| R6  | Clean-slate API cutover divergence         | Watch      | Contract gate; stays local candidate until green                         |
| R7  | Store review or wallet cert expiry         | Watch      | Production-readiness gate covers listings, icons, native files           |

Decisions (locked): single universal account; server-only money; event-level inventory;
verified-only redemptions; default-deny rules; dual-lens single-bundle shells.

---

## 23. Appendix — acceptance criteria index

- A1 Events: publish, tiered buy, wallet add, door scan, payout; race test green (§5).
- A2 Discovery: import, claim, live hours; follow, broadcast received (§6).
- A3 Calendar: ticket auto-import; proposal, email, accept, both calendars; `.ics` valid
  (§7).
- A4 Business: onboard, list, publish, claim, scan-redeem; exactly-once ledger (§8).
- A5 Bio and Circle: handle, QR and vCard; Circle check-in visible, 1-1 private; ping,
  hangout (§9).
- A6 Comms: one inbox item plus one email per lifecycle event; unsubscribe respects
  marketing versus transactional split (§10).
- A7 Trust: rules suite plus rules check green; export and delete round-trip; zero fake
  data (§11).
- A8 Design: 44px audit, 16px inputs, safe areas, single-haptic, focus-trap pass (§12).
- A9 Release: `npm run verify` equals 0, deploy runbook followed, rollback tagged
  (§§19–20).

---
