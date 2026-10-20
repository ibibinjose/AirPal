import { useState, type FormEvent } from "react";
import { Link, useLocation, useParams } from "wouter";
import { toast } from "sonner";
import { ArrowRight, CalendarDays, KeyRound, Store, Ticket, Users } from "lucide-react";

function CodeEntry({ mode }: { mode: "join" | "arrival" }) {
  const [, nav] = useLocation();
  const params = useParams<{ code?: string }>();
  const code = params.code?.trim();
  const [inputCode, setInputCode] = useState(code || "");

  function handleApplyCode(e: FormEvent) {
    e.preventDefault();
    const cleaned = inputCode.trim().toUpperCase();
    if (!cleaned) {
      toast.info("Enter your arrival or cohort code first.");
      return;
    }
    nav(mode === "join" ? `/join/${encodeURIComponent(cleaned)}` : `/arrival/${encodeURIComponent(cleaned)}`);
  }

  return (
    <div className="human-card p-5 sm:p-6 space-y-4">
      <div className="flex items-start gap-3">
        <span
          className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary-container text-on-primary-container"
          aria-hidden="true"
        >
          <KeyRound size={22} />
        </span>
        <div>
          <h2 className="human-section-title text-base">{code ? `Code ${code}` : "Have an arrival or cohort code?"}</h2>
          <p className="mt-0.5 text-sm text-mute">
            {code
              ? "This code was shared by a venue, university, or organiser. Pick where it belongs below."
              : "Venues, hosts, and cohort partners share short codes at the door, on tables, and on passes."}
          </p>
        </div>
      </div>

      {code ? (
        <div className="flex items-center justify-between gap-2 rounded-2xl bg-paper px-4 py-3 ring-1 ring-line">
          <span className="font-mono text-lg font-bold tracking-widest text-ink">{code}</span>
          <Link
            href={mode === "join" ? "/join" : "/arrival"}
            className="inline-flex min-h-[44px] items-center px-2 -mx-2 text-xs font-semibold text-accent hover:underline"
          >
            Change code
          </Link>
        </div>
      ) : (
        <form onSubmit={handleApplyCode} className="flex flex-col sm:flex-row gap-2">
          <input
            value={inputCode}
            onChange={(e) => setInputCode(e.target.value)}
            placeholder="Enter arrival or cohort code (e.g. SYD-WELCOME)"
            maxLength={32}
            aria-label="Arrival or cohort code"
            className="h-12 flex-1 rounded-2xl border border-line bg-paper px-4 font-mono text-[16px] sm:text-sm uppercase tracking-wider text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 placeholder:font-sans placeholder:normal-case placeholder:tracking-normal"
          />
          <button
            type="submit"
            className="inline-flex min-h-[48px] items-center justify-center gap-1.5 rounded-2xl bg-brand px-5 text-sm font-bold text-white shadow-xs transition hover:bg-brand-ink active:scale-95"
          >
            <span>Unlock Code</span>
            <ArrowRight size={15} />
          </button>
        </form>
      )}

      <div className="grid gap-2.5 sm:grid-cols-2 pt-1">
        <Link
          href="/events"
          className="inline-flex min-h-[48px] items-center justify-center gap-1.5 rounded-2xl bg-brand px-5 text-sm font-semibold text-white transition hover:bg-brand-ink active:scale-95"
        >
          <Ticket size={15} />
          <span>Find it in Events</span>
        </Link>
        <Link
          href="/business"
          className="inline-flex min-h-[48px] items-center justify-center gap-1.5 rounded-2xl bg-paper px-5 text-sm font-semibold text-ink ring-1 ring-line hover:bg-card active:scale-95"
        >
          <Store size={15} />
          <span>Open Business Hub</span>
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
      <p className="human-eyebrow">{isJoin ? "Join · Cohort & Arrival Engine" : "Arrival"}</p>
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

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Link
          href="/events"
          className="human-card group p-5 transition hover:shadow-clay-hover flex flex-col justify-between"
        >
          <div>
            <CalendarDays size={20} className="text-accent" aria-hidden="true" />
            <h2 className="human-section-title mt-2 text-sm">What&apos;s on</h2>
            <p className="mt-1 text-xs sm:text-sm text-mute">Live concerts, markets, and gatherings near you.</p>
          </div>
          <span className="mt-3 inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-accent">
            Browse events <ArrowRight size={14} className="transition group-hover:translate-x-0.5" />
          </span>
        </Link>
        <Link
          href="/me/tickets"
          className="human-card group p-5 transition hover:shadow-clay-hover flex flex-col justify-between"
        >
          <div>
            <Ticket size={20} className="text-accent" aria-hidden="true" />
            <h2 className="human-section-title mt-2 text-sm">Your tickets</h2>
            <p className="mt-1 text-xs sm:text-sm text-mute">Apple &amp; Google Wallet passes and dynamic QR entry.</p>
          </div>
          <span className="mt-3 inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-accent">
            Open wallet <ArrowRight size={14} className="transition group-hover:translate-x-0.5" />
          </span>
        </Link>
        <Link
          href="/circle"
          className="human-card group p-5 transition hover:shadow-clay-hover flex flex-col justify-between"
        >
          <div>
            <Users size={20} className="text-accent" aria-hidden="true" />
            <h2 className="human-section-title mt-2 text-sm">Networking Circle</h2>
            <p className="mt-1 text-xs sm:text-sm text-mute">Check in live at the venue and meet people here now.</p>
          </div>
          <span className="mt-3 inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-accent">
            Open Circle <ArrowRight size={14} className="transition group-hover:translate-x-0.5" />
          </span>
        </Link>
      </div>
    </div>
  );
}
