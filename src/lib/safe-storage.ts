/** Null-safe web storage accessors. Never throws (SSR / private-mode safe). */

const memoryStore = new Map<string, string>();

export function safeLocalStorage(): Storage | null {
  try {
    return typeof localStorage !== "undefined" ? localStorage : null;
  } catch {
    return null;
  }
}

export function safeSessionStorage(): Storage | null {
  try {
    return typeof sessionStorage !== "undefined" ? sessionStorage : null;
  } catch {
    return null;
  }
}

export function safeGetItem(key: string): string | null {
  try {
    const storage = safeLocalStorage();
    if (storage) return storage.getItem(key);
    return memoryStore.get(key) ?? null;
  } catch {
    return memoryStore.get(key) ?? null;
  }
}

export function safeSetItem(key: string, value: string): boolean {
  try {
    const storage = safeLocalStorage();
    if (storage) {
      storage.setItem(key, value);
      return true;
    }
    memoryStore.set(key, value);
    return true;
  } catch {
    memoryStore.set(key, value);
    return false;
  }
}

export function safeRemoveItem(key: string): boolean {
  try {
    const storage = safeLocalStorage();
    if (storage) {
      storage.removeItem(key);
      memoryStore.delete(key);
      return true;
    }
    memoryStore.delete(key);
    return true;
  } catch {
    memoryStore.delete(key);
    return false;
  }
}

export function safeGetJSON<T>(key: string, fallback: T): T {
  try {
    const raw = safeGetItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as T;
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

export function safeSetJSON<T>(key: string, value: T): boolean {
  try {
    return safeSetItem(key, JSON.stringify(value));
  } catch {
    return false;
  }
}
