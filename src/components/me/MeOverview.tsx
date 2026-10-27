import { ArrowRight, Calendar, Coffee, QrCode, Sun, Ticket } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/Button";
import { MeSection, MeSectionHeader, TodaySkeleton } from "@/components/me/MeSections";
import { triggerHaptic } from "@/lib/native";
import { cn } from "@/lib/cn";

export type OverviewTab = "today" | "appointments" | "tickets" | "pass";

export interface OverviewGlanceItem {
  id: string;
  title: string;
  sub: string;
  kind: "catchup" | "plan" | "ticket";
}

export interface OverviewHostEvent {
  id: string;
  name: string;
  detail: string;
  status: string;
}

const KIND_DOT: Record<OverviewGlanceItem["kind"], string> = {
  catchup: "bg-sky-500",
  plan: "bg-brand",
  ticket: "bg-amber-400",
};

const KIND_LABEL: Record<OverviewGlanceItem["kind"], string> = {
  catchup: "Catch-up",
  plan: "My plan",
  ticket: "Pass",
};

function GlanceRows({ items }: { items: OverviewGlanceItem[] }) {
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.id} className="flex items-center gap-3 min-w-0">
          <span className={cn("h-2 w-2 rounded-full shrink-0", KIND_DOT[item.kind])} aria-hidden="true" />
          <p className="font-bold text-sm text-ink truncate">{item.title}</p>
          <span className="text-[10px] font-bold rounded-full bg-paper px-2 py-0.5 text-mute shrink-0">
            {KIND_LABEL[item.kind]}
          </span>
          <p className="text-xs text-mute truncate ml-auto pl-2 shrink-0 max-w-[45%] text-right">{item.sub}</p>
        </div>
      ))}
    </div>
  );
}

/**
 * Overview dashboard: a dashboard, not a stack. Condensed "at a glance" and
 * "coming up" summaries route into their full tabs; full CRUD lives in
 * those tabs. Read-only here by design.
 */
