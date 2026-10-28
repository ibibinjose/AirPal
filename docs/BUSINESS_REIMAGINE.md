# Business Hub Reimagination — Command-Center Blueprint

**Scope:** `/business` + full orbit (setup, onboard, helpdesk, promotions studio,
claim, public venue page, neighbours `/event`, `/scan`, `/deals`).
**North star:** the daily-ops command center — a merchant opens it during service
and sees tonight at a glance.
**Status:** all 5 slices built (Tonight tab + venue alias; Door upgrades; shared
offer form; setup per-field completion + Tonight finish + helpdesk redirect;
public venue live strip).

## 1. Vision

One thumb, two taps, zero hunting. The reimagined Business Hub answers three
questions in order:

1. **What is happening tonight?** (covers, door queue, bookings needing action)
2. **What needs me?** (unconfirmed bookings, expiring offers, belonging pulse dips)
3. **What do I want to change?** (hours, offers, door list, venue story)

Everything else — venue bio polish, helpdesk guides, promotion analytics — drops
one level down. The current hub opens on Venue Info (static config). The new hub
opens on **Tonight** (live operations).

## 2. Honest audit of today (from code + 28 Oct walkthrough)

| Surface                                | Today                                        | Verdict                                                  |
| -------------------------------------- | -------------------------------------------- | -------------------------------------------------------- |
| `/business` Venue Info (`?tab=place`)  | Config-first landing: address, hours, photos | Wrong default; keep as a tab, not the home               |
| 7-Day Schedule Helper modal            | Works, modal + cancel                        | Promote into Tonight                                     |
| Bookings (`?tab=bookings`)             | Renders                                      | Needs action triage, not a raw list                      |
| Door List (`?tab=list`)                | Renders                                      | Must be big-target, offline-proof, one-tap check-in      |
| Offers & Deals (`?tab=offer`)          | Renders                                      | Split brain with `/business/promotions/*` studio — merge |
| `/business/setup` (5 steps, 80% ready) | Step links correct                           | Keep; tighten copy, keep resume                          |
| `/business/onboard`, `/helpdesk`       | Render; listing combobox works               | Fold helpdesk into contextual help, not a page           |
| `/claim`                               | Renders                                      | Keep; one job, does it                                   |
| Public venue `/@handle`                | Fixed (finding 11)                           | Add live tonight strip ("Open now · 3 offers")           |
| Neighbours `/event`, `/scan`, `/deals` | Healthy                                      | Deep-link both ways; no duplication                      |

Design debt to kill: two offer-creation paths (Offer tab vs promotions studio),
helpdesk as a destination page, config-first landing, and empty states that
describe instead of act.

## 3. Reimagined information architecture

Five tabs, operations first. URL tabs persist (`?tab=`), and `?tab=place`
redirects to `?tab=venue` so old links keep working.

| #   | Tab                                  | Job                                                                                                                                     | Default |
| --- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| 1   | **Tonight** (new)                    | Service briefing: open/closed, covers tonight, next 3 bookings needing action, door shortcut, live offer count, belonging pulse snippet | Landing |
| 2   | **Door** (`?tab=list`)               | Check-in list: search, party-size stepper, one-tap check-in, walk-in add; offline-cached                                                | —       |
| 3   | **Bookings** (`?tab=bookings`)       | Action triage first (unconfirmed, tonight), then all; per-row admit/message                                                             | —       |
| 4   | **Offers** (`?tab=offer`)            | Single creation path (absorbs promotions studio lite flow); full studio stays at `/business/promotions/*` for campaigns                 | —       |
| 5   | **Venue** (`?tab=venue`, ex `place`) | Info, hours, photos, story, danger zone (remove venue, confirm dialog naming the venue)                                                 | —       |

`BusinessNavHub` keeps 5 tabs max (tab bar, per guide). Setup, onboard, claim,
helpdesk stay as flows, reachable from an overflow "More" menu and contextual
entry points — never as tabs.

## 4. Per-page blueprint

### 4.1 Tonight (new home)

