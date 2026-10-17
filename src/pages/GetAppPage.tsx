import { Link } from "wouter";
import { ArrowRight, CalendarDays, Smartphone, Ticket, Users } from "lucide-react";

/** Get the app — one page for web, iOS, and Android. No store-badge maze. */
export function GetAppPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-6 sm:px-6">
      <p className="human-eyebrow">Get AirPal</p>
      <h1 className="human-title mt-2 text-2xl sm:text-3xl">One account, every screen.</h1>
      <p className="human-lede mt-2 text-sm sm:text-base">
        AirPal runs in your browser today and as a native app on your phone. Same sign-in, same tickets, same circle —
        pick whichever is closest.
      </p>

      <div className="human-card mt-6 p-5">
        <div className="flex items-center gap-3">
          <span
            className="grid h-11 w-11 place-items-center rounded-2xl bg-primary-container text-on-primary-container"
            aria-hidden="true"
          >
            <Smartphone size={22} />
          </span>
          <div>
            <h2 className="human-section-title text-base">Use it right now</h2>
            <p className="mt-0.5 text-sm text-mute">
              You&apos;re already here. Add this page to your home screen and it behaves like an app.
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <Link
            href="/events"
            className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-full bg-brand px-5 text-sm font-semibold text-white transition hover:bg-brand-ink active:scale-95"
          >
            <CalendarDays size={15} />
            <span>What&apos;s on</span>
          </Link>
          <Link
            href="/me/tickets"
            className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-full px-5 text-sm font-semibold text-ink ring-1 ring-line hover:bg-card active:scale-95"
          >
            <Ticket size={15} />
            <span>My tickets</span>
          </Link>
          <Link
            href="/circle"
            className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-full px-5 text-sm font-semibold text-ink ring-1 ring-line hover:bg-card active:scale-95"
          >
            <Users size={15} />
            <span>My circle</span>
          </Link>
        </div>
      </div>

      <p className="mt-4 text-sm text-mute">
        On native builds the same screens run inside the AirPal and AirPal Pass shells.{" "}
        <Link href="/help" className="inline-flex items-center gap-1 font-semibold text-accent hover:underline">
          Need a hand? <ArrowRight size={13} />
        </Link>
      </p>
    </div>
  );
}
