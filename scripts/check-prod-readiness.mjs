import { existsSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";

const root = resolve(import.meta.dirname, "..");

console.log("🔍 Checking Production & App Store Readiness...\n");

const failures = [];

// 1. Store Pack Assets
const requiredStoreFiles = [
  "docs/store/README.md",
  "docs/store/listing.md",
  "docs/store/listing-pass.md",
  "store/feature-graphic-1024x500.png",
  "store/icons/icon-512-flat.png",
];

for (const rel of requiredStoreFiles) {
  const full = join(root, rel);
  if (!existsSync(full)) {
    failures.push(`Missing store document: ${rel}`);
  }
}

// 2. Screenshots
const screenshotDirs = [
  "store/screenshots/ios-6.9",
  "store/screenshots/ios-6.7",
  "store/screenshots/ios-5.5",
  "store/screenshots/android-phone",
];

for (const rel of screenshotDirs) {
  const full = join(root, rel);
  if (!existsSync(full)) {
    failures.push(`Missing screenshot directory: ${rel}`);
  } else {
    const count = readdirSync(full).filter((f) => /\.(jpg|png|jpeg)$/i.test(f)).length;
    if (count < 4) {
      failures.push(`Insufficient screenshots in ${rel}: found ${count}, expected at least 4.`);
    }
  }
}

// 3. Native Capacitor Configurations
const nativeFiles = ["capacitor.config.ts", "ios/App/App.xcodeproj", "android/build.gradle"];

for (const rel of nativeFiles) {
  if (!existsSync(join(root, rel))) {
    failures.push(`Missing native configuration: ${rel}`);
  }
}

// 4. Production Cloud Secrets Checklist
const requiredProdSecrets = [
  { key: "STRIPE_SECRET_KEY", desc: "Live Stripe secret key (sk_live_...)" },
  { key: "STRIPE_WEBHOOK_SECRET", desc: "Stripe webhook endpoint secret (whsec_...)" },
  { key: "WALLET_PASS_TYPE_ID", desc: "Apple Wallet Pass Type Identifier (pass.me.airpal)" },
  { key: "WALLET_TEAM_ID", desc: "Apple Developer Team ID" },
  { key: "WALLET_SIGNER_CERT", desc: "Apple Pass Signer Certificate (.pem)" },
  { key: "WALLET_SIGNER_KEY", desc: "Apple Pass Signer Private Key (.pem)" },
  { key: "GOOGLE_WALLET_ISSUER_ID", desc: "Google Wallet Issuer ID (digits from Pay & Wallet Console)" },
  { key: "GOOGLE_WALLET_SA_JSON", desc: "Google Cloud Service Account JSON credentials with private key" },
];

console.log("📋 Production Cloud Secrets Manifest:");
for (const s of requiredProdSecrets) {
  console.log(`   • ${s.key.padEnd(26)} : ${s.desc}`);
}
console.log("");

if (failures.length > 0) {
  console.error("❌ Production Readiness FAILED:");
  for (const f of failures) console.error(`   - ${f}`);
  process.exit(1);
}

console.log("✅ Production & App Store Readiness check PASSED!");
console.log("   All store listing documents, icons, screenshots, and native files are present.\n");
