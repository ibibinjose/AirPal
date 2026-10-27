export interface TicketTierDraft {
  id: string;
  name: string;
  /** Dollars, e.g. "45". */
  price: string;
  /** Seats, e.g. "20". Empty = shares event capacity. */
  capacity: string;
}

export interface TicketFieldValues {
  paid: boolean;
  /** Dollars, e.g. "25". */
  price: string;
  /** Seats, e.g. "40". Empty = unlimited. */
  capacity: string;
  /** Named price tiers. Empty = legacy single price. */
  tiers: TicketTierDraft[];
}

/** Validate ticket fields. Returns the error message, or null when valid. */
export function validateTickets(values: TicketFieldValues): string | null {
  if (!values.paid) return null;
  const price = Number(String(values.price).replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(price) || price <= 0) return "Enter a ticket price, or switch to Free.";
  if (values.capacity.trim()) {
    const cap = Number(values.capacity.trim());
    if (!Number.isInteger(cap) || cap < 1 || cap > 2000) return "Capacity must be 1–2000, or leave it empty.";
  }
  for (let i = 0; i < values.tiers.length; i++) {
    const tier = values.tiers[i]!;
    if (!tier.name.trim()) return `Tier ${i + 1} needs a name.`;
    const tp = Number(String(tier.price).replace(/[^0-9.]/g, ""));
    if (!Number.isFinite(tp) || tp <= 0) return `Tier "${tier.name || i + 1}" needs a price above $0.`;
    if (tier.capacity.trim()) {
      const tc = Number(tier.capacity.trim());
      if (!Number.isInteger(tc) || tc < 1 || tc > 2000) return `Tier "${tier.name}" capacity must be 1–2000.`;
    }
  }
  return null;
}

interface Props {
  values: TicketFieldValues;
  onChange: (next: TicketFieldValues) => void;
}

/** Dollars → cents for the events engine. */
export function ticketValuesToCents(values: TicketFieldValues): {
  ticketPriceCents?: number;
  capacity?: number;
  ticketTiers?: { id: string; name: string; priceCents: number; capacity?: number }[];
} {
  if (!values.paid) return { ticketPriceCents: undefined, capacity: undefined, ticketTiers: undefined };
  const cents = Math.max(0, Math.round(Number(String(values.price).replace(/[^0-9.]/g, "")) * 100));
  const capRaw = values.capacity.trim();
  const cap = capRaw ? Math.floor(Number(capRaw)) : undefined;
  const tiers = values.tiers
    .map((t, i) => ({
      id:
        t.id ||
        t.name
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "") ||
        `tier-${i + 1}`,
      name: t.name.trim(),
      priceCents: Math.max(0, Math.round(Number(String(t.price).replace(/[^0-9.]/g, "")) * 100)),
      capacity: t.capacity.trim() ? Math.floor(Number(t.capacity.trim())) : undefined,
    }))
    .filter((t) => t.name && t.priceCents > 0)
    .slice(0, 8);
  return {
    ticketPriceCents: cents > 0 ? cents : undefined,
    capacity: cap && Number.isInteger(cap) && cap >= 1 && cap <= 2000 ? cap : undefined,
    ticketTiers: tiers.length ? tiers : undefined,
  };
}

export function EventTicketFields({ values, onChange }: Props) {
  const set = (patch: Partial<TicketFieldValues>) => onChange({ ...values, ...patch });
  const input =
    "h-12 w-full rounded-2xl border border-line bg-paper px-4 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 placeholder:text-mute/60";
  return (
    <div className="neu-section p-5 space-y-4">
      <p className="text-xs font-bold uppercase tracking-wider text-accent">Tickets</p>
      <div className="grid grid-cols-2 gap-2">
        {(
          [
            [false, "Free entry"],
            [true, "Paid · Stripe checkout"],
          ] as const
        ).map(([id, label]) => {
          const on = values.paid === id;
          return (
            <button
              key={label}
              type="button"
              aria-pressed={on}
              onClick={() => set({ paid: id })}
              className={
                on
                  ? "rounded-2xl px-4 py-3 text-xs sm:text-sm font-semibold transition text-left bg-brand text-white shadow-sm"
                  : "neu-card px-4 py-3 text-xs sm:text-sm font-semibold transition text-left text-mute hover:text-ink"
              }
            >
              {label}
            </button>
          );
        })}
      </div>
      {values.paid && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-mute mb-1.5 block">Price (AUD)</label>
            <input
              value={values.price}
              onChange={(e) => set({ price: e.target.value })}
              placeholder="25"
              inputMode="decimal"
              className={input}
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-mute mb-1.5 block">
              Capacity (optional)
            </label>
            <input
              value={values.capacity}
              onChange={(e) => set({ capacity: e.target.value })}
              placeholder="40"
              inputMode="numeric"
              className={input}
            />
          </div>
        </div>
      )}
      {values.paid && (
        <div className="space-y-2.5 pt-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wider text-mute block">
              Price tiers (optional)
            </label>
            {values.tiers.length < 8 && (
              <button
                type="button"
                onClick={() => set({ tiers: [...values.tiers, { id: "", name: "", price: "", capacity: "" }] })}
                className="text-xs font-bold text-accent hover:underline"
              >
                + Add tier
              </button>
            )}
          </div>
          {values.tiers.length === 0 ? (
            <p className="text-[11px] text-mute">One price for everyone — or add named tiers like General and VIP.</p>
          ) : (
            values.tiers.map((tier, i) => (
              <div
                key={i}
                className="grid grid-cols-[1fr_1fr_auto] items-center gap-2 sm:grid-cols-[1fr_84px_70px_auto]"
              >
                <input
                  value={tier.name}
                  onChange={(e) => {
                    const tiers = values.tiers.slice();
                    tiers[i] = { ...tiers[i]!, name: e.target.value };
                    set({ tiers });
                  }}
                  placeholder="VIP"
                  aria-label={`Tier ${i + 1} name`}
                  className="col-span-3 h-11 rounded-xl border border-line bg-paper px-3 text-sm outline-none transition focus:border-brand sm:col-span-1"
                />
                <input
                  value={tier.price}
                  onChange={(e) => {
                    const tiers = values.tiers.slice();
                    tiers[i] = { ...tiers[i]!, price: e.target.value };
                    set({ tiers });
                  }}
                  placeholder="$"
                  inputMode="decimal"
                  aria-label={`Tier ${i + 1} price in dollars`}
                  className="h-11 min-w-0 rounded-xl border border-line bg-paper px-3 text-sm outline-none transition focus:border-brand"
                />
                <input
                  value={tier.capacity}
                  onChange={(e) => {
                    const tiers = values.tiers.slice();
                    tiers[i] = { ...tiers[i]!, capacity: e.target.value };
                    set({ tiers });
                  }}
                  placeholder="Seats"
                  inputMode="numeric"
                  aria-label={`Tier ${i + 1} seats`}
                  className="h-11 min-w-0 rounded-xl border border-line bg-paper px-3 text-sm outline-none transition focus:border-brand"
                />
                <button
                  type="button"
                  onClick={() => set({ tiers: values.tiers.filter((_, j) => j !== i) })}
                  aria-label={`Remove tier ${i + 1}`}
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-mute transition hover:bg-rose-100 hover:text-rose-700"
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>
      )}
      <p className="text-[11px] text-mute leading-relaxed">
        {values.paid
          ? "Guests pay by card at checkout. The platform fee comes from admin settings — you receive the night's takings after the event."
          : "Free nights use the I'm-going RSVP. Switch to paid any time before tickets sell."}
      </p>
    </div>
  );
}
