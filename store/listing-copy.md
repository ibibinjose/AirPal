# AirPal Ecosystem — Store Listing Assets & Submission Index

Current production store submission copy, App Store Connect full configuration, and App Store Reviewer notes:

- **AirPal (me.airpal.app)**: [`docs/store/listing.md`](../docs/store/listing.md)
- **AirPal Pass (me.airpal.pass)**: [`docs/store/listing-pass.md`](../docs/store/listing-pass.md)
- **Full App Store Connect Configuration**: [`ios/App/APP_STORE_METADATA.md`](../ios/App/APP_STORE_METADATA.md)
- **App Review Guidelines & 4.3 Defense**: [`docs/store/README.md`](../docs/store/README.md)

---

## App Review Notes & Demo Credentials (Both Apps)

```text
Test Demo Account: reviewer@airpal.me
Test Demo Password: AirPalStoreReview2026!

AirPal operates as a unified two-shell platform (me.airpal.app for Personal Bio, Circle, and Hangout Calendar; me.airpal.pass for Live Event Tickets, Apple/Google Wallet passbook, and Door Scanning). See docs/store/README.md and ios/App/APP_STORE_METADATA.md for the complete reviewer walkthrough.
```

---

## Store Visual Asset Matrix

| Asset                         | Target Path                                           | Resolution                | Required by                     |
| :---------------------------- | :---------------------------------------------------- | :------------------------ | :------------------------------ |
| **iOS 6.9" Super Retina XDR** | `store/screenshots/ios-6.9/01..04-*.jpg`              | 1320 x 2868 px            | iPhone 16 Pro Max               |
| **iOS 6.7" Super Retina XDR** | `store/screenshots/ios-6.7/01..04-*.jpg`              | 1290 x 2796 px            | iPhone 15 Pro Max / 14 Pro Max  |
| **iOS 5.5" Retina HD**        | `store/screenshots/ios-5.5/01..04-*.jpg`              | 1242 x 2208 px            | iPhone 8 Plus / SE Display Mode |
| **Android Phone**             | `store/screenshots/android-phone/01..04-*.jpg`        | 1080 x 1920 px            | Google Play Store               |
| **Play Feature Graphic**      | `store/feature-graphic-1024x500.png`                  | 1024 x 500 px             | Google Play Store               |
| **Play Hi-Res Icon**          | `store/icons/icon-512-flat.png`                       | 512 x 512 px              | Google Play Store               |
| **iOS App Icon**              | `ios/App/App/Assets.xcassets/AppIcon.appiconset`      | 1024 x 1024 px (No alpha) | App Store Connect               |
| **iOS Pass Icon**             | `ios/App/App/Assets.xcassets/AppIcon-Pass.appiconset` | 1024 x 1024 px (No alpha) | App Store Connect               |

---

To capture new screenshot sets from the running application:

```bash
# Capture AirPal screenshots:
npm run screenshots

# Capture AirPal Pass screenshots:
npm run screenshots:pass
```
