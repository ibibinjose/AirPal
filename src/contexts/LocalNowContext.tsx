import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Geo } from "@shared/nearby";
import { PRECINCT_META } from "@/lib/cities";
import { DEFAULT_TZ, deviceTimeZone, formatLocalDay, formatLocalTime, toZonedDateStr } from "@/lib/local-time";
import { loadLocalWeather, type LocalWeather, type WeatherOrigin } from "@/lib/weather";
import { queryGeoPermission, requestDeviceGeo, watchDeviceGeo } from "@/lib/geo-locate";
import { geoDrifted } from "@/lib/weather";
import {
  loadLastGps,
  loadLocationChoice,
  loadShareLocation,
  saveLastGps,
  saveLocationChoice,
  saveShareLocation,
  type LocationChoice,
} from "@/lib/location-pref";
import { useOptionalBattery } from "@/hooks/useBattery";

export type LocalNowValue = {
  now: Date;
  timeZone: string;
  today: string;
  time: string;
  day: string;
  city: string;
  /** True when here is the device GPS, not The Rocks / a chosen city. */
  usingGps: boolean;
  /** True when the browser reports geolocation denied (auto-blocked or refused). */
  geoBlocked: boolean;
  /** Physical / GPS-or-fallback point for weather, time, and Discover. */
  here: Geo;
  /** Physical anchor point for weather and Discover; same as here. */
  anchor: Geo;
  source: WeatherOrigin["source"];
  weather: LocalWeather | null;
  loading: boolean;
  failed: boolean;
  choice: LocationChoice;
  shareLocation: boolean;
  chooseLocation: (choice: LocationChoice) => void;
  setShareLocation: (on: boolean) => void;
  refresh: () => void;
};

const LocalNowContext = createContext<LocalNowValue | undefined>(undefined);

export function LocalNowProvider({ children }: { children: ReactNode }) {
  const [choice, setChoice] = useState<LocationChoice>(() => loadLocationChoice());
  const [shareLocation, setShareLocationState] = useState(() => loadShareLocation());
  const [now, setNow] = useState(() => new Date());
  const [deviceGeo, setDeviceGeo] = useState<Geo | null>(null);
  const [geoBlocked, setGeoBlocked] = useState(false);
  const [weather, setWeather] = useState<LocalWeather | null>(null);
  const [failed, setFailed] = useState(false);

  const fallback = useMemo<WeatherOrigin>(() => {
    const last = loadLastGps();
    if (last) {
      return { lat: last.lat, lng: last.lng, source: "gps", city: last.city || "" };
    }
    return { lat: PRECINCT_META.geo.lat, lng: PRECINCT_META.geo.lng, source: "precinct", city: "" };
  }, []);

  const preferred = useMemo<WeatherOrigin>(() => {
    if (choice.mode === "city") return { lat: choice.lat, lng: choice.lng, source: "city", city: choice.city };
    if (choice.mode === "gps" && deviceGeo) return { ...deviceGeo, source: "gps" };
    return fallback;
  }, [choice, deviceGeo, fallback]);

  const battery = useOptionalBattery();
  const powerSave = Boolean(battery?.powerSaveActive);

  useEffect(() => {
    const intervalMs = powerSave ? 60_000 : 15_000;
    const id = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(id);
  }, [powerSave]);

  const load = useCallback(async (origin: WeatherOrigin) => {
    try {
      const data = await loadLocalWeather(origin);
      setWeather(data);
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    void load(preferred);
  }, [load, preferred]);

  useEffect(() => {
    if (choice.mode === "city") return;
    let alive = true;
    let stop: (() => void) | undefined;
    // Never re-prompt a denied permission: Chrome auto-blocks geolocation
    // after repeated dismissals, recoverable only via site settings.
    void queryGeoPermission().then((state) => {
      if (!alive) return;
      if (state === "denied") {
        setGeoBlocked(true);
        return;
      }
      setGeoBlocked(false);
      void requestDeviceGeo({ highAccuracy: choice.mode === "gps" }).then((geo) => {
        if (!alive || !geo) return;
        setDeviceGeo(geo);
        saveLastGps(geo);
        void load({ ...geo, source: "gps" });
      });
      stop = watchDeviceGeo((geo) => {
        if (!alive) return;
        setDeviceGeo((prev) => {
          if (prev && !geoDrifted(prev, geo, 250)) return prev;
          saveLastGps(geo);
          void load({ ...geo, source: "gps" });
          return geo;
        });
      });
    });
    return () => {
      alive = false;
      stop?.();
    };
  }, [choice.mode, load]);

  const chooseLocation = useCallback(
    (next: LocationChoice) => {
      saveLocationChoice(next);
      setChoice(next);
      if (next.mode === "gps" || next.mode === "auto") {
        void queryGeoPermission().then((state) => {
          if (state === "denied") {
            setGeoBlocked(true);
            return;
          }
          setGeoBlocked(false);
          void requestDeviceGeo({ highAccuracy: true }).then((geo) => {
            if (!geo) return;
            setDeviceGeo(geo);
            saveLastGps(geo);
            void load({ ...geo, source: "gps" });
          });
        });
      }
    },
    [load],
  );

  const setShareLocation = useCallback((on: boolean) => {
    saveShareLocation(on);
    setShareLocationState(on);
  }, []);

  const refresh = useCallback(() => {
    void load(preferred);
    if (choice.mode === "city") return;
    void queryGeoPermission().then((state) => {
      if (state === "denied") {
        setGeoBlocked(true);
        return;
      }
      setGeoBlocked(false);
      void requestDeviceGeo({ highAccuracy: choice.mode === "gps" }).then((geo) => {
        if (!geo) return;
        setDeviceGeo(geo);
        void load({ ...geo, source: "gps" });
      });
    });
  }, [choice.mode, load, preferred]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [refresh]);

  const here = choice.mode === "city" || !deviceGeo ? preferred : deviceGeo;
  const usingGps = Boolean(deviceGeo) && choice.mode !== "city";
  const anchor = here;
  const timeZone = weather?.timezone || deviceTimeZone() || DEFAULT_TZ;
  const city = usingGps
    ? weather?.source === "gps" && weather.city
      ? weather.city
      : "Current location"
    : weather?.city || preferred.city || "Choose a city";

  const value = useMemo<LocalNowValue>(
    () => ({
      now,
      timeZone,
      today: toZonedDateStr(now, timeZone),
      time: formatLocalTime(now, timeZone),
      day: formatLocalDay(now, timeZone),
      city,
      usingGps,
      geoBlocked,
      here,
      anchor,
      source: weather?.source || preferred.source,
      weather,
      loading: !weather && !failed,
      failed,
      choice,
      shareLocation,
      chooseLocation,
      setShareLocation,
      refresh,
    }),
    [
      now,
      timeZone,
      city,
      usingGps,
      geoBlocked,
      here,
      anchor,
      weather,
      preferred.source,
      failed,
      choice,
      shareLocation,
      chooseLocation,
      setShareLocation,
      refresh,
    ],
  );

  return <LocalNowContext.Provider value={value}>{children}</LocalNowContext.Provider>;
}

export function useLocalNow() {
  const ctx = useContext(LocalNowContext);
  if (!ctx) throw new Error("useLocalNow must be used within LocalNowProvider");
  return ctx;
}

export function useOptionalLocalNow() {
  return useContext(LocalNowContext);
}
