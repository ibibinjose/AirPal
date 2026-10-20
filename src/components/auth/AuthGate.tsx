import { useMemo } from "react";
import { useLocation } from "wouter";
import { Bell, Building2, CalendarDays, CheckCircle2, Lock, ShieldCheck, Sparkles, Store } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

export function AuthGate({
  next,
  kicker,
  title,
  lede,
}: {
  next: string;
  kicker?: string;
  title: string;
  lede?: string;
}) {
  const [, nav] = useLocation();

  const roleInfo = useMemo(() => {
    const target = (next || kicker || title || "").toLowerCase();
    if (target.includes("circle")) {
      return {
        icon: Sparkles,
        role: "guest",
        badge: kicker || "AirPal Circle",
        title: title || "Start your Circle",
        description: lede || "Sign in to invite your audience, set a status, announce, and catch up.",
        benefits: [
          "Bring followers and friends into one Circle",
          "Announce, or share I’m here at an event",
          "Set a status. Catch up together.",
        ],
        accentColor: "text-accent",
        accentBg: "bg-brand/10",
      };
    }
    if (target.includes("/w/") || target.includes("wave")) {
      return {
        icon: Sparkles,
        role: "guest",
        badge: kicker || "Wave",
        title: title || "Wave back",
        description: lede || "Someone nearby is greeting AirPals. Sign in to wave back — no phone numbers.",
        benefits: [
          "Greet the venue or person in the room",
          "They see your @handle, not your number",
          "Follow up in Circle if you want",
        ],
        accentColor: "text-accent",
        accentBg: "bg-brand/10",
      };
    }
    if (target.includes("inbox") || target.includes("notification")) {
      return {
        icon: Bell,
        role: "guest",
        badge: kicker || "Notifications",
        title: title || "Your inbox",
        description: lede || "Announcements from Circles you follow, events, and results — in one quiet list.",
        benefits: ["Circle announcements from people you follow", "Event updates in one list", "Alerts you control"],
        accentColor: "text-accent",
        accentBg: "bg-brand/10",
      };
    }
    if (target.includes("host")) {
      return {
        icon: Building2,
        role: "host",
        badge: kicker || "Host Workspace",
        title: title || "Host Account Required",
        description:
          lede || "Sign in or create a host account to manage your venues and events, door entry, and guest feedback.",
        benefits: [
          "Event studio, door scanner & guestlist",
          "AirPal Pulse feedback with live QR codes",
          "Business bio, deals & promotions",
        ],
        accentColor: "text-amber-600 dark:text-amber-400",
        accentBg: "bg-amber-500/10",
      };
    }
    if (target.includes("business") || target.includes("place")) {
      return {
        icon: Store,
        role: "business",
        badge: kicker || "Your place",
        title: title || "Add your place",
        description:
          lede || "Sign in to import your Google listing, publish offers, and show up when people nearby are looking.",
        benefits: [
          "Claim your verified local @handle and public card",
          "Publish live discounts & perks (e.g. 15% off for guests)",
          "Featured placement in neighbourhood discovery walks",
        ],
        accentColor: "text-emerald-600 dark:text-emerald-400",
        accentBg: "bg-emerald-500/10",
      };
    }
    if (target.includes("/event/new") || (title || "").toLowerCase().includes("create an event")) {
      return {
        icon: CalendarDays,
        role: "event",
        badge: kicker || "Event",
        title: title || "Create an event",
        description: lede || "Public nights and ticketed shows — list yours in minutes.",
        benefits: [
          "Free or paid tickets for a public event",
          "Show up on Home and Calendar",
          "Guests pay by card — you get paid after the night",
        ],
        accentColor: "text-accent",
        accentBg: "bg-brand/10",
      };
    }
    if (target.includes("event")) {
      return {
        icon: CalendarDays,
        role: "event",
        badge: kicker || "Event Organiser",
        title: title || "Organiser Dashboard",
        description:
          lede ||
          "Sign in or create an account to set up market, expo, or festival directories, gate QR codes, and stall manager.",
        benefits: [
          "Instant gate QR codes for contactless visitor entry",
          "Interactive stall map, categories & CSV import",
          "Live visitor sentiment and emoji ratings",
        ],
        accentColor: "text-sky-600 dark:text-sky-400",
        accentBg: "bg-sky-500/10",
      };
    }
    if (target.includes("claim") || target.includes("venue")) {
      return {
        icon: Store,
        role: "business",
        badge: kicker || "Venue Claims",
        title: title || "Claim Your Venue",
        description:
          lede || "Sign in to prove your link to a venue, request ownership, and manage it as the verified owner.",
        benefits: [
          "Request ownership of your Google-listed venue",
          "Approval mints your draft venue page",
          "Publish it when ready — nothing goes public first",
        ],
        accentColor: "text-accent",
        accentBg: "bg-brand/10",
      };
    }
    return {
      icon: ShieldCheck,
      role: "guest",
      badge: kicker || "AirPal Account",
      title: title || "Sign in to continue",
      description: lede || "Log in or sign up to start a Circle, catch up, save places, and book events.",
      benefits: [
        "Invite family and friends into your Circle",
        "Catch up with people nearby",
        "Event tickets and saved places on one login",
      ],
      accentColor: "text-accent",
      accentBg: "bg-brand/10",
    };
  }, [next, kicker, title, lede]);

  const RoleIcon = roleInfo.icon;
  const q = `next=${encodeURIComponent(next)}&role=${roleInfo.role}`;

  return (
    <div className="mx-auto max-w-md px-4 py-12 md:py-16">
      <div className="rounded-3xl bg-card p-6 md:p-8 ring-1 ring-line shadow-clay text-center">
        {/* Role Icon */}
        <div
          className={cn(
            "mx-auto grid h-14 w-14 place-items-center rounded-2xl",
            roleInfo.accentBg,
            roleInfo.accentColor,
          )}
        >
          <RoleIcon size={26} strokeWidth={2} />
        </div>

        {/* Badge & Headings */}
        <p className={cn("mt-4 text-[11px] font-semibold uppercase tracking-[0.18em]", roleInfo.accentColor)}>
          {roleInfo.badge}
        </p>
        <h1 className="font-display mt-1 text-2xl md:text-3xl font-semibold text-ink">{roleInfo.title}</h1>
        <p className="mt-2 text-xs md:text-sm text-mute leading-relaxed">{roleInfo.description}</p>

        {/* Value Bullet Points */}
        <div className="mt-6 space-y-2.5 rounded-2xl bg-paper p-4 text-left ring-1 ring-line">
          {roleInfo.benefits.map((b) => (
            <div key={b} className="flex items-start gap-2.5 text-xs">
              <CheckCircle2 size={16} className={cn("shrink-0 mt-0.5", roleInfo.accentColor)} />
              <span className="text-ink font-medium leading-snug">{b}</span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="mt-6 space-y-2.5">
          <Button className="w-full text-sm font-semibold h-11" onClick={() => nav(`/start?tab=signin&${q}`)}>
            Sign In with Email or Social
          </Button>
          <Button variant="ghost" className="w-full text-sm h-11" onClick={() => nav(`/start?tab=signup&${q}`)}>
            Create Free Account
          </Button>
        </div>

        {/* Safety Note */}
        <div className="mt-5 flex items-center justify-center gap-1.5 text-[11px] text-mute">
          <Lock size={12} />
          <span>Secure authentication · Fast & spam-free</span>
        </div>
      </div>

      <p className="mt-4 text-center">
        <button
          type="button"
          onClick={() => nav("/")}
          className="text-xs text-mute hover:text-ink transition underline"
        >
          ← Back to home
        </button>
      </p>
    </div>
  );
}
