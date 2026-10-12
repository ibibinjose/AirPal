import { useState, useMemo } from "react";
import { Link } from "wouter";
import { Search, Compass, MapPin, ArrowLeft } from "lucide-react";
import { CURATED_EXPERIENCES, type ExperienceItem } from "@/lib/curated-experiences";
import { ExperienceCard } from "@/components/airpal/ExperienceCard";
import { ExperienceDialog } from "@/components/airpal/ExperienceDialog";
import { CategoryFilters, type CategoryType } from "@/components/airpal/CategoryFilters";
import { triggerHapticSelection } from "@/lib/native";
import { cn } from "@/lib/cn";

type KindFilter = "" | "idea" | "event" | "deal";

const KINDS: { key: KindFilter; label: string }[] = [
  { key: "", label: "Everything" },
  { key: "idea", label: "Things to do" },
  { key: "event", label: "Events" },
  { key: "deal", label: "Local perks" },
];

export function ExplorePage() {
  const [kind, setKind] = useState<KindFilter>("");
  const [category, setCategory] = useState<CategoryType>("All");
  const [search, setSearch] = useState("");
  const [area, setArea] = useState("");
  const [selectedItem, setSelectedItem] = useState<ExperienceItem | null>(null);

  // Derive distinct areas from curated data
  const distinctAreas = useMemo(() => {
    const set = new Set<string>();
    CURATED_EXPERIENCES.forEach((item) => {
      if (item.area) set.add(item.area);
    });
    return Array.from(set).sort();
  }, []);

  const filteredItems = useMemo(() => {
    return CURATED_EXPERIENCES.filter((item) => {
      // Kind filter
      if (kind === "idea" && item.kind !== "idea" && item.kind !== "attraction") return false;
      if (kind === "event" && item.kind !== "event") return false;
      if (kind === "deal" && item.kind !== "deal") return false;

      // Category filter
      if (category !== "All" && item.category !== category) return false;

      // Area filter
      if (area && !item.area.toLowerCase().includes(area.toLowerCase())) return false;

      // Search text
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchDesc = item.description.toLowerCase().includes(q);
        const matchVenue = item.venue.toLowerCase().includes(q);
        const matchArea = item.area.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchVenue && !matchArea) return false;
      }

      return true;
    });
  }, [kind, category, area, search]);

  return (
    <main className="mx-auto max-w-6xl px-4 pb-28 pt-4 md:px-6 md:pt-6">
      {/* Header breadcrumb & kicker */}
      <div className="flex items-center gap-2 mb-2">
        <Link
          href="/"
          className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full bg-card px-3 text-xs font-semibold text-mute hover:text-ink ring-1 ring-line hover:bg-paper transition"
        >
          <ArrowLeft size={13} />
          <span>Home</span>
        </Link>
        <span className="text-[11px] font-bold uppercase tracking-wider text-accent">FOLLOW YOUR CURIOSITY</span>
      </div>

      {/* Title */}
      <div className="mt-2">
        <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-ink">
          Your next good thing.
        </h1>
        <p className="mt-1 text-sm text-mute">Little discoveries. New favourites. All a little closer.</p>
      </div>

      {/* Toolbar */}
      <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {/* Kind selector */}
        <div className="flex items-center gap-1 rounded-2xl border border-line bg-paper p-1 w-fit overflow-x-auto">
          {KINDS.map((k) => (
            <button
              key={k.key}
              type="button"
              onClick={() => {
                void triggerHapticSelection();
                setKind(k.key);
              }}
              className={cn(
                "rounded-xl px-4 py-2 text-xs font-semibold transition cursor-pointer touch-manipulation whitespace-nowrap",
                kind === k.key ? "bg-card text-ink shadow-xs" : "text-mute hover:text-ink hover:bg-card/50",
              )}
            >
              {k.label}
            </button>
          ))}
        </div>

        {/* Controls: Area + Search */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Area dropdown */}
          <div className="relative flex items-center rounded-2xl border border-line bg-card px-3 py-2 shadow-2xs">
            <MapPin size={15} className="text-accent shrink-0 mr-2" />
            <select
              value={area}
              onChange={(e) => setArea(e.target.value)}
              aria-label="Filter by area"
              className="bg-transparent text-xs font-semibold text-ink outline-none cursor-pointer"
            >
              <option value="">All areas</option>
              {distinctAreas.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>

          {/* Search box */}
          <div className="relative flex flex-1 sm:w-64 items-center rounded-2xl border border-line bg-card px-3 py-2 shadow-2xs">
            <Search size={15} className="text-mute shrink-0 mr-2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Find something you’ll love…"
              aria-label="Search experiences"
              className="w-full bg-transparent text-xs text-ink placeholder:text-mute outline-none"
            />
          </div>
        </div>
      </div>

      {/* Category Pills */}
      <div className="mt-4">
        <CategoryFilters value={category} onChange={setCategory} />
      </div>

      <p className="mt-2 text-xs text-mute">
        Showing curated Sydney experiences, live events, scenic walks, and local dining perks.
      </p>

      {/* Grid of cards */}
      {filteredItems.length > 0 ? (
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item) => (
            <ExperienceCard key={item.id} item={item} onSelect={setSelectedItem} />
          ))}
        </div>
      ) : (
        <div className="mt-8 rounded-3xl border border-dashed border-line bg-paper/50 p-12 text-center">
          <Compass size={32} className="mx-auto text-accent" />
          <h2 className="mt-3 font-display text-lg font-bold text-ink">A different path, perhaps?</h2>
          <p className="mx-auto mt-1 max-w-sm text-xs text-mute leading-relaxed">
            No experiences match this search. Try selecting another category or clearing your query.
          </p>
          <button
            type="button"
            onClick={() => {
              setKind("");
              setCategory("All");
              setArea("");
              setSearch("");
            }}
            className="mt-5 inline-flex min-h-[40px] items-center gap-1.5 rounded-full border border-line bg-card px-5 text-xs font-semibold text-ink hover:bg-paper transition"
          >
            Show everything
          </button>
        </div>
      )}

      <ExperienceDialog item={selectedItem} onClose={() => setSelectedItem(null)} />
    </main>
  );
}
