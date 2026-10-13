# Next 30 Days — AirPal Validation & Go-To-Market Plan

A practical 30-day playbook to validate the rebuilt AirPal ecosystem with real customers, launch the first live pilots in Sydney, and track North Star metrics before writing new features.

---

## 1. The North Star Metric & Milestone

- **North Star Metric:** **Completed Experiences per Active User (CE/AU)**.
  - _Definition:_ A user either attends a ticketed event (`/pass`), completes a shared hangout with $\ge 2$ mates (`/plan`), or checks in via live presence (`/circle`).
  - _Day 30 Target:_ $\ge 1.5$ Completed Experiences per weekly active user.
- **First Revenue Milestone:** **$500 in net platform fees** (generated via 5% Stripe ticketing on 200 tickets @ $50 avg. ticket price, plus 10 Pro Bio subscriptions @ $9/mo).

---

## 2. 2-Week 3-Customer Validation Plan

To validate the dual-lens model without spending on paid ads, we recruit 3 anchor partners in the Sydney CBD / Rocks precinct across distinct use cases:

### Customer 1: The Event Host (The Rocks Market / Live Music Host)

- **Target Partner:** Local independent live music promoter or Rocks artisanal night market organiser.
- **The Value Pitch:** "Sell tickets with instant Apple & Google Wallet passbooks, zero monthly software fees, and a simple 5% platform split—plus door scanning right from your phone's browser at `/scan`."
- **Success Criteria:**
  - Onboard 1 live weekend event on `/event`.
  - Process 50+ ticket sales through native Stripe checkout.
  - Scan $\ge 90\%$ of attendees at the door using `/scan` without paper checklists.

### Customer 2: The Social Coordinator (University Society / PBSA Social Lead)

- **Target Partner:** Student club social director (e.g., USYD / UNSW Indian Society or Urbanest Sydney Resident Assistant).
- **The Value Pitch:** "Organise group dinners and weekend outings in under 60 seconds. Send one `/invite/:code` link where everyone votes on stops and RSVPs without having to download an app or sign up."
- **Success Criteria:**
  - Create 3 group hangouts on `/plan`.
  - Achieve $\ge 15$ web RSVPs per plan with $\ge 60\%$ attendance rate.
  - Collect zero complaints about login barriers.

### Customer 3: The Hospitality Merchant (The Glenmore Hotel / Local Rooftop Venue)

- **Target Partner:** Historic pub or rooftop bar in The Rocks precinct.
- **The Value Pitch:** "Claim your venue on AirPal's Discovery Radar (`/now`). When people search 'What's open now in The Rocks', your live vibe, craft beer list, and perks appear first."
- **Success Criteria:**
  - Import venue via Google Places API into `/business`.
  - Launch 1 merchant perk (e.g., "Show your AirPal Pass for 10% off before 7 PM").
  - Track $\ge 25$ perk redemptions via `/deals`.

---

## 3. Weekly Execution Schedule

### Week 1 (Days 1–7): Partner Onboarding & Shadowing

- **Monday–Tuesday:** Pitch the 3 target partners using the clickable prototype (`prototype/index.html`) and live demo.
- **Wednesday–Thursday:** Set up partner Stripe Connect accounts on `/event` and import venue details on `/business`.
- **Friday–Sunday:** Shadow Customer 1 (Event Host) during event setup; test attendee ticket purchase flow on mobile devices.

### Week 2 (Days 8–14): Live Execution & Feedback Loop

- **Execute First Ticketed Event:** Verify real money flows through Stripe webhook; verify Apple Wallet `.pkpass` downloads.
- **Execute First Social Hangout:** Coordinate university club mixer via `/plan` and `/invite/:code`.
- **Daily Support Triage:** Monitor Sentry error logs and Firebase Auth drop-offs. Fix any user-facing bug within 4 hours.

### Week 3 (Days 15–21): Retention & Viral Loop Ignition

- **Measure K-Factor:** Calculate viral invites per plan: $\text{Viral Factor} = \frac{\text{New RSVPs from } /invite/:code}{\text{Existing Active Users}}$.
- **Promote Digital Bios:** Introduce attendees to personal digital bio handles (`/@handle`) as their event badge and networking link.
- **Belonging Check-in:** Test `<HereCheckIn />` live presence at the partner venue to gauge real-time density.

### Week 4 (Days 22–30): Financial & Product Review

- **Council Review Meeting:** Review unit economics with CFO and CEO lenses:
  - Did Stripe fees exceed Firebase hosting costs? (Day 0 profitability).
  - What was customer acquisition cost (CAC) vs. lifetime value (LTV)?
- **Go / No-Go Decision on New Features:**
  - Only build features requested by $\ge 2$ of the 3 pilot partners.
  - Reject all unvalidated scope additions.

---

## 4. What NOT to Build (Saying "No" Rules)

Unless the North Star Metric drops and direct customer feedback demands it, do **NOT** build:

1. Native hotel property management systems (PMS) or room key integrations.
2. Stranger chat / unsolicited direct messaging (violates trust and safety rails).
3. Complex loyalty coin / crypto token reward mechanics.
4. Separate databases or third-party auth providers that fragment the universal account.
