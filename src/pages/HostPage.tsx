import { Link } from "wouter";
import { ArrowRight, CalendarPlus, HeartHandshake, Store } from "lucide-react";

/**
 * Host hub — the front door for organisers and venues.
 * Hands off to the real studio surfaces: event creation, belonging
 * reports, and the business hub. No duplicate tooling lives here.
 */
export function HostPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-6 sm:px-6">
      <p className="human-eyebrow">Host</p>
      <h1 className="human-title mt-2 text-2xl sm:text-3xl">Host something people belong to.</h1>
      <p className="human-lede mt-2 text-sm sm:text-base">
        Create the event, read the room while it&apos;s live, and keep the regulars coming back.
      </p>

      <div className="mt-6 grid gap-3">
        <Link href="/event" className="human-card group p-5 transition hover:shadow-clay-hover">
          <div className="flex items-center gap-3">
            <span
              className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary-container text-on-primary-container"
              aria-hidden="true"
            >
              <CalendarPlus size={22} />
            </span>
            <div className="min-w-0">
              <h2 className="human-section-title text-base">Organiser studio</h2>
              <p className="mt-0.5 text-sm text-mute">
                Create events, sell native tickets, scan doors, and manage the guestlist.
              </p>
            </div>
          </div>
          <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-accent">
            Open studio <ArrowRight size={14} className="transition group-hover:translate-x-0.5" />
          </span>
        </Link>

        <Link href="/host/pulse" className="human-card group p-5 transition hover:shadow-clay-hover">
          <div className="flex items-center gap-3">
            <span
              className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-human-blush text-human-clay"
              aria-hidden="true"
            >
              <HeartHandshake size={22} />
            </span>
            <div className="min-w-0">
              <h2 className="human-section-title text-base">Belonging reports</h2>
              <p className="mt-0.5 text-sm text-mute">
                Pulse check-ins show how welcome people felt — in plain words, not dashboards.
              </p>
            </div>
          </div>
          <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-accent">
            Read Pulse <ArrowRight size={14} className="transition group-hover:translate-x-0.5" />
          </span>
        </Link>

        <Link href="/business" className="human-card group p-5 transition hover:shadow-clay-hover">
          <div className="flex items-center gap-3">
            <span
              className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary-container text-on-primary-container"
              aria-hidden="true"
            >
              <Store size={22} />
            </span>
            <div className="min-w-0">
              <h2 className="human-section-title text-base">Business hub</h2>
              <p className="mt-0.5 text-sm text-mute">
                Claim your venue, publish perks, and keep arrival codes in one place.
              </p>
            </div>
          </div>
          <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-accent">
            Open Business hub <ArrowRight size={14} className="transition group-hover:translate-x-0.5" />
          </span>
        </Link>
      </div>
    </div>
  );
}
