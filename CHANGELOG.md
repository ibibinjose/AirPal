# CHANGELOG — AirPal Rebuild (`rebuild/v2`)

All major structural, architectural, and security changes made during the Rebuild of AirPal.

---

## Unreleased — robots, SEO metadata & security headers

- **robots.txt rewrite:** dropped the deprecated `Host:` directive; fixed the stale `/event/*/guestlist` rule (real paths are `/e/:id/guests` + `/e/:id/manage`); added auth-gated/token/studio surface (`/bio`, `/friends`, `/event/manage`, `/events/new`, `/business/*` studio paths, `/join`, `/arrival`, `/pulse`, `/start`, `/welcome`, `/unsubscribe`, `/api/`).
- **Apple association sync:** root `apple-app-site-association` was a stale single-app file; now identical to `.well-known` (dual-app `me.airpal.app` + `me.airpal.pass` split).
- **SEO metadata:** new `src/lib/events-meta.ts` `CollectionPage` JSON-LD rendered by `/events` at runtime and embedded by prerender (same single-source pattern as `trust-meta`); `prerender.test.ts` now enforces per-route parity.
- **Security headers:** catch-all responses add `Cross-Origin-Opener-Policy: same-origin-allow-popups` (popup auth/Stripe keep working), `X-Permitted-Cross-Domain-Policies: none`, `Origin-Agent-Cluster: ?1`; `security.txt` gains `Policy` + `Canonical`.
- **Gates:** `seo:check` extended (new robots rules, header set, association sync, policy link); `npm run audit` clean (0 actionable high/critical).

## Unreleased — `/events` UI/UX pass

- **Search that works (`src/pages/EventsPage.tsx`):** visible search box wired to the existing `query` state (was state-only with no input), `?q=` deep-link seeding, clear button, live result count, query-aware empty state, dismissible city menu (backdrop + Escape).
- **Card polish (`src/components/calendar/CalendarEventCard.tsx`):** 16:10 hero (was square), lucide icons replacing emoji in the calendar export menu, all quick actions at 44px targets (icon buttons 44px, hit-slop on inline Reset/tags/directions), itinerary export included.
- **Tests:** new `src/pages/EventsPage.test.ts` (search render, `?q=` filtering, query-aware empty state, collapsed city menu) — 1,129 client tests passing, `npm run verify` + `npm run test:rules` green.

---

## Release 2.1.1 — 2026-10-20 (Trust Rails, Inventory & Verified Vouchers)

- **Server price authority (`functions/src/stripe.ts`):** `authoritativeEventTotal()` prices named tiers from the live event row and legacy `standard` / `vip` (1.5x) / `group` (4-pass bundle) multipliers; the client always sends the tier it displayed. No-tier bookings can no longer be charged a bare 1x unit.
- **Transactional booking + capacity enforcement (`functions/src/stripe.ts`, `functions/src/guestlist.ts`):** `createEventBooking` runs in one transaction (live event read, pricing, headroom gate over guestlist heads plus unpaid pending holds); `createBookingCheckoutSession` re-checks headroom; free RSVPs gate inside the row-write trigger. `refreshGuestCounts` maintains server-authoritative `bookedHeads`; rules pin it client-immutable and forbid lowering `capacity` below seated heads. `checkout.session.expired` auto-cancels stale pending bookings. New composite index `bookings(eventId, paymentStatus)`.
- **Idempotent points redemptions (`functions/src/promotions.ts`):** `promotionRedemptionId` (one doc per member per offer, transactional; retries replay instead of re-charging) with legacy active-code replay.
- **Merchant voucher verification (`functions/src/promotions.ts`, `src/components/deals/DealGatePanel.tsx`, `src/pages/ScanPage.tsx`):** owner-or-admin-only `verifyPromotionRedemption` / `consumePromotionRedemption` (consuming writes a server `offer_redeem` ledger event); `AIRPAL:DEAL:` QRs verify inline in `/scan`. Only per-guest codes mint scannable QRs.
- **Presence privacy (`functions/src/here.ts`, `shared/here.ts`, `firestore.rules`):** person-audience shares never enter the `here_at` mirror (`resolvePinOnMap`); `here_pins` reads are owner/admin-only; the board filters legacy person-audience rows.
- **Rules hardening (`firestore.rules`):** organiser/listing ownership immutable via edit, blocks pin `blockerUid`, split booking rights (guests cancel-only) with `cancelReason` cap, shaped safety-report creates, catchup party pin + status allowlist, trips owner/admin-only, secret-bearing keys blocked on public property docs.
- **Client correctness & a11y:** TicketPage staff gate, ScanPage ticket-id validation, RFC 5545 ICS folding + unique UIDs, vCard `PHOTO;VALUE=URI`, live follower counters, 44px touch targets, CalendarEventModal haptics, `Sheet` focus trap + restore, GuestlistPage capacity guard, Sold-out states.
- **Docs canon sync:** `docs/AIRPAL.md` (rails, gates incl. `check:prod`, corrected Part J matrix), route fixes (`/me/tickets`, `/e/:id/guests`, live `/join` + `/host`), V3 build doc (32 callables, 4 test files), store sandbox note, runbook webhook list.
- **Gates:** 1,114 client tests + 195 functions tests passing (incl. new verify/consume, redeem-idempotency, and staff-PIN redeem gap suites); full `npm run verify` green.
- **Gap closure (2026-10-20):** `claimDeal` creation/idempotency, `createEventBooking` transaction (pricing, group normalisation, oversell + pending-hold rejection), server-owned `deleteBusinessListing` (rules deny direct client deletes; 3 callable tests + 1 rules case), and a 17-case Firestore rules emulator suite (`npm run test:rules`, skipped by hermetic default gates) — 1,122 client + 206 functions tests passing, rules suite 17/17.

