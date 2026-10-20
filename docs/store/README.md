# AIRPAL Store Launch & App Review Playbook

This document defines the submission configuration, App Store review notes, and store assets for the two native Capacitor shells compiled from this single codebase:

| App Name        | Bundle ID / Package Name | Primary Purpose                                                     | Primary Routes                                                           |
| :-------------- | :----------------------- | :------------------------------------------------------------------ | :----------------------------------------------------------------------- |
| **AirPal**      | `me.airpal.app`          | Personal Life & Identity Companion (Bio, Circle, Calendar, Friends) | `/@handle`, `/bio/*`, `/circle`, `/friends`, `/calendar`, `/me`          |
| **AirPal Pass** | `me.airpal.pass`         | Events, Dynamic QR Ticketing, Passbook & Merchant Deals             | `/pass`, `/events`, `/e/:id`, `/me/tickets`, `/deals`, `/scan`, `/event` |

---

## 1. App Store Review Defense (Guideline 4.3 — Repackaged / Dual Apps)

Because both native shells share a single unified Firebase Auth and Firestore backend, Apple Reviewers may question why two applications are published.

### Copy & Paste Review Note for App Store Reviewers:

```text
To the App Store Review Team:

AIRPAL operates as a complementary two-lens ecosystem to prevent user context fatigue and optimize focus between two distinct real-world use cases:

1. AirPal (me.airpal.app) is a Personal Life & Identity Companion. It empowers users to manage their personal digital bio (/@handle), discover and connect with mutual friends and their networking circle (/circle), check in live at venues (<HereCheckIn />), and plan 1-on-1 catch-ups on their personal calendar (/calendar).

2. AirPal Pass (me.airpal.pass) is an Events, Ticketing & Door Operations Passbook. It is focused strictly on event-goers, ticket holders, and door teams: discovering live concerts and festivals (/events), storing tickets and passes in Apple Wallet and Google Wallet (/me/tickets), claiming local merchant deals (/deals), and day-of door check-in scanning (/scan).

Both apps share a single universal account model so that an event ticket claimed in AirPal Pass seamlessly reflects in the user's personal calendar in AirPal, and vice versa. Each application serves an independent, non-overlapping target user experience.
```

---

## 2. Reviewer Test Credentials & Demo Data

- **Test Demo Account**: `reviewer@airpal.me`
- **Test Demo Password**: `AirPalStoreReview2026!`
- **Pre-Loaded Sample Data** (App Store / Play review sandbox only — never production seed data, per the authenticity rails in `docs/AIRPAL.md`):
  - Active Digital Bio: `/@bibinjose`
  - Active Confirmed Ticket: Sydney Tech & AI Mixer 2026
  - Active Calendar Hangout Proposal: Coffee Catch-Up at Surry Hills
  - Active Door Scanner Permission: Verified Organiser Door Access

---

## 3. Store Listing Files

- [AirPal Listing Copy (me.airpal.app)](./listing.md)
- [AirPal Pass Listing Copy (me.airpal.pass)](./listing-pass.md)
- [Store Asset Specs & Screenshot Matrix](../../store/listing-copy.md)
