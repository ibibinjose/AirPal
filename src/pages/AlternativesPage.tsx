import { Link, useParams } from "wouter";
import { ArrowRight, Compass } from "lucide-react";

const KNOWN = new Set(["luma", "eventbrite", "meetup", "partiful", "allevents"]);

/** Alternatives — a calm, honest comparison landing for a named alternative. */
export function AlternativesPage() {
  const params = useParams<{ slug?: string }>();
  const slug = params.slug?.trim().toLowerCase() ?? "";
  const name = KNOWN.has(slug) ? slug.charAt(0).toUpperCase() + slug.slice(1) : "elsewhere";

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-6 sm:px-6">
      <p className="human-eyebrow">Alternatives</p>
      <h1 className="human-title mt-2 text-2xl sm:text-3xl">Coming from {name}? Here&apos;s the difference.</h1>
      <p className="human-lede mt-2 text-sm sm:text-base">
        Most tools sell tickets <em>or</em> host communities. AirPal does the whole evening: discovery, ticketing, door
        scanning, and the people you met — under one account.
      </p>

      <div className="human-card mt-6 p-5">
        <div className="flex items-center gap-3">
          <span
            className="grid h-11 w-11 place-items-center rounded-2xl bg-primary-container text-on-primary-container"
            aria-hidden="true"
          >
            <Compass size={22} />
          </span>
          <h2 className="human-section-title text-base">Try the whole evening, not just the ticket</h2>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <Link
            href="/events"
            className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-brand px-5 text-sm font-semibold text-white transition hover:bg-brand-ink active:scale-95"
          >
            Browse events
          </Link>
          <Link
            href="/circle"
            className="inline-flex min-h-[44px] items-center justify-center rounded-full px-5 text-sm font-semibold text-ink ring-1 ring-line hover:bg-card active:scale-95"
          >
            Meet the Circle
          </Link>
          <Link
            href="/business"
            className="inline-flex min-h-[44px] items-center justify-center rounded-full px-5 text-sm font-semibold text-ink ring-1 ring-line hover:bg-card active:scale-95"
          >
            For venues
          </Link>
        </div>
        <p className="mt-4 text-sm text-mute">
          Want the full story?{" "}
          <Link href="/about" className="inline-flex items-center gap-1 font-semibold text-accent hover:underline">
            About AirPal <ArrowRight size={13} />
          </Link>
        </p>
      </div>
    </div>
  );
}