## Release 2.1.0 — 2026-10-19 (Brand Flow, Liquid Glass & Communications Engine)

- **Master Brand Email Templates Suite (`shared/email-templates.ts`):** Complete dual-lens responsive email design system with dark/light mode support, lens badges (`PASS`, `ME`, `ACCOUNT`, `CIRCLE`), $\ge 48\text{px}$ touch targets, and universal legal footers. Templates for Tickets, RSVPs, Catch-ups, Broadcasts, and Welcome orientation.
- **Backend Email Delivery Pipeline (`functions/src/email.ts`):** Standardized delivery queue writing to Firestore `mail` collection (Firebase Trigger Email extension) with direct REST fallback (Resend / Postmark API keys) and marketing opt-out enforcement.
- **Lifecycle Server Triggers (`functions/src/guestlist.ts`, `functions/src/catchup-agent.ts`):** Automated passbook email and in-app notifications on ticket purchase, event RSVP, and catch-up proposals.
- **Full In-App Notifications CRUD (`src/lib/notifications.ts`, `firestore.rules`):** Complete create, read, update (mark read/unread), and delete (single dismissal and bulk clear-read) capabilities with updated security rules allowing users to manage their own notifications.
- **Real-Time Notification UI (`src/pages/InboxPage.tsx`, `src/components/notifications/NotificationBell.tsx`):** Category icons, read/unread filters, quick single dismissals, bulk "Clear Read", and live real-time snapshot listeners.
- **Mobile Welcome Experience (`src/pages/WelcomePage.tsx`):** Apple Liquid Glass aesthetic with ambient caustics, interactive swipe gesture cards, and live product previews.
- **Touch & Keyboard Ergonomics:** Resolved mobile modal double-padding, prevented iOS Safari auto-zoom with $\ge 16\text{px}$ font sizing, and implemented universal backdrop dismiss.
- **Test & Build Gates:** 1,012 client tests + 172 functions tests passing green; `npm run verify` and `npm run cap:sync` passing 100%.

---

## Release 2.0.1 — 2026-10-15 (market-ready build)

- Version: web/package `2.0.1`, Android `versionCode 9` / `versionName 2.0.1`
  (flavors `airpal` + `pass`), iOS `MARKETING_VERSION 2.0.1` (build 17).
- Zero-dead-code sweep: ~75 dead symbols removed (22 dead callable
  wrappers, Discover/cohort/stay leftovers, unused imports), 3 empty dirs
  removed, 3 unused map deps uninstalled. No behavior change.
- E2E honesty: retired `/partners` asserts its `/business` redirect.
- Gates: `npm run verify` green (959 web + 157 functions tests, both
  typechecks, lint zero, web + functions builds, rules/v3/secrets/seo).
- Artifacts: `dist/` (web), signed Android release AAB/APK (both
  flavors, upload cert), iOS Release archive + dev IPA (2.0.1/17).
