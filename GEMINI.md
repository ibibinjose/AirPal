# Gemini — AIRPAL Ecosystem

Read **`AGENTS.md`**, then **`docs/AIRPAL.md`** (the single source of truth) before any edit.

This is a Vite SPA (not Next.js) on Firebase project `airpalme-app`, with two Capacitor shells from one codebase: `me.airpal.app` (AirPal) + `me.airpal.pass` (AirPal Pass, tickets/events only). Web stays one all-in-one app.

### Product Architecture:

- **AIRPAL:** Master brand ("Life Made Easy") with unified Firebase Auth and Firestore.
- **AirPal.Me:** Personal Life & Identity companion (`/@handle`, `/bio/setup`, `/bio/edit`, `/friends`, `/circle`, `/calendar`, `/me`).
- **AirPal Pass:** Events, Deals & Experiences hub (`/pass`, `/events`, `/me/tickets`, `/deals`, `/scan`, `/event`, `/business`).

### Communications & Real-Time Engine:

- **Master Brand Email Templates:** Dual-lens responsive email system (`shared/email-templates.ts`) supporting dark/light mode client styles, $\ge 48\text{px}$ touch CTAs, and legal footers.
- **Delivery Pipeline & Outbox:** Firestore `mail` collection queueing (`functions/src/email.ts`) with direct REST fallback (Resend/Postmark) and marketing opt-out enforcement.
- **Notifications CRUD:** Full in-app notifications CRUD with real-time sync in `/me/inbox` and `<NotificationBell />`.

V1 scope, trust rails, and the rebuild plan live in `docs/AIRPAL.md` Parts B, C, G. Do not rebuild excluded surfaces (Part B3). Always verify with `npm run verify` and sync native with `npm run cap:sync`.

Full rules: `docs/AIRPAL.md`. Store pack: `docs/store/README.md`.
