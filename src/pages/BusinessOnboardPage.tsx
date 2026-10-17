import { Link } from "wouter";
import { ArrowRight, LifeBuoy, Rocket, Settings2 } from "lucide-react";

/**
 * Business onboarding / setup / helpdesk — staged entries into the real
 * Business hub. Each step hands off to live surfaces instead of forking
 * a second onboarding flow.
 */
export function BusinessOnboardPage({ step }: { step: "onboard" | "setup" | "helpdesk" }) {
  const copy = {
    onboard: {
      eyebrow: "Business · Onboard",
      title: "Put your venue on AirPal.",
      lede: "Claim your place, add the details guests actually read, and publish your first perk — most venues finish in one sitting.",
      icon: Rocket,
    },
    setup: {
      eyebrow: "Business · Setup",
      title: "Finish your venue setup.",
      lede: "Hours, contact, arrival codes, and payouts. Everything you complete here shows up instantly for guests.",
      icon: Settings2,
    },
    helpdesk: {
      eyebrow: "Business · Helpdesk",
      title: "Stuck? Talk to a human.",
      lede: "Setup questions, payouts, perks, or arrival codes — start with the help centre, then reach us directly.",
      icon: LifeBuoy,
    },
  }[step];
  const Icon = copy.icon;

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-6 sm:px-6">
      <p className="human-eyebrow">{copy.eyebrow}</p>
      <h1 className="human-title mt-2 text-2xl sm:text-3xl">{copy.title}</h1>
      <p className="human-lede mt-2 text-sm sm:text-base">{copy.lede}</p>

      <div className="human-card mt-6 p-5">
        <div className="flex items-center gap-3">
          <span
            className="grid h-11 w-11 place-items-center rounded-2xl bg-primary-container text-on-primary-container"
            aria-hidden="true"
          >
            <Icon size={22} />
          </span>
          <h2 className="human-section-title text-base">Continue where it&apos;s live</h2>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <Link
            href="/business"
            className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-full bg-brand px-5 text-sm font-semibold text-white transition hover:bg-brand-ink active:scale-95"
          >
            <span>Open Business hub</span>
            <ArrowRight size={14} />
          </Link>
          {step === "helpdesk" ? (
            <Link
              href="/help"
              className="inline-flex min-h-[44px] items-center justify-center rounded-full px-5 text-sm font-semibold text-ink ring-1 ring-line hover:bg-card active:scale-95"
            >
              Visit help centre
            </Link>
          ) : (
            <Link
              href="/claim"
              className="inline-flex min-h-[44px] items-center justify-center rounded-full px-5 text-sm font-semibold text-ink ring-1 ring-line hover:bg-card active:scale-95"
            >
              Claim a venue
            </Link>
          )}
        </div>
        {step === "helpdesk" ? (
          <p className="mt-4 text-sm text-mute">
            Prefer email?{" "}
            <Link href="/contact" className="font-semibold text-accent hover:underline">
              Contact us
            </Link>{" "}
            and mention your venue name.
          </p>
        ) : null}
      </div>
    </div>
  );
}
