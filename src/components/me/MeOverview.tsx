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

/**
 * Kind → tab the row deep-links to. Rows look tappable, so they are: a dead
 * row reads as broken.
 */
export function glanceItemTab(item: Pick<OverviewGlanceItem, "kind">): OverviewTab {
  if (item.kind === "catchup") return "appointments";
  if (item.kind === "ticket") return "tickets";
  return "today";
}

function GlanceRows({ items, onOpen }: { items: OverviewGlanceItem[]; onOpen: (item: OverviewGlanceItem) => void }) {
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onOpen(item)}
          aria-label={`${item.title} — open in ${KIND_LABEL[item.kind]}`}
          className="flex min-h-[44px] w-full cursor-pointer items-center gap-3 rounded-xl px-1 text-left transition-colors min-w-0 hover:bg-paper/60 active:bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
        >
          <span className={cn("h-2 w-2 rounded-full shrink-0", KIND_DOT[item.kind])} aria-hidden="true" />
          <p className="font-bold text-sm text-ink truncate">{item.title}</p>
          <span className="text-[10px] font-bold rounded-full bg-paper px-2 py-0.5 text-mute shrink-0">
            {KIND_LABEL[item.kind]}
          </span>
          <p className="text-xs text-mute truncate ml-auto pl-2 shrink-0 max-w-[45%] text-right">{item.sub}</p>
        </button>
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

  const openItem = (item: OverviewGlanceItem) => go(glanceItemTab(item));

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
          <GlanceRows items={todayItems} onOpen={openItem} />
        ) : agendaLoading ? (
          <TodaySkeleton />
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-xs text-mute leading-relaxed">Nothing scheduled today — the day is yours.</p>
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
          <GlanceRows items={upcomingItems} onOpen={openItem} />
        ) : agendaLoading ? (
          <TodaySkeleton lines={2} />
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-xs text-mute leading-relaxed">Nothing coming up yet.</p>
            <button
              type="button"
              onClick={() => {
                void triggerHaptic("light");
                nav("/pass");
              }}
              className="neu-btn inline-flex min-h-[44px] shrink-0 items-center gap-1.5 px-4 text-xs font-bold text-ink transition-[box-shadow,transform] active:scale-95 cursor-pointer"
            >
              <Ticket size={14} className="text-amber-600" />
              <span>Browse Pass</span>
            </button>
          </div>
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
              ? "Your scannable identity for doors, Wallet, and contacts."
              : "Claim your @handle to unlock your bio pass and wallet credential."}
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
              Concerts, festivals, and member dining perks near you.
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
