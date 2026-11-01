import { useMemo, useState } from "react";
import { Link } from "wouter";
import {
  ArrowRight,
  BedDouble,
  Coffee,
  Compass,
  Footprints,
  Gift,
  MapPin,
  SearchX,
  ShoppingBag,
  Sparkles,
  Store,
  UtensilsCrossed,
} from "lucide-react";
import { sortNearbyPlaces } from "@shared/nearby";
import { activePlaces, placesWithDeals } from "@/lib/catalog";
import { useListings } from "@/contexts/ListingsContext";
import { useOptionalLocalNow } from "@/contexts/LocalNowContext";
import { triggerHapticSelection } from "@/lib/native";
import { cn } from "@/lib/cn";
import { PlaceCard } from "@/components/discovery/PlaceCard";
import { SearchBar } from "@/components/search/SearchBar";
import { FilterChips } from "@/components/ui/FilterChips";
import { PossieTicket, stubCode } from "@/components/pass/PossieTicket";
import { PlanBeforeYouGo } from "@/components/pass/PlanBeforeYouGo";
import { DirectionsHandoff } from "@/components/pass/DirectionsHandoff";
import { ArrivalAssistantCard } from "@/components/arrival/ArrivalAssistantCard";

type PlaceFilterId = "all" | "eat" | "coffee" | "things" | "shops" | "stay" | "deals";

/**
 * /places — discover local venues and partner spots.
 * Reads the live precinct catalog (Firestore `places` + claimed listings).
 * Empty catalog → honest empty state, never filler venues.
 * Possie adoption: popular ticket shortcuts, walk-ranked results, category
 * filters, and a last-leg maps handoff. Walk times are straight-line estimates
 * shown only when the device GPS is active — never fabricated.
 */
export function PlacesPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<PlaceFilterId>("all");
  const [closestFirst, setClosestFirst] = useState(true);
  const { version: listingsVersion } = useListings();
  const local = useOptionalLocalNow();
  const origin = local && local.usingGps ? local.here : undefined;
  const geoBlocked = local?.geoBlocked ?? false;

  const places = useMemo(() => activePlaces(), [listingsVersion]);

  const counts = useMemo(() => {
    return {
      all: places.length,
      eat: places.filter((p) => p.category === "eat").length,
      coffee: places.filter((p) => p.category === "coffee").length,
      things: places.filter((p) => p.category === "things" || p.category === "events").length,
      shops: places.filter((p) => p.category === "shops" || p.category === "services").length,
      stay: places.filter((p) => p.category === "stay").length,
      deals: placesWithDeals(places).length,
    };
  }, [places]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return places.filter((p) => {
      if (category === "eat" && p.category !== "eat") return false;
      if (category === "coffee" && p.category !== "coffee") return false;
      if (category === "things" && p.category !== "things" && p.category !== "events") return false;
      if (category === "shops" && p.category !== "shops" && p.category !== "services") return false;
      if (category === "stay" && p.category !== "stay") return false;
      if (category === "deals" && !p.deal) return false;

      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.precinctId || "").toLowerCase().includes(q) ||
        (p.address || "").toLowerCase().includes(q) ||
        (p.shortWhy || "").toLowerCase().includes(q) ||
        (p.deal?.badge || "").toLowerCase().includes(q)
      );
    });
  }, [places, query, category]);

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
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="human-eyebrow">Places</p>
          <h1 className="human-title mt-2 text-2xl sm:text-3xl">Find your kind of place.</h1>
          <p className="human-lede mt-2 text-sm sm:text-base">
            Local venues, partner spots, and precinct favourites — pinned, open-now honest.
          </p>
        </div>

        <Link
          href="/business"
          className="neu-btn inline-flex min-h-[44px] items-center gap-1.5 px-4 text-xs font-bold text-ink transition active:scale-95"
        >
          <Store size={14} className="text-accent shrink-0" aria-hidden="true" />
          <span>List or Claim a Venue</span>
        </Link>
      </div>

      <div className="mt-4">
        <SearchBar value={query} onChange={setQuery} placeholder="Where are you headed? Try a venue or precinct…" />
      </div>

      {/* Category Filter Pills */}
      <FilterChips
        ariaLabel="Place categories"
        className="mt-4"
        options={[
          { id: "all" as const, label: "All Places", icon: Sparkles, count: counts.all > 0 ? counts.all : undefined },
          {
            id: "eat" as const,
            label: "Eat & Drink",
            icon: UtensilsCrossed,
            count: counts.eat > 0 ? counts.eat : undefined,
          },
          {
            id: "coffee" as const,
            label: "Coffee",
            icon: Coffee,
            count: counts.coffee > 0 ? counts.coffee : undefined,
          },
          {
            id: "deals" as const,
            label: "Member Perks",
            icon: Gift,
            count: counts.deals > 0 ? counts.deals : undefined,
          },
          {
            id: "things" as const,
            label: "Sights & Do",
            icon: Compass,
            count: counts.things > 0 ? counts.things : undefined,
          },
          {
            id: "shops" as const,
            label: "Shops",
            icon: ShoppingBag,
            count: counts.shops > 0 ? counts.shops : undefined,
          },
          {
            id: "stay" as const,
            label: "Stays",
            icon: BedDouble,
            count: counts.stay > 0 ? counts.stay : undefined,
          },
        ]}
        value={category}
        onChange={setCategory}
      />

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
              {query || category !== "all" ? "No places match that filter." : "No places listed yet."}
            </h2>
            <p className="mt-1 text-sm text-mute">
              {query || category !== "all"
                ? "Try a different category, name, or precinct."
                : "New venues appear here the moment they go live."}
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {query || category !== "all" ? (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setCategory("all");
                  }}
                  className="inline-flex min-h-[44px] items-center rounded-full bg-brand px-5 text-sm font-semibold text-white transition-[background-color,transform] hover:bg-brand-ink active:scale-95"
                >
                  Reset filters
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
