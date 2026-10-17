export type ThemeMode = "system" | "light" | "dark";

const THEME_STORAGE_KEY = "airpal_theme";

export function getThemePreference(): ThemeMode {
  if (typeof window === "undefined") return "system";
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === "light" || saved === "dark" || saved === "system") {
      return saved;
    }
  } catch {
    /* fallback */
  }
  return "system";
}

const META_THEMES: Record<"light" | "dark", string> = {
  light: "#f4f2e9",
  dark: "#0e0f0c",
};

function syncMetaThemeColor(mode: ThemeMode): void {
  if (typeof document === "undefined") return;
  const head = document.head;
  head.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.remove());
  const wants: Array<{ content: string; media?: string }> =
    mode === "system"
      ? [
          { content: META_THEMES.dark, media: "(prefers-color-scheme: dark)" },
          { content: META_THEMES.light, media: "(prefers-color-scheme: light)" },
        ]
      : [{ content: META_THEMES[mode] }];
  for (const t of wants) {
    const meta = document.createElement("meta");
    meta.setAttribute("name", "theme-color");
    meta.setAttribute("content", t.content);
    if (t.media) meta.setAttribute("media", t.media);
    head.appendChild(meta);
  }
}

function applyTheme(mode: ThemeMode): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (mode === "dark") {
    root.classList.add("dark");
    root.classList.remove("light");
    root.setAttribute("data-theme", "dark");
  } else if (mode === "light") {
    root.classList.add("light");
    root.classList.remove("dark");
    root.setAttribute("data-theme", "light");
  } else {
    root.classList.remove("dark", "light");
    root.removeAttribute("data-theme");
  }
  syncMetaThemeColor(mode);
}

export function setThemePreference(mode: ThemeMode): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
  applyTheme(mode);
}

export function initTheme(): void {
  applyTheme(getThemePreference());
}