export function MeOverview({
  todayItems,
  todayTotalCount,
  agendaLoading,
  upcomingItems,
  upcomingCatchupsCount,
  upcomingTicketsCount,
  hasPass,
  passHandle,
  hostEvent,
  onGoTab,
  onAddPlan,
}: {
  todayItems: OverviewGlanceItem[];
  todayTotalCount: number;
  agendaLoading: boolean;
  upcomingItems: OverviewGlanceItem[];
  upcomingCatchupsCount: number;
  upcomingTicketsCount: number;
  hasPass: boolean;
  passHandle?: string;
  hostEvent?: OverviewHostEvent | null;
  onGoTab: (tab: OverviewTab) => void;
  onAddPlan: () => void;
}) {
  const [, nav] = useLocation();

  const go = (tab: OverviewTab) => {
    void triggerHaptic("light");
    onGoTab(tab);
  };

  return (
    <div className="space-y-6">
      {/* TODAY AT A GLANCE */}
      <MeSection>
        <MeSectionHeader
          icon={<Sun size={18} />}
          tileClass="bg-brand/10 text-accent"
          title="Today at a glance"
          sub={todayTotalCount > 0 ? `${todayTotalCount} scheduled today` : "Your day is open — plan something great"}
          right={
            <button
              type="button"
              onClick={() => go("today")}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-brand px-4 text-xs font-bold text-white shadow-xs hover:bg-brand-ink transition-[background-color,transform] active:scale-95 cursor-pointer"
            >
              <span>Open Today</span>
              <ArrowRight size={13} className="shrink-0" />
            </button>
          }
        />
        {todayItems.length > 0 ? (
          <GlanceRows items={todayItems} />
        ) : agendaLoading ? (
          <TodaySkeleton />
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-xs text-mute leading-relaxed">
              No catch-ups, plans or passes scheduled for today. Turn free time into an experience!
            </p>
            <Button
              size="sm"
              className="min-h-[44px] shrink-0 rounded-full bg-brand px-5 text-xs font-bold text-white shadow-xs hover:bg-brand-ink active:scale-95"
              onClick={() => {
                void triggerHaptic("light");
                onAddPlan();
              }}
            >
              Add a plan for today
            </Button>
          </div>
        )}
      </MeSection>

      {/* COMING UP */}
      <MeSection>
        <MeSectionHeader
          icon={<Coffee size={18} />}
          tileClass="bg-sky-500/10 text-sky-600"
          title="Coming up"
          sub={
            upcomingCatchupsCount + upcomingTicketsCount > 0
              ? `${upcomingCatchupsCount} catch-ups · ${upcomingTicketsCount} passes`
              : "Nothing on the horizon yet"
          }
        />
        {upcomingItems.length > 0 ? (
          <GlanceRows items={upcomingItems} />
        ) : agendaLoading ? (
          <TodaySkeleton lines={2} />
        ) : (
          <p className="text-xs text-mute leading-relaxed">
            Nothing coming up. Browse the Pass for concerts, festivals and member perks.
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => go("appointments")}
            className="neu-btn inline-flex min-h-[44px] items-center gap-1.5 px-4 text-xs font-bold text-ink transition-[box-shadow,transform] active:scale-95 cursor-pointer"
          >
            <Coffee size={14} className="text-sky-600" />
            <span>Catch-ups</span>
          </button>
          <button
            type="button"
            onClick={() => go("tickets")}
            className="neu-btn inline-flex min-h-[44px] items-center gap-1.5 px-4 text-xs font-bold text-ink transition-[box-shadow,transform] active:scale-95 cursor-pointer"
          >
            <Ticket size={14} className="text-amber-600" />
            <span>Tickets</span>
          </button>
        </div>
      </MeSection>

      {/* PASS + HOSTING TEASERS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <MeSection className="flex flex-col justify-between">
          <MeSectionHeader
            icon={<QrCode size={18} />}
            tileClass="bg-brand/10 text-accent"
            title="Your Pass"
            sub={hasPass ? `@${passHandle} · wallet ready` : "Claim your digital pass"}
          />
          <p className="text-xs text-mute leading-relaxed mb-4">
            {hasPass
              ? "One scannable identity for contact exchange, door check-ins and Apple & Google Wallet."
              : "Claim your @handle to unlock your scannable bio pass and wallet credential."}
          </p>
          <button
            type="button"
            onClick={() => go("pass")}
            className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-full bg-brand px-4 text-xs font-bold text-white shadow-xs hover:bg-brand-ink transition-[background-color,transform] active:scale-95 cursor-pointer"
          >
            <QrCode size={14} />
            <span>{hasPass ? "Open Bio & QR Pass" : "Claim @handle"}</span>
          </button>
        </MeSection>

        {hostEvent ? (
          <MeSection className="flex flex-col justify-between">
            <MeSectionHeader
              icon={<Calendar size={18} />}
              tileClass="bg-brand/10 text-accent"
              title="Hosting"
              sub={hostEvent.status}
            />
            <p className="font-display font-bold text-base text-ink leading-snug truncate">{hostEvent.name}</p>
            <p className="text-xs text-mute mt-1 truncate mb-4">{hostEvent.detail}</p>
            <button
              type="button"
              onClick={() => {
                void triggerHaptic("light");
                nav("/event");
              }}
              className="neu-btn inline-flex min-h-[44px] items-center justify-center gap-1.5 px-4 text-xs font-bold text-ink transition-[box-shadow,transform] active:scale-95 cursor-pointer"
            >
              <span>Open studio</span>
              <ArrowRight size={13} />
            </button>
          </MeSection>
        ) : (
          <MeSection className="flex flex-col justify-between">
            <MeSectionHeader
              icon={<Ticket size={18} />}
              tileClass="bg-amber-500/10 text-amber-600"
              title="Go out tonight"
              sub="Live on AirPal Pass"
            />
            <p className="text-xs text-mute leading-relaxed mb-4">
              Concerts, cultural festivals and member dining perks happening around you.
            </p>
            <button
              type="button"
              onClick={() => {
                void triggerHaptic("light");
                nav("/pass");
              }}
              className="neu-btn inline-flex min-h-[44px] items-center justify-center gap-1.5 px-4 text-xs font-bold text-ink transition-[box-shadow,transform] active:scale-95 cursor-pointer"
            >
              <Ticket size={14} className="text-amber-600" />
              <span>Discover Passes</span>
            </button>
          </MeSection>
        )}
      </div>
    </div>
  );
}
