import { useState } from "react";
import { Car, ChevronDown, ChevronUp, Compass, Footprints, MapPin, Navigation, Train } from "lucide-react";
import type { Geo } from "@shared/nearby";
import { getNearbyArrivalPoints, resolvePrecinctGeo, type ArrivalPoint } from "@/lib/arrival";
import { appleMapsDirectionsUrl, googleMapsDirectionsUrl, isAppleDevice } from "@/lib/maps";
import { triggerHaptic } from "@/lib/native";
import { cn } from "@/lib/cn";

export interface ArrivalAssistantCardProps {
  destination?: Geo;
  destinationName: string;
  address?: string;
  city?: string;
  className?: string;
  compact?: boolean;
  initialExpanded?: boolean;
}

/**
 * ArrivalAssistantCard — Possie-inspired arrival & last-mile navigation module.
 * Ranks nearby parking and transit by actual walking time to the entrance,
 * provides real-time space indicators, and offers 1-tap dual navigation hand-offs
 * to Apple Maps and Google Maps.
 */
export function ArrivalAssistantCard({
  destination,
  destinationName,
  address,
  city,
  className,
  compact = false,
  initialExpanded = false,
}: ArrivalAssistantCardProps) {
  const [expanded, setExpanded] = useState(initialExpanded);
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);

  const resolvedGeo = destination || resolvePrecinctGeo(address || destinationName || city || "");
  const nearbyPoints = getNearbyArrivalPoints(resolvedGeo, { max: 3 });
  const isApple = isAppleDevice();

  if (nearbyPoints.length === 0) return null;

  const activePoint: ArrivalPoint = nearbyPoints.find((p) => p.id === selectedPointId) || nearbyPoints[0];

  const handleToggle = () => {
    void triggerHaptic("light");
    setExpanded((prev) => !prev);
  };

  const appleDriveUrl = appleMapsDirectionsUrl({
    destination: activePoint.geo,
    destinationName: `${activePoint.name} (Parking for ${destinationName})`,
    mode: "driving",
  });

  const appleWalkUrl = appleMapsDirectionsUrl({
    destination: resolvedGeo,
    destinationName: `${destinationName} (Entrance)`,
    mode: "walking",
  });

  const googleDriveUrl = googleMapsDirectionsUrl({
    destination: activePoint.geo,
    destinationName: `${activePoint.name} (Parking for ${destinationName})`,
    mode: "driving",
  });

  const googleWalkUrl = googleMapsDirectionsUrl({
    destination: resolvedGeo,
    destinationName: `${destinationName} (Entrance)`,
    mode: "walking",
  });

  return (
    <div
      className={cn(
        "arrival-assistant-card overflow-hidden rounded-2xl bg-paper/95 text-ink ring-1 ring-line/80 shadow-xs backdrop-blur-md",
        compact ? "p-2.5 sm:p-3" : "p-3.5 sm:p-4",
        className,
      )}
      aria-label={`Arrival and parking options for ${destinationName}`}
    >
      {/* Header bar / Summary Strip */}
      <div className="flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand/10 text-accent">
            <Compass size={18} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-ink truncate">Arrival &amp; Parking</span>
              {activePoint.walkingLabel && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-500/25">
                  <Footprints size={10} aria-hidden="true" />
                  <span>{activePoint.walkingLabel}</span>
                </span>
              )}
            </div>
            <p className="text-[11px] text-mute font-medium truncate mt-0.5">
              Nearest: {activePoint.name}
              {activePoint.availableSpaces && ` · ${activePoint.availableSpaces} spots open`}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleToggle}
          aria-expanded={expanded}
          aria-label={expanded ? "Collapse arrival details" : "Expand arrival details"}
          className="grid h-9 w-9 min-h-[44px] min-w-[44px] place-items-center rounded-full text-mute hover:text-ink hover:bg-card transition-[background-color,transform] active:scale-95 cursor-pointer"
        >
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {/* Expanded Details: Ranked Hubs + Dual Navigation Hand-off */}
      {expanded && (
        <div className="mt-3.5 pt-3.5 border-t border-line/60 space-y-3">
          {/* Precinct Spots Selector Tabs */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-mute">
              Select Parking or Transit Hub
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {nearbyPoints.map((pt) => {
                const isSelected = pt.id === activePoint.id;
                return (
                  <button
                    key={pt.id}
                    type="button"
                    onClick={() => {
                      void triggerHaptic("selection");
                      setSelectedPointId(pt.id);
                    }}
                    className={cn(
                      "flex min-h-[44px] flex-col justify-center rounded-xl p-2.5 text-left transition-[background-color,box-shadow,transform] cursor-pointer active:scale-95 ring-1",
                      isSelected
                        ? "bg-card text-ink ring-brand/40 shadow-xs"
                        : "bg-paper/50 text-mute ring-line/60 hover:bg-card/70",
                    )}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="flex items-center gap-1.5 text-xs font-bold text-ink truncate">
                        {pt.type === "parking" ? (
                          <Car size={13} className="shrink-0 text-accent" />
                        ) : (
                          <Train size={13} className="shrink-0 text-purple-600" />
                        )}
                        <span className="truncate">{pt.name}</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                      <span>{pt.walkingLabel}</span>
                      {pt.availableSpaces && <span>· {pt.availableSpaces} spots</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Point Highlights */}
          <div className="rounded-xl bg-card p-3 ring-1 ring-line/70 text-xs">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-bold text-ink">{activePoint.name}</p>
                {activePoint.address && <p className="text-mute text-[11px] mt-0.5">{activePoint.address}</p>}
                {activePoint.ratesHint && (
                  <p className="text-accent text-[11px] font-medium mt-1">💳 {activePoint.ratesHint}</p>
                )}
                {activePoint.restrictionsHint && (
                  <p className="text-amber-700 dark:text-amber-400 text-[11px] font-medium mt-0.5">
                    ℹ️ {activePoint.restrictionsHint}
                  </p>
                )}
              </div>
              <div className="text-right shrink-0">
                <span className="text-[11px] font-mono font-bold text-ink">{activePoint.walkingMinutes} min</span>
                <span className="block text-[10px] text-mute">to gate</span>
              </div>
            </div>
          </div>

          {/* Dual Maps Hand-off Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            <a
              href={isApple ? appleDriveUrl : googleDriveUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => void triggerHaptic("medium")}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-brand px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-brand-ink transition-[background-color,transform] active:scale-95"
              aria-label={`Drive to ${activePoint.name} via ${isApple ? "Apple Maps" : "Google Maps"}`}
            >
              <Navigation size={14} className="shrink-0" />
              <span>Drive to Parking ({isApple ? "Apple Maps" : "Google Maps"})</span>
            </a>

            <a
              href={isApple ? appleWalkUrl : googleWalkUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => void triggerHaptic("light")}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-line bg-card px-3.5 py-2 text-xs font-bold text-ink hover:bg-paper transition-[background-color,transform] active:scale-95 shadow-2xs"
              aria-label={`Walk to ${destinationName} entrance`}
            >
              <Footprints size={14} className="shrink-0 text-emerald-600" />
              <span>Walk to Entrance</span>
            </a>
          </div>

          {address && (
            <p className="text-center text-[10px] text-mute/80 flex items-center justify-center gap-1">
              <MapPin size={10} aria-hidden="true" />
              <span className="truncate">Destination: {address}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