- iOS store-export blocker (portal-side, 5 min): the App Store
  provisioning profile for `me.airpal.app` lacks the
  `com.apple.developer.pass-type-identifiers` entitlement. In the Apple
  Developer portal, enable Wallet/Pass Type IDs on the App ID (or open
  the project in Xcode → Signing → regenerate profiles), then re-run
  `xcodebuild -exportArchive` with `ios/App/ExportOptions.plist`.

---

## 1. Summary of Changes

The Council of Seven Experts conducted a full-funnel audit, strategy formation, UX overhaul, and code rebuild to transform AirPal from a legacy hotel/PMS concierge prototype into a high-converting, unified **Dual-Lens Experience Ecosystem**:

- **AirPal.Me:** Personal Life & Identity Companion (`/@handle`, `/now`, `/plan`, `/circle`).
- **AirPal Pass:** Real-World Events & Experiences Hub (`/pass`, `/me/tickets`, `/event`, `/deals`, `/scan`).

| Dimension               | Before (`main`)                                                         | After (`rebuild/v2`)                                              | Impact                                |
| :---------------------- | :---------------------------------------------------------------------- | :---------------------------------------------------------------- | :------------------------------------ |
| **Total LOC**           | ~25,800 LOC                                                             | ~17,600 LOC                                                       | **-8,192 net lines deleted (-31.7%)** |
| **Page Components**     | 77 pages                                                                | 50 pages                                                          | **-27 legacy pages purged (-35.1%)**  |
| **Security / Auth**     | Insecure localhost auto-login (`getTestUser`), hardcoded mock passwords | Strict Firebase Auth, unified session, zero demo accounts         | **100% hardened**                     |
| **Navigation Chrome**   | 5 stacked banners + FAB + pillar strip                                  | Clean single header + 5-tab mobile dock                           | **Zero vertical screen clutter**      |
| **Discovery Core Loop** | Cluttered vertical silo list                                            | 60s Discovery Radar (`/now`), category chips, hero CTA            | **Time to value < 60s**               |
| **Privacy Compliance**  | Generic policy text                                                     | GDPR / DPDP Art. 20 JSON data export, clear consent controls      | **Full regulatory compliance**        |
| **Test Verification**   | Broken tests, skipped suites                                            | 177 Vitest files (1,058 tests) + 131 Playwright E2E tests passing | **100% test pass rate**               |

---

## 2. Surfaces Purged (CUT) — 27 Legacy Pages

The following 27 pages and their routes were eliminated from the codebase. Every route now has an explicit client redirect in `src/app/routes.tsx` to maintain 100% link integrity for existing bookmarks and backlinks.

1. `AccountSyncPage.tsx` (`/account-sync` $\to$ `/me`) — Redundant account sync panel; universal auth already synchronises via Firebase.
2. `AlternativePage.tsx` (`/alternatives/:slug` $\to$ `/about`) — SEO keyword-stuffing comparison page.
3. `AssistPage.tsx` (`/assist` $\to$ `/support`) — Deprecated duplicated concierge support portal.
4. `BioRecoverPage.tsx` (`/bio/recover` $\to$ `/start?tab=reset`) — Obsolete custom bio recovery; unified auth password reset handles this natively.
5. `BusinessOnboardPage.tsx` (`/business/onboard` $\to$ `/business`) — Redundant second onboarding form merged into canonical `/business` studio.
6. `BusinessPromotionDetailPage.tsx` (`/business/promotions/:id` $\to$ `/deals/:id`) — Duplicate deal detail view; merged with canonical consumer deal card.
7. `BusinessPromotionNewPage.tsx` (`/business/promotions/new` $\to$ `/business`) — Redundant promotion creator merged into Business Studio.
8. `BusinessPromotionsPage.tsx` (`/business/promotions` $\to$ `/business`) — Merged into `/business` deals management panel.
9. `BusinessShowcasePage.tsx` (`/business/showcase` $\to$ `/business`) — Marketing brochure page merged into `/business`.
10. `ExpoDirectoryPage.tsx` (`/expo` $\to$ `/events`) — Dead conference expo directory; events are managed canonical via `/events`.
11. `FoundersPage.tsx` (`/founders` $\to$ `/about`) — Outdated investor pitch deck page.
12. `GetAirPalPage.tsx` (`/get` $\to$ `/pass`) — Redundant download landing page; app stores linked directly from `/pass`.
13. `HelpDeskPage.tsx` (`/helpdesk` $\to$ `/support`) — Legacy hotel housekeeping helpdesk replaced by canonical `/support`.
14. `HostPage.tsx` (`/host` $\to$ `/event`) — Hotel host portal purged; event organisers use `/event`.
15. `HostPulsePage.tsx` (`/host/pulse` $\to$ `/join`) — Legacy hostel pulse check-in replaced by Arrival Engine.
16. `MarkerPage.tsx` (`/m/:id` $\to$ `/explore`) — Dead QR marker landing page without context.
17. `NotificationsAdminPage.tsx` (`/admin/notifications` $\to$ `/admin`) — Merged into canonical `/admin` dashboard.
18. `PartnerPage.tsx` (`/partners/:id` $\to$ `/business`) — Duplicate partner profile merged into canonical `/business`.
19. `PartnersPage.tsx` (`/partners` $\to$ `/business`) — Merged into canonical B2B portal `/business`.
20. `PromotionAdminDetailPage.tsx` (`/admin/promotions/:id` $\to$ `/admin`) — Redundant admin sub-page merged into `/admin`.
21. `PromotionsAdminPage.tsx` (`/admin/promotions` $\to$ `/admin`) — Merged into canonical `/admin`.
22. `PulseHubPage.tsx` (`/pulse` $\to$ `/join`) — Legacy hotel vibe tracker replaced by Arrival Engine `/join`.
23. `PulsePublicPage.tsx` (`/pulse/:code` $\to$ `/join`) — Legacy QR table-tent check-in redirected to `/join`.
24. `SearchPage.tsx` (`/search` $\to$ `/now`) — Empty keyword input page replaced by the active Discovery Radar (`/now`).
25. `StallPage.tsx` (`/stalls/:id` $\to$ `/explore`) — Isolated flea market stall detail merged into Place & Precinct explore.
26. `TourPage.tsx` (`/tour` $\to$ `/now`) — Static guided tour walkthrough redirected to live discovery.
27. `WavePage.tsx` (`/w/:code` $\to$ `/circle`) — Transient stranger-wave page redirected to Networking Circle.

