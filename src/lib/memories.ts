import { safeLocalStorage } from "./safe-storage";

export type Memory = {
  id: string;
  /** Photo src: authenticated Firebase Storage path or a legacy device-cache id. */
  src: string;
  caption?: string;
  /** Free-text names / @handles of people in the shot. */
  people: string[];
  place?: string;
  takenAt: string;
};

const KEY = "airpal:memories:v2";
let accountUid: string | null = null;
let persistHook: ((memories: Memory[]) => Promise<void>) | null = null;

function storageKey(): string {
  return `${KEY}:${accountUid || "guest"}`;
}

export function setMemoriesAccount(uid: string | null): void {
  accountUid = uid;
}

function clean(row: unknown): Memory | null {
  if (!row || typeof row !== "object") return null;
  const r = row as Partial<Memory>;
  if (typeof r.src !== "string" || !r.src) return null;
  const people = Array.isArray(r.people)
    ? r.people.filter((p): p is string => typeof p === "string" && p.trim().length > 0).map((p) => p.trim())
    : [];
  return {
    id: typeof r.id === "string" && r.id ? r.id : `m-${Date.now()}`,
    src: r.src,
    caption: typeof r.caption === "string" && r.caption.trim() ? r.caption.trim() : undefined,
    people,
    place: typeof r.place === "string" && r.place.trim() ? r.place.trim() : undefined,
    takenAt: typeof r.takenAt === "string" && r.takenAt ? r.takenAt : new Date().toISOString(),
  };
}

export function listMemories(): Memory[] {
  try {
    const raw = safeLocalStorage()?.getItem(storageKey());
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(clean).filter((m): m is Memory => m !== null);
  } catch {
    return [];
  }
}

/** Installs the authenticated server writer used by user-initiated changes. */
export function setMemoriesPersistHook(fn: ((memories: Memory[]) => Promise<void>) | null): void {
  persistHook = fn;
}

async function persist(memories: Memory[]): Promise<void> {
  if (!accountUid || !persistHook) throw new Error("Sign in to save memories to your AirPal account.");
  if (memories.some((memory) => memory.src.startsWith("idb:"))) {
    throw new Error("This photo is only on this device. Upload it again to save it to your account.");
  }
  await persistHook(memories);
  try {
    safeLocalStorage()?.setItem(storageKey(), JSON.stringify(memories));
  } catch {
    // The server write is authoritative; this is only a device cache.
  }
  if (typeof window !== "undefined") window.dispatchEvent(new Event("airpal:device-data-updated"));
}

function newMemoryId(): string {
  try {
    return `m-${crypto.randomUUID()}`;
  } catch {
    return `m-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  }
}

export async function addMemory(input: Omit<Memory, "id" | "takenAt"> & { takenAt?: string }): Promise<Memory> {
  const row: Memory = {
    id: newMemoryId(),
    src: input.src,
    caption: input.caption?.trim() || undefined,
    people: (input.people || []).map((p) => p.trim()).filter(Boolean),
    place: input.place?.trim() || undefined,
    takenAt: input.takenAt || new Date().toISOString(),
  };
  await persist([row, ...listMemories()]);
  return row;
}

export async function updateMemory(
  id: string,
  patch: Partial<Pick<Memory, "caption" | "people" | "place">>,
): Promise<Memory | null> {
  const memories = listMemories();
  const idx = memories.findIndex((m) => m.id === id);
  if (idx < 0) return null;
  const next: Memory = {
    ...memories[idx],
    caption: patch.caption !== undefined ? patch.caption.trim() || undefined : memories[idx].caption,
    people: patch.people !== undefined ? patch.people.map((p) => p.trim()).filter(Boolean) : memories[idx].people,
    place: patch.place !== undefined ? patch.place.trim() || undefined : memories[idx].place,
  };
  memories[idx] = next;
  await persist(memories);
  return next;
}

/** Replace the cache from the authenticated Firebase mirror. */
export function replaceMemories(rows: Memory[]): void {
  const memories = rows
    .map(clean)
    .filter((r): r is Memory => r !== null)
    .filter((r, i, all) => all.findIndex((o) => o.id === r.id) === i);
  try {
    safeLocalStorage()?.setItem(storageKey(), JSON.stringify(memories));
  } catch {
    // The cache is optional.
  }
  if (typeof window !== "undefined") window.dispatchEvent(new Event("airpal:device-data-updated"));
}

export async function removeMemory(id: string): Promise<void> {
  await persist(listMemories().filter((m) => m.id !== id));
}

function personKey(value: string): string {
  return value.trim().toLowerCase().replace(/^@/, "");
}

export function memoriesWithPerson(memories: Memory[], personId: string): Memory[] {
  const needle = personKey(personId);
  if (!needle) return [];
  return memories.filter((m) => m.people.some((p) => personKey(p) === needle));
}
