# Council Decisions & Conflict Resolution Log (DECISIONS.md)

> **Governing Conflict Hierarchy:**  
> Customer Value > Safety & Privacy > Commercial Viability (CEO/CFO) > Simplicity (CTO/Designer) > Nice-to-Haves.  
> Every real conflict between the seven council experts is recorded here with rationale, options considered, and resolution.

---

## Decision 1: Purging the Hotel PMS, Housekeeping & Guest Concierge OS
- **Lenses in Conflict:** CTO vs CEO / Customer Lens
- **The Debate:**
  - *CTO:* The codebase contains extensive hotel property schemas, room tokens, housekeeping states, PMS sync, and staff ticketing engines with over 100 passing unit tests. Deleting this code discards significant architectural engineering.
  - *CEO & Customer:* Zero customers use AirPal as a hotel operating system. AirPal is marketed as a social companion for events, hangouts, and digital bios. Retaining hotel room status cards, in-room dining menus, and front-desk maintenance dispatchers creates severe mental model confusion for new users and pollutes Firestore with dead data.
- **Conflict Hierarchy Applied:** Customer Value & Commercial Viability outrank Technical Sunk Cost.
- **Resolution:** **CUT 100% of hotel stay/PMS infrastructure.** All `/stay`, `/host`, `/pulse`, `/helpdesk`, and `StaffTicket` surfaces are excised. Legacy URLs are redirected cleanly to avoid 404s.

---

## Decision 2: Elimination of Mobile Navigation Header Clutter
- **Lenses in Conflict:** Marketer / Growth vs Designer / Customer
- **The Debate:**
  - *Marketer:* We need maximum top-of-funnel exposure for all 4 pillars, plus dining perks, ticket alerts, and weather pills on the mobile screen.
  - *Designer & Customer:* On a standard iPhone screen (390×844), stacking `TicketAlertBar` + `LocalNowBar` + Brand Header + `MobilePillarsNav` + sub-links consumes over 320px (nearly 40% of the entire viewport) before the user even sees content. It violates Apple HIG and creates severe visual fatigue.
- **Conflict Hierarchy Applied:** Customer Value & Simplicity outrank Marketing Feature Density.
- **Resolution:** **Strip to a single 44px top header (Logo + Search + Avatar)** and a **single 5-item bottom dock (Home, Now, Events, Plan, Bio)**. Purge `MobilePillarsNav`, `TicketAlertBar`, `BatteryWarningBanner`, and the floating `CreateFab`.

---

## Decision 3: Event Ticketing Platform Fee & Monetization Model
- **Lenses in Conflict:** Growth vs CFO & CEO
- **The Debate:**
  - *Growth:* Make all event ticketing 100% free with 0% platform fee to maximize ticket volume and compete aggressively with Eventbrite and Luma.
  - *CFO & CEO:* Free ticketing leaves AirPal vulnerable to credit card processing fees ($0.30 + 1.75%–2.9%) on paid events and fails to establish a viable business. Event organizers are accustomed to paying 3.7%–10% on platforms like Eventbrite and Luma.
- **Conflict Hierarchy Applied:** Commercial Viability outranks Unfunded Growth.
- **Resolution:** **Hybrid 5% Model:**
  1. Free community events: **100% free** ($0 fee) to drive viral user acquisition.
  2. Paid ticketed events: **Flat 5% platform fee** collected via Stripe Connect application fees.
  3. Organizers receive instant payouts after event completion; AirPal achieves positive unit economics on Day 1.

---

## Decision 4: Frictionless Web Hangout RSVP vs Forced Authentication
- **Lenses in Conflict:** Customer / Growth vs Ops / Security
- **The Debate:**
  - *Ops & Security:* Require full Firebase sign-in before a guest can RSVP to a friend's hangout link (`/invite/:code`) to prevent spam responses and anonymous troll voting.
  - *Customer & Growth:* Forcing a friend to download an app or create an account with password verification just to reply "I'm coming to Saturday coffee" causes an 80%+ drop-off in group chats.
- **Conflict Hierarchy Applied:** Customer Value outranks Security Overkill for low-risk actions.
- **Resolution:** **Two-Tiered Verification:**
  1. **Low-Risk (Hangout RSVP):** Zero-friction web RSVP. Guests can enter their first name and click "Going" or vote on stops without creating a password.
  2. **High-Risk (Ticket Purchases, Handle Claiming, Payouts):** Strict Firebase Auth and Stripe Connect identity verification required.

---

## Decision 5: Removal of Stranger Matching ("Mates" & "Wave")
- **Lenses in Conflict:** Growth vs Ops / Legal & Safety
- **The Debate:**
  - *Growth:* Offering a "meet a local stranger to go with you" button (`mate_requests`, `/w/:code`) could create a novel companion marketplace.
  - *Ops & Legal / Safety:* Matching solo strangers in real-world private settings without multi-point background checks introduces severe physical safety risks, liability exposure under Australian Law, and shifts the brand toward an uncurated dating app.
- **Conflict Hierarchy Applied:** Safety & Privacy outranks Growth Experiments.
- **Resolution:** **Strict enforcement of the Anti-Stranger Canon.** AirPal is designed for **friends, existing circles, and verified public events**. Delete all `mate_requests`, `companion_applications`, and stranger `wave` mechanisms.
