import { Link } from "wouter";

/** Honest dead end for a routed event id that resolves to nothing. Never a demo event. */
export function EventStudioNotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 pb-24 pt-16 text-center">
      <p className="human-eyebrow">Event studio</p>
      <h1 className="human-title mt-2 text-2xl">Couldn’t find that event</h1>
      <p className="human-lede mt-2 text-sm">
        It may have been removed, or the link is incomplete. Start a new one — it takes a minute.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Link
          href="/event"
          className="inline-flex min-h-[44px] items-center rounded-full bg-brand px-5 text-sm font-semibold text-white transition hover:bg-brand-ink active:scale-95"
        >
          Open event studio
        </Link>
        <Link
          href="/events"
          className="inline-flex min-h-[44px] items-center rounded-full px-5 text-sm font-semibold text-ink ring-1 ring-line transition hover:bg-card active:scale-95"
        >
          Browse events
        </Link>
      </div>
    </div>
  );
}
