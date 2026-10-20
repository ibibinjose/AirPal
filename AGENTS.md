# AGENTS.md — AIRPAL Ecosystem Boot

**Agents: read [`docs/AIRPAL.md`](./docs/AIRPAL.md) before any edit. It is the binding source of truth** — product, dual-lens ecosystem, V1 scope, trust/safety/privacy/money rails, tech rules, design system, launch plan, and agent rules. This file is only the boot pointer so every tool lands in the same place.

Repo map (source vs generated vs secrets, directory conventions): [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md).

## Core Architecture: Master Brand & The 5 Core Pillars

- **AIRPAL:** Master brand ("Life Made Easy") with unified Firebase Auth, Firestore, and trust rails.
- **1. Events & Access:** Live concerts, cultural festivals, native Stripe ticketing, Apple/Google Wallet passbook (`/pass`, `/events`, `/me/tickets`), door check-in scanner (`/scan`), and organiser studio (`/event`).
- **2. Discovery (Place & Community):** Curated venue discovery (`/places`), organiser communities (`/communities`) with follow-to-join loops. (Legacy `/now`, `/explore`, `/guide`, `/p/:id` redirect cleanly to Home).
- **3. Personal Calendar & Catch-Ups:** Personal agenda & ICS schedule at `/calendar`, personal 1-on-1 networking proposals in Bio & Circle. (Legacy `/plan/*`, `/invite/:code` redirect to Home).
- **4. Business & Merchant Hub:** Unified business studio (`/business`), member merchant perks (`/deals`), self-service listing & ticket management. (Legacy `/join`, `/host`, `/concierge`, `/stay` retired and redirected to `/business` and `/events`).
- **5. Personal Bio, Friends & Networking Circle:** Friends hub (`/friends`) for mutuals and co-attendees, dedicated Networking Circle (`/circle`) with live presence check-in (`<HereCheckIn />`), connector rank quests, personal digital bio profiles (`/@handle`, `/bio/setup`), and user dashboard (`/me`).
- **Single Universal Account:** Never create a separate user database or auth partition across pillars or native shells (`me.airpal.app` + `me.airpal.pass`).
- **Communications Engine:** Master Brand dual-lens responsive email suite (`shared/email-templates.ts`), Cloud Functions outbox delivery (`functions/src/email.ts`), and full notifications CRUD with real-time sync (`/me/inbox`, `<NotificationBell />`).

## Non-negotiables (expanded in `docs/AIRPAL.md` Parts C + I):

- Safety, security, privacy, and payment integrity outrank everything.
- Never commit secrets (`.env` stays out). Never weaken `firestore.rules`.
- No second user system, booking engine, or chat engine. Privileged writes via Cloud Functions.
- `npm test` and `npm run verify` pass before commits or deployment. `npm run cap:sync` after web builds for native.
- Smallest change that solves; strict TS; no fake production data.

Pre-rebuild rules (product rules, canon freeze, brain) are archived in git history.
