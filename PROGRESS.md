# AirPal Rebuild Progress

## Current Phase: Phase 0 (Understand + Align)
**Branch:** `rebuild/v2`

---

## 1. Done
- [x] Initialised and switched to branch `rebuild/v2`.
- [x] Read configuration files (`package.json`, `vite.config.ts`, `tsconfig.json`, `firestore.rules`).
- [x] Verified build tools, test suite (177 files, 1,058 tests passing), lint, and typecheck status.
- [x] Audited full git history (10 commits on repo, initial merge from AirPal-100 Luma + AirPalMeApp).
- [x] Evaluated existing 79 pages in `src/pages`, 16 contexts in `src/contexts`, and 54 shared modules in `shared/`.
- [x] Completed Phase 0 architectural audit across all 7 council lenses (Customer, Designer, CTO, CEO, CFO, Growth, Ops/Legal).
- [x] Authored `UNDERSTANDING.md` with 10-line summary, exhaustive leftover inventory, and 6 strategic questions with recommended defaults.

---

## 2. Next (Awaiting User Gate Approval)
- [ ] Receive user sign-off on Phase 0 (`use defaults` or specific adjustments).
- [ ] **Phase 1: Full Audit (`AUDIT.md`)**
  - Inventory every route, page, component, hook, context, and collection with KEEP / MERGE / SIMPLIFY / CUT verdict.
  - Complete Mermaid relationship map of roles, entities, and data flows.
  - Ranked issues table (dead code, duplicate surfaces, auth/security, perf, accessibility).
- [ ] **Phase 2: Product & Growth Strategy (`STRATEGY.md`)**
  - Personas, 3-step core loop, North Star metric + 3 supporting metrics.
  - MoSCoW feature triage (cutting $\ge 40\%$ of surface area).
  - Business model & unit economics (CEO + CFO), 3-customer 2-week validation plan.
  - Pre-mortem (top 5 failure modes + mitigations).
- [ ] **Phase 3: UX & Information Architecture (`UX.md` + Clickable Prototype)**
  - Clean sitemap ($\le 5$ primary items, $\le 2$ taps).
  - Design system tokens (typography, soft clay / liquid glass tokens, spacing).
  - Clickable HTML prototype in `prototype/index.html`.
- [ ] **Phase 3.5: Approval Gate**
  - Summary commit and wait for `go`.
- [ ] **Phase 4: Rebuild**
  - Security hardening, dead code pruning, route redirects, design shell, core loops, payments, privacy, CI/CD, verification.

---

## 3. Blockers
- **Gate 0:** Waiting for user confirmation on the 6 questions in `UNDERSTANDING.md` (or reply `use defaults`).
