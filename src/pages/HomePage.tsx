import { useState, useMemo } from "react";
import { Link } from "wouter";
import { ArrowRight, ArrowUpRight, MapPin, Plus, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocalNow } from "@/contexts/LocalNowContext";
import { CURATED_EXPERIENCES, type ExperienceItem } from "@/lib/curated-experiences";
import { ExperienceCard } from "@/components/airpal/ExperienceCard";
import { ExperienceDialog } from "@/components/airpal/ExperienceDialog";
import { AddPlanDialog } from "@/components/airpal/AddPlanDialog";
import { CategoryFilters, type CategoryType } from "@/components/airpal/CategoryFilters";
import { TodayPanel } from "@/components/airpal/TodayPanel";
import { PILLARS } from "@/lib/pillars";
import { triggerHaptic } from "@/lib/native";

export function HomePage() {
  const { user } = useAuth();
  const { city } = useLocalNow();

  const [category, setCategory] = useState<CategoryType>("All");
  const [selectedExperience, setSelectedExperience] = useState<ExperienceItem | null>(null);
  const [showAddPlan, setShowAddPlan] = useState(false);

  const firstName = useMemo(() => {
    const n = user?.displayName?.trim().split(/\s+/)[0];
    return n || null;
  }, [user]);

  // Filter curated experiences by selected category
  const filteredExperiences = useMemo(() => {
    if (category === "All") return CURATED_EXPERIENCES;
    return CURATED_EXPERIENCES.filter((item) => item.category === category);
  }, [category]);

  const whatNowItems = useMemo(() => {
    return filteredExperiences.slice(0, 6);
  }, [filteredExperiences]);

  const upcomingEventItems = useMemo(() => {
    return CURATED_EXPERIENCES.filter((item) => item.kind === "event").slice(0, 3);
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 pb-[calc(env(safe-area-inset-bottom,0px)+6.5rem)] pt-3 sm:px-6 sm:pt-6">
      {/* Editorial Page Greeting */}
      <div className="mb-6">
        <div className="text-[10px] font-bold uppercase tracking-widest text-accent">
          YOUR EVERYDAY, A LITTLE BRIGHTER
        </div>
        <h1 className="mt-1 font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-ink">
          {firstName ? `Hey ${firstName}, good to see you ` : "Hey, good to see you "}
          <span className="text-accent inline-block">✳</span>
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-mute">A whole city of possibilities. A day that’s yours.</p>
      </div>

      {/* Hero Banner — Editorial Luma Craft */}
      <section className="relative overflow-hidden rounded-3xl bg-[#121614] text-white shadow-md">
        {/* Cover Photo with Subtle Parallax/Dark Gradient */}
        <div className="absolute inset-0" aria-hidden="true">
          <img
            src="/media/harbour.jpg"
            alt="Sydney coastline and harbour"
            className="h-full w-full object-cover object-center opacity-70"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/60 to-black/30" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 px-5 py-8 sm:px-10 sm:py-14 max-w-2xl">
          <div className="flex items-center gap-2 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-white/90">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>A LITTLE SPONTANEITY LOOKS GOOD ON YOU</span>
          </div>

          <h2 className="mt-3 font-display text-3xl sm:text-5xl font-extrabold leading-[1.08] tracking-tight text-white">
            Less scrolling. <br />
            More <span className="font-serif italic font-normal text-amber-300">living.</span>
          </h2>

          <p className="mt-3 max-w-lg text-xs sm:text-sm text-white/85 leading-relaxed">
            Find your kind of places, people, and plans. We’ll keep the little things together.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href="/explore"
              className="inline-flex min-h-[48px] items-center gap-2 rounded-full bg-brand px-6 text-xs sm:text-sm font-semibold text-white shadow-sm transition hover:bg-brand-ink active:scale-95 cursor-pointer touch-manipulation"
            >
              <span>Find my next thing</span>
              <ArrowUpRight size={16} />
            </Link>

            <button
              type="button"
              onClick={() => {
                void triggerHaptic("medium");
                setShowAddPlan(true);
              }}
              className="inline-flex min-h-[48px] items-center gap-1.5 rounded-full bg-white/15 px-5 text-xs sm:text-sm font-semibold text-white ring-1 ring-white/30 backdrop-blur-md hover:bg-white/25 transition active:scale-95 cursor-pointer touch-manipulation"
            >
              <Plus size={16} />
              <span>Plan a hangout</span>
            </button>
          </div>
        </div>

        {/* Location Tag */}
        <div className="absolute bottom-4 right-5 hidden sm:flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1 text-[10px] font-bold tracking-widest uppercase text-white/80 backdrop-blur-md">
          <MapPin size={11} className="text-accent" />
          <span>{city || "Sydney"} &amp; A Little Beyond</span>
        </div>
      </section>

      {/* 4 Core Pillars Hub */}
      <section className="mt-8" aria-label="Explore by category">
        <div className="flex items-center justify-between mb-3 px-1">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-accent">THE 4 PILLARS</span>
            <h2 className="text-base sm:text-lg font-bold text-ink">Find what you need</h2>
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {PILLARS.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <Link
                key={pillar.id}
                href={pillar.href}
                className="group relative flex flex-col justify-between rounded-2xl bg-card p-4 ring-1 ring-line hover:ring-brand/40 hover:shadow-md transition active:scale-[0.98] cursor-pointer"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand/10 text-accent group-hover:bg-brand group-hover:text-white transition">
                      <Icon size={20} />
                    </span>
                    <ArrowUpRight size={16} className="text-mute group-hover:text-ink transition" />
                  </div>
                  <h3 className="mt-3 text-base font-bold text-ink">{pillar.label}</h3>
                  <p className="mt-0.5 text-xs text-mute line-clamp-1">{pillar.subLabel}</p>
                </div>
                <div className="mt-3 flex flex-wrap gap-1 border-t border-line/60 pt-2.5">
                  {pillar.subLinks.slice(0, 3).map((sub) => (
                    <span
                      key={sub.href}
                      className="text-[10.5px] font-medium text-mute group-hover:text-accent transition"
                    >
                      {sub.label}
                      <span className="last:hidden inline-block ml-1 text-line">·</span>
                    </span>
                  ))}
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Category Pills Bar */}
      <div className="mt-8">
        <CategoryFilters value={category} onChange={setCategory} />
      </div>

      {/* Two Column Layout on Desktop: Feed + TodayPanel */}
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_360px]">
        {/* Left Column: Experiences & Events */}
        <div className="flex flex-col gap-10">
          {/* Section: What Now? */}
          <section>
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles size={18} className="text-accent" />
                  <h2 className="font-display text-xl font-bold text-ink">What now?</h2>
                </div>
                <p className="mt-0.5 text-xs text-mute">A few ideas for wherever the day takes you.</p>
              </div>

              <Link
                href="/explore"
                className="inline-flex min-h-[44px] items-center gap-1 text-xs sm:text-sm font-semibold text-accent hover:underline cursor-pointer touch-manipulation"
              >
                <span>View all</span>
                <ArrowRight size={14} />
              </Link>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
              {whatNowItems.map((item) => (
                <ExperienceCard key={item.id} item={item} onSelect={setSelectedExperience} />
              ))}
            </div>
          </section>

          {/* Banner: A little perk goes a long way */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-[28px] bg-card p-5 ring-1 ring-line/80 shadow-clay">
            <div className="flex items-center gap-3.5">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Sparkles size={22} />
              </div>
              <div>
                <h3 className="font-display text-sm font-bold text-ink">A little perk goes a long way.</h3>
                <p className="text-xs text-mute mt-0.5">Discover local dining perks &amp; exclusive guest offers.</p>
              </div>
            </div>

            <Link
              href="/deals"
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-paper px-5 text-xs sm:text-sm font-semibold text-ink ring-1 ring-line shadow-xs hover:bg-card hover:shadow-clay-hover transition active:scale-95 cursor-pointer touch-manipulation"
            >
              <span>Explore perks</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          {/* Section: Good things on the horizon (Upcoming events) */}
          <section>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-xl font-bold text-ink">Good things on the horizon</h2>
                <p className="mt-0.5 text-xs text-mute">Make a little space for something memorable.</p>
              </div>

              <Link
                href="/pass"
                className="inline-flex min-h-[44px] items-center gap-1 text-xs sm:text-sm font-semibold text-accent hover:underline cursor-pointer touch-manipulation"
              >
                <span>All events</span>
                <ArrowRight size={14} />
              </Link>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
              {upcomingEventItems.map((item) => (
                <ExperienceCard key={item.id} item={item} onSelect={setSelectedExperience} />
              ))}
            </div>
          </section>

          {/* Page Footer */}
          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6 text-xs text-mute">
            <span>Made for the life between your plans.</span>
            <span>airpal.me · Curated preview</span>
          </footer>
        </div>

        {/* Right Column: Sticky Today Panel */}
        <div className="lg:sticky lg:top-24 h-fit">
          <TodayPanel />
        </div>
      </div>

      <ExperienceDialog item={selectedExperience} onClose={() => setSelectedExperience(null)} />

      <AddPlanDialog open={showAddPlan} onClose={() => setShowAddPlan(false)} />
    </div>
  );
}
