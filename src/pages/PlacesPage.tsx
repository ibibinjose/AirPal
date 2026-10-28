import { useMemo, useState } from "react";
import { Link } from "wouter";
import { ArrowRight, Footprints, MapPin, SearchX, Store } from "lucide-react";
import { sortNearbyPlaces } from "@shared/nearby";
import { activePlaces } from "@/lib/catalog";
import { useOptionalLocalNow } from "@/contexts/LocalNowContext";
import { triggerHapticSelection } from "@/lib/native";
import { cn } from "@/lib/cn";
import { PlaceCard } from "@/components/discovery/PlaceCard";
import { SearchBar } from "@/components/search/SearchBar";
import { PossieTicket, stubCode } from "@/components/pass/PossieTicket";
import { PlanBeforeYouGo } from "@/components/pass/PlanBeforeYouGo";
import { DirectionsHandoff } from "@/components/pass/DirectionsHandoff";
import { ArrivalAssistantCard } from "@/components/arrival/ArrivalAssistantCard";

/**
 * /places — discover local venues and partner spots.
 * Reads the live precinct catalog (Firestore `places` + claimed listings).
 * Empty catalog → honest empty state, never filler venues.
 * Possie adoption: popular ticket shortcuts, walk-ranked results, and a
 * last-leg maps handoff. Walk times are straight-line estimates shown only
 * when the device GPS is active — never fabricated.
 */
export function PlacesPage() {
  const [query, setQuery] = useState("");
  const [closestFirst, setClosestFirst] = useState(true);
  const local = useOptionalLocalNow();
  const origin = local && local.usingGps ? local.here : undefined;
  const geoBlocked = local?.geoBlocked ?? false;

  const places = useMemo(() => activePlaces(), []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return places;
    return places.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.precinctId || "").toLowerCase().includes(q) ||
        (p.address || "").toLowerCase().includes(q),
    );
  }, [places, query]);

  const ranked = useMemo(() => sortNearbyPlaces(filtered, origin), [filtered, origin]);
  const ordered = closestFirst && origin ? ranked.map((r) => r.place) : filtered;
  const walkById = useMemo(
    () => new Map(ranked.flatMap((r) => (r.walk ? [[r.place.id, r.walk.walkTime] as const] : []))),
    [ranked],
  );
  const popular = useMemo(() => ordered.slice(0, 6), [ordered]);
  const single = filtered.length === 1 ? filtered[0] : undefined;

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-6 sm:px-6">
      <p className="human-eyebrow">Places</p>
      <h1 className="human-title mt-2 text-2xl sm:text-3xl">Find your kind of place.</h1>
      <p className="human-lede mt-2 text-sm sm:text-base">
        Local venues, partner spots, and precinct favourites — pinned, open-now honest.
      </p>

      <div className="mt-4">
        <SearchBar value={query} onChange={setQuery} placeholder="Where are you headed? Try a venue or precinct…" />
      </div>

      <PlanBeforeYouGo />

      {popular.length > 0 && (
        <section aria-label="Popular places" className="mt-5">
          <p className="human-eyebrow">Popular · tap a ticket</p>
          <ul className="mt-2 grid grid-cols-2 gap-2">
            {popular.map((place) => (
              <li key={place.id}>
                <PossieTicket
                  stub={stubCode(place.category)}
                  title={place.name}
                  subtitle={(place.precinctId || "").replace(/-/g, " ") || place.address}
                  walk={walkById.get(place.id)}
                  onSelect={() => setQuery(place.name)}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-label="Results" className="neu-section mt-5 p-3 sm:p-4">
        <div className="mx-auto mb-1 h-1.5 w-10 shrink-0 rounded-full bg-line/80 sm:hidden" aria-hidden="true" />
        <div className="flex flex-wrap items-center justify-between gap-2 px-1 pb-2">
          <p className="text-xs font-bold uppercase tracking-wider text-mute">
            {ordered.length === 0 ? "No results" : `${ordered.length} place${ordered.length === 1 ? "" : "s"}`}
            {origin ? " · ranked by walk" : ""}
          </p>
          <button
            type="button"
            aria-pressed={closestFirst && Boolean(origin)}
            disabled={!origin}
            title={origin ? "Sort by closest walk first" : "Turn on location to sort by walk time"}
            onClick={() => {
              void triggerHapticSelection();
              setClosestFirst((v) => !v);
            }}
            className={cn(
              "inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-4 text-xs font-bold transition active:scale-95 cursor-pointer touch-manipulation disabled:cursor-not-allowed disabled:opacity-50",
              closestFirst && origin ? "bg-brand text-white shadow-sm" : "neu-btn text-ink",
            )}
          >
            <Footprints size={14} aria-hidden="true" />
            <span>Closest first</span>
          </button>
        </div>
        {!origin && (
          <p className="px-1 pb-2 text-xs text-mute">
            {geoBlocked
              ? "Location is blocked in this browser — tap the tune icon by the address bar, allow Location, then reload."
              : "Turn on location to see walk times and sort by closest first."}
          </p>
        )}

        {single && (
          <div className="px-1 pb-3 space-y-3">
            <DirectionsHandoff geo={single.geo} label={single.name} address={single.address} />
            <ArrivalAssistantCard
              destination={single.geo}
              destinationName={single.name}
              address={single.address}
              city={single.precinctId}
            />
          </div>
        )}

        {ordered.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ordered.map((place) => (
              <PlaceCard key={place.id} place={place} walk={walkById.get(place.id)} />
            ))}
          </div>
        ) : (
          <div className="neu-section p-8 text-center">
            <SearchX size={28} className="mx-auto text-mute" aria-hidden="true" />
            <h2 className="human-section-title mt-3 text-base">
              {query ? "No places match that search." : "No places listed yet."}
            </h2>
            <p className="mt-1 text-sm text-mute">
              {query ? "Try a different name or precinct." : "New venues appear here the moment they go live."}
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="inline-flex min-h-[44px] items-center rounded-full bg-brand px-5 text-sm font-semibold text-white transition-[background-color,transform] hover:bg-brand-ink active:scale-95"
                >
                  Clear search
                </button>
              ) : (
                <>
                  <Link
                    href="/business"
                    className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-brand px-5 text-sm font-semibold text-white transition-[background-color,transform] hover:bg-brand-ink active:scale-95"
                  >
                    <Store size={15} />
                    <span>List your venue</span>
                  </Link>
                  <Link
                    href="/events"
                    className="neu-btn inline-flex min-h-[44px] items-center gap-1 px-5 text-sm font-semibold text-ink transition active:scale-95"
                  >
                    <span>What&apos;s on instead</span>
                    <ArrowRight size={14} />
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </section>

      <p className="mt-6 flex items-center gap-1.5 text-xs text-mute">
        <MapPin size={13} aria-hidden="true" />
        <span>Open-now badges hide when hours haven&apos;t been confirmed recently.</span>
      </p>
    </div>
  );
}
