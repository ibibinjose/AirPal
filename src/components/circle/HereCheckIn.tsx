import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { MapPin, Radio } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useBio } from "@/contexts/BioContext";
import { useSocial } from "@/contexts/SocialContext";
import { CircleHereSheet } from "@/components/circle/CircleHereSheet";
import { CircleHereBoard } from "@/components/circle/CircleHereBoard";
import { fetchHereAt, fetchMyHerePin, stopHereRemote } from "@/lib/here";
import { liveBackendEnabled } from "@/lib/functions";
import { herePlaceKey, type HerePin } from "@shared/here";
import { listPeople } from "@/lib/people";
import { circleHandles } from "@/lib/circle";
import { cn } from "@/lib/cn";

export function HereCheckIn({
  placeName,
  placeId,
  eventId,
}: {
  placeName: string;
  placeId?: string;
  eventId?: string;
}) {
  const [, nav] = useLocation();
  const { user } = useAuth();
  const { mine } = useBio();
  const { followedHandles, followerHandles, likedHandles, likedByHandles } = useSocial();
  const [open, setOpen] = useState(false);
  const [minePin, setMinePin] = useState<HerePin | null>(null);
  const [pins, setPins] = useState<HerePin[]>([]);
  const placeKey = herePlaceKey({ placeId, eventId });

  const people = useMemo(() => {
    const met = new Set(
      listPeople()
        .map((p) => (p.handle || "").toLowerCase())
        .filter(Boolean),
    );
    const handles = circleHandles({
      following: followedHandles,
      followers: followerHandles,
      liked: likedHandles,
      likedBy: likedByHandles,
      met,
    });
    const directory = listPeople();
    return handles.map((h) => ({ handle: h, name: directory.find((p) => p.handle === h)?.name || h }));
  }, [followedHandles, followerHandles, likedHandles, likedByHandles]);

  const load = useCallback(async () => {
    if (!liveBackendEnabled()) return;
    const own = mine?.handle ? await fetchMyHerePin(mine.handle) : null;
    const effectiveKey = placeKey || own?.placeKey || "";
    const at = effectiveKey ? await fetchHereAt(effectiveKey) : [];
    setMinePin(own);
    setPins(at);
  }, [mine?.handle, placeKey]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!user) return null;

  const hereNow = Boolean(minePin && (!placeKey || minePin.placeKey === placeKey));

  async function stop() {
    try {
      await stopHereRemote();
      setMinePin(null);
      toast.success("Stopped sharing");
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not stop");
    }
  }

  return (
    <div>
      <div
        className={cn(
          "flex w-full items-center gap-3 rounded-[20px] px-4 py-3.5 text-left ring-1 shadow-2xs transition-[background-color,ring-color]",
          hereNow ? "bg-emerald-500/5 ring-emerald-500/30" : "bg-paper ring-line/80 hover:bg-card",
        )}
      >
        <button
          type="button"
          onClick={() => (mine?.handle ? setOpen(true) : nav("/bio/setup"))}
          className="flex min-h-[44px] min-w-0 flex-1 items-center gap-3 text-left cursor-pointer"
        >
          <span
            className={cn(
              "relative grid h-10 w-10 shrink-0 place-items-center rounded-full",
              hereNow ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-brand/10 text-accent",
            )}
          >
            {hereNow ? <Radio size={18} aria-hidden="true" /> : <MapPin size={18} aria-hidden="true" />}
            {hereNow && (
              <span
                className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-card"
                aria-hidden="true"
              />
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs font-semibold text-mute">
              <span>{hereNow ? "You’re checked in" : "Live Presence"}</span>
              {hereNow && minePin?.audience === "person" && minePin.toHandle && (
                <span className="max-w-full truncate text-accent">· with @{minePin.toHandle}</span>
              )}
            </span>
            <span className="block truncate text-[15px] font-semibold text-ink">
              {hereNow && minePin ? minePin.placeName : `Share I’m here · ${placeName}`}
            </span>
          </span>
        </button>

        {hereNow ? (
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="inline-flex min-h-[44px] items-center whitespace-nowrap rounded-full bg-card px-3 text-xs font-semibold text-ink ring-1 ring-line transition-[background-color] hover:bg-paper cursor-pointer"
            >
              Update
            </button>
            <button
              type="button"
              onClick={() => void stop()}
              className="inline-flex min-h-[44px] items-center whitespace-nowrap rounded-full bg-emerald-500/15 px-3.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 transition-[background-color] hover:bg-emerald-500/25 cursor-pointer"
            >
              Stop
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => (mine?.handle ? setOpen(true) : nav("/bio/setup"))}
            className="inline-flex min-h-[44px] shrink-0 items-center whitespace-nowrap rounded-full bg-brand/10 px-4 text-xs font-bold text-accent transition-[background-color] hover:bg-brand/15 cursor-pointer"
          >
            Share
          </button>
        )}
      </div>
      <CircleHereBoard pins={pins} myHandle={mine?.handle} />
      <CircleHereSheet
        open={open}
        onClose={() => setOpen(false)}
        people={people}
        defaultPlaceName={hereNow && minePin ? minePin.placeName : placeName}
        placeId={placeId}
        eventId={eventId}
        onShared={() => void load()}
      />
    </div>
  );
}
