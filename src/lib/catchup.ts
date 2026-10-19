import { collection, deleteDoc, doc, onSnapshot, query, setDoc, updateDoc, where } from "firebase/firestore";
import type { CatchUpSlot } from "@shared/catchup-agent";
import { getFirebaseDb, isFirebaseConfigured } from "./firebase";
import { safeLocalStorage } from "./safe-storage";

/** Catch-up proposal kinds. Free-form strings stay valid for legacy rows. */
export type CatchUpType = "catchup" | "meeting" | "nightout" | "casual" | string;

export interface CatchUpItem {
  id: string;
  targetHandle: string;
  targetOwnerUid?: string;
  requesterUid?: string;
  requesterHandle?: string;
  requesterName: string;
  requesterPhoto?: string;
  type: CatchUpType;
  date?: string;
  time?: string;
  durationMinutes?: number;
  activity?: string;
  venue?: string;
  meetingLink?: string;
  meetingPlatform?: "in_person" | "google_meet" | "facetime" | "zoom";
  notes?: string;
  proposals?: CatchUpSlot[];
  conversationId?: string;
  createdAt: string;
  isReminderOnly?: boolean;
  status: "pending" | "accepted" | "scheduled" | "dismissed";
}

/** Legacy device-local key — read once to migrate, never written again. */
const LEGACY_STORAGE_KEY = "airpal:catchups:v1";
const MIGRATED_FLAG_KEY = "airpal:catchups:migrated:v2";

/** In-memory mirror of remote (and offline fallback when Firebase is off). */
let memory: CatchUpItem[] = [];
const migratedUids = new Set<string>();

function omitUndefined<T extends Record<string, unknown>>(row: T): T {
  return Object.fromEntries(Object.entries(row).filter(([, v]) => v !== undefined)) as T;
}

function normalizeHandle(handle: string): string {
  return handle.trim().replace(/^@/, "").toLowerCase();
}

function readLegacyLocal(): CatchUpItem[] {
  try {
    const raw = safeLocalStorage()?.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CatchUpItem[]) : [];
  } catch {
    return [];
  }
}

function clearLegacyLocal(): void {
  try {
    safeLocalStorage()?.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    /* private browsing */
  }
}

function upsertMemory(item: CatchUpItem): void {
  const idx = memory.findIndex((row) => row.id === item.id);
  if (idx >= 0) {
    memory = [...memory.slice(0, idx), item, ...memory.slice(idx + 1)];
  } else {
    memory = [item, ...memory];
  }
}

function removeFromMemory(id: string): void {
  memory = memory.filter((item) => item.id !== id);
}

function mergeRemoteForRequester(uid: string, rows: CatchUpItem[]): void {
  memory = [...memory.filter((item) => item.requesterUid !== uid), ...rows];
}

function mergeRemoteForOwner(ownerUid: string, rows: CatchUpItem[]): void {
  memory = [...memory.filter((item) => item.targetOwnerUid !== ownerUid), ...rows];
}

export async function persistCatchUp(item: CatchUpItem): Promise<void> {
  if (!isFirebaseConfigured || !item.requesterUid) return;
  const db = getFirebaseDb();
  if (!db) return;
  await setDoc(doc(db, "catchups", item.id), omitUndefined(item as unknown as Record<string, unknown>), {
    merge: true,
  });
}

function syncRemote(item: CatchUpItem): void {
  void persistCatchUp(item).catch(() => undefined);
}

/**
 * One-shot: push legacy localStorage rows that belong to this uid into Firestore,
 * then drop the device-local store so conflict checks are no longer per-browser.
 */
function migrateLegacyForUid(uid: string): void {
  if (!uid || migratedUids.has(uid)) return;
  migratedUids.add(uid);
  try {
    if (safeLocalStorage()?.getItem(`${MIGRATED_FLAG_KEY}:${uid}`) === "1") return;
  } catch {
    /* continue */
  }

  const legacy = readLegacyLocal();
  if (legacy.length === 0) {
    try {
      safeLocalStorage()?.setItem(`${MIGRATED_FLAG_KEY}:${uid}`, "1");
    } catch {
      /* ignore */
    }
    return;
  }

  for (const row of legacy) {
    const belongs = row.requesterUid === uid || (!row.requesterUid && Boolean(row.isReminderOnly));
    if (!belongs) continue;
    const item: CatchUpItem = {
      ...row,
      requesterUid: row.requesterUid || uid,
      targetHandle: normalizeHandle(row.targetHandle),
    };
    upsertMemory(item);
    syncRemote(item);
  }

  clearLegacyLocal();
  try {
    safeLocalStorage()?.setItem(`${MIGRATED_FLAG_KEY}:${uid}`, "1");
  } catch {
    /* ignore */
  }
}

/** Sync snapshot of the in-memory mirror (tests / offline). Prefer subscribe* for live UI. */
export function listCatchUps(): CatchUpItem[] {
  return memory;
}

