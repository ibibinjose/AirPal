# AirPal Pass — Apple & Google Wallet Configuration Guide

AirPal Pass provides dual native wallet passes for both Apple Wallet (`.pkpass`) and Google Wallet (Google Pay & Wallet Save links).

Every booking, concert admission, and festival ticket purchased on AirPal Pass is issued as a cryptographically signed digital passbook ticket with dynamic QR code barcodes, door scanner brightness boosts, and offline caching.

---

## 1. Apple Wallet (`.pkpass`) Architecture

### Pass Types

1. **Event Tickets (`eventTicket`)**:
   - **Endpoint**: `GET /api/wallet/ticket/:bookingId.pkpass`
   - **Payload**: Event title, Sydney-local formatted date/time, venue location, ticket tier (e.g. _VIP Early Access_), guest name, organiser/host name, booking reference ID, multi-ticket counts, and door admission guidance.
   - **Barcode**: QR code encoding `https://airpal.me/ticket/:bookingId?event=:eventId` (verified in real-time by the AirPal scanner at `/scan`).
   - **Colors**: AirPal Blue (`rgb(0, 78, 255)`), white typography, high-contrast label color.
   - **Assets**: Branded AirPal icon and logo assets (`icon.png`, `icon@2x.png`, `logo.png`, `logo@2x.png`).

2. **Personal Digital Bio Cards (`generic`)**:
   - **Endpoint**: `GET /api/wallet/card/:handle.pkpass`
   - **Payload**: Member name, `@handle`, location, personal bio tagline, and link to profile.
   - **Barcode**: QR code encoding `https://airpal.me/@:handle`.

### Required Cloud Secrets (Firebase Functions)

Configure these via Firebase CLI (`firebase functions:secrets:set <KEY>`):

| Secret Name             | Description                  | Example / Format                                         |
| :---------------------- | :--------------------------- | :------------------------------------------------------- |
| `WALLET_PASS_TYPE_ID`   | Apple Developer Pass Type ID | `pass.me.airpal`                                         |
| `WALLET_TEAM_ID`        | Apple Developer Team ID      | `10-character string (e.g. ABCDE12345)`                  |
| `WALLET_SIGNER_CERT`    | Pass Type ID Certificate     | Full PEM block (`-----BEGIN CERTIFICATE-----...`)        |
| `WALLET_SIGNER_KEY`     | Signer Private Key           | Example PEM block (`-----BEGIN RSA PRIVATE KEY-----...`) |
| `WALLET_KEY_PASSPHRASE` | (Optional) Key passphrase    | Optional passphrase if key is encrypted                  |

> [!NOTE]
> The Apple Worldwide Developer Relations (WWDR) G4 Intermediate Certificate is bundled directly in `functions/src/wallet.ts`.

### Native iOS Handoff

On iOS Safari, macOS Safari, and the iOS native Capacitor shell:

- The client app performs a `HEAD` preflight to verify that the pass exists and the signer is active.
- For authenticated ticket passes, a short-lived user auth token is appended (`?token=...`).
- When opened on iOS, iOS Safari handles the `application/vnd.apple.pkpass` MIME type natively, automatically presenting Apple's native `PKAddPassesViewController` modal with the live pass preview and "Add" button.
- On non-Apple platforms (e.g. desktop testing), the `.pkpass` bundle downloads with a sanitized file name.

---

## 2. Google Wallet (Google Pay & Wallet Save Links)

### Architecture

Google Wallet passes are minted on-demand as cryptographically signed JSON Web Tokens (RS256) following the Google Wallet API specifications:

- **Event Tickets (`eventTicketClasses` & `eventTicketObjects`)**:
  - **Endpoint**: `GET /api/wallet/google/ticket/:bookingId`
  - **Class**: `${ISSUER_ID}.event_${eventId}` (with `AirPal Pass` branding, logo mark, and website URI).
  - **Object**: `${ISSUER_ID}.${bookingId}` with `hexBackgroundColor: "#004eff"`, ticket tier (`ticketType`), event start time (Sydney timezone), venue name & address, guest name, ticket number, QR barcode, and deep-links back to AirPal.
