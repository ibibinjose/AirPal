# AIRPAL — Ecosystem Architecture & Canon Specification

> **Binding Source of Truth** for the entire AIRPAL ecosystem. All agents, developers, and tools must align with this document. When any specification or legacy document conflicts with this file, this document prevails.

---

## Part A: Master Brand & Dual-Lens Architecture

**AIRPAL ("Life Made Easy")** is a unified lifestyle and live experiences ecosystem. Its singular mission is to turn _"I want to do something"_ into a completed, real-world experience without chaos, ticketing fees, or platform bloat.

### The Two Lenses, One Universal Account

To eliminate context fatigue and maintain clear mental models, AIRPAL provides two focused lenses powered by one universal Firebase Auth, Firestore, and trust engine:

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
│ • Link-in-Bio: `/@handle`     │               │ • What's On: `/pass`, `/events`│
│ • Bio Setup & Edit: `/bio/*`  │               │ • Apple/Google Pass: `/me/tickets`│
│ • Friends Hub: `/friends`     │               │ • Dining & Perks: `/deals`    │
│ • Network Circle: `/circle`   │               │ • Door Scanner: `/scan`       │
│ • Live Presence: `<HereCheckIn>`│             │ • Host Studio: `/event`       │
│ • Calendar: `/calendar`       │               │ • Business Hub: `/business`   │
└───────────────────────────────┘               └───────────────────────────────┘
```

1. **AirPal.Me — Personal Life & Identity:**
   - **Job to be Done:** _"Organise your schedule, share your digital bio, and connect with people in real life."_
   - **Core Surfaces:** Digital Bio (`/@handle`, `/bio/setup`, `/bio/edit`), Friends Hub (`/friends`), Networking Circle (`/circle` with live presence `<HereCheckIn />`), Personal Calendar (`/calendar`), and the Me Dashboard (`/me`).
2. **AirPal Pass — Events, Access & Perks:**
   - **Job to be Done:** _"Discover concerts & festivals, access mobile wallet tickets, and enjoy local merchant deals."_
   - **Core Surfaces:** What's On & Passes (`/pass`, `/events`), Apple & Google Wallet passes (`/me/tickets`), Dining Vouchers (`/deals`), Door Scanner (`/scan`), Organiser Event Studio (`/event`), and Business Hub (`/business`).

**The Single Universal Account Invariant:**
Under no circumstances should a second user database, partition, or duplicate auth system be created. A user authenticated on `AirPal.Me` is identically authenticated on `AirPal Pass`, and every ticket booked automatically enriches their personal schedule.

---

## Part B: The 5 Core Pillars & Shipped Route Canon

### 1. Events & Access

- Live concerts, cultural & community festivals (e.g. Diwali, Dandiya, live music), and creator meetups.
- Native Stripe Checkout with direct ticketing, customer receipts, and zero-tax admission passes.
- Apple Wallet (.pkpass) and Google Wallet integration with scannable QR passes.
- **Routes:**
  - `/pass` — Discover passes and live city experiences.
  - `/events` — Comprehensive event catalog with search and date filters.
  - `/e/:id` — Event details, ticket tier selection, and checkout.
  - `/me/tickets` — Personal passbook with live digital passes.
  - `/ticket/:id` — Single ticket pass presentation with Wallet add buttons.
  - `/scan` — Fast door scanner for event organisers and door staff.
  - `/event` — Event hosting studio to publish events, ticket tiers, and stalls.
  - `/e/:id/guests` — Door team guestlist management.

### 2. Discovery (Place & Community)

- Curated venue discovery and organiser communities with follow-to-join loops.
- **Routes:**
  - `/places` — Verified venue directory with live operating hours.
  - `/communities` — Organiser and creator circles.
  - _Legacy redirects:_ `/now`, `/explore`, `/guide`, `/p/:id` redirect directly to Home (`/`) to eliminate empty discovery silos.

### 3. Personal Calendar & Catch-Ups

- Personal agenda, ICS exports, and schedule synchronization.
- Personal 1-on-1 coffee, meeting, and hangout proposals with automatic email invites.
- **Routes:**
  - `/calendar` — Universal personal schedule combining booked tickets, RSVPs, and catch-ups.
  - _Legacy redirects:_ `/plan/*`, `/invite/:code` redirect to Home (`/`). Co-planning lives natively in `/circle` and `/@handle`.

### 4. Business & Merchant Hub

- B2B portal for event organizers, venue owners, and merchant partners.
- Member dining perks, voucher redemptions, and self-service listing management.
- **Routes:**
  - `/business` — Unified business studio, deal creator, and listing manager.
  - `/deals` — Member-exclusive dining and activity perks.
  - `/deals/:id` — Voucher redemption card.
  - _Live Arrival surfaces:_ `/join`, `/join/:code`, `/host`, `/host/pulse` (arrival, host hub, belonging reports).
  - _Legacy redirects:_ `/partners`, `/concierge`, `/stay` redirect cleanly to `/business` or `/events`.

### 5. Personal Bio, Friends & Networking Circle

- Digital identity at `/@handle` acting as a modern digital business card (.vcf vCard 3.0 export).
- Friends hub tracking mutuals, followers, and co-attendees going together to booked events.
- Dedicated networking circle with live presence check-in (`<HereCheckIn />`), connector rank quests, and ultrasonic/BLE wave handshakes.
- **Routes:**
  - `/@handle` — Public digital bio and networking profile.
  - `/bio/setup` & `/bio/edit` — Bio configuration and social link management.
  - `/friends` — Following, followers, mutuals, and "going together" connections.
  - `/circle` — Networking Circle with live presence radar and quests.
  - `/me` — Central user dashboard (attending from bookings, hosting from studio).
  - `/me/inbox` — Unified notification and updates inbox.

---

## Part C: Trust, Safety, Privacy, and Money Rails

1. **Payment Integrity (the server is the price authority):**
   - Single price authority `authoritativeEventTotal()` (`functions/src/stripe.ts`): named tiers resolve from the live event row; legacy `standard` / `vip` (1.5x) / `group` (4-pass bundle) multipliers match the client display, so a booking can never be charged a bare 1x unit price. The client always sends the tier it displayed.
   - `createEventBooking` runs in one Firestore transaction: live event read, authoritative pricing, capacity gate over guestlist heads plus unpaid pending holds, then booking create. Concurrent checkouts serialize here, so the last seats can't double-sell.
   - `createBookingCheckoutSession` re-prices from the live row and re-checks headroom before minting a Stripe session. `checkout.session.expired` auto-cancels stale pending bookings so abandoned checkouts release their inventory holds (refunds/disputes likewise cancel guestlist rows via trigger).
   - Money calculations, Stripe Checkout sessions, Connect account onboarding, and refunds occur exclusively via server Cloud Functions (`functions/src/stripe.ts` and `functions/src/managed-payments.ts`). Clients never write prices, fee calculations, or payment statuses directly to Firestore.
2. **Inventory & Capacity (no oversell):**
   - The `refreshGuestCounts` trigger maintains server-authoritative `bookedHeads` (active guestlist heads) on every event doc — display and fast checks, recomputed from rows so it never drifts, never client-written.
   - Paid bookings (`assertEventHeadroomTx`) and free RSVPs (row-write transaction) both gate on live inventory. Full events skip the row; the door list is the source of truth and the UI shows Sold out (`EventRegistrationCard`, free-RSVP guard, live counts).
   - Rules pin `bookedHeads` client-immutable and forbid lowering `capacity` below seated heads (organiser and co-host branches); `setEventCapacity` soft-guards client-side first. Honored payments always win over capacity in the rare post-pay race.
3. **Redemptions are verified, never eyeballed:**
   - Deal vouchers redeem via `redeemVoucher` (staff-PIN transaction, `functions/src/deals.ts`).
   - Promotion points redemptions are idempotent (`promotionRedemptionId`: one doc per member per offer, transactional; retries and double-taps replay instead of re-charging) and verify/consume via owner-or-admin-only `verifyPromotionRedemption` / `consumePromotionRedemption`, scanned inline in `/scan` (`DealGatePanel`). Consuming writes a server `offer_redeem` ledger event.
   - Only per-guest redemption codes mint scannable `AIRPAL:DEAL:` QRs; static promo/entry codes stay text because they can't be verified at the till.
4. **Presence privacy:**
   - One-person shares never enter the public `here_at` venue mirror (`resolvePinOnMap`, `shared/here.ts`) — they deliver via `here_shares` + push only. The map toggle renders for Circle audience only.
   - `here_pins` reads are owner-or-admin only; the board additionally filters any legacy person-audience rows (`fetchHereAt`).
5. **Security Rules (`firestore.rules`):**
   - Default-deny architecture. Unmatched collections cannot be read or written.
   - Strict owner-binding: users can only write their own profile, calendar entries, feedback, and notifications.
   - Ownership is immutable via edit: event `organiserUid` and listing `ownerUid` can never be reassigned by update (claims go through server flows).
   - Split booking rights: guests can only cancel their own bookings (short validated reason); providers move service status; money fields stay server-only.
   - Shaped writes: safety reports accept a fixed field set, `new`-only, with bounded text; blocks pin `blockerUid`; catch-ups pin both parties with a status allowlist; trips are owner/admin-only; public property docs reject secret-bearing keys; `bookedHeads` is server-only.
   - Rate-limiting documents (`rateLimits`), abuse signals (`abuseSignals`), guestlist signups, coupons, partner leads, and mail outbox (`mail`) are locked from client writes; per-collection composite indexes back every multi-filter query (`firestore.indexes.json`).
6. **Privacy & Data Portability:**
   - GDPR / Australian Privacy Act compliance with self-service JSON data export (`functions/src/exports.ts`) and account deletion (`/account_deletions`).
   - Marketing emails require explicit opt-in; transactional notices (ticket receipts, security alerts, catch-up proposals) always deliver reliably.
7. **Authenticity:**
   - Zero synthetic seed profiles, fabricated metrics, or mock review data in production. Store-review demo fixtures are sandbox-only and never ship as production content.

---

## Part D: Tech Stack & System Architecture

- **Frontend Core:** React 19, TypeScript (strict mode), Vite, Wouter routing, Tailwind CSS, Lucide icons, Sonner toasts.
- **Backend & Cloud:** Firebase Auth, Cloud Firestore, Cloud Functions (v2 HTTPS Callables and Firestore Triggers), Firebase Storage.
- **Mobile Runtime:** Dual Capacitor shells from a single codebase (`src/lib/app-flavor.ts`):
  - `me.airpal.app` — AirPal (All-in-one companion)
  - `me.airpal.pass` — AirPal Pass (Events, tickets, deals, gate check-in)
- **Email Pipeline:** Shared responsive HTML template engine (`shared/email-templates.ts`) + Cloud Functions outbox (`functions/src/email.ts`) queueing to Firestore `mail` collection with direct REST delivery fallback (Resend / Postmark).

---

## Part E: Design System & Mobile Ergonomics

1. **Materials & Aesthetics:**
   - Apple Liquid Glass materials architecture: multi-layered glassmorphism (`backdrop-blur-xl`, `ring-1 ring-line/80`, `shadow-clay`).
   - Contrast rails: High-contrast ink text (`#111827`), brand blue (`#004eff`), and warning gold (`#ffb224`).
2. **Touch Ergonomics:**
   - Every interactive control, button, and list row provides a minimum touch target of **$\ge 44\text{px}$** (48px for email CTAs); visually dense chips may use hit-slop (`after:-inset-2`) instead of growing.
   - `xl:`-only desktop chrome keeps its density; every touch-reachable surface meets 44px.
   - Safe-area insets enforced (`.safe-bottom`, `pt-[env(safe-area-inset-top,0px)]`, `calc(env(safe-area-inset-bottom, 0px))`, bottom-dock clearance).
3. **Tactile Game Feel:**
   - Tactile haptic feedback (`triggerHaptic("light")`, `"medium"`, `"selection"`) on state changes, dismissals, tab switches, and attendance toggles — exactly one layer fires per event.
4. **Keyboard & Input Handling:**
   - Universal backdrop dismiss on modals, popovers, and bottom sheets; `Sheet` traps Tab focus, focuses on open, and restores focus on close.
   - Input font sizes $\ge 16\text{px}$ to prevent iOS Safari auto-zooming.
   - Clean keyboard listeners without double-padding.

---

## Part F: Email Templates & Notifications Engine

### Email Architecture (`shared/email-templates.ts`)

- **Dual-Lens Design**: Dynamic `PASS`, `ME`, `ACCOUNT`, or `CIRCLE` branding badges.
- **Client Resilience**: Email-safe nested tables, inline CSS styles, dark-mode media queries (`@media (prefers-color-scheme: dark)`), and accessible legal footer with unsubscribe links.
- **Standard Templates**:
  - `ticketConfirmationEmail`: Order ref, spots, venue, and 1-tap Wallet pass link.
  - `eventRsvpConfirmationEmail`: Door list RSVP confirmation with calendar actions.
  - `catchUpProposalEmail`: Personal networking invitation with suggested meeting slots.
  - `broadcastAnnouncementEmail`: Organiser updates to circle followers.
  - `welcomeAccountEmail`: Dual-lens welcome orientation.

### Notifications CRUD (`src/lib/notifications.ts` & `functions/src/email.ts`)

- **Create**: Automated in-app notification dispatch on lifecycle events (`ticket_confirmed`, `event_rsvp`, `catchup_proposed`, `security_alert`, `welcome`).
- **Read**: Real-time Firestore snapshot listeners on `/me/inbox` and `<NotificationBell />`.
- **Update**: `markNotificationRead(id)`, `markNotificationUnread(id)`, and bulk `markAllNotificationsRead(ids)`.
- **Delete / Dismiss**: Permanent dismissal via `deleteNotification(id)` and bulk `deleteAllNotifications(ids)`.

---

## Part G: Verification Gates & Quality Non-Negotiables

Before committing code or deploying to production, the full verification suite must pass cleanly:

```bash
npm run verify
```

This single command executes and enforces:

1. `npm run format:check` — Prettier formatting compliance across all code files.
2. `npm run typecheck` — TypeScript strict typecheck on the client app.
3. `npm run functions:typecheck` — TypeScript strict typecheck on Cloud Functions.
4. `npm run lint` — ESLint rules with zero errors and zero warnings.
5. `npm test` — Vitest client and shared unit test suite (>1,110 tests).
6. `npm run functions:test` — Vitest Cloud Functions unit test suite (>200 tests).
7. `npm run build` — Production Vite build and route prerender.
8. `npm run functions:build` — esbuild bundling for Cloud Functions.
9. `npm run rules:check` — Security rules consistency and composite index check.
10. `npm run v3:check` — V3 API clean-slate contract verification.
11. `npm run secrets:check` — Secret scanner ensuring no tokens or `.env` leak.
12. `npm run seo:check` — Route integrity check across sitemap and prerender paths.
13. `npm run check:prod` — Production & App Store readiness (secrets manifest, listings, icons, native files).
14. `npm run test:rules` — Firestore rules regression suite (`functions/src/rules.test.ts`) against the local emulator (skipped by default gates, so they stay hermetic).

After any web build, sync native mobile containers:

```bash
npm run cap:sync
```

---

## Part H: Deployment Runbook

1. **Full Verification:** Ensure `npm run verify` exits with code 0.
2. **Deploy Hosting & Functions:**
   ```bash
   npm run deploy
   ```
   Or deploy individual slices:
   - Hosting only: `npm run deploy:hosting`
   - Functions only: `npm run deploy:functions`
   - Security Rules: `npm run deploy:rules`
3. **Native Builds:**
   - iOS: `npm run cap:ios` (opens Xcode for archive/distribution).
   - Android: `npm run cap:android` (opens Android Studio for AAB release).

---

## Part I: Agent & Developer Rules

1. **Smallest Change That Solves:** Do not introduce sprawling refactors or invent parallel account or database schemas.
2. **Strict TypeScript:** No `any` bypasses without explicit justification.
3. **Preserve Documentation Integrity:** Never overwrite existing comments, docstrings, or test files that are unrelated to the current task.
4. **Never Commit Secrets:** `.env` and API keys must remain strictly uncommitted.
5. **Honor the North Star:** Every code change must directly support **Completed Experiences per Active User**.

---

## Part J: Full Ecosystem CRUD Capability Matrix & Verification Checklist

Every core entity in AIRPAL is fully built, configured, and operable with no placeholder UI, mock handlers, or stub data. All operations map to real Firestore collections, Cloud Functions, and Apple HIG ergonomics ($\ge 44\text{px}$ touch targets, tactile haptics, safe areas).

### 1. Events, Ticketing & Door Access (AirPal Pass)

_Primary surfaces: `/events`, `/pass`, `/event`, `/e/:id`, `/scan`, `/e/:id/guests`_

- [x] **Live Events**
  - **Create**: Publish concerts, cultural festivals, or meetups via `/event` studio with media, location, and dates.
  - **Read**: Live catalog discovery on `/events`, `/pass`, `/e/:id`, search filters, and Live Attendee Preview.
  - **Update**: Edit details, reschedule run dates, adjust capacity limits, and manage co-hosts via `/event/manage`.
  - **Delete**: Cancel or unpublish live events via `EventManagePanel` (marks `status: "ended"`).
- [x] **Ticket Tiers & Stalls**
  - **Create**: Multi-tier tickets (Early Bird, VIP, General) or merchant stalls with pricing via `EventTicketFields` (per-tier capacity is display-only; enforcement is event-level).
  - **Read**: Tier selection, event capacity, and Sold-out state on `/e/:id` (`EventRegistrationCard`, live `guestCounts` vs capacity).
  - **Update**: Modify tier names, pricing, allocations, and active sales windows.
  - **Delete**: Remove unsold tiers using `Trash2` tier deletion control.
- [x] **Promo Coupons**
  - **Create**: Generate discount coupon codes (fixed $ or % off, max redemptions, expiry) via `EventCouponManager`.
  - **Read**: Live coupon dashboard on organiser studio.
  - **Update**: Toggle active state and adjust discount limits.
  - **Delete**: Deactivate or revoke promo codes.
- [x] **Guestlist & Door Check-In**
  - **Create**: Door team adds walk-in guests or manual door entries with party size (`addDoorGuest`).
  - **Read**: Real-time door guestlist on `/e/:id/guests`, search by name/ref, and CSV export.
  - **Update**: Check-in status updates (`checked-in`, `no-show`, `going`, `invited`) via `checkInGuestRemote`.
  - **Delete**: Remove manual or cancelled entries with confirmation via `deleteGuestEntry`.
- [x] **Tickets & RSVPs**
  - **Create**: Stripe Checkout ticket purchase or 1-tap free RSVP on `/e/:id`. Paid bookings transact (live event read, `authoritativeEventTotal()` pricing, capacity gate over guestlist heads plus unpaid pending holds); free RSVPs gate inside the row-write trigger. Full events stay Sold out.
  - **Read**: Scannable passbook on `/me/tickets`, `/ticket/:id`, and Apple/Google Wallet pass export (`walletPass`, `googleWalletPass`).
  - **Update**: Gate check-in admission (`admitTicket`, `checkInGuest`); providers move service status, guests may only cancel their own bookings (rules-enforced).
  - **Delete**: RSVP withdrawal via calendar status; expired checkouts auto-cancel and release holds; refunds/disputes cancel guestlist rows via trigger. Server-reconciled inventory throughout.

### 2. Personal Bio & Digital Identity (AirPal.Me)

_Primary surfaces: `/@handle`, `/bio/setup`, `/bio/edit`, `/me`_

- [x] **Digital Bio & Handle**
  - **Create**: Claim unique username handle (`/@yourhandle`), set avatar, bio, headline, and location at `/bio/setup`.
  - **Read**: Public digital bio at `/@handle`, vCard 3.0 (.vcf) download with remote-portrait `PHOTO;VALUE=URI`, and QR code pass.
  - **Update**: Edit bio details, change handle, update contact numbers, and toggle privacy (public/unlisted) at `/bio/edit`.
  - **Delete**: Request account wipe or complete profile deletion (`/account_deletions`).
- [x] **Social & Custom Links**
  - **Create**: Add custom link tiles, portfolio links, and social accounts in `/bio/edit`.
  - **Read**: Publicly accessible on bio link stack.
  - **Update**: Reorder links, edit labels, URLs, and icons.
  - **Delete**: Remove individual link tiles with instant sync.
- [x] **Bio Perks / Offers**
  - **Create**: Attach member perks, discounts, or services directly to your digital bio in `BioCatalogEditor`.
  - **Read**: Visitors view and claim perks from public bio card.
  - **Update**: Edit offer details, terms, and redemption quotas.
  - **Delete**: Remove or archive perks via `Trash2` catalog action.

### 3. Personal Calendar & Catch-Up Hangouts

_Primary surfaces: `/calendar`, `/@handle`, `/me/inbox`_

- [x] **Personal Schedule Entries**
  - **Create**: Auto-import booked passes/RSVPs, or add custom plans via `PersonalScheduleModal` on `/calendar`.
  - **Read**: Agenda, Day, Week, and Month views on `/calendar` + Apple/Google `.ics` export (RFC 5545 line folding, unique UIDs per event).
  - **Update**: Edit details, drag-and-drop reschedule across days, or adjust times.
  - **Delete**: Remove personal entries or cancel attendance (`setEventStatus(id, null)`).
- [x] **1-on-1 Catch-Up Proposals**
  - **Create**: Propose coffee, meeting, or hangout directly from any `/@handle` via `BioCatchUpModal` (slot proposals, conflict check).
  - **Read**: View proposal status, venue, and time in calendar & notifications inbox.
  - **Update**: Accept, decline, or reschedule (`updateCatchUpStatus`); rules pin both parties with a `pending / accepted / scheduled / dismissed` allowlist.
  - **Delete**: Cancel or withdraw proposal via `deleteCatchUp`.

### 4. Networking Circle, Friends & Live Presence

_Primary surfaces: `/circle`, `/friends`_

- [x] **Social Graph (Follows & Likes)**
  - **Create**: Follow members, connect with mutuals, and like profiles via `useSocial().toggleFollow` / `toggleLike`.
  - **Read**: View Following, Followers, Mutuals, and "Going Together" co-attendees on `/friends` and `/circle`.
  - **Update**: Mutual connection status updates in real-time.
  - **Delete**: Unfollow or unlike with two-way graph deletion.
- [x] **Live Presence (`<HereCheckIn />`)**
  - **Create**: Check in at venue or event space with active duration via `<HereCheckIn />` — Circle audience pins to the venue board, one-person shares stay direct (`resolvePinOnMap`).
  - **Read**: View presence radar and active AirPals in the room or city (`CircleHereBoard`, `fetchHereAt` filters person-audience rows).
  - **Update**: Extend duration or switch active place key.
  - **Delete**: Check out / stop sharing live presence (`stopHereRemote`).
- [x] **AirPal Pings (Hangout Nudges)**
  - **Create**: Send instant hangout ping ("Let's catch up") to another member.
  - **Read**: View incoming and outgoing ping cards in `PingsPanel`.
  - **Update**: Recipient marks `pinged_back`, `hanging_out`, or `dismissed`; sender can cancel.
  - **Delete**: Dismiss or close ping thread.
- [x] **Venue Wave**
  - **Create**: Broadcast ultrasonic / BLE / proximity greeting via `WaveHostCard`.
  - **Read**: Detect nearby AirPal waves.
  - **Update**: Toggle active wave broadcast.
  - **Delete**: End wave broadcast (`stopWave`).

### 5. Business Hub, Places & Deals

_Primary surfaces: `/business`, `/places`, `/deals`, `/claim`_

- [x] **Places & Venues**
  - **Create**: List a business/venue, import from Google Places (`GooglePlaceImport`), or claim a venue (`/claim`).
  - **Read**: Verified public venue directory with trading hours, address, maps, and amenities.
  - **Update**: Edit trading hours, photos, tags, contact info, and amenities on `/business`.
  - **Delete**: Deactivate or remove place listing via `DeleteVenueDialog`.
- [x] **Member Deals & Perks**
  - **Create**: Merchants create member perks, discounts, or vouchers via `/business` and `/business/promotions/new`.
  - **Read**: Browse deals directory on `/deals` and `/deals/:id`.
  - **Update**: Edit deal terms, active dates, redemption caps, or discount values.
  - **Delete**: Pause, expire, or remove deals (`Trash2`).
- [x] **Deal Claims & Vouchers**
  - **Create**: Members claim dining/activity deal vouchers (`claimDeal`, idempotent per member per deal).
  - **Read**: Per-guest redemption codes render scannable `AIRPAL:DEAL:` QRs on `/deals/:id`; static promo/entry codes stay text-only.
  - **Update**: Merchants scan and redeem inline in `/scan` (`DealGatePanel` → `verifyPromotionRedemption` / `consumePromotionRedemption`, owner-or-admin only); deal vouchers redeem via staff-PIN `redeemVoucher`.
  - **Delete**: Cancel unredeemed claim.
- [x] **Promotions & Giveaways**
  - **Create**: Host promotional campaigns, contests, or giveaways with entry criteria.
  - **Read**: Public giveaway entry cards, prize summaries, and winner announcements (`winnerNote`).
  - **Update**: Update contest rules, draw winners (`closeAndDraw`), and notify entrants. Points redemptions are idempotent (`promotionRedemptionId`, one doc per member per offer).
  - **Delete**: Close or archive campaign.

### 6. Notifications, Inbox & Trust Rails

_Primary surfaces: `/me/inbox`, `/settings`_

- [x] **Notifications**
  - **Create**: Automated triggers for ticket sales, RSVPs, catch-up requests, and event updates.
  - **Read**: Real-time notification center on `/me/inbox` and `<NotificationBell />`.
  - **Update**: Mark single notification or all as read (`markAllNotificationsRead`).
  - **Delete**: Clear single or bulk dismiss notifications (`deleteAllNotifications`).
- [x] **Event & Venue Feedback**
  - **Create**: Submit emoji mood and review feedback after attending.
  - **Read**: Organisers and guests view sentiment and feedback.
  - **Update / Delete**: Read-only once submitted to prevent review tampering.
- [x] **Safety Reports & Blocks**
  - **Create**: Submit confidential safety reports (reporter-bound, `new`-only, bounded text) or block problematic users.
  - **Read**: Admin triage inbox for reports; block records readable only by the blocker.
  - **Update**: Admin status updates and moderation notes; block records pin `blockerUid` and can never be re-pointed.
  - **Delete**: Reports are never deleted; unblock by deleting the block record.
- [x] **Privacy Data & Account**
  - **Create**: Request self-service JSON data export or submit account deletion request.
  - **Read**: Review profile data and privacy permissions in `/settings`.
  - **Update**: Update email, phone, and communication preferences.
  - **Delete**: Permanent account deletion (`/account_deletions`).