/** Incoming proposals for a public bio (owner inbox). */
export function listCatchUpsForHandle(targetHandle: string): CatchUpItem[] {
  const norm = normalizeHandle(targetHandle);
  return listCatchUps().filter((item) => normalizeHandle(item.targetHandle) === norm && item.status !== "dismissed");
}

export function hasCatchUpReminder(targetHandle: string): boolean {
  const norm = normalizeHandle(targetHandle);
  return listCatchUps().some(
    (item) =>
      normalizeHandle(item.targetHandle) === norm && Boolean(item.isReminderOnly) && item.status !== "dismissed",
  );
}

export function toggleCatchUpReminder(target: {
  handle: string;
  name: string;
  photo?: string;
  city?: string;
  /** Required for Firestore create rules; memory-only when omitted (tests / offline). */
  requesterUid?: string;
}): boolean {
  const items = listCatchUps();
  const norm = normalizeHandle(target.handle);
  const existingIdx = items.findIndex(
    (i) =>
      normalizeHandle(i.targetHandle) === norm &&
      Boolean(i.isReminderOnly) &&
      i.status !== "dismissed" &&
      (!target.requesterUid || !i.requesterUid || i.requesterUid === target.requesterUid),
  );

  if (existingIdx >= 0) {
    const existing = items[existingIdx]!;
    removeFromMemory(existing.id);
    if (isFirebaseConfigured && existing.requesterUid) {
      const db = getFirebaseDb();
      if (db) void deleteDoc(doc(db, "catchups", existing.id)).catch(() => undefined);
    }
    return false;
  }

  const newItem: CatchUpItem = {
    id: `cup-${Date.now()}-${Math.floor(Math.random() * 1e4)}`,
    targetHandle: norm,
    requesterUid: target.requesterUid,
    requesterName: target.name,
    requesterPhoto: target.photo,
    venue: target.city,
    type: "catchup",
    isReminderOnly: true,
    createdAt: new Date().toISOString(),
    status: "pending",
  };

  upsertMemory(newItem);
  syncRemote(newItem);
  return true;
}

export function recordCatchUpInterest(input: {
  targetHandle: string;
  targetOwnerUid?: string;
  requesterUid?: string;
  requesterHandle?: string;
  requesterName: string;
  requesterPhoto?: string;
  type?: CatchUpType;
  date?: string;
  time?: string;
  durationMinutes?: number;
  activity?: string;
  venue?: string;
  meetingLink?: string;
  meetingPlatform?: "in_person" | "google_meet" | "facetime" | "zoom";
  notes?: string;
}): CatchUpItem {
  const norm = normalizeHandle(input.targetHandle);

  const item: CatchUpItem = {
    id: `cup-${Date.now()}-${Math.floor(Math.random() * 1e4)}`,
    targetHandle: norm,
    targetOwnerUid: input.targetOwnerUid,
    requesterUid: input.requesterUid,
    requesterHandle: input.requesterHandle ? normalizeHandle(input.requesterHandle) : undefined,
    requesterName: input.requesterName.trim(),
    requesterPhoto: input.requesterPhoto,
    type: input.type || "catchup",
    date: input.date,
    time: input.time,
    durationMinutes: input.durationMinutes || 45,
    activity: input.activity,
    venue: input.venue,
    meetingLink: input.meetingLink,
    meetingPlatform: input.meetingPlatform,
    notes: input.notes,
    createdAt: new Date().toISOString(),
    isReminderOnly: false,
    status: "pending",
  };

  upsertMemory(item);
  syncRemote(item);
  return item;
}

/** Live proposals where this account is the requester (for conflict checks + reminders). */
export function subscribeMyCatchUps(uid: string, onRows: (rows: CatchUpItem[]) => void): () => void {
  if (!uid) {
    onRows([]);
    return () => undefined;
  }

  migrateLegacyForUid(uid);

  if (!isFirebaseConfigured) {
    onRows(listCatchUps().filter((i) => i.requesterUid === uid && i.status !== "dismissed"));
    return () => undefined;
  }

  const db = getFirebaseDb();
  if (!db) {
    onRows(listCatchUps().filter((i) => i.requesterUid === uid && i.status !== "dismissed"));
    return () => undefined;
  }

  const q = query(collection(db, "catchups"), where("requesterUid", "==", uid));
  return onSnapshot(
    q,
    (snap) => {
      const rows = snap.docs.map((d) => {
        const data = d.data() as CatchUpItem;
        return { ...data, id: data.id || d.id };
      });
      mergeRemoteForRequester(uid, rows);
      onRows(rows.filter((i) => i.status !== "dismissed"));
    },
    () => {
      onRows(listCatchUps().filter((i) => i.requesterUid === uid && i.status !== "dismissed"));
    },
  );
}

