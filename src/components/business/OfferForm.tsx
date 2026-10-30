import { useState, type FormEvent } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

export interface OfferDraft {
  headline: string;
  badge: string;
  window: string;
  terms: string;
}

export interface OfferPayload {
  badge: string;
  detail: string;
  claimHint: string;
}

export const EMPTY_OFFER_DRAFT: OfferDraft = { headline: "", badge: "", window: "", terms: "" };

/** Prefill the one shared form from the live deal. Terms stay blank: the live detail already carries them. */
export function dealToDraft(deal?: { badge?: string; detail?: string; claimHint?: string } | null): OfferDraft {
  if (!deal) return { ...EMPTY_OFFER_DRAFT };
  return {
    headline: deal.detail || "",
    badge: deal.badge || "",
    window: deal.claimHint || "",
    terms: "",
  };
}

/** Single validation + payload rule for every offer publish in the app. */
export function buildOfferPayload(draft: OfferDraft): { payload: OfferPayload } | { error: string } {
  const headline = draft.headline.trim();
  if (headline.length < 3) return { error: "Give your offer a clear headline (3+ characters)." };
  return {
    payload: {
      badge: draft.badge.trim() || "Member Perk",
      detail: draft.terms.trim() ? `${headline} — ${draft.terms.trim()}` : headline,
      claimHint: draft.window.trim() || "Show AirPal Pass QR at counter",
    },
  };
}

/**
 * The one offer creation form: used inside a sheet on the Business Hub Offers
 * tab and inline in the Promotions Studio. Same fields, same validation,
 * same payload — no forked creation path.
 */
export function OfferForm({
  initial,
  submitLabel,
  busy,
  onCancel,
  onSubmit,
}: {
  initial: OfferDraft;
  submitLabel: string;
  busy: boolean;
  onCancel?: () => void;
  onSubmit: (payload: OfferPayload) => Promise<void> | void;
}) {
  const [draft, setDraft] = useState<OfferDraft>(initial);
  const [headlineTouched, setHeadlineTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(key: keyof OfferDraft) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setDraft((prev) => ({ ...prev, [key]: e.target.value }));
      if (error) setError(null);
    };
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    const result = buildOfferPayload(draft);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setError(null);
    await onSubmit(result.payload);
  }

  const inputClass =
    "neu-inset h-12 w-full px-4 text-[16px] sm:text-sm outline-none transition focus:ring-2 focus:ring-brand/20";

  return (
    <form className="space-y-3" onSubmit={(e) => void submit(e)}>
      {error && (
        <p
          role="alert"
          className="rounded-xl bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-600 dark:text-red-400"
        >
          {error}
        </p>
      )}
      <div>
        <label
          htmlFor="offer-headline"
          className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-mute"
        >
          Offer Headline *
        </label>
        <input
          id="offer-headline"
          value={draft.headline}
          onChange={(e) => {
            setHeadlineTouched(true);
            setDraft((prev) => ({ ...prev, headline: e.target.value }));
            if (error) setError(null);
          }}
          onBlur={() => setHeadlineTouched(true)}
          placeholder="e.g. 2-for-1 house drink for AirPal Pass holders"
          required
          maxLength={120}
          className={inputClass}
        />
        {headlineTouched && draft.headline.trim().length < 3 && (
          <p role="alert" className="mt-1 text-xs font-semibold text-red-600 dark:text-red-400">
            Give your offer a clear headline (3+ characters).
          </p>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label
            htmlFor="offer-badge"
            className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-mute"
          >
            Badge Pill
          </label>
          <input
            id="offer-badge"
            value={draft.badge}
            onChange={set("badge")}
            placeholder="e.g. Member Perk"
            maxLength={32}
            className={inputClass}
          />
        </div>
        <div>
          <label
            htmlFor="offer-window"
            className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-mute"
          >
            Redemption Window
          </label>
          <input
            id="offer-window"
            value={draft.window}
            onChange={set("window")}
            placeholder="e.g. Thu–Sun · 5pm–8pm"
            maxLength={80}
            className={inputClass}
          />
        </div>
      </div>
      <div>
        <label htmlFor="offer-terms" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-mute">
          Terms & Counter Instructions
        </label>
        <input
          id="offer-terms"
          value={draft.terms}
          onChange={set("terms")}
          placeholder="e.g. Present AirPal Pass QR on arrival · 1 redemption per member"
          maxLength={160}
          className={inputClass}
        />
      </div>
      <div className="flex items-center gap-2 pt-1">
        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            size="lg"
            className="min-h-[44px] flex-1 neu-btn font-semibold text-mute hover:text-ink cursor-pointer"
            onClick={onCancel}
            aria-label="Cancel editing offer"
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          size="lg"
          className={cn("gap-2", onCancel ? "flex-1" : "w-full")}
          disabled={busy || draft.headline.trim().length < 3}
          loading={busy}
        >
          <Sparkles size={16} aria-hidden="true" />
          <span>{submitLabel}</span>
        </Button>
      </div>
    </form>
  );
}
