import {
  BatteryLow,
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  MapPin,
  Moon,
  Share2,
  Sun,
  Umbrella,
} from "lucide-react";
import { useState } from "react";
import { useLocalNow } from "@/hooks/useLocalNow";
import { useBattery } from "@/hooks/useBattery";
import { shareCurrentLocation } from "@/lib/share";
import { weatherLabelKey } from "@/lib/weather";
import { cn } from "@/lib/cn";
import { useLocale } from "@/contexts/LocaleContext";
import { useAnalytics } from "@/contexts/AnalyticsContext";
import { LocationSheet } from "./LocationSheet";
import { ThemeToggle } from "./ThemeToggle";

function SkyIcon({ code, isDay, size = 14 }: { code: number; isDay: boolean; size?: number }) {
  if (code === 0) return isDay ? <Sun size={size} /> : <Moon size={size} />;
  if (code <= 2) return isDay ? <CloudSun size={size} /> : <Cloud size={size} />;
  if (code === 3) return <Cloud size={size} />;
  if (code <= 48) return <CloudFog size={size} />;
  if (code <= 67 || (code >= 80 && code <= 82)) return <CloudRain size={size} />;
  if (code <= 77 || (code >= 85 && code <= 86)) return <CloudSnow size={size} />;
  if (code >= 95) return <CloudLightning size={size} />;
  return <CloudSun size={size} />;
}

export function LocalNowBar() {
  const { weather, time, day, loading, city, source, usingGps, shareLocation } = useLocalNow();
  const { isLowBattery, powerSaveActive, percentageText, togglePowerSave } = useBattery();
  const { t } = useLocale();
  const { trackFeatureEngagement } = useAnalytics();
  const [picker, setPicker] = useState(false);
  const today = weather?.days[0];
  const condition = weather ? t(weatherLabelKey(weather.code, weather.isDay)) : "";
  const placeLabel = usingGps ? city : weather?.city || city || (loading ? t("locating") : t("nearYou"));

  return (
    <div
      data-theme="light"
      className="border-b border-black/10 bg-white text-[#3c362f] font-mono text-[10px] sm:text-[11px] leading-none select-none transition-colors"
    >
      <LocationSheet open={picker} onClose={() => setPicker(false)} />
      <div className="mx-auto flex h-11 max-w-6xl items-center gap-1.5 overflow-x-clip px-2.5 sm:gap-2.5 sm:px-4 md:px-6 lg:h-6">
        <span className="relative flex h-1.5 w-1.5 shrink-0" aria-hidden="true">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-600" />
        </span>

        <button
          type="button"
          onClick={() => {
            void trackFeatureEngagement("weather", "open_location_picker", { city });
            setPicker(true);
          }}
          className="group relative flex min-h-[44px] min-w-0 max-w-[38%] items-center gap-1 font-mono text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-ink transition hover:text-brand-ink active:scale-95 sm:max-w-none lg:min-h-0 cursor-pointer"
          title="Select location & precinct"
          aria-label={`Current location: ${placeLabel}. Tap to select location`}
        >
          <MapPin size={10} className="shrink-0 text-accent opacity-90" />
          <span className="truncate" title={source === "gps" ? t("nearYou") : placeLabel}>
            {placeLabel}
          </span>
          {shareLocation && (
            <span className="hidden shrink-0 rounded bg-emerald-500/15 px-1 py-0.5 text-[9px] font-bold text-emerald-700 sm:inline">
              GPS
            </span>
          )}
        </button>

        <span className="shrink-0 text-black/25 select-none text-[9px]">/</span>

        <p className="shrink-0 whitespace-nowrap font-mono text-[10px] sm:text-[11px] font-bold tabular-nums text-ink tracking-wider">
          {time}
          <span className="ml-1 font-normal opacity-60 text-[9.5px] uppercase">{day}</span>
        </p>

        <span className="shrink-0 text-black/25 select-none text-[9px]">/</span>

        <div
          className={cn(
            "flex min-w-0 flex-1 items-center gap-1 font-mono text-[10px] sm:text-[11px]",
            loading && "opacity-50",
          )}
        >
          {weather ? (
            <>
              <span className="shrink-0 text-amber-600">
                <SkyIcon code={weather.code} isDay={weather.isDay} size={11} />
              </span>
              <span className="shrink-0 font-mono font-bold text-amber-700 tabular-nums">{weather.temp}°</span>
              <span className="truncate opacity-75 uppercase tracking-wide text-[9.5px] sm:text-[10px]">
                {condition}
              </span>
              {today && (
                <span className="hidden min-[480px]:inline-flex shrink-0 opacity-70 text-[9.5px] items-center gap-1">
                  {today.rain > 0 ? (
                    <span className="inline-flex items-center gap-0.5 font-bold text-cyan-700">
                      <Umbrella size={9} className="shrink-0" aria-hidden="true" />
                      <span>{today.rain}%</span>
                    </span>
                  ) : null}
                  <span className="hidden md:inline tabular-nums">
                    H:{today.high}° L:{today.low}°
                  </span>
                </span>
              )}
            </>
          ) : (
            <span className="truncate opacity-60 text-[9.5px] uppercase">
              {loading ? t("forecast") : t("timeOnly")}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => {
            void trackFeatureEngagement("share", "share_current_location", { city });
            void shareCurrentLocation(city);
          }}
          className="relative hidden min-h-[44px] shrink-0 items-center gap-1 font-mono text-[9.5px] uppercase tracking-wider text-mute hover:text-ink transition sm:flex lg:min-h-0 cursor-pointer"
          title={`Share ${city || "current location"} guide`}
          aria-label={`Share ${city || "current location"} guide`}
        >
          <Share2 size={10} className="text-accent" />
          <span>Share</span>
        </button>

        {(isLowBattery || powerSaveActive) && (
          <button
            type="button"
            onClick={togglePowerSave}
            className={cn(
              "relative flex min-h-[44px] shrink-0 items-center gap-0.5 rounded px-1 text-[9.5px] font-mono uppercase tracking-wider transition active:scale-95 lg:min-h-0",
              powerSaveActive ? "bg-amber-500/20 text-amber-800 ring-1 ring-amber-500/40" : "text-mute hover:text-ink",
            )}
            title={`Battery ${percentageText} · Power Saver ${powerSaveActive ? "active" : "off"} · Tap to toggle`}
            aria-label={`Battery ${percentageText}. Power Saver is ${powerSaveActive ? "active" : "off"}`}
          >
            <BatteryLow size={10} className={powerSaveActive ? "text-amber-600" : "text-mute"} />
            <span className="tabular-nums">{percentageText !== "—%" ? percentageText : "Saver"}</span>
          </button>
        )}

        <ThemeToggle compact />
      </div>
    </div>
  );
}
