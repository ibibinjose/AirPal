import { useState, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { ArrowRight, ArrowUpRight, MapPin, Sparkles, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocalNow } from "@/contexts/LocalNowContext";
import { CURATED_EXPERIENCES, type ExperienceItem } from "@/lib/curated-experiences";
import { ExperienceCard } from "@/components/airpal/ExperienceCard";
import { CategoryFilters, type CategoryType } from "@/components/airpal/CategoryFilters";

export function HomePage() {
  const { user } = useAuth();
  const { city } = useLocalNow();
  const [, nav] = useLocation();

  const [category, setCategory] = useState<CategoryType>("All");
  const openExperience = (item: ExperienceItem) => nav(`/experience/${item.id}`);

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
        <div className="human-eyebrow">Life made easy</div>
        <h1 className="human-title mt-2 text-2xl sm:text-3xl">
          {firstName ? `Hey ${firstName}, good to see you ` : "Hey, good to see you "}
          <span className="text-accent inline-block" aria-hidden="true">
            ✳
          </span>
        </h1>
        <p className="human-lede text-sm sm:text-base">
          A whole city of possibilities. Real places, real people, one day at a time.
        </p>
      </div>

      {/* Hero Banner — Editorial Luma Craft */}
      <section className="relative overflow-hidden rounded-3xl bg-[#121614] text-white shadow-md">
        {/* Cover Photo with Subtle Parallax/Dark Gradient */}
        <div className="absolute inset-0" aria-hidden="true">
          <img
            src="/media/harbour.jpg"
            alt=""
            loading="eager"
            decoding="async"
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

          <h2 className="mt-3 font-display text-3xl sm:text-5xl font-extrabold leading-[1.08] tracking-tight text-white text-balance">
            Less scrolling. <br />
            More <span className="font-serif italic font-normal text-amber-300">living.</span>
          </h2>

          <p className="mt-3 max-w-lg text-sm sm:text-base text-white/85 leading-relaxed">
            Find your kind of places and people. Everyone is welcome here.
          </p>

          <div className="mt-6 flex flex-col items-stretch gap-2.5 min-[380px]:flex-row min-[380px]:items-center sm:flex-wrap sm:gap-3">
            <Link
              href="/events"
              className="inline-flex min-h-[48px] flex-1 sm:flex-initial items-center justify-center gap-2 whitespace-nowrap rounded-full bg-brand px-5 sm:px-6 text-xs sm:text-sm font-semibold text-white shadow-sm transition hover:bg-brand-ink active:scale-95 cursor-pointer touch-manipulation"
            >
              <span>What's on</span>
              <ArrowUpRight size={16} className="shrink-0" />
            </Link>

            <Link
              href="/circle"
              className="inline-flex min-h-[48px] flex-1 sm:flex-initial items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-white/15 px-5 text-xs sm:text-sm font-semibold text-white ring-1 ring-white/30 backdrop-blur-md hover:bg-white/25 transition active:scale-95 cursor-pointer touch-manipulation"
            >
              <Users size={16} className="shrink-0" />
              <span>Find your circle</span>
            </Link>
          </div>
        </div>

        {/* Location Tag */}
        <div className="absolute bottom-4 right-5 hidden sm:flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1 text-[10px] font-bold tracking-widest uppercase text-white/80 backdrop-blur-md">
          <MapPin size={11} className="text-amber-300" aria-hidden="true" />
          <span>{city || "Sydney"} &amp; A Little Beyond</span>
        </div>
      </section>

      {/* Category Pills Bar */}
      <div className="mt-6">
        <CategoryFilters value={category} onChange={setCategory} />
      </div>

      {/* Experiences & Events feed */}
      <div className="mt-8">
        <div className="flex flex-col gap-10">
          {/* Section: What Now? */}
          <section aria-labelledby="what-now-heading">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles size={18} className="text-accent" aria-hidden="true" />
                  <h2 id="what-now-heading" className="human-section-title text-xl">
                    What now?
                  </h2>
                </div>
                <p className="mt-0.5 text-sm text-mute">A few ideas for wherever the day takes you.</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
              {whatNowItems.map((item) => (
                <ExperienceCard key={item.id} item={item} onSelect={openExperience} />
              ))}
            </div>
          </section>

          {/* Banner: A little perk goes a long way */}
          <div className="human-card flex flex-wrap items-center justify-between gap-4 p-5">
            <div className="flex items-center gap-3.5">
              <div
                className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-human-blush text-human-clay"
                aria-hidden="true"
              >
                <Sparkles size={22} />
              </div>
              <div>
                <h3 className="human-section-title text-sm">A little perk goes a long way.</h3>
                <p className="text-sm text-mute mt-0.5">Local dining perks and friendly offers near you.</p>
              </div>
            </div>

            <Link
              href="/deals"
              className="inline-flex min-h-[44px] w-full sm:w-auto items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-paper px-5 text-xs sm:text-sm font-semibold text-ink ring-1 ring-line shadow-xs hover:bg-card hover:shadow-clay-hover transition active:scale-95 cursor-pointer touch-manipulation"
            >
              <span>Explore perks</span>
              <ArrowRight size={14} className="shrink-0" />
            </Link>
          </div>

          {/* Section: Good things on the horizon (Upcoming events) */}
          <section aria-labelledby="horizon-heading">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 id="horizon-heading" className="human-section-title text-xl">
                  Good things on the horizon
                </h2>
                <p className="mt-0.5 text-sm text-mute">Make a little space for something memorable.</p>
              </div>

              <Link
                href="/events"
                className="inline-flex min-h-[44px] items-center gap-1 text-xs sm:text-sm font-semibold text-accent hover:underline cursor-pointer touch-manipulation"
              >
                <span>All events</span>
                <ArrowRight size={14} />
              </Link>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
              {upcomingEventItems.map((item) => (
                <ExperienceCard key={item.id} item={item} onSelect={openExperience} />
              ))}
            </div>
          </section>

          {/* Page sign-off (the global SiteFooter owns the contentinfo landmark) */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6 text-sm text-mute">
            <span>Made for every human, every day.</span>
            <span>airpal.me</span>
          </div>
        </div>
      </div>
    </div>
  );
}
