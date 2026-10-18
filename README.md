# AIRPAL — Master Brand & Ecosystem

**Life Made Easy.** Turn "I want to do something" into a completed real-world experience.

Production: [https://airpal.me](https://airpal.me) · Firebase project `airpalme-app` · Dual Capacitor mobile shells `me.airpal.app` (AirPal) + `me.airpal.pass` (AirPal Pass, ticketing/events only) from one shared codebase (`src/lib/app-flavor.ts`); web stays one all-in-one app.

---

## The Dual-Lens Product Architecture

To eliminate clutter and maintain crystal-clear user mental models, **AIRPAL** separates features into two dedicated lenses powered by one universal account, trust engine, and database:

### 1. AirPal.Me — Personal Life, Identity & Networking

> **"Organise your schedule, share your digital bio, and connect with people in real life."**

Your personal life companion.

- **Digital Bio & Identity:** Fast link-in-bio at `/@handle` (`/bio/setup`, `/bio/edit`) with 1-tap vCard (.vcf) contact saving and live availability status rings.
- **Personal Calendar:** Universal schedule combining booked event tickets, RSVPs, and catch-ups at `/calendar` with ICS calendar exports.
- **Friends Hub:** Track mutuals, followers, and friends going together to the same events at `/friends`.
- **Networking Circle:** Live presence radar with `<HereCheckIn />`, connector quests, and BLE/ultrasonic wave handshakes at `/circle`.
- **Central Dashboard:** Personal attendance and hosting dashboard at `/me`.
- **Live Notifications Inbox:** Unified notification center at `/me/inbox` with full CRUD (read/unread toggle, single dismiss, and bulk clear-read).

### 2. AirPal Pass — Events, Access & Perks

> **"Discover live concerts & festivals, access digital passes, and save money."**

Your scannable mobile access pass to real-world experiences.

- **What's On & Passes:** Curated concerts, Indian cultural festivals (Diwali, Dandiya), nightlife, and community gatherings at `/pass` and `/events`.
- **Passbook Wallet:** Live digital QR pass cards, Apple Wallet (.pkpass) & Google Wallet passes at `/me/tickets` and `/ticket/:id`.
- **Local Perks & Dining Deals:** Exclusive member dining deals, food perks, and voucher redemptions at `/deals`.
- **Door Check-In Scanner:** Rapid QR ticket admission scanner for event hosts and door teams at `/scan`.
- **Event Hosting Studio:** Full organizer tooling to publish events, manage ticket tiers, and track guestlists at `/event`.
- **Business Hub:** Partner and venue hub for merchant perks, listing management, and claims at `/business`.

**Single Universal Account:** Both lenses share the exact same user profile, Firebase Auth, and Firestore database. Any pass or ticket booked in AirPal Pass automatically appears in the user's AirPal.Me schedule and friends feed.

---

## Brand Email & Communications Pipeline

AIRPAL includes a production-grade communications suite designed for maximum brand trust:

- **Master Brand Email Templates (`shared/email-templates.ts`):** Responsive, client-tested email layouts supporting dark/light mode, lens branding badges (`PASS`, `ME`, `ACCOUNT`, `CIRCLE`), $\ge 48\text{px}$ touch CTAs, and legal footers.
  - Ticket confirmation & passbook links.
  - Event RSVP door-list notices with calendar integration.
  - Personal networking catch-up proposals.
  - Creator & organizer circle broadcasts.
  - Dual-lens welcome orientation.
- **Delivery Queue & Outbox (`functions/src/email.ts`):** Background Firestore `mail` collection delivery compatible with the Firebase Trigger Email extension, with automatic direct REST fallback via Resend or Postmark API keys.
- **Marketing Compliance:** Strict marketing opt-out enforcement protecting user privacy, while guaranteeing critical transactional delivery (tickets, security, RSVPs).

---

## Developer Quickstart

Agents & Contributors: read [**`AGENTS.md`**](./AGENTS.md) and [**`docs/AIRPAL.md`**](./docs/AIRPAL.md) (the binding single source of truth) before editing code.

Copy `.env.example` → `.env` first. Restart Vite after changing `VITE_*` values.

```bash
npm install
npm run dev          # http://localhost:3000
npm test             # run unit & integration tests (Vitest)
npm run verify       # full verification gate (format, types, lint, test, build, rules, secrets, SEO)
npm run cap:sync     # sync web bundle to iOS and Android Capacitor containers
npm run deploy       # verify + deploy hosting, functions, and firestore rules
```

Full architecture, schema details, and operational runbooks live in [`docs/AIRPAL.md`](./docs/AIRPAL.md).
