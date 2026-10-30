import { Link } from "wouter";
import { TicketCheck, Users, Gift, Store } from "lucide-react";
import { CHECKIN_POINTS, REDEEM_POINTS, REFERRAL_POINTS } from "@shared/promotions";

const EARN_ROWS = [
  {
    icon: Users,
    title: "Bring a mate",
    detail: `+${REFERRAL_POINTS} points when someone joins with your link.`,
    href: "/friends",
    cta: "Invite mates",
  },
  {
    icon: TicketCheck,
    title: "Get scanned in",
    detail: `+${CHECKIN_POINTS} points when your ticket or RSVP is scanned at the door.`,
    href: "/me/tickets",
    cta: "My tickets",
  },
  {
    icon: Store,
    title: "Redeem in-store",
    detail: `+${REDEEM_POINTS} points when staff verify your deal at the till.`,
    href: "/deals",
    cta: "Browse deals",
  },
  {
    icon: Gift,
    title: "Spend points",
    detail: "Points-priced offers below unlock with your balance.",
    href: "/deals",
    cta: "Browse deals",
  },
] as const;

export function RewardsEarnList() {
  return (
    <section aria-label="How to earn" className="neu-section p-5 sm:p-6 space-y-3">
      <h2 className="font-display text-lg font-bold text-ink">How to earn</h2>
      <ul className="space-y-2">
        {EARN_ROWS.map((row) => (
          <li key={row.title} className="neu-card flex items-center justify-between gap-3 p-4">
            <div className="flex items-center gap-3 min-w-0">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand/10 text-accent">
                <row.icon size={17} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-ink">{row.title}</p>
                <p className="text-xs text-mute leading-relaxed">{row.detail}</p>
              </div>
            </div>
            <Link
              href={row.href}
              className="inline-flex min-h-[44px] shrink-0 items-center rounded-full bg-paper px-4 text-xs font-bold text-ink transition hover:bg-card active:scale-95"
            >
              {row.cta}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
