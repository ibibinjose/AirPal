# AirPal Understanding & Architectural Assessment

> Prepared by the Council of Seven Experts (Customer, Designer, CTO, CEO, CFO, Growth/Marketer, Ops/Legal)
> Branch: `rebuild/v2` · Evaluation against codebase state as of commit `171f021`.

---

## 1. 10-Line Executive Summary

1. **What it is:** AirPal is a unified local experience and social coordination platform combining live event discovery/ticketing, social hangout planning, digital networking bios, and precinct guides ([`README.md`](file:///Users/bibinjose/Projects/Codebase/Projects/AirPal/README.md#L1-L36)).
2. **Who it is for:** Urban residents and active community members who want to discover local experiences, coordinate hangouts with mates, and network in person ([`src/pages/HomePage.tsx#L43-L112`](file:///Users/bibinjose/Projects/Codebase/Projects/AirPal/src/pages/HomePage.tsx#L43-L112), [`AirPalBio.md#L7-L20`](file:///Users/bibinjose/Projects/Codebase/Projects/AirPal/AirPalBio.md#L7-L20)).
3. **The core job:** Turning vague intent ("What should we do today?") into completed real-world outings with minimal coordination friction ([`src/pages/NowPage.tsx`](file:///Users/bibinjose/Projects/Codebase/Projects/AirPal/src/pages/NowPage.tsx), [`src/pages/PlanCreatePage.tsx`](file:///Users/bibinjose/Projects/Codebase/Projects/AirPal/src/pages/PlanCreatePage.tsx)).
4. **Identity & access:** Single universal identity model where one user account holds event tickets, calendar plans, and an interactive digital bio card (`/@handle`) ([`src/contexts/AuthContext.tsx`](file:///Users/bibinjose/Projects/Codebase/Projects/AirPal/src/contexts/AuthContext.tsx), [`shared/bio.ts`](file:///Users/bibinjose/Projects/Codebase/Projects/AirPal/shared/bio.ts)).
5. **Ticketing & passbook:** Full Stripe checkout, Apple & Google Wallet passes, and live QR gate check-in scanning for event organisers ([`functions/src/stripe.ts`](file:///Users/bibinjose/Projects/Codebase/Projects/AirPal/functions/src/stripe.ts), [`src/pages/ScanPage.tsx`](file:///Users/bibinjose/Projects/Codebase/Projects/AirPal/src/pages/ScanPage.tsx), [`src/pages/MyTicketsPage.tsx`](file:///Users/bibinjose/Projects/Codebase/Projects/AirPal/src/pages/MyTicketsPage.tsx)).
6. **Social coordination:** Lightweight group hangouts with 1-tap web RSVPs, stops voting, and personal calendar sync ([`src/pages/PlanDetailPage.tsx`](file:///Users/bibinjose/Projects/Codebase/Projects/AirPal/src/pages/PlanDetailPage.tsx), [`shared/plan.ts`](file:///Users/bibinjose/Projects/Codebase/Projects/AirPal/shared/plan.ts)).
7. **In-person networking:** Public digital business card at `/@handle` featuring instant vCard 3.0 export, real-time availability rings, and coffee catch-up proposals ([`AirPalBio.md`](file:///Users/bibinjose/Projects/Codebase/Projects/AirPal/AirPalBio.md), [`src/pages/BioPublicPage.tsx`](file:///Users/bibinjose/Projects/Codebase/Projects/AirPal/src/pages/BioPublicPage.tsx)).
8. **Current technical stack:** React 19, Vite 7, TypeScript, Tailwind CSS v4, Firebase (Auth, Firestore, Cloud Functions), Capacitor (iOS/Android), and Vitest ([`package.json#L43-L88`](file:///Users/bibinjose/Projects/Codebase/Projects/AirPal/package.json#L43-L88)).
9. **Current stage:** Mid-pivot fusion. A massive codebase (~79 pages, 16 contexts, 54 shared files) that successfully resolved previous auth security issues and boasts 1,058 passing tests, yet suffers from extreme feature bloat and navigation crowding ([`src/app/routes.tsx`](file:///Users/bibinjose/Projects/Codebase/Projects/AirPal/src/app/routes.tsx), [`src/components/layout/AppShell.tsx`](file:///Users/bibinjose/Projects/Codebase/Projects/AirPal/src/components/layout/AppShell.tsx)).
10. **Critical challenge:** Over-engineered UI chrome (up to 6 top/bottom bars competing on mobile) and dead-weight residue from the abandoned hotel/residence concierge OS that confuses first-time users ([`src/components/layout/AppShell.tsx#L135-L243`](file:///Users/bibinjose/Projects/Codebase/Projects/AirPal/src/components/layout/AppShell.tsx#L135-L243)).

---

## 2. Leftovers from the Old Concept (To Be Purged or Retired)

The previous incarnation was a **hotel guest companion + host property management OS** (for hotels, serviced apartments, and residential campuses). Significant dead residue remains embedded across data schemas, routes, components, and contexts:

### A. Hotel Operations, Housekeeping & PMS Schemas

- **PMS Room & Housekeeping States:** `roomStatuses: Record<string, "occupied" | "vacant" | "maintenance" | "cleaning">`, `roomTokens`, `checkIn`, `checkOut`, `breakfast` in [`shared/airpal-data.ts#L31-L96`](file:///Users/bibinjose/Projects/Codebase/Projects/AirPal/shared/airpal-data.ts#L31-L96).
- **Staff Ticketing & SLA Engine:** `StaffTicket`, `StaffPresence`, `TicketSlaStatus`, `StaffInternalNote`, and `INITIAL_STAFF_TICKETS` in [`shared/airpal-data.ts#L261-L500, L1706-L1900`](file:///Users/bibinjose/Projects/Codebase/Projects/AirPal/shared/airpal-data.ts#L261-L500) and [`src/pages/HelpDeskPage.tsx`](file:///Users/bibinjose/Projects/Codebase/Projects/AirPal/src/pages/HelpDeskPage.tsx).
- **In-Room Dining Menu:** `IN_ROOM_DINING_MENU`, `DiningOrder`, and room charge routing in [`shared/airpal-data.ts#L125-L140, L1365-L1430`](file:///Users/bibinjose/Projects/Codebase/Projects/AirPal/shared/airpal-data.ts#L125-L140).
- **Hotel Upsells & Winback Offers:** `HOTEL_UPSELLS` and `winbackOffer` in [`shared/airpal-data.ts#L110, L1577-L1610`](file:///Users/bibinjose/Projects/Codebase/Projects/AirPal/shared/airpal-data.ts#L110).
- **Hardcoded Demo Accounts:** Elena Vance, Marcus Sterling, Liam Chen, Bibin Jose (Room 508) in [`shared/airpal-data.ts#L1251-L1284`](file:///Users/bibinjose/Projects/Codebase/Projects/AirPal/shared/airpal-data.ts#L1251-L1284).

### B. Legacy Hotel/Concierge Routes & Redirects

- **Stay & Concierge dead redirects:** `/stay`, `/concierge`, `/stay/:id`, `/g/:id`, `/c/:id`, `/stay/@:handle` in [`src/app/routes.tsx#L170-L187`](file:///Users/bibinjose/Projects/Codebase/Projects/AirPal/src/app/routes.tsx#L170-L187).
- **Operator Host & Pulse Hubs:** `HostPage.tsx`, `HostPulsePage.tsx`, `PulseHubPage.tsx`, `PulsePublicPage.tsx` in [`src/pages/`](file:///Users/bibinjose/Projects/Codebase/Projects/AirPal/src/pages/) — complex multi-property hotel operator dashboards that have no real customer base in an events/social app.
- **Physical Room Marker System:** `MarkerPage.tsx` (`/q/:city/:handle`, `/q/:a`) in [`src/pages/MarkerPage.tsx`](file:///Users/bibinjose/Projects/Codebase/Projects/AirPal/src/pages/MarkerPage.tsx) originally meant for laminated acrylic table tents in hotel rooms and lobby counters.

### C. Abandoned Verticals & Stranger Networking

- **Stranger "Mate" matching:** `shared/mate-request.ts`, `shared/companion.ts`, `CompanionContext.tsx`, and copy in [`index.html#L148-L151`](file:///Users/bibinjose/Projects/Codebase/Projects/AirPal/index.html#L148-L151) ("meet a local Mate to go with you"). AirPal is explicitly anti-dating / anti-stranger matching per canon.
- **Campus & Dorm modules:** `shared/campus.ts`, `shared/cohort.ts`, `CohortContext.tsx`.
- **Tour booking engine:** `TourPage.tsx` (`/tour/:id`) and `tours-store.ts` in [`src/pages/TourPage.tsx`](file:///Users/bibinjose/Projects/Codebase/Projects/AirPal/src/pages/TourPage.tsx).
- **Birthday freebies aggregator:** `shared/birthday-freebies.ts` redirected into deals.

### D. Redundant Discovery Pages

- Multiple parallel ways to view places and events:
  - Discovery: `ExplorePage.tsx` vs `NowPage.tsx` vs `GuidePage.tsx` vs `AttractionsPage.tsx` vs `PlacePage.tsx` vs `SearchPage.tsx`.
  - Events: `EventsPage.tsx` vs `PassPage.tsx` vs `EventPage.tsx` vs `StallPage.tsx` vs `CalendarPage.tsx`.
  - Business/Partners: `BusinessPage.tsx` vs `BusinessOnboardPage.tsx` vs `BusinessShowcasePage.tsx` vs `PartnerPage.tsx` vs `PartnersPage.tsx` vs `FoundersPage.tsx`.

### E. Mobile Chrome Congestion

- In [`src/components/layout/AppShell.tsx`](file:///Users/bibinjose/Projects/Codebase/Projects/AirPal/src/components/layout/AppShell.tsx):
  - `TicketAlertBar` (host ticket alerts)
  - `LocalNowBar` (weather/time pill)
  - Mobile Top Header (Brand + Plus + Search + Bell + Profile)
  - `MobilePillarsNav` (4 large pillar buttons + horizontal sub-links strip)
  - `BatteryWarningBanner` & `SyncStatusBar`
  - Bottom `TabBar` (Home, Now, Plan, Me, Bio)
  - Floating `CreateFab` button
  - _Result:_ Viewport is overwhelmed with navigation chrome before the user even scrolls.

---

## 3. The Council's 6 Strategic Questions & Recommended Defaults

To align the council before executing the Phase 1 audit and Phase 4 rebuild, we propose the following 6 questions with our recommended defaults derived from the codebase facts:

| #      | Question                             | Council Recommended Default                                                                                                                                                                                                                                                                                                                                                                                                 | Rationale & Code Evidence                                                                                                                                                             |
| ------ | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Q1** | **The Pivoted Idea in One Sentence** | **"The frictionless social companion for discovering local events, planning hangouts with mates, and networking with a tap."**                                                                                                                                                                                                                                                                                              | Eliminates hotel PMS/stay confusion. Leverages existing Stripe ticketing (`functions/src/stripe.ts`), group hangout RSVP (`shared/plan.ts`), and public bio vCard (`AirPalBio.md`).   |
| **Q2** | **Primary User**                     | **The Active Urbanite & Social Coordinator (22–38 yo)** who organizes weekend plans with friends and attends local cultural events or professional meetups; **Secondary:** The Event Organiser/Host who creates events and scans tickets at the door.                                                                                                                                                                       | Solves the coordination friction of "Where are we going?" and "Who's coming?". Supported by native passbook (`/me/tickets`), Apple Wallet, and `/scan`.                               |
| **Q3** | **Target Market / Initial Region**   | **Sydney, Australia (Metro & Surrounds)** with extensible support for Australian capital cities (Melbourne, Brisbane).                                                                                                                                                                                                                                                                                                      | Codebase is currently seeded with Sydney data (`The Rocks`, `Surry Hills`, `Newtown`, `Parramatta`, `Bondi`) in `shared/the-rocks-data.ts`, `src/lib/cities.ts`, and currency is AUD. |
| **Q4** | **How Revenue Should Work**          | **Hybrid Model:** <br>1. **Event Ticketing Commission:** 5% platform fee on paid ticket sales ([`src/pages/OrganiserEventPage.tsx#L129211`](file:///Users/bibinjose/Projects/Codebase/Projects/AirPal/src/pages/OrganiserEventPage.tsx)). <br>2. **AirPal Pro Bio / Organizer Subscription:** $9/mo ($89/yr) for advanced analytics, custom domain, and newsletter capture. <br>3. **Zero fees for free community events.** | Already implemented with Stripe Connect & Checkout. Requires $0 upfront capital. Clear unit economics with instant payback.                                                           |
| **Q5** | **Hard Technical Constraints**       | **Keep Firebase (Auth + Firestore + Functions); Keep Capacitor iOS/Android shell; Keep strict mobile-first viewport ergonomics; Zero high-cost third-party AI APIs.**                                                                                                                                                                                                                                                       | Stack is fast, stable, cheap ($0–$10/mo on Blaze tier), 1,058 tests already pass, and native shells (`me.airpal.app`, `me.airpal.pass`) are configured.                               |
| **Q6** | **Timeline to Launch**               | **2-Week Hard Freeze:** Phase 1–3 completed in Days 1–3; Phase 4 Rebuild & Security Hardening in Days 4–8; Testing & Verification in Days 9–11; Store sync and live soft launch on Day 14.                                                                                                                                                                                                                                  | Keeps scope lean, prioritizes radical pruning over additions, and enforces the 60-second time-to-first-value rule.                                                                    |

---

## 4. Next Step

Per the Phase 0 instructions: **STOP and wait.**
If you agree with these recommendations, reply **`use defaults`** to proceed to **Phase 1 (Full Audit & `AUDIT.md`)**. If you want adjustments on any of the 6 points, specify your preferences.
