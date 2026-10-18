import { Link, useParams } from "wouter";
import { ArrowLeft, ArrowRight, Building2, HeartHandshake, Lock, QrCode, Users } from "lucide-react";

/**
 * Pulse — belonging reports for hosts.
 * Token links (`/pulse/:token`) open a shared read-only view; everything
 * else hands off to the organiser studio where live reports live.
 */
export function PulsePage() {
  const params = useParams<{ publicToken?: string }>();
  const token = params.publicToken?.trim();

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-6 sm:px-6 space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/business"
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-card px-3.5 text-xs font-semibold text-mute ring-1 ring-line transition hover:bg-paper hover:text-ink"
        >
          <ArrowLeft size={14} />
          <span>Business Hub</span>
        </Link>
        <Link
          href="/event"
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-card px-3.5 text-xs font-semibold text-mute ring-1 ring-line transition hover:bg-paper hover:text-ink"
        >
          <span>Event Studio</span>
        </Link>
        <Link
          href="/join"
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-card px-3.5 text-xs font-semibold text-mute ring-1 ring-line transition hover:bg-paper hover:text-ink"
        >
          <Users size={13} className="text-accent" />
          <span>Arrival Engine</span>
        </Link>
        <Link
          href="/scan"
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-card px-3.5 text-xs font-semibold text-mute ring-1 ring-line transition hover:bg-paper hover:text-ink"
        >
          <QrCode size={13} className="text-accent" />
          <span>Door Scanner</span>
        </Link>
      </div>

      <div>
        <p className="human-eyebrow">Pulse · Belonging &amp; Host Reports</p>
        <h1 className="human-title mt-2 text-2xl sm:text-3xl">Did people feel they belonged?</h1>
        <p className="human-lede mt-2 text-sm sm:text-base">
          After the night ends, Pulse asks one gentle question and turns the answers into aggregate insights a host can
          act on.
        </p>
      </div>

      {token ? (
        <div className="human-card p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span
              className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary-container text-on-primary-container"
              aria-hidden="true"
            >
              <Lock size={20} />
            </span>
            <div>
              <h2 className="human-section-title text-base">Shared report ({token})</h2>
              <p className="mt-0.5 text-sm text-mute">
                Reports open inside the organiser studio, signed in as the host or a steward — shared links never expose
                guest identities.
              </p>
            </div>
          </div>
          <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
            <Link
              href="/event"
              className="inline-flex min-h-[48px] items-center justify-center gap-1.5 rounded-2xl bg-brand px-5 text-sm font-semibold text-white transition hover:bg-brand-ink active:scale-95"
            >
              <span>Open Organiser Studio</span>
              <ArrowRight size={14} />
            </Link>
            <Link
              href="/trust"
              className="inline-flex min-h-[48px] items-center justify-center rounded-2xl bg-paper px-5 text-sm font-semibold text-ink ring-1 ring-line hover:bg-card active:scale-95"
            >
              How privacy works
            </Link>
          </div>
        </div>
      ) : (
        <div className="human-card p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span
              className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-human-blush text-human-clay"
              aria-hidden="true"
            >
              <HeartHandshake size={22} />
            </span>
            <div>
              <h2 className="human-section-title text-base">Run Pulse on your venue or event</h2>
              <p className="mt-0.5 text-sm text-mute">
                Create an event, welcome people at the door with QR check-in, then read the room in the studio.
              </p>
            </div>
          </div>
          <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
            <Link
              href="/event"
              className="inline-flex min-h-[48px] items-center justify-center gap-1.5 rounded-2xl bg-brand px-5 text-sm font-semibold text-white transition hover:bg-brand-ink active:scale-95"
            >
              <span>Open Event Studio</span>
              <ArrowRight size={14} />
            </Link>
            <Link
              href="/business"
              className="inline-flex min-h-[48px] items-center justify-center gap-1.5 rounded-2xl bg-paper px-5 text-sm font-semibold text-ink ring-1 ring-line hover:bg-card active:scale-95"
            >
              <Building2 size={15} className="text-accent" />
              <span>Open Business Hub</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
