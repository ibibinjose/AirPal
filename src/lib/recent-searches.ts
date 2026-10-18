import { isValidSearchQuery } from "./search-query";

const RECENT_KEY = "airpal.recentSearches.v1";
const RECENT_MAX = 5;

export type RecentItem = { title: string; href: string };

function storage(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

function isClean(item: RecentItem): boolean {
  return (
    Boolean(item) &&
    typeof item.title === "string" &&
    typeof item.href === "string" &&
    isValidSearchQuery(item.title) &&
    !item.href.includes("/Users/") &&
    !item.href.includes("node_modules") &&
    !item.href.startsWith("file:")
  );
}

export function loadRecent(): RecentItem[] {
  const store = storage();
  if (!store) return [];
  try {
    const raw = store.getItem(RECENT_KEY);
    const parsed = raw ? (JSON.parse(raw) as RecentItem[]) : [];
    if (!Array.isArray(parsed)) return [];
    // Sanitize: filter out any items that contain file paths, node_modules, or invalid search queries
    const valid = parsed.filter(isClean);
    if (valid.length !== parsed.length) {
      store.setItem(RECENT_KEY, JSON.stringify(valid));
    }
    return valid.slice(0, RECENT_MAX);
  } catch {
    return [];
  }
}

export function saveRecent(item: RecentItem) {
  const store = storage();
  if (!store || !isClean(item)) return;
  try {
    const next = [item, ...loadRecent().filter((r) => r.href !== item.href)].slice(0, RECENT_MAX);
    store.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}
