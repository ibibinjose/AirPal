import { useState } from "react";
import { Link } from "wouter";
import { Ticket, QrCode, ArrowRight, ArrowLeft } from "lucide-react";
import { useMyBookings } from "@/hooks/useMyBookings";
import { PassDialog } from "@/components/airpal/PassDialog";
import { triggerHapticSelection, triggerHaptic } from "@/lib/native";
import { cn } from "@/lib/cn";

type FilterTab = "All" | "Tickets" | "Perks";

interface LocalPassItem {
  id: string;
  title: string;
  venue: string;
  date: string;
  kind: "event" | "deal";
  image: string;
  badge: string;
  code: string;
}

export function PassbookPage() {
  const { bookings } = useMyBookings();
  const [filter, setFilter] = useState<FilterTab>("All");
  const [selectedPass, setSelectedPass] = useState<LocalPassItem | null>(null);

  // Generate a rich set of passes combining live bookings and featured pass benefits
  const samplePasses: LocalPassItem[] = [
    {
      id: "pass-glenmore-rooftop",
      title: "The Glenmore Rooftop Sunset Pass",
      venue: "The Glenmore Hotel · The Rocks",
      date: new Date(Date.now() + 86400000).toISOString(),
      kind: "deal",
      image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80",
      badge: "15% Guest Perk",
      code: "AIR-GLEN-88",
    },
    {
      id: "pass-rocks-night-market",
      title: "The Rocks Weekend Night Market Pass",
      venue: "Playfair Street · The Rocks",
      date: new Date(Date.now() + 172800000).toISOString(),
      kind: "event",
      image: "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=1200&q=80",
      badge: "Free Entry",
      code: "AIR-MKT-42",
    },
    {
      id: "pass-fortune-brew",
      title: "Fortune of War Craft Tasting Paddle",
      venue: "Fortune of War · George St",
      date: new Date(Date.now() + 259200000).toISOString(),
      kind: "deal",
      image: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1200&q=80",
      badge: "Free Craft Taste",
      code: "AIR-FOW-18",
    },
  ];

  // Merge with real bookings
  const livePasses: LocalPassItem[] = bookings.map((b) => ({
    id: b.id,
    title: b.title,
    venue: b.suburb || b.providerName || "Sydney",
    date: b.date || new Date().toISOString(),
    kind: "event",
    image: "/media/harbour.jpg",
    badge: "Confirmed Ticket",
    code: b.id.slice(0, 8).toUpperCase(),
  }));

  const allPasses = [...livePasses, ...samplePasses];

  const visiblePasses = allPasses.filter((p) => {
    if (filter === "All") return true;
    if (filter === "Tickets") return p.kind === "event";
    if (filter === "Perks") return p.kind === "deal";
    return true;
  });

  return (
    <main className="mx-auto max-w-5xl px-4 pb-28 pt-4 md:px-6 md:pt-6">
      {/* Header breadcrumb & kicker */}
      <div className="flex items-center gap-2 mb-2">
        <Link
          href="/"
          className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full bg-card px-3 text-xs font-semibold text-mute hover:text-ink ring-1 ring-line hover:bg-paper transition"
        >
          <ArrowLeft size={13} />
          <span>Home</span>
        </Link>
        <span className="text-[11px] font-bold uppercase tracking-wider text-accent">GOOD TIMES, ON HAND</span>
      </div>

      {/* Title */}
      <div className="flex flex-wrap items-center justify-between gap-4 mt-2">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-ink">
            Your pocket of possibilities.
          </h1>
          <p className="mt-1 text-sm text-mute">Tickets, little perks, and something to look forward to.</p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/me/tickets"
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full bg-card px-4 text-xs font-semibold text-mute ring-1 ring-line hover:bg-paper hover:text-ink transition"
          >
            <Ticket size={14} className="text-accent" />
            <span>Manage All Tickets</span>
          </Link>
        </div>
      </div>

      {/* Filter Segmented Control */}
      <div className="mt-6 flex items-center gap-1 rounded-2xl border border-line bg-paper p-1 w-fit">
        {(["All", "Tickets", "Perks"] as FilterTab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => {
              void triggerHapticSelection();
              setFilter(tab);
            }}
            className={cn(
              "rounded-xl px-4 py-2 text-xs font-semibold transition cursor-pointer touch-manipulation",
              filter === tab ? "bg-card text-ink shadow-xs" : "text-mute hover:text-ink hover:bg-card/50",
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      <p className="mt-4 text-xs text-mute">
        Digital passes are saved directly to your AirPal pocket. Show the QR at the door or tap to open in Apple Wallet.
      </p>

      {/* Wallet Pass Cards Grid */}
      {visiblePasses.length > 0 ? (
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visiblePasses.map((pass) => (
            <article
              key={pass.id}
              className="flex flex-col overflow-hidden rounded-3xl border border-line bg-card shadow-xs transition hover:border-brand/40 hover:shadow-md"
            >
              {/* Cover Photo */}
              <div className="relative aspect-[16/9] w-full bg-paper">
                <img src={pass.image} alt={pass.title} className="h-full w-full object-cover" />
                <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold text-ink shadow-xs backdrop-blur-md dark:bg-black/80 dark:text-white">
                  {pass.badge}
                </span>
              </div>

              {/* Pass Body */}
              <div className="flex flex-1 flex-col justify-between p-5">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-accent">
                    {pass.kind === "deal" ? "A LITTLE PERK" : "EVENT PASS"}
                  </span>
                  <h2 className="mt-1 font-display text-lg font-bold text-ink leading-snug">{pass.title}</h2>
                  <p className="mt-1 text-xs text-mute">{pass.venue}</p>
                  <span className="mt-3 block text-xs font-semibold text-[#5a6a48] dark:text-[#a0b885]">
                    {new Intl.DateTimeFormat("en-AU", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    }).format(new Date(pass.date))}
                  </span>
                </div>

                {/* Dashed Tear Line */}
                <div className="my-4 border-b border-dashed border-line" />

                {/* Show Pass Button */}
                <button
                  type="button"
                  onClick={() => {
                    void triggerHaptic("medium");
                    setSelectedPass(pass);
                  }}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-line bg-paper text-xs font-semibold text-ink transition hover:bg-card hover:border-brand/40 active:scale-[0.98] cursor-pointer"
                >
                  <QrCode size={16} className="text-accent" />
                  <span>Show digital pass</span>
                  <ArrowRight size={14} className="text-mute" />
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-6 rounded-3xl border border-dashed border-line bg-paper/50 p-12 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand/10 text-accent">
            <Ticket size={28} />
          </div>
          <h2 className="mt-4 font-display text-xl font-bold text-ink">Your next good time belongs here.</h2>
          <p className="mx-auto mt-1.5 max-w-sm text-xs text-mute leading-relaxed">
            Reserve an event pass or claim a local perk to fill your passbook.
          </p>
          <div className="mt-6">
            <Link
              href="/explore"
              className="inline-flex min-h-[42px] items-center gap-1.5 rounded-full bg-brand px-6 text-xs font-semibold text-white shadow-xs hover:bg-brand-ink transition active:scale-95"
            >
              <span>Explore events &amp; perks →</span>
            </Link>
          </div>
        </div>
      )}

      <PassDialog pass={selectedPass} onClose={() => setSelectedPass(null)} />
    </main>
  );
}
