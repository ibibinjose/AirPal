# Repository Architecture Map

Where everything lives, what is generated, and what must stay secret. The
product canon is [`AIRPAL.md`](./AIRPAL.md); this file is the tree legend.

## Top-level layout

| Path                                                                                           | Kind         | Committed | Notes                                                                                                                                           |
| ---------------------------------------------------------------------------------------------- | ------------ | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/`                                                                                         | source       | yes       | Vite SPA: `app/` (routes + canon), `pages/`, `components/*`, `contexts/`, `hooks/`, `lib/`, `types/`                                            |
| `shared/`                                                                                      | source       | yes       | Client/server contract: pricing, capacity, validation, email templates, QR intents. No Firebase Admin imports                                   |
| `functions/src/`                                                                               | source       | yes       | Cloud Functions callables + triggers. Only server code may price, pay out, or verify                                                            |
| `functions/package.json`                                                                       | source       | yes       | Separate functions toolchain (own `node_modules`, own vitest)                                                                                   |
| `scripts/`                                                                                     | source       | yes       | Repo gates (`check-*.mjs`), prerender, screenshots. Every gate is an `npm run` script                                                           |
| `docs/`                                                                                        | source       | yes       | Canon (`AIRPAL.md`), contracts, runbooks, store pack, `archive/` for retired material                                                           |
| `public/`                                                                                      | source       | yes       | Static web assets: icons, manifest, service worker, `robots.txt`, `sitemap.xml`, `llms.txt`                                                     |
| `e2e/`                                                                                         | source       | yes       | Playwright journeys (`npm run test:e2e`)                                                                                                        |
| `ios/`, `android/`                                                                             | shells       | yes       | Capacitor native shells built from `dist/` via `cap:sync`. Generated subdirs (`Pods/`, `.gradle/`, `app/build/`, synced web assets) are ignored |
| `index.html`, `vite.config.ts`, `capacitor.config.ts`                                          | config       | yes       | Web entry, build, native shell config                                                                                                           |
| `firebase.json`, `.firebaserc`, `firestore.rules`, `firestore.indexes.json` (+ `.v3` variants) | config       | yes       | Hosting rewrites/headers, project, security rules, composite indexes                                                                            |
| `package.json`, `package-lock.json`, `bun.lock`                                                | config       | yes       | Toolchain + dependency pins                                                                                                                     |
| `AGENTS.md`, `README.md`, `CHANGELOG.md`, `DEPLOY_RUNBOOK.md`                                  | docs         | yes       | Entry pointers, quickstart, history, dated ops plans                                                                                            |
| `dist/`                                                                                        | build output | **no**    | Vite production bundle. Deployed to Hosting, never committed                                                                                    |
| `functions/lib/`                                                                               | build output | **no**    | esbuild bundle (`functions/.gitignore`). Deployed to Cloud Functions, never committed                                                           |
| `.firebase/`                                                                                   | deploy cache | **no**    | Hosting deploy cache, never committed                                                                                                           |
| `node_modules/`, `functions/node_modules/`                                                     | toolchain    | **no**    | Installed, never committed                                                                                                                      |
| `playwright-report/`, `test-results/`                                                          | test output  | **no**    | Local only, never committed                                                                                                                     |
| `*.log`                                                                                        | logs         | **no**    | Emulator/debug logs, never committed                                                                                                            |
| `.env`                                                                                         | secrets      | **no**    | Root: **client keys only** (`VITE_*`). See below                                                                                                |
| `functions/.env`                                                                               | local config | **no**    | Non-secret Functions environment config; do not duplicate keys bound with `defineSecret`                                                        |
| `functions/.secret.local`                                                                      | secrets      | **no**    | Local emulator overrides for `defineSecret` bindings; production uses Secret Manager                                                            |
| `Certificates.p12`, keystores, service-account JSON                                            | secrets      | **no**    | Local signing/credentials. Ignored by pattern (`*.p12`, `*.jks`, `android/**/keystore.properties`, `*serviceAccount*.json`). Back up off-repo   |

## `src/` conventions

- **Routing lives in one place:** `src/app/routes.tsx` declares pages;
  `src/app/airpal-app.ts` holds the canonical route table, aliases, and
  section mapping. QR intents that resolve in-app go through `src/lib/qr.ts`
  (`pathForIntent`); merchant voucher QRs verify inline instead of routing.
- **One context per domain** (`src/contexts/`), one hook file per hook
  (`src/hooks/`), colocated `*.test.ts` next to the module it covers.
- **Components group by surface** (`event/`, `booking/`, `calendar/`,
  `circle/`, `deals/`, `ui/`, …). `components/debug/` is support tooling
  only — gated behind `?debug` / shortcut / explicit event, renders nothing
  by default.
- **Client never prices, pays, or verifies:** display math may mirror the
  server for UX, but `functions/` re-derives every money, inventory, and
  trust decision from live documents.

## `shared/` contract

Pure TypeScript both sides import: single price authority inputs, capacity
gate (`eventHeadsAllowed`), validators, email templates, QR/auth URL
codecs, analytics dictionary. If both client and server need it, it lives
here — never duplicated. Adding a two-`where` query in `functions/src`
requires a composite index entry (`firestore.indexes.json`); the
`rules:check` gate enforces this.

## Secrets discipline

1. Root `.env` = public client config only. Non-secret Functions config lives
   in `functions/.env`; local secret overrides for `defineSecret` bindings go
   in `functions/.secret.local`, while production secrets live in Secret
   Manager. Never put a `defineSecret` key in a plain `.env` file.
2. Vite exposes only `VITE_*` to the bundle — but never put a secret in
   root `.env` at all; the file's own header says so.
3. Signing material (`.p12`, keystores, `keystore.properties`,
   service-account JSON) stays on signing machines, never in git.
4. `npm run secrets:check` scans tracked files; `npm run verify` runs it
   plus format, types, lint, both unit suites, both builds, rules, v3,
   SEO, and prod-readiness. Live rules behaviour is covered separately by
   `npm run test:rules` (emulator-backed suite, skipped by default gates).
