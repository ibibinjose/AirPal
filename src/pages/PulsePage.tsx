import { Link, useParams } from "wouter";
import { ArrowRight, HeartHandshake, Lock } from "lucide-react";

/**
 * Pulse — belonging reports for hosts.
 * Token links (`/pulse/:token`) open a shared read-only view; everything
 * else hands off to the organiser studio where live reports live.
 */
export function PulsePage() {
  const params = useParams<{ publicToken?: string }>();
  const token = params.publicToken?.trim();

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-6 sm:px-6">
      <p className="human-eyebrow">Pulse</p>
      <h1 className="human-title mt-2 text-2xl sm:text-3xl">Did people feel they belonged?</h1>
      <p className="human-lede mt-2 text-sm sm:text-base">
        After the night ends, Pulse asks one gentle question and turns the answers into words a host can act on.
      </p>

      {token ? (
        <div className="human-card mt-6 p-5">
          <div className="flex items-center gap-3">
            <span
              className="grid h-11 w-11 place-items-center rounded-2xl bg-primary-container text-on-primary-container"
              aria-hidden="true"
            >
              <Lock size={20} />
            </span>
            <div>
              <h2 className="human-section-title text-base">Shared report</h2>
              <p className="mt-0.5 text-sm text-mute">
                Reports open inside the organiser studio, signed in as the host or a steward — shared links never expose
                guest identities.
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/event"
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-brand px-5 text-sm font-semibold text-white transition hover:bg-brand-ink active:scale-95"
            >
              <span>Open organiser studio</span>
              <ArrowRight size={14} />
            </Link>
            <Link
              href="/trust"
              className="inline-flex min-h-[44px] items-center rounded-full px-5 text-sm font-semibold text-ink ring-1 ring-line hover:bg-card active:scale-95"
            >
              How privacy works
            </Link>
          </div>
        </div>
      ) : (
        <div className="human-card mt-6 p-5">
          <div className="flex items-center gap-3">
            <span
              className="grid h-11 w-11 place-items-center rounded-2xl bg-human-blush text-human-clay"
              aria-hidden="true"
            >
              <HeartHandshake size={22} />
            </span>
            <div>
              <h2 className="human-section-title text-base">Run Pulse on your event</h2>
              <p className="mt-0.5 text-sm text-mute">
                Create an event, welcome people at the door, then read the room in the studio.
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/event"
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-brand px-5 text-sm font-semibold text-white transition hover:bg-brand-ink active:scale-95"
            >
              <span>Start in the studio</span>
              <ArrowRight size={14} />
            </Link>
            <Link
              href="/host"
              className="inline-flex min-h-[44px] items-center rounded-full px-5 text-sm font-semibold text-ink ring-1 ring-line hover:bg-card active:scale-95"
            >
              Back to Host hub
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