- **Service card:** open/closed state (icon + text, never color alone), today hours from the 7-Day Schedule, "Open late / Close early" quick override with confirm.
- **Action queue:** at most 3 cards — e.g. "6 unconfirmed for tonight", "Offer ends today", "Pulse dipped Friday". Each card is a button to the exact row.
- **Door shortcut:** giant "Open door list" CTA (min 64px tall on mobile), cached count.
- **Belonging strip:** one-line pulse aggregate + link to `/host/pulse`.
- **Loading:** skeleton cards for the briefing (content-heavy), spinner only for the override action. Numbers use `tabular-nums`.

### 4.2 Door (`?tab=list`)

- Sticky search + status filter chips (≥44px). Rows ≥56px with guest name, party size, status icon + label.
- One-tap check-in with haptic success; undo window (5s toast) instead of a confirm per guest.
- "Add walk-in" opens a bottom sheet (grab handle, ESC/back-button dismiss), inputs ≥16px.
- Offline: render cached list with an "Offline — showing saved list" banner; queue check-ins and sync on reconnect.

### 4.3 Bookings (`?tab=bookings`)

- Segmented control: Needs action / Tonight / All. Empty states act: "No bookings yet. Share your event link." with copy-link CTA.
- Row actions: confirm, message guest, view ticket. Destructive (cancel booking) needs a confirm dialog naming the booking.

### 4.4 Offers (`?tab=offer`)

- One "New offer" button opening the same sheet the promotions studio uses — single creation path, no fork.
- Each offer: status (icon + text), redemptions `12/50` in tabular numerals, pause/extend inline.
- Empty state: what an offer is + "Create your first offer" button.

### 4.5 Venue (`?tab=venue`, ex `place`)

- Sectioned config: Story, Hours (7-day editor stays), Photos, Contact, Danger Zone last.
- Street/Suburb/State/Postcode fields keep the fixed split (finding 14); setup completion counts per-field, never "complete" with an empty street.
- Every save: disable submit + spinner, toast on result, re-enable on error.

### 4.6 Flows: setup, onboard, claim, helpdesk

- **Setup:** keep 5 steps + resume; step 1 gains per-field completion; final step previews the Tonight tab, not just "Live at /@handle".
- **Onboard:** unchanged (combobox already works); add "skip to Tonight" for returning owners.
- **Claim:** unchanged single job; success lands on Tonight.
- **Helpdesk:** dissolve as a page; move guides into contextual "Learn" links inside Tonight and Venue. Redirect `/business/helpdesk` to `/business` with a notice.

### 4.7 Public venue page + neighbours

- Public `/@handle` venue pages gain a live strip: "Open now · Happy hour till 6 · 2 offers".
- `/event` (create event), `/scan` (door scanner), `/deals` (dining) get bidirectional deep links from Tonight/Door/Offers. No duplicated creation UI anywhere — one path per job.

## 5. Cross-cutting rules (non-negotiable)

- **Touch:** every control ≥44px; icon-only buttons get `aria-label`; inputs ≥16px.
- **State never color-only:** status always pairs icon + text.
- **Feedback pattern:** toasts for action results, inline messages for field errors (focus first error), banners for page-level/offline states.
- **Destructive:** confirm dialog naming the venue/booking/offer, or an undo window — never silent, never single-tap delete.
- **Motion:** 150–300ms named transitions, transform/opacity only, honor reduced motion; one haptic layer per event.
- **Layout:** no horizontal scroll at 375px; `min-w-0` + truncation for long names; z-scale 10/20/30/50.
- **Canon:** no second venue/order/chat system; money and redemption stay in Cloud Functions; `npm test` + `npm run verify` before merge.

## 6. Rollout (smallest safe slices)

1. **Tonight tab + `?tab=place` → `?tab=venue` alias.** Read-only briefing first, then the open/close override.
2. **Door upgrades:** undo check-in, walk-in sheet, offline banner.
3. **Offers merge:** single creation sheet shared with promotions studio.
4. **Setup/helpdesk:** per-field completion, Tonight preview, helpdesk redirect.
5. **Public live strip** on venue pages.

Each slice ships behind the existing tab param, so refresh, bookmarks, and the
walkthrough's hard-reload checks keep passing throughout.

## 7. Decisions for you

1. Tonight as default landing — yes, or keep Venue Info for new owners until setup completes?
2. Dissolve `/business/helpdesk` into contextual help — keep the URL as a redirect?
3. One offer-creation sheet shared with the promotions studio — or keep studio fully separate for campaigns?
