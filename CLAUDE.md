# Claude / Muse — AirPal.me

Read **`AGENTS.md`**, then **`docs/AIRPAL.md`** (the single source of truth) before any edit.

## Ecosystem Architecture

- **Master Brand:** AIRPAL ("Life Made Easy") with single universal Firebase Auth, Firestore, and trust rails.
- **AirPal.Me:** Personal Life & Identity (`/@handle`, `/bio/setup`, `/bio/edit`, `/friends`, `/circle`, `/calendar`, `/me`).
- **AirPal Pass:** Events, Deals & Experiences (`/pass`, `/events`, `/me/tickets`, `/deals`, `/scan`, `/event`, `/business`).
- **Stack:** Vite + React 19 + TypeScript + Tailwind + Firebase Auth/Firestore/Functions + Capacitor (`me.airpal.app`, `me.airpal.pass`). Do not migrate to Next.js.
- **Communications:** Master Brand responsive email templates (`shared/email-templates.ts`), background delivery queue (`functions/src/email.ts`), and full notifications CRUD (`/me/inbox`, `<NotificationBell />`).

## Server Authorities (never reimplement client-side)

- **Pricing:** `authoritativeEventTotal()` in `functions/src/stripe.ts` — named tiers + legacy `standard`/`vip`/`group`.
- **Inventory:** transactional booking + RSVP gates, `bookedHeads` trigger mirror, capacity floor in rules — see `functions/src/guestlist.ts`.
- **Redemptions:** idempotent `redeemPoints`; verify/consume via `verifyPromotionRedemption` / `consumePromotionRedemption`, staff-PIN `redeemVoucher`.
- **Presence:** person-audience shares never hit the `here_at` mirror (`resolvePinOnMap` in `shared/here.ts`); `here_pins` is owner/admin-only.
- **Routes:** `src/app/routes.tsx` + canon in `src/app/airpal-app.ts` (`/join`, `/host` are live Arrival surfaces).

## Non-Negotiables

- V1 scope, trust rails, and the rebuild plan live in `docs/AIRPAL.md` Parts B, C, G. Do not rebuild excluded surfaces.
- Smallest change that solves. Reuse `shared/` and existing pages in `src/app/routes.tsx`.
- Never commit `.env` or secrets. Never weaken `firestore.rules`.
- Always verify: `npm run verify`.
- Always sync native after web builds: `npm run cap:sync`.