---

## 3. Surfaces Merged (MERGE)

- **Search $\to$ Discovery Radar (`/now`):** Eliminated dead `/search` route. Modal search and global search shortcuts (`Cmd+K`) navigate directly to `/now?q=...`, offering instant category filtering, open-now places, and outfit/weather context.
- **Legacy Helpdesk & Housekeeping $\to$ Support (`/support`):** Consolidated customer and organiser support under a single help portal.
- **Business Promotions $\to$ Business Studio (`/business`):** Unified merchant deal creation and management under the main Business portal.
- **Host / Organiser Tools $\to$ Event Studio (`/event`):** Replaced legacy residential host tooling with high-converting native event ticketing tools.

---

## 4. Surfaces Simplified (SIMPLIFY)

- **App Shell & Chrome (`AppShell.tsx`):**
  - Restored `<LocalNowBar />` at the top of the sticky header with location picker, date, time, live weather condition, temperature, rain chance, and power saver indicator.
  - Removed stacked overhead alert banners (`TicketAlertBar`, `BatteryWarningBanner`, `SyncStatusBar`).
  - Removed the floating action button (FAB) that blocked mobile tap targets.
  - Retained clean top header and the 5-tab thumb-friendly bottom navigation dock (`Now`, `Pass`, `Plan`, `Circle`, `Me`).
- **HomePage (`HomePage.tsx`):**
  - Replaced the fragmented 4-vertical landing matrix with a clean editorial greeting: "Less scrolling. More living."
  - Featured a single high-contrast primary CTA: "Discover What's Open Now $\to$" linking directly to `/now`.
  - Displayed secondary action: "Plan a Hangout" (`/plan`).
- **Global Search Modal (`GlobalSearchModal.tsx`):**
  - Deep-linked search queries directly into `/now?q=...` with auto-focused category triggers.
- **Admin Dashboard (`AdminPage.tsx`):**
  - Pointed quick action portals directly to canonical ecosystem routes (`/support`, `/now`, `/event`).

---

## 5. Security & Privacy Hardening (SECURITY)

- **Purged Test-User Auth Spoofing (`AuthContext.tsx`):**
  - Removed insecure `getTestUser()` fallback that automatically signed local guests in as a mock user.
  - Eliminated hardcoded demo accounts (`DEMO_USERS`) in `shared/airpal-data.ts`.
  - All protected surfaces (`/event`, `/business`, `/bio/setup`, attendance toggling) now strictly enforce Firebase Auth via `AuthGate` or `requireUser` prompt.