export function subscribeCatchUpsForOwner(ownerUid: string, onRows: (rows: CatchUpItem[]) => void): () => void {
  if (!ownerUid) {
    onRows([]);
    return () => undefined;
  }

  if (!isFirebaseConfigured) {
    onRows(listCatchUps().filter((i) => i.targetOwnerUid === ownerUid && i.status !== "dismissed"));
    return () => undefined;
  }

  const db = getFirebaseDb();
  if (!db) {
    onRows([]);
    return () => undefined;
  }

  const q = query(collection(db, "catchups"), where("targetOwnerUid", "==", ownerUid));
  return onSnapshot(
    q,
    (snap) => {
      const rows = snap.docs.map((d) => {
        const data = d.data() as CatchUpItem;
        return { ...data, id: data.id || d.id };
      });
      mergeRemoteForOwner(ownerUid, rows);
      onRows(rows.filter((i) => i.status !== "dismissed"));
    },
    () => onRows(listCatchUps().filter((i) => i.targetOwnerUid === ownerUid && i.status !== "dismissed")),
  );
}

export function updateCatchUpStatus(id: string, status: "pending" | "accepted" | "scheduled" | "dismissed"): void {
  const existing = listCatchUps().find((item) => item.id === id);
  const next = existing ? { ...existing, status } : undefined;
  if (next) upsertMemory(next);
  else {
    memory = listCatchUps().map((item) => (item.id === id ? { ...item, status } : item));
  }
  if (!isFirebaseConfigured) return;
  const db = getFirebaseDb();
  if (!db) return;
  void updateDoc(doc(db, "catchups", id), { status }).catch(() => undefined);
}

/** Permanently delete or withdraw a catch-up proposal */
export async function deleteCatchUp(id: string): Promise<void> {
  removeFromMemory(id);
  if (!isFirebaseConfigured) return;
  const db = getFirebaseDb();
  if (!db) return;
  try {
    await deleteDoc(doc(db, "catchups", id));
  } catch {
    /* offline or denied */
  }
}

export interface TimeConflict {
  hasConflict: boolean;
  conflictingTitle?: string;
  conflictingTime?: string;
  conflictingType?: string;
}

/** Check if a date & time slot conflicts with existing catch-ups or scheduled meetups (+/- 60 mins or duration) */
export function checkTimeConflict(
  date: string,
  time: string,
  existingPlans: Array<{ date: string; time?: string; title: string; type?: string; durationMinutes?: number }> = [],
  existingCatchups: CatchUpItem[] = [],
  durationMinutes = 60,
): TimeConflict {
  if (!date || !time) return { hasConflict: false };

  const [th, tm] = time.split(":").map(Number);
  const targetMinutes = (th || 0) * 60 + (tm || 0);
  const targetEnd = targetMinutes + Math.max(15, durationMinutes);

  for (const p of existingPlans) {
    if (p.date === date && p.time) {
      const [ph, pm] = p.time.split(":").map(Number);
      const planMinutes = (ph || 0) * 60 + (pm || 0);
      const planDuration = p.durationMinutes || 60;
      const planEnd = planMinutes + planDuration;
      // Overlap if targetMinutes < planEnd and planMinutes < targetEnd
      if (targetMinutes < planEnd && planMinutes < targetEnd) {
        return {
          hasConflict: true,
          conflictingTitle: p.title,
          conflictingTime: p.time,
          conflictingType: p.type || "catchup",
        };
      }
    }
  }

  for (const c of existingCatchups) {
    if (c.date && c.time && c.status !== "dismissed" && !c.isReminderOnly) {
      if (c.date !== date) continue;
      const [ch, cm] = c.time.split(":").map(Number);
      const catchupMinutes = (ch || 0) * 60 + (cm || 0);
      const catchupDuration = c.durationMinutes || 60;
      const catchupEnd = catchupMinutes + catchupDuration;
      if (targetMinutes < catchupEnd && catchupMinutes < targetEnd) {
        return {
          hasConflict: true,
          conflictingTitle: `Meetup with ${c.requesterName}`,
          conflictingTime: c.time,
          conflictingType: c.type,
        };
      }
    }
  }

  return { hasConflict: false };
}

/** Formats a clean human-readable title and vibe for catch-ups */
export function formatCatchUpSummary(item: CatchUpItem): string {
  const typeLabel =
    item.type === "meeting"
      ? "Meeting"
      : item.type === "nightout"
        ? item.activity
          ? `Hangout (${item.activity})`
          : "Hangout"
        : "Catch Up";
  const durationLabel = item.durationMinutes ? ` · ${item.durationMinutes}m` : "";
  return `${typeLabel} with ${item.requesterName}${durationLabel}`;
}

/** Formats start and estimated end time range (e.g. "14:00 – 14:45") */
export function formatCatchUpTimeRange(time?: string, durationMinutes = 45): string {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  if (isNaN(h!) || isNaN(m!)) return time;
  const startMins = h! * 60 + m!;
  const endMins = startMins + durationMinutes;
  const endH = Math.floor(endMins / 60) % 24;
  const endM = endMins % 60;
  const formatTime = (hour: number, min: number) => {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${pad(hour)}:${pad(min)}`;
  };
  return `${time} – ${formatTime(endH, endM)} (${durationMinutes}m)`;
}

/** Test helper — clear the in-memory mirror between cases. */
export function __resetCatchUpMemoryForTests(): void {
  memory = [];
  migratedUids.clear();
}
