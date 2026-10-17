import { Link, useParams } from "wouter";
import { ArrowRight, Cake, MapPin } from "lucide-react";
import { BIRTHDAY_DISCLAIMER, BIRTHDAY_REGIONS, isBirthdayRegionCode } from "@shared/birthday-freebies";

/**
 * Birthday freebies — curated birthday-month rewards by region.
 * Regions come from the shared birthday model; live offers live on Deals.
 */
export function BirthdayFreebiesPage() {
  const params = useParams<{ region?: string }>();
  const raw = params.region?.trim().toLowerCase();
  const region = raw && isBirthdayRegionCode(raw) ? raw : null;
  const active = BIRTHDAY_REGIONS.find((r) => r.code === region) ?? null;

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-6 sm:px-6">
      <p className="human-eyebrow">Birthday freebies{active ? ` · ${active.label}` : ""}</p>
      <h1 className="human-title mt-2 text-2xl sm:text-3xl">
        {active ? `Birthday treats in ${active.label}.` : "Your birthday month, on us-ish."}
      </h1>
      <p className="human-lede mt-2 text-sm sm:text-base">
        Local venues share a little something in your birthday month. Pick a region, set your birthday in Settings, and
        redeem with a mate.
      </p>

      {raw && !active ? (
        <p className="mt-4 rounded-xl bg-human-blush px-4 py-3 text-sm text-human-clay">
          We don&apos;t cover “{raw}” yet — showing every region instead.
        </p>
      ) : null}

      <div className="mt-6 grid gap-2 sm:grid-cols-2">
        {BIRTHDAY_REGIONS.map((r) => {
          const on = r.code === region;
          return (
            <Link
              key={r.code}
              href={`/birthday-freebies/${r.code}`}
              aria-current={on ? "page" : undefined}
              className={
                on
                  ? "inline-flex min-h-[48px] items-center gap-2 rounded-2xl bg-brand px-4 text-sm font-semibold text-white"
                  : "human-card inline-flex min-h-[48px] items-center gap-2 px-4 text-sm font-semibold transition hover:shadow-clay-hover"
              }
            >
              <MapPin size={15} aria-hidden="true" />
              <span>
                {r.flagEmoji ? `${r.flagEmoji} ` : ""}
                {r.label}
              </span>
            </Link>
          );
        })}
      </div>

      <div className="human-card mt-4 p-5">
        <div className="flex items-center gap-3">
          <span
            className="grid h-11 w-11 place-items-center rounded-2xl bg-human-blush text-human-clay"
            aria-hidden="true"
          >
            <Cake size={22} />
          </span>
          <div>
            <h2 className="human-section-title text-base">Live offers live on Deals</h2>
            <p className="mt-0.5 text-sm text-mute">
              Birthday offers are published as member deals — approved, redeemable, and region-tagged.
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/deals"
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-brand px-5 text-sm font-semibold text-white transition hover:bg-brand-ink active:scale-95"
          >
            <span>Browse Deals</span>
            <ArrowRight size={14} />
          </Link>
          <Link
            href="/settings"
            className="inline-flex min-h-[44px] items-center rounded-full px-5 text-sm font-semibold text-ink ring-1 ring-line hover:bg-card active:scale-95"
          >
            Set my birthday
          </Link>
        </div>
        <p className="mt-4 text-xs text-mute">{BIRTHDAY_DISCLAIMER}</p>
      </div>
    </div>
  );
}
