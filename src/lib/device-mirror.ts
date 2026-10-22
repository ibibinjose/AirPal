import { doc, getDoc, setDoc } from "firebase/firestore";
import { getFirebaseDb } from "./firebase";
import { replaceMemories, setMemoriesAccount, setMemoriesPersistHook, type Memory } from "./memories";
import { replacePeople, setPeopleAccount, setPeoplePersistHook, type PersonMet } from "./people";

/**
 * Firebase source of truth for the private people and memories lists.
 * LocalStorage is an account-scoped read cache; writes wait for Firestore.
 */

type MirrorDoc = {
  people?: PersonMet[];
  memories?: Memory[];
  updatedAt?: string;
};

let activeUid: string | null = null;
let readyUid: string | null = null;
let readiness: { uid: string; promise: Promise<void>; resolve: () => void } | null = null;

function sanitize<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function mirrorRef(uid: string) {
  const db = getFirebaseDb();
  if (!db) throw new Error("Firestore is not configured.");
  return doc(db, "users", uid, "device", "mirror");
}

export function wireAutoPush(uid: string | null): void {
  readiness?.resolve();
  activeUid = uid;
  readyUid = null;
  if (uid) {
    let resolveReady!: () => void;
    const promise = new Promise<void>((resolve) => {
      resolveReady = resolve;
    });
    readiness = { uid, promise, resolve: resolveReady };
  } else {
    readiness = null;
  }
  setPeopleAccount(uid);
  setMemoriesAccount(uid);
  const persist = async (patch: Pick<MirrorDoc, "people" | "memories">) => {
    const currentReadiness = readiness;
    if (currentReadiness?.uid === uid) await currentReadiness.promise;
    if (uid && activeUid === uid && readyUid !== uid) {
      await pullDeviceMirror(uid);
    }
    if (!uid || activeUid !== uid || readyUid !== uid) {
      throw new Error("Your saved people and memories are still loading. Try again shortly.");
    }
    await pushDeviceMirror(uid, patch);
  };
  setPeoplePersistHook(uid ? (people) => persist({ people }) : null);
  setMemoriesPersistHook(uid ? (memories) => persist({ memories }) : null);
  if (typeof window !== "undefined") window.dispatchEvent(new Event("airpal:device-data-updated"));
}

/** Persist an account-owned list; callers only update their cache after this succeeds. */
export async function pushDeviceMirror(uid: string, patch: Pick<MirrorDoc, "people" | "memories">): Promise<void> {
  await setDoc(mirrorRef(uid), sanitize({ ...patch, updatedAt: new Date().toISOString() }), { merge: true });
}

/** Load the authenticated account data without uploading unscoped device-local records. */
export async function pullDeviceMirror(uid: string): Promise<void> {
  try {
    const snap = await getDoc(mirrorRef(uid));
    if (activeUid !== uid) return;
    const remote = (snap.exists() ? (snap.data() as MirrorDoc) : {}) || {};
    replacePeople(Array.isArray(remote.people) ? remote.people : []);
    replaceMemories(Array.isArray(remote.memories) ? remote.memories : []);
    readyUid = uid;
  } finally {
    if (readiness?.uid === uid) {
      readiness.resolve();
    }
  }
}
