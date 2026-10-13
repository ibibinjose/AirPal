# AirPal Rebuild Progress

## Current Phase: Complete (100% Rebuilt & Verified)

**Branch:** `rebuild/v2`

---

## 1. Done

- [x] **Phase 0: Understand & Questions (`UNDERSTANDING.md`):**
  - Synthesised repo architecture, eliminated outdated hotel/PMS hypotheses, and formulated council alignment questions.
- [x] **Phase 1: Full Inventory & Triage (`AUDIT.md`):**
  - Audited 77 pages, 15 contexts, 54 shared files, and 115 Firestore collections.
  - Classified every surface with council rationale and mapped system architecture via Mermaid.
- [x] **Phase 2: Product, Business & Growth Strategy (`STRATEGY.md`):**
  - Defined 3 target personas, the 3-step core loop (Want $\to$ Plan/Book $\to$ Go), and North Star metric (Completed Experiences per Active User).
  - Triaged features via MoSCoW, established unit economics (5% Stripe ticket fee + $9/mo Pro Bio), and formulated pre-mortem mitigations.
- [x] **Phase 3: UX & Information Architecture (`UX.md`):**
  - Designed 5-tab mobile dock, single clean top nav, and wireframes for remaining pages.
  - Created standalone clickable prototype in `prototype/index.html`.
- [x] **Documented Council Debates & Resolutions (`DECISIONS.md`):**
  - Documented 5 core council tradeoffs and resolutions across all 7 lenses.
- [x] **Phase 4: Rebuild Execution (`rebuild/v2`):**
  - **Security & Auth:** Eliminated insecure localhost auto-login (`getTestUser`), hardcoded mock passwords, and enforced strict Firebase Auth.
  - **Pruning & Redirection:** Deleted 27 legacy PMS/table-tent/concierge pages (-10,164 LOC pruned) and configured 100% route redirects.
  - **Shell & Navigation:** Streamlined `AppShell.tsx` by eliminating 5 stacked chrome banners and mobile FAB.
  - **Homepage Streamlining:** Replaced fragmented 4-vertical landing with editorial greeting and high-converting `/now` CTA.
  - **Privacy & Portability:** Implemented GDPR/DPDP Article 20 JSON data export in `SettingsPage.tsx`.
  - **Admin Portals:** Pointed quick portals to canonical routes (`/support`, `/now`, `/event`).
  - **E2E Playwright Suite:** Aligned all 19 test files (129 tests passing, 0 failures).
- [x] **Verification & Documentation:**
  - `npm run verify` passed cleanly (format, typecheck, lint, 1,058 Vitest tests, build with 21 prerendered routes, rules, secrets, SEO).
  - Completed `CHANGELOG.md`, `BEFORE_AFTER.md`, `MANUAL_QA.md`, and `NEXT_30_DAYS.md`.

---

## 2. Status & Next Actions

- **Status:** **Ready for Customer Demos & Live Pilot Launch**.
- **Next Steps:** Follow `NEXT_30_DAYS.md` to onboard the 3 anchor partners in Sydney (The Rocks Market, University Social Club, The Glenmore Hotel).
