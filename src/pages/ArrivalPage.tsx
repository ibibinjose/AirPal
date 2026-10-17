import { Link, useParams } from "wouter";
import { ArrowRight, CalendarDays, KeyRound, Store, Ticket } from "lucide-react";

function CodeEntry({ mode }: { mode: "join" | "arrival" }) {
  const params = useParams<{ code?: string }>();
  const code = params.code?.trim();
  return (
    <div className="human-card p-5">
      <div className="flex items-center gap-3">
        <span
          className="grid h-11 w-11 place-items-center rounded-2xl bg-primary-container text-on-primary-container"
          aria-hidden="true"
        >
          <KeyRound size={22} />
        </span>
        <div>
          <h2 className="human-section-title text-base">{code ? `Code ${code}` : "Have an arrival code?"}</h2>
          <p className="mt-0.5 text-sm text-mute">
            {code
              ? "This code was shared by a venue or organiser. Pick where it belongs."
              : "Venues and organisers share short codes at the door, on tables, and on tickets."}
          </p>
        </div>
      </div>
      {code ? (
        <p className="mt-4 rounded-xl bg-paper px-4 py-3 text-center font-mono text-lg font-bold tracking-widest text-ink">
          {code}
        </p>
      ) : null}
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <Link
          href="/events"
          className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-full bg-brand px-5 text-sm font-semibold text-white transition hover:bg-brand-ink active:scale-95"
        >
          <Ticket size={15} />
          <span>{mode === "join" ? "Find it in Events" : "Find it in Events"}</span>
        </Link>
        <Link
          href="/business"
          className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-full px-5 text-sm font-semibold text-ink ring-1 ring-line hover:bg-card active:scale-95"
        >
          <Store size={15} />
          <span>Open Business hub</span>
        </Link>
      </div>
    </div>
  );
}

/**
 * Arrival — the front door for cohort/venue entry codes.
 * `/join*` is the partner path, `/arrival*` the guest path; both land here
 * and hand off to the live Events and Business pillars. No parallel system.
 */
export function ArrivalPage({ mode }: { mode: "join" | "arrival" }) {
  const isJoin = mode === "join";
  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-6 sm:px-6">
      <p className="human-eyebrow">{isJoin ? "Join" : "Arrival"}</p>
      <h1 className="human-title mt-2 text-2xl sm:text-3xl">
        {isJoin ? "Join your crew inside." : "You made it. Welcome in."}
      </h1>
      <p className="human-lede mt-2 text-sm sm:text-base">
        {isJoin
          ? "One account, one arrival. Your code connects you to the right venue, event, and people — nothing extra to install."
          : "Check the event details, grab your ticket, and find your people. Everything below is live."}
      </p>

      <div className="mt-6">
        <CodeEntry mode={mode} />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Link href="/events" className="human-card group p-5 transition hover:shadow-clay-hover">
          <CalendarDays size={20} className="text-accent" aria-hidden="true" />
          <h2 className="human-section-title mt-2 text-sm">What&apos;s on</h2>
          <p className="mt-1 text-sm text-mute">Live concerts, festivals, and gatherings near you.</p>
          <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-accent">
            Browse events <ArrowRight size={14} className="transition group-hover:translate-x-0.5" />
          </span>
        </Link>
        <Link href="/circle" className="human-card group p-5 transition hover:shadow-clay-hover">
          <Ticket size={20} className="text-accent" aria-hidden="true" />
          <h2 className="human-section-title mt-2 text-sm">Your tickets</h2>
          <p className="mt-1 text-sm text-mute">Passbook, QR entry, and belonging in one wallet.</p>
          <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-accent">
            Open wallet <ArrowRight size={14} className="transition group-hover:translate-x-0.5" />
          </span>
        </Link>
      </div>
    </div>
  );
}
