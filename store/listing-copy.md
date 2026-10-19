# AirPal Ecosystem — Store Listing Assets & Submission Index

Current production store submission copy and App Store Reviewer notes:

- **AirPal (me.airpal.app)**: [`docs/store/listing.md`](../docs/store/listing.md)
- **AirPal Pass (me.airpal.pass)**: [`docs/store/listing-pass.md`](../docs/store/listing-pass.md)
- **App Review Guidelines & 4.3 Defense**: [`docs/store/README.md`](../docs/store/README.md)

## App Review Notes & Demo Account (Both Stores)

```text
Test Demo Account: reviewer@airpal.me
Test Demo Password: AirPalStoreReview2026!

AirPal operates as a unified two-shell platform (me.airpal.app for Personal Bio, Circle, and Hangout Calendar; me.airpal.pass for Live Event Tickets, Apple/Google Wallet passbook, and Door Scanning). See docs/store/README.md for the complete reviewer walkthrough.
```

## Asset map (this repo, `store/`)

| Asset                                           | File                                     | Size      |
| ----------------------------------------------- | ---------------------------------------- | --------- |
| iOS 6.9" screenshots (4)                        | `screenshots/ios-6.9/01..04-*.jpg`       | 1320x2868 |
| iOS 6.7" screenshots (4)                        | `screenshots/ios-6.7/01..04-*.jpg`       | 1290x2796 |
| iOS 5.5" screenshots (4)                        | `screenshots/ios-5.5/01..04-*.jpg`       | 1242x2208 |
| Android phone screenshots (4)                   | `screenshots/android-phone/01..04-*.jpg` | 1080x1920 |
| Play feature graphic                            | `feature-graphic-1024x500.png`           | 1024x500  |
| Play hi-res icon (flattened, no alpha risk)     | `icons/icon-512-flat.png`                | 512x512   |
| iOS app icon (in Xcode asset catalog, no alpha) | `ios/.../AppIcon-512@2x.png`             | 1024x1024 |

To replace these designed previews with real captures later, run
`npm run screenshots` on a machine that can serve the app
(it needs localhost sockets + a Playwright browser).
