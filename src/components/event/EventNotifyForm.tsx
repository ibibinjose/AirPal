import { useState } from "react";
import { Link } from "wouter";
import { BellRing, Check } from "lucide-react";
import { toast } from "sonner";
import { validateGuestlistSignup } from "@shared/airpal-guestlist";
import { joinGuestlistSignupRemote } from "@/lib/functions";
import { ensureAnonymousSession } from "@/lib/firebase";
import { triggerHaptic } from "@/lib/native";

/**
 * Notify-me capture for closed or ended events. Writes a real guestlist
 * signup scoped to the event (`source = event:{id}`), so hosts can invite
 * these guests to the next instance. Unsubscribe anytime via /unsubscribe.
 */
export function EventNotifyForm({ eventId, eventTitle }: { eventId: string; eventTitle: string }) {
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (sending || done) return;
    const problems = validateGuestlistSignup({ name, city, email, interests: [], source: `event:${eventId}` });
    if (problems.length > 0) {
      toast.error(problems[0] || "Check the form and try again.");
      return;
    }
    void triggerHaptic("medium");
    setSending(true);
    try {
      await ensureAnonymousSession();
      await joinGuestlistSignupRemote({
        name: name.trim(),
        city: city.trim(),
        email: email.trim(),
        interests: [],
        source: `event:${eventId}`,
      });
      setDone(true);
      toast.success("You're on the notify list");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't join. Try again.");
    } finally {
      setSending(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl bg-emerald-500/10 p-4 ring-1 ring-emerald-500/25 text-center">
        <p className="flex items-center justify-center gap-1.5 text-sm font-bold text-emerald-700 dark:text-emerald-300">
          <Check size={15} strokeWidth={3} aria-hidden="true" />
          <span>You&apos;re on the list</span>
        </p>
        <p className="mt-1 text-xs leading-relaxed text-mute">
          We&apos;ll email you when “{eventTitle}” opens again or a similar gathering drops.{" "}
          <Link href="/unsubscribe" className="font-semibold underline">
            Unsubscribe anytime
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2.5 text-left">
      <div className="flex items-center gap-2">
        <BellRing size={15} className="shrink-0 text-accent" aria-hidden="true" />
        <p className="text-sm font-bold text-ink">Notify me next time</p>
      </div>
      <label htmlFor={`notify-name-${eventId}`} className="sr-only">
        Your name
      </label>
      <input
        id={`notify-name-${eventId}`}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Your name"
        autoComplete="name"
        maxLength={80}
        className="h-11 min-h-[44px] w-full rounded-xl bg-card px-3.5 text-[16px] text-ink ring-1 ring-line outline-none placeholder:text-mute focus:ring-2 focus:ring-brand/40"
      />
      <label htmlFor={`notify-city-${eventId}`} className="sr-only">
        Your city
      </label>
      <input
        id={`notify-city-${eventId}`}
        value={city}
        onChange={(e) => setCity(e.target.value)}
        placeholder="Your city"
        autoComplete="address-level2"
        maxLength={60}
        className="h-11 min-h-[44px] w-full rounded-xl bg-card px-3.5 text-[16px] text-ink ring-1 ring-line outline-none placeholder:text-mute focus:ring-2 focus:ring-brand/40"
      />
      <label htmlFor={`notify-email-${eventId}`} className="sr-only">
        Your email
      </label>
      <input
        id={`notify-email-${eventId}`}
        type="email"
        inputMode="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        autoComplete="email"
        autoCapitalize="none"
        className="h-11 min-h-[44px] w-full rounded-xl bg-card px-3.5 text-[16px] text-ink ring-1 ring-line outline-none placeholder:text-mute focus:ring-2 focus:ring-brand/40"
      />
      <button
        type="submit"
        disabled={sending}
        className="min-h-[44px] h-11 w-full rounded-full bg-brand text-sm font-bold text-white transition hover:bg-brand-ink active:scale-[0.99] disabled:opacity-60 cursor-pointer touch-manipulation"
      >
        {sending ? "Joining…" : "Notify me"}
      </button>
      <p className="text-center text-[11px] leading-relaxed text-mute">
        One email when this event returns.{" "}
        <Link href="/unsubscribe" className="font-semibold underline">
          Unsubscribe anytime
        </Link>
        .
      </p>
    </form>
  );
}
