# AirPal — Team Handover (from the code)

> **For:** the next developer or team taking ownership of this repo.
> **Status:** Self-contained and written from the actual file tree, router, functions
> barrel, rules, and configs. No other document is required reading.
> **Product:** AirPal ("Life Made Easy") — one Vite + React 19 + Firebase codebase serving
> two lenses (AirPal.Me and AirPal Pass) off one universal auth identity.

---

## Table of contents

1. [What this is](#1-what-this-is-30-second-brief)
2. [Product map: lenses and pillars](#2-product-map-lenses-and-pillars)
3. [Boot and runtime: how the app starts](#3-boot-and-runtime-how-the-app-starts)
4. [File-structure map](#4-file-structure-map)
5. [Pages by pillar](#5-pages-by-pillar)
6. [Components by surface](#6-components-by-surface)
7. [Client support code: contexts, hooks, lib, shared](#7-client-support-code-contexts-hooks-lib-shared)
8. [Server: Cloud Functions map](#8-server-cloud-functions-map)
9. [Routes, aliases, and hosting rewrites](#9-routes-aliases-and-hosting-rewrites)
10. [Data map: Firestore collections](#10-data-map-firestore-collections)
11. [Feature walkthrough: file-level traces](#11-feature-walkthrough-file-level-traces)
12. [The invariants (do not break)](#12-the-invariants-do-not-break)
13. [Daily workflows and verification](#13-daily-workflows-and-verification)
14. [Ops: environments, secrets, remotes](#14-ops-environments-secrets-remotes)
15. [Deploy and rollback](#15-deploy-and-rollback-read-fully-before-shipping)
16. [When things break (triage map)](#16-when-things-break-triage-map)
17. [Open work and known watches](#17-open-work-and-known-watches)
18. [Handover acceptance](#18-handover-acceptance)

---

## 1. What this is (30-second brief)

AirPal turns "I want to do something" into a completed real-world experience. One bundle
builds to `dist/` and ships to Firebase Hosting plus two Capacitor shells (`me.airpal.app`
and `me.airpal.pass`). Only Cloud Functions may price, pay, or verify. `npm run verify`
gates everything: format, types, lint, both test suites, both builds, rules,
clean-slate contract, secrets, SEO, production readiness.

North Star: Completed Experiences per Active User (ticket scanned in, RSVP honoured,
catch-up held, deal redeemed).

---

## 2. Product map: lenses and pillars

Two lenses, one universal Firebase Auth identity. A user authenticated on Me is
identically authenticated on Pass. Every ticket booked enriches the personal schedule.

| Lens        | Job to be done                                             | Flagship surfaces                                                           |
| ----------- | ---------------------------------------------------------- | --------------------------------------------------------------------------- |
| AirPal.Me   | Organise schedule, share digital bio, connect in real life | `/@handle`, `/bio/*`, `/friends`, `/circle`, `/calendar`, `/me`             |
| AirPal Pass | Discover shows, carry wallet tickets, enjoy local deals    | `/pass`, `/events`, `/me/tickets`, `/deals`, `/scan`, `/event`, `/business` |

Five pillars:

1. Events and Access: publish concerts and festivals, tiered Stripe ticketing, wallet
   passes, door scanner, organiser studio.
2. Discovery (Place and Community): verified venue directory, organiser communities with
   follow-to-join loops. Legacy discovery paths redirect to Home.
3. Personal Calendar and Catch-Ups: agenda plus ICS schedule, personal 1-on-1 networking
   proposals from any bio. Legacy planning paths redirect to Home.
4. Business and Merchant Hub: unified business studio, member merchant perks,
   self-service listing and ticket management.
5. Personal Bio, Friends and Networking Circle: friends hub for mutuals and co-attendees,
   networking Circle with live presence check-in, connector rank quests, digital bio
   profiles, user dashboard.

Communications engine: dual-lens responsive email suite (PASS, ME, ACCOUNT, CIRCLE badges)
plus Cloud Functions outbox delivery and full notifications CRUD with real-time sync.

---

## 3. Boot and runtime: how the app starts

Read these three files top to bottom and you understand startup:

1. `src/main.tsx`: calls `initTheme()` first; registers the service worker only for
   mobile-web production (skipped in dev to avoid stale caches, skipped inside the
   Capacitor shell where custom schemes break worker scope); then awaits
   `initAppFlavor()` before first render so the start route, dock, and switcher scope
   correctly; fades the brand boot splash after React commits first paint.
2. `src/lib/app-flavor.ts`: pure flavor resolution with zero static Capacitor imports so
   unit tests run in Node (`app-flavor.test.ts`). An explicit `VITE_APP_FLAVOR` override
   wins; the native Pass shell resolves from its app id (`me.airpal.pass`); everything
   else gets the full AirPal app. `initAppFlavor()` caches after first call.
3. `src/App.tsx` plus `src/app/providers.tsx` (composed via `composeProviders`, right to
   left). One context per domain — `src/contexts/`: Analytics, Auth, Battery, Bio,
   Companion, Events, Listings, Locale, LocalNow, Social, Sync.
4. `src/app/routes.tsx` renders `AppRoutes` inside a route error boundary and Suspense
   with a brand loader. `HomePage` is eager for instant first paint; every other page is
   lazy-split. Root `/` redirects to `/pass` inside the Pass shell.

Key app-shell components (`src/components/layout/`): `AppShell`, `TopNav`, `TabBar`,
`SiteFooter`, `PullToRefreshContainer`, `NetworkStatusToast`, `LocationSheet`,
`PresencePublisher`, `LocalNowBar`, `ThemeToggle`, `DeviceMirror`,
`NativeSplashTransition`.

---

## 4. File-structure map

| Path                                                                        | Kind         | Committed | What is actually inside                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| --------------------------------------------------------------------------- | ------------ | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/app/`                                                                  | source       | yes       | `routes.tsx` (all route declarations), `airpal-app.ts` (canon table, aliases, section mapping), `providers.tsx` + `composeProviders`, plus their `*.test.ts`                                                                                                                                                                                                                                                                                                                         |
| `src/pages/`                                                                | source       | yes       | ~55 page components, one file per surface (see section 5), colocated `*.test.ts`                                                                                                                                                                                                                                                                                                                                                                                                     |
| `src/components/`                                                           | source       | yes       | ~30 surface folders (see section 6) plus `ErrorBoundary`, `RouteErrorBoundary`                                                                                                                                                                                                                                                                                                                                                                                                       |
| `src/contexts/`                                                             | source       | yes       | 11 domain contexts: Analytics, Auth, Battery, Bio, Companion, Events, Listings, Locale, LocalNow, Social, Sync                                                                                                                                                                                                                                                                                                                                                                       |
| `src/hooks/`                                                                | source       | yes       | `useBattery`, `useDataReload`, `useDelayedLoading`, `useHandleStatus`, `useLocalNow`, `useMediaSrc`, `useMyBookings`, `usePullToRefresh`, `useScrollLock`, `useSearchQueryLogger`                                                                                                                                                                                                                                                                                                    |
| `src/lib/`                                                                  | source       | yes       | ~70 modules: firebase access, auth-mail, phone-auth, social-auth, app-flavor, native, qr, wallet, share, notifications, calendar utils and export, trading-hours, places-store, bio family (handle, store, persist, pass-export, presets), catchup, circle, wave, ble-wave, arrival, travel, promotions, pass-partners, partner family, pending-intent, safe-storage, biometrics, sync, theme, tabs, search-query, recent-searches, share-meta, and more — most with colocated tests |
| `src/types/`                                                                | source       | yes       | Ambient declarations (`nfc`, push notifications)                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `shared/`                                                                   | source       | yes       | ~35 pure-TS contract modules both sides import (see section 7). No Admin imports                                                                                                                                                                                                                                                                                                                                                                                                     |
| `functions/src/`                                                            | source       | yes       | ~35 server modules plus `v3/` clean-slate API; barrel `index.ts` (see section 8)                                                                                                                                                                                                                                                                                                                                                                                                     |
| `functions/package.json`                                                    | config       | yes       | Separate functions toolchain, own `node_modules`, own vitest                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `scripts/`                                                                  | source       | yes       | `check-audit`, `check-prod-readiness`, `check-rules`, `check-secrets`, `check-seo`, `check-v3`, `prerender-routes`, `screenshots` — every gate is an `npm run` script                                                                                                                                                                                                                                                                                                                |
| `docs/`                                                                     | source       | yes       | Requirements, handover, rebuild guide, contracts, runbooks, store pack, `archive/` for retired material                                                                                                                                                                                                                                                                                                                                                                              |
| `public/`                                                                   | source       | yes       | Icons, manifest, service worker (`sw.js`), `robots.txt`, `sitemap.xml`                                                                                                                                                                                                                                                                                                                                                                                                               |
| `e2e/`                                                                      | source       | yes       | 15 Playwright specs: auth, calendar, circle-crm, creator-hub, event-create, event-detail, home-journey, loop-proof, navigation, pass-shell, redirects, route-recovery, tickets-guest, unified-app, wave                                                                                                                                                                                                                                                                              |
| `ios/`, `android/`                                                          | shells       | yes       | Capacitor shells built from `dist/` via `cap:sync`; generated subdirs ignored                                                                                                                                                                                                                                                                                                                                                                                                        |
| `index.html`, `vite.config.ts`, `capacitor.config.ts`                       | config       | yes       | Web entry, build, shell config (`appId: me.airpal.app`)                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `firebase.json`, `.firebaserc`, `firestore.rules`, `firestore.indexes.json` | config       | yes       | Rewrites and headers, project id, security rules, composite indexes (plus `.v3` variants)                                                                                                                                                                                                                                                                                                                                                                                            |
| `dist/`                                                                     | build output | no        | Vite production bundle, deployed to Hosting                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `functions/lib/`                                                            | build output | no        | Bundled functions, deployed to Cloud Functions                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `.env`, `functions/.env`, `functions/.secret.local`, signing material       | secrets      | no        | Client keys, local config, local secret overrides, signing creds — never committed                                                                                                                                                                                                                                                                                                                                                                                                   |

---

## 5. Pages by pillar

Router order in `src/app/routes.tsx` is pillar-grouped. HomePage eager; rest lazy.

- Events and Access: `PassPage`, `EventsPage`, `EventPage`, `ExperienceDetailPage`,
  `TicketPage`, `MyTicketsPage`, `ScanPage`, `GuestlistPage`, `EventStudioPage`
  (handles `/event`, `/event/manage`, `/e/:id/manage`, `/events/new`),
  `PassPartnersPage`, `PassPartnerDetailPage`, `PassPartnerApplyPage`.
- Discovery: `PlacesPage`, `CommunitiesPage`, `ClaimVenuePage`.
- Circle and Me: `CirclePage`, `FriendsPage`, `MePage` (also serves `/bio` on the pass
  tab), `BioSetupPage`, `BioEditPage`, `BioPublicPage`, `BioSitePage`, `BioRecoverPage`,
  `MemoryWallPage`, `InboxPage`.
- Business and Arrival: `BusinessPage`, `BusinessPartnerPage`, `BusinessOnboardPage`
  (steps onboard and setup), `PromotionsStudioPage` (business and admin scopes),
  `PromotionsPage`, `PromotionDetailPage` (promotion and giveaway kinds),
  `BirthdayFreebiesPage`, `ArrivalPage` (join and arrival modes), `PulsePage`.
- Admin: `AdminPage`, `AdminPartnersPage`, `SearchAnalyticsPage` (plus admin promotion
  and notification views inside `PromotionsStudioPage`).
- System: `WelcomePage`, `OnboardingPage`, `StartPage`, `AuthActionPage`,
  `SettingsPage`, `AboutPage`, `TrustPage`, `ContactPage`, `HelpPage`,
  `UnsubscribePage`, `PrivacyPage`, `TermsPage`, `CookiesPage`, `AlternativesPage`,
  `GetAppPage`, `NotFoundPage`.

---

## 6. Components by surface

- `event/`: studio field groups (name and media, host, venue, dates with calendar block,
  description, agenda, festival, stalls, tickets), `EventRegistrationCard` (tier select
  and buy), `EventManagePanel` (edit, reschedule, capacity, co-hosts, cancel),
  `EventCouponManager`, `EventLiveAttendeePreview`, `EventShareModal`,
  `EventAnnounceModal`, `EventNotifyForm`, `EventRefundBlock`, `EventReportButton`,
  `SpeakerPicker`.
- `booking/`: `createBooking` client, `TicketGatePanel`, `PaymentCanceledNotice`,
  `BusinessBookingsSection`.
- `tickets/` + `pass/`: ticket pass visuals, `PossieTicket`, `DirectionsHandoff`,
  `PlanBeforeYouGo`, wallet buttons in `ui/` (`AppleWalletButton`,
  `GoogleWalletButton`).
- `calendar/`: Agenda, Day, Week, Month views, drag context, event card and modals,
  reschedule modal, sidebar, `PersonalScheduleModal`, `AddToCalendarMenu`.
- `circle/`: `HereCheckIn`, `CircleHereBoard`, `CircleHereSheet`.
- `social/`: `SocialButtons` (follow and like), `PingsPanel`, `PingButton`.
- `wave/`: `WaveHostCard`, `WaveListenCard`.
- `bio/`: `BioSiteView`, `BioCatalog` + `BioCatalogEditor`, `BioCatchUpModal`,
  `BioShareModal`, `BioPassCard` visuals, `DigitalBioPassCard`, socials, theme picker,
  insights, subscribers, handle and display-name forms, status modal, pulse rate,
  `VenueLiveStrip`.
- `business/`: `BusinessNavHub`, `BusinessSubscriptionCard`, `BusinessTonight`,
  `DeleteVenueDialog`, `GooglePlaceImport`, `OfferForm`, `OfferSheet`.
- `deals/`: `DealGatePanel` (scan-and-redeem inline in `/scan`).
- `claim/`: `ClaimShell`, `ClaimVenueForm`, `ClaimReviewQueue`.
- `discovery/`: `PlaceCard`, `TradingHoursScheduleView`. `airpal/`: `ExperienceCard`,
  `CategoryFilters`.
- `connect/`: `PayoutSetupCard` (Connect onboarding). `dashboard/`: `StatTile`.
  `club/`: `GuestListPanel`. `invite/`: `InvitePanel`. `arrival/`:
  `ArrivalAssistantCard`. `host/`: `HostFreshnessBanner`.
- `promotions/`: `PromotionTerms`. `search/`: `SearchBar`, `GlobalSearchModal`.
- `notifications/`: `NotificationBell`, `NotificationPopup`.
- `me/`: `MeOverview`, `MeSections`.
- `auth/`: `AuthGate`, `NativeAuthGate`, `SignupFlow`, `SocialAuthButtons`,
  `BiometricAuthButton`, `BiometricEnrollCard`, `ProfileMenu`, `SignInPrompt`,
  `VerifyEmailBanner`, `AccountContacts`, `MeAvatar`.
- `admin/`: overview, audit trail, campaign inbox, companion, festival, guestlist
  signups, mate requests, partner applications and leads, safety inbox, search-queries
  dashboard tab.
- `ui/`, `forms/`, `media/`, `icons/`, `legal/`, `layout/`, `design-system/`, `brand/`:
  buttons, sheets, chips, loaders, photo, tab pills, form primitives, legal blocks.
- `debug/`: support tooling only — gated behind `?debug`, renders nothing by default.

---

## 7. Client support code: contexts, hooks, lib, shared

Contexts (`src/contexts/`, one per domain): `AuthContext` is the session source of truth
(email and password, phone, social, link and unlink, verification, display name, account
deletion marker, pending intents, device-cache clear). `SocialContext` backs
follow and like toggles; `EventsContext` the catalog; `ListingsContext` venues;
`BioContext` the bio; `AnalyticsContext` event batching; `SyncContext` reload;
`LocalNowContext` + `useLocalNow` for local time; `LocaleContext`; `BatteryContext` +
`useBattery`; `CompanionContext`.

Hooks: `useMyBookings` (passbook data), `useHandleStatus` (handle availability),
`useSearchQueryLogger` (search analytics), `usePullToRefresh`, `useScrollLock`,
`useDelayedLoading`, `useDataReload`, `useMediaSrc`.

Lib highlights (`src/lib/`): `firebase` (auth and db accessors, config guard, auth
upgrade), `auth-mail`, `phone-auth`, `social-auth`, `qr` (`pathForIntent` — every QR
intent that resolves in-app goes through here), `wallet` (pass buttons and flows),
`calendar-export` (ICS) plus `calendar-utils`, `trading-hours` (live open state),
`places-store`, `catchup` (proposal model), `circle`, `wave` + `ble-wave`,
`promotions`, `pass-partners`, `partner-account`, `partner-dashboard`,
`partner-directory`, `account-deletion`, `admin-audit`, `pending-intent`
(save and clear across auth), `safe-storage`, `biometrics`, `sync`, `theme`, `tabs`,
`pillars`, `brand`, `build-info`, `public-origin`, `share`, `share-meta`,
`on-idle`, `analytics` + queue + door-admit test helper.

Shared contract (`shared/`, pure TS, no Admin imports — if both sides need it, it lives
here): `booking` (price authority inputs), `airpal-guestlist` (capacity gate),
`event`, `festival`, `bio`, `business`, `business-onboarding`, `promotions`,
`guestlist`, `here`, `wave`, `ping`, `catchup-agent`, `safety`, `validate`,
`airpal-security`, `airpal-data`, `airpal-urls`, `auth-email`, `notifications`,
`email-templates` (the whole dual-lens suite), `content-meta`, `share-meta`,
`analytics` + `analytics-dictionary` + `analytics-aggregate`, `geo-address`,
`google-place`, `osm-place`, `nearby`, `companion`, `club`, `campaign`,
`mate-request`, `birthday-freebies`, `subscription`, `partner`, `stars`,
`freshness`, `image-crop`, `names`, `time-ago`, `tours`, plus the `v3-contract`.

---

## 8. Server: Cloud Functions map

Barrel file `functions/src/index.ts` — every callable keeps its deployed name; domain
logic lives in sibling modules. Only server code may price, pay out, or verify.

- Accounts and access (`account.ts`, `registration.ts`): complete and confirm signup,
  phone-password login, ensure user profile, ensure platform admin, set property member,
  backfill owner claims.
- Ticketing and money (`stripe.ts`, `managed-payments.ts`, `reconcile.ts`): create event
  booking, create booking checkout session, complete paid booking, refund paid booking,
  Stripe webhook, Connect account link plus refresh plus login links, release held
  payouts, managed products and checkout sessions, subscription checkout and portal,
  reconciliation report and payout reconciliation.
- Events and guestlist (`events.ts`, `guestlist.ts`, `guestlist-signups.ts`): upsert
  event, upsert event stall, save attendee stall, submit venue rating, check in guest,
  close guestlist, list door team, add door guest, guest-booking plus RSVP plus entry
  triggers, guest-count refresh trigger, join signup, list subscribers, unsubscribe.
- Coupons (`coupons.ts`): upsert, validate, and list event coupons.
- Gate (`gate.ts`): verify ticket, admit ticket.
- Wallet (`wallet.ts`, `wallet-strip.ts`, `google-wallet.ts`): Apple Wallet pass, Google
  Wallet pass.
- Deals and promotions (`deals.ts`, `promotions.ts`): claim deal, redeem voucher,
  partner deal and claim flows, free venue presence, promotion create through draw and
  winner (update, submit, review, enter, close-and-draw, winner status, views, clicks,
  ending-soon), redeem points, verify and consume promotion redemption.
- Listings and partners (`listings.ts`, `partners.ts`): upsert business listing and deal,
  server-checked delete listing, partner application submit and review.
- Bio (`bio.ts`): check handle availability, create and update business profile, set bio
  offer, record bio tap, bio link stats, claim bio offer, transfer handle, list bio
  directory.
- Social and presence (`pings.ts`, `here.ts`, `wave.ts`, `catchup-agent.ts`): ping
  created and updated triggers, share here, stop here, start wave, wave at, stop wave,
  schedule catch-up.
- Comms (`email.ts`, `notifications.ts`, `share-meta.ts`): brand-email test send,
  announce event to guests, create and review broadcast,
  event-published-to-followers trigger, share-meta unfurls.
- Pulse and ops (`pulse.ts`, `birthday-freebies.ts`, `catalog.ts`, `pass-profile.ts`,
  `pin.ts`, `admin.ts`, `abuse.ts`): pulse by token, bio pulse, pulse responses, create
  and publish pulse, acknowledge and resolve pulse issues, pulse status, pulse
  follow-ups, birthday alert prefs and monthly alerts.
- Analytics (`analytics.ts`): record batch, aggregate hourly, run aggregation.
- Clean-slate API (`v3/`: identity, events, discovery, business, commerce, trust,
  common, plus contract and fakes): versioned namespace, local cutover candidate behind
  its own contract gate.

---

## 9. Routes, aliases, and hosting rewrites

Canon source: `src/app/airpal-app.ts`. `CANONICAL_ROUTES` is sorted by section then path
so duplicates are obvious in review; tab bars, top nav, and footer all derive from this
registry so a route can never exist in one place and 404 in another. Pure module: no
React, no Firebase — safe to unit test.

Sections: home (`/`), pass (Events and Access), discover (Place and Community), circle
(Networking Circle plus Bio and Me), business (Business and Arrival engine), admin
(platform console), system (auth, settings, legal).

Alias system (two layers):

- Param-preserving aliases live in `routes.tsx` as render functions that forward params:
  `/promotions/:id` to `/deals/:id`, `/stay/@:handle` to `/@:handle`,
  `/e/:eventId/s/:stallId` to `/e/:eventId`, `/experience-details/:id` to `/e/:id`,
  `/f/:slug` to events search.
- `STATIC_ALIASES` in `airpal-app.ts` is the static redirect table the router renders:
  retired discovery (`/now`, `/explore`, `/explore/attractions`, `/discover`,
  `/discovery`, `/guide`, `/my-day`, `/search`, `/venues`, `/tour/:id`, `/concierge`,
  `/plans`, `/plan*`, `/invite/:code`, `/p/:id`, `/q*`) to Home; retired shells
  (`/c*`, `/f`, `/event-categories`) to `/events`; (`/stay*`, `/g*`, `/partners`,
  `/partner`, `/listings`) to `/business`; (`/passbook`, `/wallet`,
  `/check-in-history`, `/saved-experiences`) to `/me/tickets`; (`/w/:code`) to
  `/circle`; `/pass/*` shortcuts to their live pages; (`/notifications`, `/inbox`) to
  `/me/inbox`; plus `/create`, `/event/new`, `/event-analytics`, `/f/new` to `/event`;
  `/offers`, `/promotions` to `/deals`; `/experiences` to `/events`; `/fashion` to
  `/deals`; `/mate` to `/friends`; helpdesk, support, assist, founders, legal, auth,
  signin, reset, getAirPal variants to their live targets.
- `BIO_PUBLIC_PATH` (`/@handle`) is registered last so it only matches handle paths,
  never static pages; anything unmatched renders `NotFoundPage`.

Hosting (`firebase.json`): `/auth` 301 to `/start?tab=signin`; `/reset` 302 to
`/start?tab=reset`. Function rewrites: `/api/stripe/webhook` to stripeWebhook;
`/api/wallet/google/**` to googleWalletPass; `/api/wallet/**` to walletPass;
`/e/**`, `/p/**`, `/pulse/**`, `/@**`, `/bio/**`, `/stay/**`, `/g/**`, `/DemoHotel`,
`/Demo`, `/deals/**` to shareMeta (crawler unfurls); everything else to `/index.html`
(SPA fallback). Headers: JSON content type for app-association and assetlinks;
no-cache for `sw.js`; immutable caching for `/assets/**`.

---

## 10. Data map: Firestore collections

Default-deny (`firestore.rules`): unmatched collections cannot be read or written.
Composite indexes in `firestore.indexes.json` back every multi-filter query; adding a
two-`where` query server-side without an index entry fails the rules gate.

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

Rules highlights: owner-binding; immutable `organiserUid` and `ownerUid` on update;
split booking rights (guests cancel own with short reason; providers move service
status); shaped safety-report writes (fixed field set, new-only, bounded text);
`bookedHeads` server-only; `mail`, `rateLimits`, `abuseSignals` client-write-locked.

---

## 11. Feature walkthrough: file-level traces

- Paid ticket: `EventsPage` to `EventPage` (`EventRegistrationCard` tier select) to
  `booking/createBooking` client to server create-booking transaction plus
  create-checkout-session to Stripe to `stripeWebhook` to complete booking;
  expiry auto-cancel releases holds; passbook in `MyTicketsPage` (`useMyBookings`,
  `PossieTicket`); receipt email plus inbox item.
- Free RSVP: `EventPage` 1-tap to row-write transaction gating inventory; full events
  skip the row and show Sold out; withdrawal via calendar status; door list is truth.
- Door: `ScanPage` (verify ticket, admit ticket; `DealGatePanel` for deal codes) plus
  `GuestlistPage` (search, states `going`, `checked-in`, `no-show`, `invited`, walk-ins
  with party size, CSV export, close list, delete with confirm); server `gate.ts` plus
  `guestlist.ts`.
- Wallet: `TicketPage` add buttons (`AppleWalletButton`, `GoogleWalletButton`) to
  `walletPass` and `googleWalletPass` rewrites; only per-guest `AIRPAL:DEAL:` QRs are
  scannable, static codes stay text.
- Coupons: `EventCouponManager` to `coupons.ts` upsert, validate, list (fixed-amount or
  percent off, caps, expiry, toggle).
- Deal redeem: `PromotionsPage` to `PromotionDetailPage` claim (idempotent, one per
  member per deal) to `ScanPage` + `DealGatePanel` (owner-or-admin verify and consume)
  or staff-PIN redeem; consume writes `offer_redeem` ledger; points redemptions replay
  on retry.
- Bio share: `BioSetupPage` (handle availability via `useHandleStatus`) to
  `BioPublicPage` and `BioSitePage` to QR plus vCard (`bio-pass-export`); taps recorded;
  offers via `BioCatalogEditor`; recovery via `BioRecoverPage`.
- Catch-up: `BioCatchUpModal` on any bio (slots plus conflict check) to
  `catchup-agent.ts` schedule plus email to `CalendarPage` plus `InboxPage`; lifecycle
  `pending`, `accepted`, `scheduled`, `dismissed`.
- Presence: `HereCheckIn` on `CirclePage` to `here.ts` share and stop; Circle-audience
  pins to `here_at` board (`CircleHereBoard`), one-to-one to `here_shares` plus push;
  pings via `PingsPanel` (`pinged_back`, `hanging_out`, `dismissed`); wave via
  `WaveHostCard` (`wave.ts`, `ble-wave.ts`).
- Broadcast: organiser `EventAnnounceModal` or promotions studio to create and review
  broadcast to `onEventPublishedToFollowers` to followers' `InboxPage` plus
  `NotificationBell` plus email.
- Payouts: `BusinessPage` plus `PayoutSetupCard` to Connect link calls to
  `releaseHeldPayouts` to `reconcile.ts` reports.
- Claims and partners: `ClaimVenuePage` (`ClaimShell`, `ClaimVenueForm`,
  `ClaimReviewQueue`) to claim flows; `BusinessPartnerPage` dashboard;
  `PassPartnersPage` family for the partner directory; admin queues in `AdminPage`,
  `AdminPartnersPage`, `PromotionsStudioPage` (admin scope), `SearchAnalyticsPage`.
- Auth edge cases: `StartPage` (signin), `AuthActionPage` (email actions),
  `NativeAuthGate` plus `NativeOpenScreen` (shell auth), `BiometricAuthButton` plus
  enroll card, `SignupFlow`, `SocialAuthButtons`, pending-intent save and clear across
  auth, account-deletion marker flow.
- Arrival and belonging: `ArrivalPage` (join and arrival modes) plus
  `ArrivalAssistantCard`; `PulsePage` (public token route included) for belonging
  reports; `MemoryWallPage`; `BirthdayFreebiesPage` by region.
- Analytics: `AnalyticsContext` batch plus queue to `recordAnalyticsBatch` to hourly
  aggregation to daily rows; rejects quarantined; `SearchAnalyticsPage` and booking
  clicks feed funnels; `useSearchQueryLogger` plus `GlobalSearchModal` plus `SearchBar`.

---

## 12. The invariants (do not break)

1. One universal account. Never create a second user database, auth partition, booking
   engine, or chat engine. A Me login is a Pass login. Any proposal that forks users,
   bookings, or auth state must be rejected.
2. Server decides money, inventory, and trust. Client display math in `shared/` plus
   components must mirror the server but never replace it: single price authority,
   single-transaction booking, server `bookedHeads`, idempotent redemption IDs,
   owner-or-admin-only verify and consume.
3. Default-deny Firestore. Unmatched collections are closed. Owner-bound writes.
   Immutable organiser and owner IDs. Money fields, `bookedHeads`, `mail`,
   `rateLimits`, and abuse signals are client-write-locked. Never weaken
   `firestore.rules` to "make it work" — add the correct index or server flow instead.
4. Presence privacy. One-to-one shares go to direct shares plus push only, never the
   public venue mirror. Pin reads are owner-or-admin only. A regression here is a P0
   privacy bug.
5. Verified redemptions only. No eyeballing: staff-PIN redeem, scanned verify and
   consume in `/scan`, ledger write per redemption. Static codes stay text-only.
6. No fake production data. No synthetic profiles, metrics, or reviews. Sandbox demo
   fixtures stay sandbox-only.
7. Smallest change that solves. Strict TypeScript (no unjustified `any`), Prettier-clean,
   ESLint zero warnings, tests colocated with the module they cover. Never overwrite
   unrelated comments, docs, or tests.

---

## 13. Daily workflows and verification

```bash
npm run dev            # Me lens (port 3000)
npm run dev:pass       # Pass lens (port 3001, VITE_APP_FLAVOR=pass)
npm test               # client + shared vitest (over 1,110 tests)
npm run functions:test # functions vitest (over 200 tests)
npm run verify         # FULL gate — run before every commit and deploy
npm run cap:sync       # after every web build (native shells)
```

What `npm run verify` runs, in order:

1. Prettier format check.
2. Client strict typecheck.
3. Functions strict typecheck.
4. ESLint (zero warnings).
5. Client plus shared tests.
6. Functions tests.
7. Vite production build plus route prerender (`scripts/prerender-routes.mjs` plus
   `prerender-routes.json`).
8. Functions bundle build.
9. Rules plus composite-index check (`check-rules.mjs` — also enforces the
   two-`where` index rule).
10. Clean-slate API contract check (`check-v3.mjs` against `shared/v3-contract`).
11. Secret scanner (`check-secrets.mjs`).
12. SEO route integrity check (`check-seo.mjs` — sitemap vs prerender vs canon).
13. Production and App Store readiness (`check-prod-readiness.mjs` — secrets manifest,
    listings, icons, native files).
14. Emulator-backed rules suite (`test:rules`, hermetic; run explicitly for rules
    changes).

Extras: `test:e2e` (plus `test:e2e:pass` flavor config) runs the 15 Playwright specs;
`screenshots` plus `screenshots:pass` regenerate both flavors; `audit` runs the audit
check; `emu:v3` boots the local clean-slate emulator config.

---

## 14. Ops: environments, secrets, remotes

- Firebase project: `airpalme-app` (see `.firebaserc`). Hosting plus Functions plus
  Firestore. Region for function rewrites: `us-central1`.
- Secrets layout:
  - Root `.env`: public client keys only (`VITE_*`). Never a secret — Vite exposes
    `VITE_*` to the bundle.
  - `functions/.env`: non-secret Functions environment config. Never duplicate keys
    bound with secrets.
  - `functions/.secret.local`: local emulator overrides for secret bindings.
  - Production: Secret Manager.
  - Signing material (certificates, keystores, keystore properties, service-account
    JSON) stays on signing machines, never in git. The secrets scanner gate enforces
    this on every verify.
- Email delivery: `shared/email-templates.ts` renders HTML; `functions/src/email.ts`
  outbox queues to the `mail` collection; REST delivery (Resend or Postmark) with direct
  fallback; paste-ready Firebase Console Authentication templates shipped as ready HTML
  files. Marketing requires explicit opt-in; transactional (receipts, security,
  catch-ups) always delivers. If mail stops: check `mail` docs (queued vs sent),
  provider keys, then the email module.
- Stripe: webhook at `/api/stripe/webhook`. Money incidents: freeze deploys, reconcile
  via the payout reconciliation report, then fix forward.
- Share unfurls: `shareMeta` serves crawler HTML for event, place, pulse, handle, bio,
  stay, group, demo, and deal paths.
- Native shells: `capacitor.config.ts` (`appId: me.airpal.app`); Pass shell
  `me.airpal.pass`; `VITE_APP_FLAVOR` override for local Pass runs; `cap:ios` opens
  Xcode, `cap:android` opens Android Studio; dual Android bundles plus dual iOS
  archives supported.

---

## 15. Deploy and rollback (read fully before shipping)

```bash
npm run verify              # must be exit 0 — no exceptions
npm run deploy               # hosting + functions (project: airpalme-app)
# slices:
npm run deploy:hosting
npm run deploy:functions
npm run deploy:rules
npm run cap:sync && npm run cap:ios / cap:android   # native after web build
```

What each deploy does:

1. Full verification first: `npm run verify` exits 0.
2. Full deploy: verify plus Hosting plus Functions to `airpalme-app`.
3. Hosting only: production web build plus Hosting deploy.
4. Functions only: functions bundle build plus Functions deploy.
5. Rules only: Firestore rules plus indexes deploy.
6. Native builds: sync shells from `dist/` first, then open the iOS project for
   archive and distribution (Xcode) or the Android project for release bundle
   (Android Studio). Dual bundles supported: AirPal plus Pass on both platforms.

Pre-deploy checklist: verification green; secrets manifest clean; store listings and
icons current; wallet certificates valid; Stripe webhook and Connect healthy; rules diff
reviewed line-by-line (never weakened); rollback point tagged.

Rollback: redeploy the last green tagged build (`dist/` plus `functions/lib/`). Data
fixes go through server functions, never hand-edits. Keep the dated operations runbook
and changelog current.

---

## 16. When things break (triage map)

| Symptom                          | First look                                                         | Likely cause                                                             |
| -------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| Sold-out wrong or oversell scare | Event `bookedHeads` vs guestlist heads; count-refresh trigger logs | Stale display or trigger lag — never fix by client-writing `bookedHeads` |
| Charged wrong amount             | Price-authority inputs vs tier sent                                | Client and server tier mismatch — server is truth                        |
| Holds blocking sales             | Pending bookings past Stripe expiry                                | Expiry handler or webhook health                                         |
| QR will not verify at door       | Code prefix: `AIRPAL:DEAL:` vs static text                         | Static codes are text-only by design; reissue per-guest code             |
| 1-1 presence visible publicly    | Public mirror rows with person audience                            | Map-filter regression — P0 privacy bug                                   |
| Mail not sending                 | `mail` collection state; provider status                           | Key, quota, or fallback path in the email module                         |
| Rules deploy fails               | Rules check output; missing composite index                        | Add index entry, do not loosen the rule                                  |
| Native stale content             | Last `cap:sync` timestamp                                          | Web built but shells not synced                                          |
| Clean-slate gate red             | Contract-check diff                                                | Contract drift — keep clean-slate local until green                      |
| Flaky route or blank page        | `routes.tsx` vs `airpal-app.ts` canon; error boundary              | Route exists in one place only — add to canon first                      |
| Wrong flavor in shell            | `app-flavor` resolution; env override                              | Override set or app-id mismatch                                          |
| Stale mobile-web content         | Service-worker registration                                        | Dev or shell path registering unexpectedly                               |

---

## 17. Open work and known watches

- Clean-slate API (`functions/src/v3/`: identity, events, discovery, business, commerce,
  trust, common, plus contract and fakes): local cutover candidate. Keep behind its
  contract gate until green; do not route production traffic at it.
- Watch: wallet certificate and store-listing expiry (production-readiness gate covers
  it, but calendar it too), Stripe and Connect health, presence-privacy regressions,
  coupon-abuse patterns in abuse signals.
- Debt to know (decisions, not bugs): per-tier capacity is display-only by design
  (event-level enforcement); feedback is read-only after submit by design; safety
  reports are never deleted by design; static codes stay text-only by design; debug UI
  stays behind `?debug` by design.

---

## 18. Handover acceptance

New owner confirms:

- [ ] Can run `npm run verify` green from a clean clone.
- [ ] Can trace one paid ticket plus one deal redemption file by file (section 11).
- [ ] Can name the 7 invariants in section 12 without looking.
- [ ] Knows never to commit `.env` or signing material or weaken `firestore.rules`.
- [ ] Knows `npm run cap:sync` follows every web build.
- [ ] Knows the canon lives in `airpal-app.ts`, aliases in two layers (section 9), and
      new queries need index entries.
- [ ] Has access: Firebase console (`airpalme-app`), Stripe dashboard plus webhook,
      Resend or Postmark, Apple and Google Wallet certificates, App Store Connect, Play
      Console, Secret Manager.

Done means: the new owner ships one small change (with tests) through verify, deploy,
and native sync without help.

---