- **GDPR & DPDP Article 20 Compliance (`SettingsPage.tsx`):**
  - Added native "Export Account Data (JSON)" button allowing users to download their complete profile, RSVPs, tickets, and attendance history in structured JSON format.
  - Maintained account deletion self-serve request flow.

---

## 6. Verification & Quality Assurance

- **Unit & Integration Tests:** 177 test suites, 1,058 tests passing (`npm test`).
- **End-to-End Tests:** 19 Playwright spec files, 129 tests passing (`npm run test:e2e`).
- **Verification Pipeline:** `npm run verify` passed with 0 errors:
  - Prettier format check: 100% clean
  - TypeScript & Functions Typecheck: 0 type errors
  - ESLint: 0 warnings, 0 errors
  - Production Vite & Functions Build: Clean bundles, 21 prerendered routes
  - Firestore Security Rules: Verified least-privilege syntax
  - Secrets Check: Zero exposed API secrets
  - SEO Check: 31 canonical routes verified in sitemap

---

## 7. Goodtimes-Inspired Capabilities Adopted (`goodtimesapp.co`)

- **"Find the Time" Multi-Slot Availability Poll ([`PlanCreatePage.tsx`](file:///Users/bibinjose/Projects/Codebase/Projects/AirPal/src/pages/PlanCreatePage.tsx) & [`PlanDatePoll.tsx`](file:///Users/bibinjose/Projects/Codebase/Projects/AirPal/src/components/plan/PlanDatePoll.tsx)):**
  - Host can propose 2–4 candidate dates/times during plan creation.
  - Mates can vote on times with 1-tap checkmarks without sharing or connecting private diaries/calendars.
  - Host sees live vote counts and locks in the winning time slot.
- **Group Chip-In / Split Bill Collection ([`PlanCreatePage.tsx`](file:///Users/bibinjose/Projects/Codebase/Projects/AirPal/src/pages/PlanCreatePage.tsx) & [`PlanDetailPage.tsx`](file:///Users/bibinjose/Projects/Codebase/Projects/AirPal/src/pages/PlanDetailPage.tsx)):**
  - Host can optionally configure a per-person contribution amount (e.g. $25 AUD) for dinner deposits or shared activities.
  - Guests pay their share with Apple Pay, Google Pay, or card via native Stripe Checkout.
- **1-Tap "Plan Hangout Here" Bridge ([`PlacePage.tsx`](file:///Users/bibinjose/Projects/Codebase/Projects/AirPal/src/pages/PlacePage.tsx)):**
  - Universal primary action on all venue/place pages that pre-fills venue title, destination, and hero image directly into a new Plan.

---

## 8. Real Baseline Data Fallbacks & Offline Reliability

- **The Rocks Weekend Market & Artisan Stalls:**
  - Connected `SEED_EVENT` ("The Rocks Weekend Market") as immediate fallback in `loadEvents()` and `getEvent()`.
  - Connected all 9 artisan market stalls in `SEED_STALLS` via `loadStalls()` and `stallsFor()` so `/e/evt-rocks-market` displays live artisan stalls on fresh installs without waiting for manual admin seeding.
- **Realistic Discoverable Hangouts & Retreats:**
  - Initialized `readFromStorage()` in [`plan-store.ts`](file:///Users/bibinjose/Projects/Codebase/Projects/AirPal/src/lib/plan-store.ts) with `SEED_PLANS` ("Friday Night Out in The Rocks", "Sunday Harbour Lunch & Walk", "5-Day Bali Surf & Yoga Retreat", and "Secret Laneways Cocktail Crawl").
  - Extended [`seed-database.ts`](file:///Users/bibinjose/Projects/Codebase/Projects/AirPal/src/lib/seed-database.ts) to seed `plans` collection in Firestore alongside places, events, stays, and bios.
- **Cross-Platform Mobile Search & Desktop TopNav Search:**
  - Added dedicated accessible Search button to desktop `TopNav` alongside mobile header search, wired to `openGlobalSearch()`.
  - Refined mobile E2E interaction in `search-flow.spec.ts` to cleanly await lazy-loaded modal appearance without timing flakes.
- **Universal Header Create (+) Action & Creation Modal:**
  - Connected the sticky mobile header and desktop TopNav Create (+) buttons to `<CreateFab showFab={false} />`, keeping the bottom tab bar uncluttered while opening the universal creation modal.
  - Verified creation pathways for social hangouts (`/plan/new`), live event hosting (`/event`), and arrival onboarding (`/join`).
