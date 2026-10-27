// Backfill B — normalise legacy duplicated locality lines in stored addresses.
//
// Run from functions/ (needs Node >= 22.18 for .ts imports):
//   node backfill-addresses.mjs            (dry run, default)
//   node backfill-addresses.mjs --apply    (write)
//
// For every listings + places doc, computes
// next = formatAddress(parseAddress(address)) with the FIXED parser and
// writes only when the text shrinks to fewer lines while introducing no new
// tokens. Idempotent: re-running changes nothing.
//
// Requires GOOGLE_APPLICATION_CREDENTIALS (or gcloud ADC) for project
// airpalme-app. Take a Firestore export / point-in-time snapshot before
// --apply.

import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { formatAddress, parseAddress } from "../shared/geo-address.ts";

const PROJECT_ID = "airpalme-app";
const apply = process.argv.includes("--apply");

initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID });
const db = getFirestore();

function tokens(text) {
  return String(text || "")
    .toLowerCase()
    .split(/[\s,;]+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

function lineCount(text) {
  return String(text || "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean).length;
}

function safeNext(address) {
  let next;
  try {
    next = formatAddress(parseAddress(address));
  } catch {
    return null;
  }
  if (!next || next === address) return null;
  if (lineCount(next) >= lineCount(address)) return null;
  const before = new Set(tokens(address));
  if (!tokens(next).every((t) => before.has(t))) return null;
  return next;
}

async function sweep(collection) {
  const snap = await db.collection(collection).get();
  let changed = 0;
  for (const doc of snap.docs) {
    const address = doc.data()?.address;
    if (typeof address !== "string" || !address) continue;
    const next = safeNext(address);
    if (!next) continue;
    console.log(
      `${apply ? "update" : "would-update"},${collection},${doc.id},${JSON.stringify(address)},${JSON.stringify(next)}`,
    );
    changed += 1;
    if (!apply) continue;
    await db
      .collection(collection)
      .doc(doc.id)
      .update({ address: next, addressNormalizedAt: new Date().toISOString() });
  }
  return changed;
}

const listings = await sweep("listings");
const places = await sweep("places");
console.log(`summary,mode=${apply ? "APPLY" : "dry-run"},listings=${listings},places=${places}`);
