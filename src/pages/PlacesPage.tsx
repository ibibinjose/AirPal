import { useMemo, useState } from "react";
import { Link } from "wouter";
import { ArrowRight, MapPin, SearchX, Store } from "lucide-react";
import { activePlaces } from "@/lib/catalog";
import { PlaceCard } from "@/components/discovery/PlaceCard";
import { SearchBar } from "@/components/search/SearchBar";

/**
 * /places — discover local venues and partner spots.
 * Reads the live precinct catalog (Firestore `places` + claimed listings).
 * Empty catalog → honest empty state, never filler venues.
 */
export function PlacesPage() {
  const [query, setQuery] = useState("");
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

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-6 sm:px-6">
      <p className="human-eyebrow">Places</p>
      <h1 className="human-title mt-2 text-2xl sm:text-3xl">Find your kind of place.</h1>
      <p className="human-lede mt-2 text-sm sm:text-base">
        Local venues, partner spots, and precinct favourites — pinned, open-now honest.
      </p>

      <div className="mt-4">
        <SearchBar value={query} onChange={setQuery} placeholder="Search venues, precincts…" />
      </div>

      {filtered.length > 0 ? (
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((place) => (
            <PlaceCard key={place.id} place={place} />
          ))}
        </div>
      ) : (
        <div className="human-card mt-5 p-8 text-center">
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
                className="inline-flex min-h-[44px] items-center rounded-full bg-brand px-5 text-sm font-semibold text-white transition hover:bg-brand-ink active:scale-95"
              >
                Clear search
              </button>
            ) : (
              <>
                <Link
                  href="/business"
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-brand px-5 text-sm font-semibold text-white transition hover:bg-brand-ink active:scale-95"
                >
                  <Store size={15} />
                  <span>List your venue</span>
                </Link>
                <Link
                  href="/events"
                  className="inline-flex min-h-[44px] items-center gap-1 rounded-full px-5 text-sm font-semibold text-ink ring-1 ring-line transition hover:bg-card active:scale-95"
                >
                  <span>What&apos;s on instead</span>
                  <ArrowRight size={14} />
                </Link>
              </>
            )}
          </div>
        </div>
      )}

      <p className="mt-6 flex items-center gap-1.5 text-xs text-mute">
        <MapPin size={13} aria-hidden="true" />
        <span>Open-now badges hide when hours haven&apos;t been confirmed recently.</span>
      </p>
    </div>
  );
}
