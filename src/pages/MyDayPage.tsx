import { useState } from "react";
import { Link } from "wouter";
import { Plus, CalendarDays, Download, MapPin, Trash2, ArrowLeft, Share2 } from "lucide-react";
import { usePlans } from "@/contexts/PlanContext";
import { downloadPlanIcs } from "@/lib/plan-store";
import { AddPlanDialog } from "@/components/airpal/AddPlanDialog";
import { toZonedDateStr } from "@/lib/local-time";
import { triggerHapticSelection, triggerHaptic } from "@/lib/native";
import { toast } from "sonner";
import { cn } from "@/lib/cn";

type FilterTab = "All plans" | "Today" | "Week" | "Month";

export function MyDayPage() {
  const { myPlans, deletePlan } = usePlans();
  const [adding, setAdding] = useState(false);
  const [filter, setFilter] = useState<FilterTab>("All plans");

  const todayStr = toZonedDateStr(new Date());
  const now = new Date();

  const filteredPlans = myPlans
    .filter((plan) => {
      if (filter === "All plans") return true;
      if (!plan.date) return false;
      if (filter === "Today") return plan.date.startsWith(todayStr);

      const planDate = new Date(plan.date);
      if (filter === "Week") {
        const weekAhead = new Date(now.getTime() + 7 * 86400000);
        return planDate >= now && planDate <= weekAhead;
      }
      if (filter === "Month") {
        const monthAhead = new Date(now.getTime() + 30 * 86400000);
        return planDate >= now && planDate <= monthAhead;
      }
      return true;
    })
    .sort((a, b) => {
      const dateCmp = (a.date || "").localeCompare(b.date || "");
      if (dateCmp !== 0) return dateCmp;
      return (a.time || "").localeCompare(b.time || "");
    });

  const handleDelete = async (planId: string, title: string) => {
    if (window.confirm(`Remove "${title}" from your day plans?`)) {
      void triggerHaptic("medium");
      await deletePlan(planId);
      toast.success("Plan removed");
    }
  };

  return (
    <main className="mx-auto max-w-4xl px-4 pb-[calc(env(safe-area-inset-bottom,0px)+6.5rem)] pt-3 sm:px-6 sm:pt-6">
      {/* Header breadcrumb & kicker */}
      <div className="flex items-center gap-2 mb-2">
        <Link
          href="/"
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-card px-3.5 text-xs font-semibold text-mute hover:text-ink ring-1 ring-line hover:bg-paper transition cursor-pointer touch-manipulation"
        >
          <ArrowLeft size={14} />
          <span>Home</span>
        </Link>
        <span className="text-[11px] font-bold uppercase tracking-wider text-accent">MAKE TIME FOR WHAT MATTERS</span>
      </div>

      {/* Title & Add Button */}
      <div className="flex flex-wrap items-center justify-between gap-4 mt-2">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-ink">
            Your day. Your way.
          </h1>
          <p className="mt-1 text-sm text-mute">Little plans and big moments, all in one place.</p>
        </div>

        <button
          type="button"
          onClick={() => {
            void triggerHaptic("medium");
            setAdding(true);
          }}
          className="inline-flex min-h-[48px] items-center gap-2 rounded-full bg-brand px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-ink active:scale-95 cursor-pointer touch-manipulation"
        >
          <Plus size={18} strokeWidth={2.5} />
          <span>Add a plan</span>
        </button>
      </div>

      {/* Filter Segmented Control */}
      <div className="mt-6 flex items-center gap-1 rounded-2xl border border-line bg-paper p-1.5 w-full sm:w-fit overflow-x-auto no-scrollbar">
        {(["All plans", "Today", "Week", "Month"] as FilterTab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => {
              void triggerHapticSelection();
              setFilter(tab);
            }}
            className={cn(
              "inline-flex min-h-[44px] flex-1 sm:flex-initial items-center justify-center rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold transition cursor-pointer touch-manipulation whitespace-nowrap",
              filter === tab ? "bg-card text-ink shadow-xs" : "text-mute hover:text-ink hover:bg-card/50",
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      <p className="mt-4 text-xs text-mute">
        Plans sync seamlessly across your devices. Download any plan to add it to your Apple or Google calendar.
      </p>

      {/* Plan List */}
      <div className="mt-6 flex flex-col gap-3">
        {filteredPlans.length > 0 ? (
          filteredPlans.map((plan) => {
            const planDateObj = plan.date ? new Date(plan.date) : new Date();
            const dayNum = planDateObj.getDate();
            const monthStr = planDateObj.toLocaleDateString("en-AU", { month: "short" });

            return (
              <article
                key={plan.id}
                className="group flex items-center gap-4 rounded-2xl border border-line bg-card p-4 sm:p-5 shadow-xs transition hover:border-brand/30 hover:shadow-sm"
              >
                {/* Date chip */}
                <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-paper text-ink font-display ring-1 ring-line tabular-nums">
                  <span className="text-xl font-bold leading-none">{dayNum}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-mute mt-0.5">{monthStr}</span>
                </div>

                {/* Plan Info */}
                <Link href={`/plan/${plan.id}`} className="min-w-0 flex-1 group/title cursor-pointer">
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-accent tabular-nums">
                    <span>{plan.time || "All Day"}</span>
                    <span className="opacity-40">·</span>
                    <span>{plan.theme || "Personal"}</span>
                  </div>
                  <h2 className="mt-0.5 font-display text-base font-bold text-ink leading-snug truncate group-hover/title:text-accent transition-colors">
                    {plan.title}
                  </h2>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-mute truncate">
                    <MapPin size={13} className="shrink-0 text-accent/80" />
                    <span>{plan.destination || "Wherever feels right"}</span>
                  </p>
                </Link>

                {/* Actions with Apple HIG min 44px touch targets */}
                <div className="flex items-center gap-1 shrink-0">
                  <Link
                    href={`/plan/${plan.id}?share=true`}
                    title="Share hangout & RSVP link"
                    aria-label={`Share ${plan.title}`}
                    className="grid min-h-[44px] min-w-[44px] place-items-center rounded-full text-mute hover:bg-paper hover:text-ink active:scale-95 transition cursor-pointer touch-manipulation"
                  >
                    <Share2 size={18} />
                  </Link>

                  <button
                    type="button"
                    onClick={() => {
                      void triggerHaptic("light");
                      downloadPlanIcs(plan);
                    }}
                    title="Download Calendar Invite (.ics)"
                    aria-label={`Download calendar for ${plan.title}`}
                    className="grid min-h-[44px] min-w-[44px] place-items-center rounded-full text-mute hover:bg-paper hover:text-ink active:scale-95 transition cursor-pointer touch-manipulation"
                  >
                    <Download size={18} />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(plan.id, plan.title)}
                    title="Remove plan"
                    aria-label={`Remove ${plan.title}`}
                    className="grid min-h-[44px] min-w-[44px] place-items-center rounded-full text-mute hover:bg-rose-50 hover:text-rose-600 active:scale-95 transition cursor-pointer touch-manipulation dark:hover:bg-rose-950/30"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </article>
            );
          })
        ) : (
          <div className="rounded-3xl border border-dashed border-line bg-paper/50 p-8 sm:p-12 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand/10 text-accent">
              <CalendarDays size={26} />
            </div>
            <h2 className="mt-4 font-display text-xl font-bold text-ink">A little room for possibility.</h2>
            <p className="mx-auto mt-1.5 max-w-sm text-xs text-mute leading-relaxed">
              Save an experience from Explore or add a plan of your own to build your day.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-brand px-5 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-brand-ink transition active:scale-95 cursor-pointer touch-manipulation"
              >
                <Plus size={16} />
                <span>Add custom plan</span>
              </button>
              <Link
                href="/explore"
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-line bg-card px-5 text-xs sm:text-sm font-semibold text-ink hover:bg-paper transition cursor-pointer touch-manipulation"
              >
                <span>Find your next thing →</span>
              </Link>
            </div>
          </div>
        )}
      </div>

      <AddPlanDialog open={adding} onClose={() => setAdding(false)} />
    </main>
  );
}
