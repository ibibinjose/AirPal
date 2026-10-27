# AirPal.bio Custom Domain Runbook

How `airpal.bio` serves the same app (and every `/bio/@handle` BioSite) as
`airpal.me`. Repo-side work is already done; the remaining steps are clicks
in the Firebase console and your DNS registrar.

## What the repo already handles

- `firebase.json` routes `/bio/**` through the `shareMeta` function, so
  crawlers get OG title/description/avatar cards for `/bio/@handle` links —
  same as `/@handle` today.
- `functions/src/share-meta.ts` resolves `/bio/@handle` BioSite cards.
- `src/lib/public-origin.ts` treats `airpal.bio` as a first-party host, so
  BioSite links are never rewritten away.
- `src/lib/biosite.ts` builds absolute BioSite URLs (`VITE_BIO_ORIGIN`
  overrides the default `https://airpal.bio` for staging).

## Owner steps (Firebase console + DNS)

1. Firebase console → Hosting → **Add custom domain** → enter `airpal.bio`.
   Follow the ownership verification (TXT record) exactly as shown.
2. Add the DNS records the console gives you (typically):
   - Root `airpal.bio` → the two `A` records shown (do not guess IPs —
     copy them from the console; they rotate).
   - `www.airpal.bio` → `CNAME` to your `*.web.app` default domain.
3. Add a second custom domain `www.airpal.bio` the same way if you want it.
4. Wait for **Pending → Connected** (usually minutes, up to 24h). HTTPS
   certificates are provisioned automatically — do not upload your own.
5. Deploy at least once after connecting so the new rewrite ships:
   `npm run deploy:hosting` (runs the build + `firebase deploy --only hosting`).

## Verify

- `https://airpal.bio/bio/@<yourhandle>` renders the BioSite card.
- `https://airpal.me/bio/@<yourhandle>` renders the identical page.
- Paste either URL into a link-preview debugger: title shows
  `<Name> (@handle)` with the bio avatar.
- `https://airpal.bio/bio/setup` still opens Bio setup (static pages are
  unaffected — only `/bio/@…` paths resolve as BioSites).

## Rollback

Remove the custom domain in Hosting settings and delete the DNS records.
`airpal.me` links keep working throughout — nothing about the BioSite
depends on the bio domain being connected.
