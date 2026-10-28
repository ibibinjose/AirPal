import { Link } from "wouter";
import { Activity, ArrowRight, CalendarClock, ClipboardList, Gift, Settings2 } from "lucide-react";

export interface TonightAction {
  id: string;
  title: string;
  detail: string;
  href: string;
}

export interface TonightInput {
  listingActive: boolean;
  listingName: string;
  dealLive: boolean;
  campaigns: number;
  rsvps: number;
}

/**
 * Tonight action queue: at most three next moves, highest leverage first.
 * Pure so the priority order stays pinned by unit tests.
 */
export function tonightActions(input: TonightInput): TonightAction[] {
  const actions: TonightAction[] = [];
  if (!input.listingActive) {
    actions.push({
      id: "setup",
      title: "Finish getting live",
      detail: `${input.listingName || "Your venue"} is still a draft — run the setup checklist.`,
      href: "/business/setup",
    });
  }
  if (!input.dealLive) {
    actions.push({
      id: "offer",
      title: "Publish your first offer",
      detail: "Members act on perks — a live offer turns lookers into covers.",
      href: "/business?tab=offer",
    });
  }
  if (input.campaigns === 0) {
    actions.push({
      id: "campaign",
      title: "Promote tonight",
      detail: "No active campaigns. Put tonight in front of nearby AirPals.",
      href: "/business/promotions",
    });
  }
  if (input.rsvps > 0) {
    actions.push({
      id: "door",
      title: `${input.rsvps} ${input.rsvps === 1 ? "guest" : "guests"} incoming`,
      detail: "Review the door list before service starts.",
      href: "/business?tab=list",
    });
  }
  return actions.slice(0, 3);
}

export function BusinessTonight({
  listingName,
  status,
  hours,
  dealLive,
  dealBadge,
  campaigns,
  rsvps,
}: {
  listingName: string;
  status: string;
  hours: string;
  dealLive: boolean;
  dealBadge?: string;
  campaigns: number;
  rsvps: number;
}) {
  const active = status === "active";
  const actions = tonightActions({ listingActive: active, listingName, dealLive, campaigns, rsvps });

  return (
    <div className="space-y-4">
      {/* Service card: state as icon + text, hours as given */}
      <section
        aria-label="Tonight service status"
        className="rounded-3xl bg-card p-5 ring-1 ring-line shadow-clay sm:p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className={
                active
                  ? "grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/25 dark:text-emerald-400"
                  : "grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-amber-500/10 text-amber-600 ring-1 ring-amber-500/25 dark:text-amber-400"
              }
              aria-hidden="true"
            >
              <CalendarClock size={20} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-ink">
                {active ? "Live tonight" : "Not live yet"} · {listingName || "Your venue"}
              </p>
              <p className="mt-0.5 truncate text-xs text-mute">{hours || "Hours not set — add them in Venue"}</p>
            </div>
          </div>
          <span className="inline-flex min-h-[44px] items-center rounded-full bg-paper px-3.5 text-xs font-bold text-ink ring-1 ring-line tabular-nums">
            {rsvps} {rsvps === 1 ? "RSVP" : "RSVPs"}
          </span>
        </div>

        <Link
          href="/business?tab=list"
          className="mt-4 flex min-h-[64px] items-center justify-between gap-3 rounded-2xl bg-brand px-5 text-sm font-bold text-white shadow-sm transition hover:bg-brand/95 active:scale-[0.99]"
        >
          <span className="inline-flex items-center gap-2">
            <ClipboardList size={18} aria-hidden="true" />
            <span>Open door list</span>
          </span>
          <ArrowRight size={18} aria-hidden="true" />
        </Link>
      </section>

      {/* Action queue: at most three, each a button to the exact place */}
      <section
        aria-label="Needs your attention"
        className="rounded-3xl bg-card p-5 ring-1 ring-line shadow-clay sm:p-6"
      >
        <p className="text-xs font-bold uppercase tracking-wider text-accent">Needs your attention</p>
        {actions.length === 0 ? (
          <p className="mt-2 text-sm text-mute">All clear — venue live, offer up, campaigns running. Enjoy service.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {actions.map((a) => (
              <li key={a.id}>
                <Link
                  href={a.href}
                  className="flex min-h-[56px] items-center justify-between gap-3 rounded-2xl bg-paper px-4 py-2.5 ring-1 ring-line transition hover:ring-ink/20"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-ink">{a.title}</span>
                    <span className="block truncate text-xs text-mute">{a.detail}</span>
                  </span>
                  <ArrowRight size={16} className="shrink-0 text-mute" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Offers + belonging strip */}
      <section aria-label="Offers and belonging" className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/business?tab=offer"
          className="flex min-h-[56px] items-center gap-3 rounded-3xl bg-card px-4 ring-1 ring-line shadow-clay transition hover:ring-ink/20"
        >
          <Gift size={18} className="shrink-0 text-amber-500" aria-hidden="true" />
          <span className="min-w-0">
            <span className="block text-xs font-bold text-ink">{dealLive ? "Offer live" : "Offer off"}</span>
            <span className="block truncate text-xs text-mute">
              {dealLive ? dealBadge || "Members can claim it now" : "Publish one to fill tables"}
            </span>
          </span>
        </Link>
        <Link
          href="/host/pulse"
          className="flex min-h-[56px] items-center gap-3 rounded-3xl bg-card px-4 ring-1 ring-line shadow-clay transition hover:ring-ink/20"
        >
          <Activity size={18} className="shrink-0 text-accent" aria-hidden="true" />
          <span className="min-w-0">
            <span className="block text-xs font-bold text-ink">Belonging pulse</span>
            <span className="block truncate text-xs text-mute">
              {campaigns > 0
                ? `${campaigns} active ${campaigns === 1 ? "campaign" : "campaigns"}`
                : "See how guests felt"}
            </span>
          </span>
        </Link>
      </section>

      {/* Overflow: setup lives one tap away, not as a tab */}
      <Link
        href="/business/setup"
        className="inline-flex min-h-[44px] items-center gap-1.5 text-xs font-semibold text-accent hover:underline"
      >
        <Settings2 size={13} aria-hidden="true" />
        <span>Setup checklist</span>
      </Link>
    </div>
  );
}
