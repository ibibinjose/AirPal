# Manual QA Checklist & Customer Walkthrough

Use this checklist to walk through the rebuilt AirPal application as a first-time user, an event organiser, or a merchant.

---

## 1. Quick Start / Environment Setup

```bash
# Terminal 1: Start AirPal Web App (Port 3000)
npm run dev

# Open browser at:
http://localhost:3000
```

---

## 2. Core Customer Loop Walkthrough (Time to Value < 60s)

### Test Case 1: First-Time Discovery (The "Want" Step)

- [ ] **Load Home (`/`):**
  - Verify clean header and greeting ("Less scrolling. More living.").
  - Verify weather snapshot and deterministic outfit recommendations are visible without requiring sign-in.
  - Verify no stacked warning banners or floating buttons clutter the viewport.
- [ ] **Execute Core CTA:**
  - Click the primary button: **"Discover What's Open Now →"**.
  - Verify instant navigation to `/now`.
- [ ] **Explore Places:**
  - Filter by category pills (`Cafes`, `Pubs & Bars`, `Dining`, `Scenic`).
  - Verify place cards render with opening hours, walk times, and vibes.
  - Tap any place card to view rich place details, trading hours, and "Add to Trip".

---

## 3. Pillar 1: Events & Access (AirPal Pass)

### Test Case 2: Event Discovery & Native Passbook

- [ ] **Navigate to Events Hub (`/events` or `/pass`):**
  - Click `Pass` on the mobile bottom tab or desktop navigation.
  - Verify featured Sydney events (Concerts, Night Markets, Festivals).
- [ ] **View Event Details (`/calendar?event=...`):**
  - Click on an event card.
  - Verify date, venue location, walk estimate from The Rocks, and calendar export menu (Google Calendar, Apple `.ics`).
- [ ] **Attendance Sign-in Gate:**
  - Click **"Going"** or **"Interested"** as a guest.
  - Verify the sign-in modal prompts: _"Sign in to mark yourself Going."_.
  - Verify closing or clicking outside dismisses cleanly without errors.
- [ ] **Door Scanner (`/scan`):**
  - Navigate to `/scan`.
  - Verify camera permission prompt and QR barcode target frame render cleanly with live scanning controls.

---

## 4. Pillar 2: Hangouts & Social Planning (AirPal.Me)

### Test Case 3: Create a Hangout & Viral Invite

- [ ] **Navigate to Plan Hub (`/plan`):**
  - Click `Plan` in the bottom navigation.
  - Verify active hangouts and "Create Plan" button.
- [ ] **Create a Plan (`/plan/new`):**
  - Select an occasion template (e.g., "Sunday Brunch" or "Night Out").
  - Enter plan title and location.
  - Click "Save Plan".
- [ ] **Shareable Web RSVP Link (`/invite/:code`):**
  - Copy the generated plan invite link.
  - Open in an incognito/private browser window.
  - Verify friends can view the itinerary, suggest stops, and RSVP as "Going" without mandatory app install.

---

## 5. Pillar 3: Networking Circle & Digital Bio

### Test Case 4: Live Check-In & Personal Bio Profile

- [ ] **Networking Circle (`/circle`):**
  - Click `Circle` in the bottom navigation.
  - Verify the `<HereCheckIn />` radar displaying nearby active AirPals.
  - Verify connector rank progression quests (First Wave, 3 Connections).
- [ ] **Personal Digital Bio (`/@alex` or `/bio/setup`):**
  - Navigate to `/bio/setup` or click your avatar.
  - Verify claim handle flow (`airpal.me/@yourname`).
  - Verify bio customization (links, social badges, music vibe, current availability).
  - Verify unauthenticated public bio renders cleanly at `/@handle`.

---

## 6. Pillar 4: Business Studio & Arrival Engine

### Test Case 5: Merchant Onboarding & Venue Import

- [ ] **Business Portal (`/business`):**
  - Navigate to `/business`.
  - Verify partner value proposition (zero upfront SaaS, 5% ticketing split).
  - Test Google Places search/import tool to auto-populate venue details.
- [ ] **Arrival Engine (`/join`):**
  - Navigate to `/join`.
  - Verify cohort onboarding flow for partner accommodations and student housing.

---

## 7. Security, Privacy & Settings

### Test Case 6: Universal Auth & Data Portability

- [ ] **Unified Authentication (`/start`):**
  - Verify Email/Password, Mobile SMS, and Google social login tabs.
  - Verify password visibility eye toggle works.
  - Verify context banners render correctly when accessed via `/start?role=host`.
- [ ] **Privacy & Data Export (`/settings`):**
  - Navigate to `/settings`.
  - Scroll down to the Privacy & Data section.
  - Click **"Export Account Data (JSON)"**.
  - Verify browser triggers download of a structured JSON archive containing user profile, RSVPs, and ticket history.
- [ ] **Legacy Route Redirection:**
  - Enter `/host` $\to$ verifies redirect to `/event`.
  - Enter `/helpdesk` $\to$ verifies redirect to `/support`.
  - Enter `/pulse` $\to$ verifies redirect to `/join`.
  - Enter `/search` $\to$ verifies redirect to `/now`.
  - Enter `/w/xyz` $\to$ verifies redirect to `/circle`.

---

## 8. Final Pass Verification Sign-off

- [x] All 5 bottom dock tabs navigate smoothly.
- [x] Zero console warnings or unhandled promise rejections.
- [x] Mobile touch targets $\ge 44\text{px}$.
- [x] Responsive layout on iPhone (390px), iPad (768px), and Desktop (1280px+).
