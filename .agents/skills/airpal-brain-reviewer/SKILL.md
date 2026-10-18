---
name: airpal-brain-reviewer
description: Evaluates product features, architecture, UI, and code changes against docs/AIRPAL.md and AGENTS.md to protect the North Star (Completed Experiences per Active User), enforce the dual-product ecosystem architecture (AirPal.Me + AirPal Pass), and prevent bloat or parallel account systems.
---

# AirPal Brain Reviewer Skill

This skill enforces product integrity defined in **`docs/AIRPAL.md`** (the binding source of truth) and **`AGENTS.md`**.

## Core Operating Principle

> **"Don't optimize for users. Optimize for completed experiences."**
> **Company Loop: Want → Discover → Connect → Book → Go/Scan → Remember → Repeat**
> **North Star Metric:** Completed AirPal Experiences per active user.

---

## Brand Architecture & Invariants

**AIRPAL** is the master brand ("Life Made Easy") with two distinct UX lenses powered by a unified account and database engine:

1. **AirPal.Me (Personal Life, Identity & Networking):**
   - _Core Job:_ "Organise your schedule, share your digital bio, and connect with people in real life."
   - _Surfaces:_ Digital Bio (`/@handle`, `/bio/setup`, `/bio/edit`), Friends Hub (`/friends`), Networking Circle (`/circle` with `<HereCheckIn />`), Personal Calendar (`/calendar`), Dashboard (`/me`), and Notifications Inbox (`/me/inbox`).
2. **AirPal Pass (Events, Deals & Experiences):**
   - _Core Job:_ "Discover live concerts & festivals, access digital passes, and save money."
   - _Surfaces:_ What's on & passes (`/pass`, `/events`), scannable digital passbook (`/me/tickets`, `/ticket/:id`), member dining perks (`/deals`), door scanner (`/scan`), organiser tools (`/event`), and business hub (`/business`).

**Invariants:**

- **One Universal Identity:** Under no circumstances create separate user accounts, login databases, or siloed user systems between AirPal.Me and AirPal Pass.
- **Deterministic Intelligence:** Live Firestore events, honest venue hours, real weather, and deterministic outfit advice. No hallucinated data or fake providers.
- **Single Booking & Payment Engine:** Stripe Checkout, ticketing, and fee calculations run exclusively through Cloud Functions with strict default-deny in `firestore.rules`.

---

## Conflict Hierarchy

When documents or requirements conflict, resolve in this strict order:

1. **Safety, Security, Privacy, and Payment Integrity** (`docs/AIRPAL.md` Part C)
2. **Binding Rebuild Truth** (`docs/AIRPAL.md` Parts A–G)
3. **Shipped Chrome, Auth, and Design System** (`docs/AIRPAL.md` Part E)
4. Older vertical plans or reference docs

---

## Feature Evaluation Framework

Before creating any new screen, route, Firestore collection, integration, or feature, evaluate against the 6 gates:

1. **Discovery:** Does it help someone discover what to do in their city?
2. **Connection:** Does it help them connect with friends or trusted groups?
3. **Planning & Action:** Does it help them turn intent into a concrete, executable experience (ticket, pass, RSVP, or catch-up)?
4. **Completion:** Does it help them show up and complete the real-world experience (verified gate scan, check-in, saved vCard)?
5. **Trust & Safety:** Does it increase trust, identity verification, or safety?
6. **Business Value:** Does it create measurable value or facilitate legitimate marketplace transactions?

_Decision Rule:_ If the answer is NO to most of these questions, do NOT build it.

---

## Anti-Pattern Checklist (What AirPal is NOT)

Reject changes that turn AirPal into:

- A generic social network or dating app
- An uncurated events directory or news feed
- A generic hotel/Airbnb clone without the experience connection layer
- An online e-commerce clothing store
- An AI chatbot with a marketplace attached (AI must propose concrete, actionable plans)
- Multiple fragmented apps or user systems (Must maintain one platform, one identity)
