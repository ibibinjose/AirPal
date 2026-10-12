import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "wouter";
import { X, CalendarDays, MapPin, ArrowRight } from "lucide-react";
import { usePlans } from "@/contexts/PlanContext";
import { useScrollLock } from "@/hooks/useScrollLock";
import { toZonedDateStr } from "@/lib/local-time";
import { triggerHaptic } from "@/lib/native";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  defaultTitle?: string;
  defaultVenue?: string;
}

export function AddPlanDialog({ open, onClose, defaultTitle = "", defaultVenue = "" }: Props) {
  const [, navigate] = useLocation();
  const { createPlan } = usePlans();
  const [title, setTitle] = useState(defaultTitle);
  const [date, setDate] = useState(() => toZonedDateStr(new Date()));
  const [time, setTime] = useState("18:00");
  const [venue, setVenue] = useState(defaultVenue);
  const [saving, setSaving] = useState(false);

  useScrollLock(open);

  if (!open || typeof document === "undefined") return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSaving(true);
    try {
      void triggerHaptic("medium");
      const created = await createPlan({
        title: title.trim(),
        type: "catchup",
        theme: "sunset",
        date,
        time,
        destination: venue.trim() || undefined,
        notes: `Created from AirPal planner.`,
      });
      toast.success("Hangout created! Share with your friends.");
      onClose();
      if (created?.id) {
        navigate(`/plan/${created.id}?share=true`);
      }
    } catch {
      toast.error("Could not save your plan. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Support ESC key dismissal
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-plan-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
    >
      {/* Backdrop */}
      <div onClick={onClose} className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" />

      {/* Sheet / Modal card */}
      <div className="apple-mobile-sheet relative z-10 w-full max-w-md overflow-y-auto rounded-t-[32px] sm:rounded-3xl border border-line bg-card p-5 sm:p-6 shadow-2xl transition-all pb-[max(1.75rem,calc(env(safe-area-inset-bottom,0px)+1.25rem))] sm:pb-6 dark:border-line/70">
        {/* Mobile Grab Handle */}
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-line/80 sm:hidden" />

        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-accent">DAY PLANNER</span>
            <h2 id="add-plan-title" className="font-display text-xl font-bold text-ink mt-0.5">
              Make time for what matters.
            </h2>
            <p className="text-xs text-mute mt-1">Add something good to look forward to.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="grid min-h-[44px] min-w-[44px] place-items-center rounded-full bg-paper text-mute hover:bg-card hover:text-ink ring-1 ring-line transition cursor-pointer touch-manipulation active:scale-95"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-ink mb-1.5">
              What are you planning? <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              maxLength={120}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Coffee at Fine Food Store, Ferry to Manly"
              autoCapitalize="sentences"
              autoComplete="off"
              className="min-h-[46px] w-full rounded-2xl border border-line bg-paper px-4 py-2.5 text-[16px] text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 dark:bg-card"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-ink mb-1.5">Date</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="min-h-[46px] w-full rounded-2xl border border-line bg-paper px-3.5 py-2.5 text-[16px] text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 dark:bg-card"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink mb-1.5">Time</label>
              <input
                type="time"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="min-h-[46px] w-full rounded-2xl border border-line bg-paper px-3.5 py-2.5 text-[16px] text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 dark:bg-card"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink mb-1.5">Location / Venue</label>
            <div className="relative">
              <input
                type="text"
                maxLength={150}
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                placeholder="e.g. The Rocks, Circular Quay, Bondi Beach"
                autoCapitalize="words"
                autoComplete="off"
                className="min-h-[46px] w-full rounded-2xl border border-line bg-paper pl-10 pr-4 py-2.5 text-[16px] text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 dark:bg-card"
              />
              <MapPin size={16} className="absolute left-3.5 top-3.5 text-mute" />
            </div>
          </div>

          <div className="mt-3 flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-[44px] items-center rounded-full px-5 py-2.5 text-xs font-semibold text-mute hover:bg-paper transition cursor-pointer touch-manipulation active:scale-95"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !title.trim()}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-brand px-6 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm transition hover:bg-brand-ink active:scale-95 disabled:opacity-50 cursor-pointer touch-manipulation"
            >
              <CalendarDays size={15} />
              <span>{saving ? "Saving…" : "Save plan"}</span>
            </button>
          </div>

          <div className="mt-3 border-t border-line/70 pt-3 text-center">
            <button
              type="button"
              onClick={() => {
                onClose();
                navigate("/plan/new");
              }}
              className="text-xs font-semibold text-accent hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Need a multi-stop itinerary or custom theme? Open full creator</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
