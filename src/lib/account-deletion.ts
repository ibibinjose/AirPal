import { doc, getDoc, setDoc, type Firestore } from "firebase/firestore";

/**
 * Records the audit marker for an account-deletion request (`requested`).
 * The marker must be written before the Auth user is deleted — after that
 * there is no signed-in user left to write it.
 *
 * Retry-safe: a failed delete (e.g. stale session needing a fresh sign-in)
 * leaves the marker behind, and `firestore.rules` only lets the owner
 * *create* it — a second `setDoc` would be an update and get denied with
 * "Missing or insufficient permissions", wedging the account. So the write
 * is skipped when the marker already exists (`get` is owner-allowed).
 *
 * Returns `"created"` when the marker was written, `"exists"` when it was
 * already there. A failed read is treated as absent so an offline or
 * denied read still attempts the create, preserving the old behavior.
 */
export async function ensureAccountDeletionMarker(
  db: Firestore,
  uid: string,
  contact: { email: string; phone: string },
): Promise<"created" | "exists"> {
  const marker = doc(db, "account_deletions", uid);
  let exists = false;
  try {
    exists = (await getDoc(marker)).exists();
  } catch {
    exists = false;
  }
  if (exists) return "exists";
  await setDoc(marker, {
    uid,
    email: contact.email,
    phone: contact.phone,
    requestedAt: new Date().toISOString(),
    status: "requested",
  });
  return "created";
}
