import { createContext, useCallback, useContext, useEffect, type ReactNode } from "react";
import { translate, type Lang } from "@/lib/i18n";

const KEY = "airpal.lang";

type LocaleValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string) => string;
};

const LocaleContext = createContext<LocaleValue | undefined>(undefined);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const lang: Lang = "en";

  useEffect(() => {
    document.documentElement.lang = "en";
    try {
      localStorage.setItem(KEY, "en");
    } catch {
      /* ignore */
    }
  }, []);

  const setLang = useCallback(() => {
    try {
      localStorage.setItem(KEY, "en");
    } catch {
      /* ignore */
    }
  }, []);

  const t = useCallback((key: string) => translate("en", key), []);

  return <LocaleContext.Provider value={{ lang, setLang, t }}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale");
  return ctx;
}