- **Digital Bio Cards (`genericClasses` & `genericObjects`)**:
  - **Endpoint**: `GET /api/wallet/google/card/:handle`
  - **Class**: `${ISSUER_ID}.airpal_profile_card`
  - **Object**: `${ISSUER_ID}.${handle}` with member name, handle header, city subheader, logo, bio text, and QR barcode.

### Required Cloud Secrets (Firebase Functions)

| Secret Name               | Description                           | Example / Format                                             |
| :------------------------ | :------------------------------------ | :----------------------------------------------------------- |
| `GOOGLE_WALLET_ISSUER_ID` | Google Pay & Wallet Console Issuer ID | `19-digit number (e.g. 3388000000012345678)`                 |
| `GOOGLE_WALLET_SA_JSON`   | Google Cloud Service Account JSON     | Full JSON string containing `client_email` and `private_key` |

### Setting Up Google Wallet API

1. Open the [Google Pay & Wallet Console](https://pay.google.com/business/console).
2. Create or link an Issuer Account to get your **Issuer ID**.
3. In the Google Cloud Console for `airpalme-app`, enable the **Google Wallet API**.
4. Create a Service Account (e.g. `airpal-wallet@airpalme-app.iam.gserviceaccount.com`).
5. Grant the Service Account the **Google Wallet Admin** or authorized issuer role in the Google Pay & Wallet Console.
6. Generate a private key in JSON format and configure it as the `GOOGLE_WALLET_SA_JSON` secret.

### Native Android Handoff

- When a user taps **Save to Google Wallet**, the client calls `openGoogleWalletPass()`.
- The endpoint returns `{ saveUrl: "https://pay.google.com/gp/v/save/:jwt" }`.
- On Android native devices, the app delegates the URL to the OS via `window.open(saveUrl, "_system")`, triggering the native Google Wallet app sheet directly.
- On web browsers, the URL opens in a pop-up window or redirect tab.

---

## 3. UI Components & User Touchpoints

| Location                              | Component              | Features                                                                                                                                   |
| :------------------------------------ | :--------------------- | :----------------------------------------------------------------------------------------------------------------------------------------- |
| **Individual Ticket** (`/ticket/:id`) | `<AirPalTicketPass />` | Full-screen contrast boost for dark doors, dynamic QR code, 1-tap Apple & Google Wallet buttons, Add-to-Calendar, print PDF, native share. |
| **Passbook & Wallet** (`/me/tickets`) | `<MyTicketsPage />`    | Search & filter active passes, offline cached passbook access, Apple & Google Wallet export on every card.                                 |
| **Member Dashboard** (`/me`)          | `<MePage />`           | Digital Wallet card carousel with compact Apple & Google Wallet quick-action buttons.                                                      |
| **Public Bio Profile** (`/@handle`)   | `<BioPublicPage />`    | Owner-only section to save personal QR contact pass to Apple & Google Wallet.                                                              |
| **Networking Circle** (`/circle`)     | `<BioShareModal />`    | Apple Wallet style luxury tear-away pass with QR code, vCard contact export, and Apple & Google Wallet buttons.                            |

---

## 4. Verification & Testing

Run unit tests covering both providers:

```bash
npx vitest run functions/src/wallet.test.ts functions/src/google-wallet.test.ts src/lib/wallet.test.ts
```

All 38 test assertions verify:

- Ticket pass formatting, tier identification, multi-spot counts, and Sydney timezone handling.
- Token-authenticated access via both `Authorization` headers and `?token=` query parameters.
- Honest 501 / 404 responses when credentials are unconfigured or documents do not exist.
- Native handoff logic on iOS and Android Capacitor platforms.
