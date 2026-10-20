import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { MapPin } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { fieldInput } from "@/components/forms/ValidField";
import { liveBackendEnabled } from "@/lib/functions";
import { shareHereRemote } from "@/lib/here";
import { requestDeviceGeo } from "@/lib/weather";
import { activePlaces } from "@/lib/catalog";
import { HERE_HOURS, type HereAudience, type HereHours } from "@shared/here";
import { cn } from "@/lib/cn";

type Person = { handle: string; name: string };

export function CircleHereSheet({
  open,
  onClose,
  people,
  defaultPlaceName,
  placeId,
  eventId,
  onShared,
}: {
  open: boolean;
  onClose: () => void;
  people: Person[];
  defaultPlaceName?: string;
  placeId?: string;
  eventId?: string;
  onShared?: () => void;
}) {
  const [placeName, setPlaceName] = useState(defaultPlaceName || "");
  const [audience, setAudience] = useState<HereAudience>("circle");
  const [toHandle, setToHandle] = useState("");
  const [hours, setHours] = useState<HereHours>(3);
  const [pinOnMap, setPinOnMap] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setPlaceName(defaultPlaceName || "");
  }, [open, defaultPlaceName]);

  const hourLabels: Record<HereHours, string> = { 1: "1 hour", 3: "3 hours", 8: "Until I stop" };

  const quickPlaces = useMemo(() => {
    const spots = activePlaces()
      .slice(0, 3)
      .map((p) => p.name);
    if (spots.length > 0) return spots;
    return ["The Glenmore Hotel", "Cut Bar & Grill", "The Rocks Market"];
  }, []);

  const filtered = useMemo(() => {
    const q = toHandle.trim().toLowerCase().replace(/^@/, "");
    if (!q) return people.slice(0, 8);
    return people.filter((p) => p.handle.includes(q) || p.name.toLowerCase().includes(q)).slice(0, 8);
  }, [people, toHandle]);

  async function send() {
    if (placeName.trim().length < 2) {
      toast.message("Name the place you’re at.");
      return;
    }
    if (audience === "person" && !toHandle.trim()) {
      toast.message("Pick someone in your Circle.");
      return;
    }
    if (!liveBackendEnabled()) {
      toast.message("Connect Firebase to share with your Circle.");
      return;
    }
    setBusy(true);
    try {
      const geo = await requestDeviceGeo();
      await shareHereRemote({
        placeName: placeName.trim(),
        placeId,
        eventId,
        lat: geo?.lat,
        lng: geo?.lng,
        audience,
        toHandle: audience === "person" ? toHandle.trim() : undefined,
        hours,
        pinOnMap: audience === "circle" ? pinOnMap : pinOnMap,
      });
      toast.success(audience === "person" ? `Shared with @${toHandle.replace(/^@/, "")}` : "Shared with your Circle");
      onShared?.();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not share");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="I’m here">
      <p className="text-[15px] leading-6 text-mute">
        Share this event space with your Circle or one person. We pin the venue, not your home.
      </p>
      <label className="mt-4 block">
        <span className="text-[13px] font-semibold text-mute">Where</span>
        <div className="relative mt-1">
          <MapPin size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-mute" />
          <input
            value={placeName}
            onChange={(e) => setPlaceName(e.target.value.slice(0, 80))}
            placeholder="The Glenmore rooftop"
            className={`${fieldInput} pl-10`}
          />
        </div>
      </label>

      {!placeId && !eventId && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {quickPlaces.map((spot) => (
            <button
              key={spot}
              type="button"
              onClick={() => setPlaceName(spot)}
              className={cn(
                "min-h-[44px] rounded-full px-3 py-1 text-xs font-medium ring-1 ring-line transition cursor-pointer",
                placeName === spot ? "bg-brand/10 text-accent ring-brand/30" : "bg-paper text-mute hover:text-ink",
              )}
            >
              {spot}
            </button>
          ))}
        </div>
      )}

      <p className="mt-4 text-[13px] font-semibold text-mute">Who sees it</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {(
          [
            ["circle", "Circle"],
            ["person", "One person"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setAudience(id)}
            className={cn(
              "min-h-[44px] rounded-full text-[14px] font-semibold transition cursor-pointer",
              audience === id ? "bg-brand text-white" : "bg-paper text-ink ring-1 ring-line/60",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      {audience === "person" && (
        <div className="mt-3">
          <input
            value={toHandle}
            onChange={(e) => setToHandle(e.target.value.replace(/^@/, ""))}
            placeholder="Search your Circle"
            className={fieldInput}
          />
          <ul className="mt-2 max-h-36 overflow-y-auto rounded-[16px] bg-paper divide-y divide-line/50">
            {filtered.map((p) => (
              <li key={p.handle}>
                <button
                  type="button"
                  onClick={() => setToHandle(p.handle)}
                  className={cn(
                    "flex min-h-[44px] w-full items-center justify-between px-3 py-2 text-left text-[15px] cursor-pointer",
                    toHandle === p.handle && "font-semibold text-accent",
                  )}
                >
                  <span>{p.name}</span>
                  <span className="text-[12px] text-mute">@{p.handle}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-4 text-[13px] font-semibold text-mute">How long</p>
      <div className="mt-2 flex gap-2">
        {HERE_HOURS.map((h) => (
          <button
            key={h}
            type="button"
            onClick={() => setHours(h)}
            className={cn(
              "min-h-[44px] flex-1 whitespace-nowrap rounded-full px-2 text-[12px] font-semibold transition cursor-pointer",
              hours === h ? "bg-brand text-white" : "bg-paper text-ink ring-1 ring-line/60",
            )}
          >
            {hourLabels[h]}
          </button>
        ))}
      </div>

      <label className="mt-4 flex min-h-[44px] cursor-pointer items-center gap-3 px-1 py-1">
        <input
          type="checkbox"
          className="h-5 w-5 accent-[#004eff]"
          checked={pinOnMap}
          onChange={(e) => setPinOnMap(e.target.checked)}
        />
        <span className="text-[15px] text-ink">Pin me for people at this place</span>
      </label>

      <Button className="mt-5 w-full min-h-[44px]" disabled={busy} loading={busy} onClick={() => void send()}>
        Share
      </Button>
      <button
        type="button"
        className="mt-2 min-h-[44px] w-full text-center text-[15px] font-medium text-mute hover:text-ink cursor-pointer"
        onClick={onClose}
      >
        Cancel
      </button>
    </Sheet>
  );
}
