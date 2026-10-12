import { useState } from "react";
import { createPortal } from "react-dom";
import { X, CalendarDays, MapPin } from "lucide-react";
import { usePlans } from "@/contexts/PlanContext";
import { useScrollLock } from "@/hooks/useScrollLock";
import { triggerHaptic } from "@/lib/native";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  defaultTitle?: string;
  defaultVenue?: string;
}

export function AddPlanDialog({ open, onClose, defaultTitle = "", defaultVenue = "" }: Props) {
  const { createPlan } = usePlans();
  const [title, setTitle] = useState(defaultTitle);
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
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
      await createPlan({
        title: title.trim(),
        type: "catchup",
        theme: "sunset",
        date,
        time,
        destination: venue.trim() || undefined,
        notes: `Created from AirPal planner.`,
      });
      toast.success("Plan added to your day!");
      onClose();
    } catch {
      toast.error("Could not save your plan. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-plan-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div onClick={onClose} className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" />

      {/* Modal card */}
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-line bg-card p-6 shadow-2xl transition-all dark:border-line/70">
        <div className="flex items-start justify-between">
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
            className="grid h-8 w-8 place-items-center rounded-full bg-paper text-mute hover:bg-card hover:text-ink ring-1 ring-line transition cursor-pointer"
          >
            <X size={16} />
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
              className="w-full rounded-xl border border-line bg-paper px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 dark:bg-card"
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
                className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-xs text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 dark:bg-card"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink mb-1.5">Time</label>
              <input
                type="time"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-xs text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 dark:bg-card"
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
                className="w-full rounded-xl border border-line bg-paper pl-9 pr-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 dark:bg-card"
              />
              <MapPin size={15} className="absolute left-3 top-3.5 text-mute" />
            </div>
          </div>

          <div className="mt-2 flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full px-4 py-2.5 text-xs font-semibold text-mute hover:bg-paper transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !title.trim()}
              className="inline-flex min-h-[42px] items-center gap-1.5 rounded-full bg-brand px-6 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-ink active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <CalendarDays size={14} />
              <span>{saving ? "Saving…" : "Save plan"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
