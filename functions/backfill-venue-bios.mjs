// Backfill A — create the missing venue (business) bio for active listings.
//
// Run from functions/ so firebase-admin resolves from functions/node_modules:
//   node backfill-venue-bios.mjs            (dry run, default)
//   node backfill-venue-bios.mjs --apply    (write)
//
// Reads all listings with status == "active" (skips demo docs). For each
// listing whose owner has no kind == "business" profile, creates
// handles/{handle} + profiles/{bio-...} with the listing's own data, using
// the listing's stored handle when valid, else the handle derived from its
// place id (same derivation as the client: handleFromPlaceId). Existing
// URLs keep working. Idempotent: re-running changes nothing.
//
// Second pass: stamps kind == "business" onto existing profiles that have a
// listingId or placeId but no kind (created before the kind field existed).
// Third pass fills an empty About from the listing description.
//

// Requires GOOGLE_APPLICATION_CREDENTIALS (or gcloud ADC) for project
// airpalme-app. Take a Firestore export / point-in-time snapshot before
// --apply. Run only after the Bug 3 hotfix is live.

import { randomBytes } from "node:crypto";
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

const PROJECT_ID = "airpalme-app";
const apply = process.argv.includes("--apply");

initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID });
const db = getFirestore();

function deriveHandle(placeId) {
  return String(placeId || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._]/g, "");
}

function handleOk(h) {
  return typeof h === "string" && h.length >= 3 && h.length <= 30 && /^[a-z0-9._]+$/.test(h);
}

function row(...cols) {
  console.log(cols.map((c) => String(c ?? "")).join(","));
}

async function main() {
  console.log(`mode,${apply ? "APPLY" : "dry-run"}`);
  const created = [];
  const skipped = [];
  const conflicts = [];

  const listings = await db.collection("listings").where("status", "==", "active").get();
  for (const doc of listings.docs) {
    const l = doc.data();
    if (l.demo === true || !l.ownerUid) {
      skipped.push([doc.id, "no-owner-or-demo"]);
      continue;
    }
    const placeId = l.placeId || doc.id.replace(/^list-/, "pl-");
    const stored = typeof l.handle === "string" ? l.handle.trim().toLowerCase() : "";
    const derived = deriveHandle(placeId);
    const handle = handleOk(stored) ? stored : handleOk(derived) ? derived : null;
    if (!handle) {
      skipped.push([doc.id, "bad-handle"]);
      continue;
    }
    const biz = await db
      .collection("profiles")
      .where("ownerUid", "==", l.ownerUid)
      .where("kind", "==", "business")
      .limit(1)
      .get();
    if (!biz.empty) {
      skipped.push([doc.id, "has-business-bio"]);
      continue;
    }
    const existingHandle = await db.collection("handles").doc(handle).get();
    if (existingHandle.exists && existingHandle.data().ownerUid !== l.ownerUid) {
      conflicts.push([doc.id, handle]);
      continue;
    }
    const profileId = existingHandle.exists ? existingHandle.data().profileId : `bio-${randomBytes(4).toString("hex")}`;
    row(apply ? "create" : "would-create", handle, profileId, doc.id, l.ownerUid);
    created.push([handle, profileId, doc.id]);
    if (!apply) continue;
    const batch = db.batch();
    batch.set(db.collection("handles").doc(handle), { handle, profileId, ownerUid: l.ownerUid }, { merge: true });
    batch.set(
      db.collection("profiles").doc(profileId),
      {
        id: profileId,
        handle,
        kind: "business",
        ownerUid: l.ownerUid,
        ownerEmail: l.ownerEmail || null,
        name: l.name,
        shortWhy: l.shortWhy || "",
        city: "Sydney",
        category: l.category || "eat",
        hours: l.hours || "See bio",
        openNow: true,
        phone: l.phone || null,
        geo: l.geo || null,
        cover: l.heroImage || null,
        avatar: l.heroImage || null,
        listingId: doc.id,
        placeId,
        mapsPlaceId: l.mapsPlaceId || null,
        links: [],
        products: [],
        services: [],
        deals: [],
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    await batch.commit();
  }

  // Second pass: kind-less legacy profiles that belong to a listing/place.
  const kindless = await db
    .collection("profiles")
    .where("kind", "==", null)
    .get()
    .catch(() => null);
  let stamped = 0;
  if (kindless) {
    for (const doc of kindless.docs) {
      const p = doc.data();
      if (!p || (!p.listingId && !p.placeId)) continue;
      row(apply ? "stamp-kind" : "would-stamp-kind", p.handle, doc.id);
      if (!apply) continue;
      await db.collection("profiles").doc(doc.id).set({ kind: "business" }, { merge: true });
      stamped += 1;
    }
  }

  // Third pass: business bios with an empty About get the listing's
  // description (one-click creation fills this for new bios; this covers
  // bios created before that fix). Never overwrites a bio that has text.
  const bizAll = await db.collection("profiles").where("kind", "==", "business").get();
  let aboutFilled = 0;
  for (const doc of bizAll.docs) {
    const p = doc.data();
    if (!p || (p.aboutText && String(p.aboutText).trim()) || !p.listingId) continue;
    const listing = await db.collection("listings").doc(p.listingId).get();
    const description = listing.exists ? String(listing.data()?.description || "").trim() : "";
    if (!description) continue;
    row(apply ? "fill-about" : "would-fill-about", p.handle, doc.id);
    if (!apply) continue;
    await db.collection("profiles").doc(doc.id).set({ aboutText: description }, { merge: true });
    aboutFilled += 1;
  }

  console.log(
    `summary,created=${created.length},skipped=${skipped.length},conflicts=${conflicts.length},stamped=${stamped},aboutFilled=${aboutFilled}`,
  );
  for (const [id, reason] of skipped) console.log(`skipped,${id},${reason}`);
  for (const [id, handle] of conflicts) console.log(`CONFLICT,${id},${handle},needs-human`);
}

await main();
