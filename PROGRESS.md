# AirPal Rebuild Progress

## Current Phase: Phase 3.5 (Approval Gate)

**Branch:** `rebuild/v2`

---

## 1. Done

- [x] Initialised and switched to branch `rebuild/v2`.
- [x] Completed Phase 0 architectural audit and questions (`UNDERSTANDING.md`).
- [x] Completed Phase 1 Full Inventory & Triage (`AUDIT.md`):
  - Audited all 71 pages, 15 contexts, 54 shared files, and 115 Firestore collections.
  - Classified all surfaces: 32 CUT (45.1%), 12 MERGE (16.9%), 14 SIMPLIFY (19.7%), 13 KEEP (18.3%).
  - Produced complete Mermaid relationship map and ranked severity problems.
- [x] Completed Phase 2 Product, Business & Growth Strategy (`STRATEGY.md`):
  - 3 primary personas (Social Coordinator, Event Host, Active Networker).
  - 3-step core loop (Want $\to$ Plan/Book $\to$ Go) & North Star metric (Completed Experiences per Active User).
  - MoSCoW feature triage (cutting $\ge 50\%$ surface area).
  - Business model & unit economics (5% Stripe ticket fee + $9/mo Pro bio subscription; Day 0 positive gross margin).
  - 2-week 3-customer validation plan.
  - Pre-mortem with top 5 failure modes and mitigations.
- [x] Completed Phase 3 UX & Information Architecture (`UX.md`):
  - Max 5 primary bottom tabs on mobile, zero stacked top headers.
  - Wireframe specs for remaining pages.
  - Built interactive, clickable HTML prototype in `prototype/index.html`.
- [x] Documented all council debates and resolutions in `DECISIONS.md`.
- [x] Validated typecheck, lint, and all 1,058 tests pass cleanly.

---

## 2. Next (Phase 4 Rebuild — Pending User `go`)

- [ ] **Phase 4 Rebuild Execution:**
  - a) Security & Auth Hardening: Remove `getTestUser()` localStorage fallback, least-privilege Firestore rules.
  - b) Code Pruning: Delete the 32 CUT pages and dead contexts; configure seamless 301/client redirects for all deprecated URLs.
  - c) Navigation & Layout Shell: Rebuild `AppShell.tsx` and `TabBar.tsx` to match Phase 3 spec (clean 5-tab dock, single header).
  - d) Core Loop Pages: Rebuild Kept pages on shared modular components.
  - e) Payments & Stripe Checkout: Ensure 5% platform fee and Stripe Connect checkout work cleanly.
  - f) Verification & Quality: Run `npm run verify` (typecheck, lint, test, build), Playwright e2e tests.

---

## 3. Blockers

- **Gate 3.5 Approval:** Waiting for user reply `go` (or edits) to proceed to Phase 4 Rebuild.
