import { useState } from "react";
import { Link } from "wouter";
import { ArrowUpRight, ArrowRight, CalendarDays, Plus, Sun, CloudRain, CloudSun, Ticket } from "lucide-react";
import { usePlans } from "@/contexts/PlanContext";
import { useLocalNow } from "@/contexts/LocalNowContext";
import { useMyBookings } from "@/hooks/useMyBookings";
import { weatherLabel } from "@/lib/weather";
import { toZonedDateStr } from "@/lib/local-time";
import { triggerHaptic } from "@/lib/native";
import { AddPlanDialog } from "./AddPlanDialog";
import { cn } from "@/lib/cn";

export function TodayPanel({ className }: { className?: string }) {
  const { myPlans } = usePlans();
  const { bookings } = useMyBookings();
  const { weather: liveWeather, city, today: localToday } = useLocalNow();
  const [adding, setAdding] = useState(false);

  const currentTemp = liveWeather?.temp ?? 21;
  const isRainy = (liveWeather?.code ?? 0) >= 51;
  const weatherText = liveWeather ? weatherLabel(liveWeather.code, liveWeather.isDay) : "Mostly sunny";
  const cityLabel = (city || liveWeather?.city || "Sydney").toUpperCase();

  const todayStr = localToday || toZonedDateStr(new Date());
  const todayPlans = myPlans
    .filter((p) => (p.date ? p.date.startsWith(todayStr) : false))
    .sort((a, b) => (a.time || "").localeCompare(b.time || ""));

  const todayDateFormatted = new Intl.DateTimeFormat("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  const totalPasses = bookings.length;

  return (
    <aside className={cn("today-column flex flex-col gap-4", className)}>
      {/* Weather Card */}
      <section className="relative overflow-hidden rounded-2xl border border-line bg-gradient-to-br from-[#f0f4e8] to-[#e6eed4] p-5 dark:from-[#1c221a] dark:to-[#161a15] dark:border-line/60 shadow-xs">
        <div className="relative z-10 flex items-center justify-between text-xs font-semibold tracking-wider uppercase text-[#5a6a48] dark:text-[#a0b885]">
          <span>{cityLabel}, RIGHT NOW</span>
          {isRainy ? (
            <CloudRain size={20} className="text-[#5a6a48] dark:text-[#a0b885]" />
          ) : weatherText.toLowerCase().includes("cloud") ? (
            <CloudSun size={20} className="text-[#899c4c] dark:text-[#b4c878]" />
          ) : (
            <Sun size={22} className="text-[#899c4c] dark:text-[#b4c878]" />
          )}
        </div>
        <div className="relative z-10 mt-3 font-display text-4xl font-extrabold tracking-tight text-ink tabular-nums">
          {currentTemp}°C
        </div>
        <p className="relative z-10 mt-1 text-sm font-semibold text-[#485638] dark:text-[#c4d6ad]">{weatherText}</p>
        <p className="relative z-10 mt-2 text-xs text-mute">
          {isRainy ? "A cosy corner or gallery is calling." : "A little fresh air looks good on you."}
        </p>
        {/* Soft decorative ambient circle */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full bg-gradient-to-br from-[#dfedbd]/40 to-transparent blur-xl dark:from-[#354823]/30"
        />
      </section>

      {/* Your day at a glance */}
      <section className="rounded-2xl border border-line bg-card p-5 shadow-clay transition hover:shadow-clay-hover">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-bold text-ink">Your day, at a glance</h2>
          <CalendarDays size={18} className="text-accent" />
        </div>
        <p className="mt-0.5 text-xs text-mute font-medium">{todayDateFormatted}</p>

        {/* Timeline */}
        <div className="mt-4 flex flex-col gap-2">
          {todayPlans.length > 0 ? (
            todayPlans.slice(0, 3).map((plan) => (
              <Link
                key={plan.id}
                href={`/plan/${plan.id}`}
                className="group relative block rounded-xl p-2 -ml-2 pl-5 transition hover:bg-paper/70 cursor-pointer before:absolute before:left-1.5 before:top-4 before:h-2 before:w-2 before:rounded-full before:bg-brand before:ring-2 before:ring-card"
              >
                <div className="text-[11px] font-bold text-mute uppercase tracking-wider tabular-nums">
                  {plan.time || "Today"}
                </div>
                <h3 className="text-sm font-bold text-ink leading-tight mt-0.5 group-hover:text-accent transition-colors">
                  {plan.title}
                </h3>
                <p className="text-xs text-mute mt-0.5 truncate">{plan.destination || "Personal plan"}</p>
              </Link>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-line bg-paper/60 p-4 text-center">
              <Sun size={24} className="mx-auto text-accent/80 opacity-80" />
              <p className="mt-1.5 text-xs font-bold text-ink">A little room for possibility.</p>
              <p className="mt-0.5 text-[11px] text-mute leading-relaxed">
                Your day is a blank canvas. Let&apos;s put something good on it.
              </p>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => {
            void triggerHaptic("medium");
            setAdding(true);
          }}
          className="mt-4 flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-2xl border border-line bg-paper text-xs sm:text-sm font-semibold text-ink transition hover:bg-card hover:border-brand/40 active:scale-[0.98] cursor-pointer touch-manipulation"
        >
          <Plus size={16} className="text-accent" />
          <span>Add a plan</span>
        </button>

        <Link
          href="/plan"
          className="mt-3 flex min-h-[44px] items-center justify-center gap-1.5 text-center text-xs sm:text-sm font-semibold text-accent hover:underline cursor-pointer touch-manipulation"
        >
          <span>See my plans</span>
          <ArrowRight size={14} />
        </Link>
      </section>

      {/* Wallet / Passbook Peek */}
      <Link
        href="/me/tickets"
        className="group flex items-center gap-3 rounded-2xl border border-line bg-card p-4 shadow-clay transition hover:border-brand/40 hover:shadow-clay-hover active:scale-[0.99] cursor-pointer"
      >
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand/10 text-accent transition group-hover:bg-brand group-hover:text-white">
          <Ticket size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-xs font-bold text-ink leading-snug group-hover:text-accent transition-colors">
            Good times, on hand.
          </h3>
          <p className="text-[11px] text-mute mt-0.5 truncate">
            {totalPasses > 0
              ? `${totalPasses} ${totalPasses === 1 ? "pass" : "passes"} in your pocket`
              : "Your tickets & little perks"}
          </p>
        </div>
        <ArrowUpRight
          size={16}
          className="text-mute transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent"
        />
      </Link>

      {/* Friendly daily reminder */}
      <div className="relative overflow-hidden rounded-2xl border border-line bg-gradient-to-br from-[#f8f5ee] to-[#f0ebde] p-4 text-left dark:from-[#1c1a17] dark:to-[#171512] dark:border-line/60">
        <span className="text-[10px] font-bold uppercase tracking-widest text-[#93856b] dark:text-[#bcae94]">
          A FRIENDLY REMINDER
        </span>
        <p className="mt-2 font-display text-lg font-bold leading-snug text-[#4a3e2c] dark:text-[#f0e8d5]">
          Not every plan needs to be a big one.
        </p>
        <div className="mt-2 flex items-center justify-between text-xs text-mute font-medium">
          <span>Even a coffee counts.</span>
          <span className="text-base text-amber-500">✳</span>
        </div>
      </div>

      <AddPlanDialog open={adding} onClose={() => setAdding(false)} />
    </aside>
  );
}
