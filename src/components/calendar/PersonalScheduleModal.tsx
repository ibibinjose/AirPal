import { useState, type FormEvent } from "react";
import {
  X,
  Calendar,
  Clock,
  MapPin,
  AlignLeft,
  Sparkles,
  Coffee,
  UtensilsCrossed,
  Dumbbell,
  Video,
  PartyPopper,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { triggerHaptic, triggerHapticSelection } from "@/lib/native";
import { SCHEDULE_TEMPLATES, getScheduleTemplate, type ScheduleTemplate } from "@/lib/schedule-templates";
import type { EventRecord } from "@shared/event";

const TEMPLATE_ICONS: Record<ScheduleTemplate["id"], LucideIcon> = {
  coffee: Coffee,
  dinner: UtensilsCrossed,
  workout: Dumbbell,
  meeting: Video,
  nightout: PartyPopper,
};

interface PersonalScheduleModalProps {
  open: boolean;
  onClose: () => void;
  defaultDate?: string;
  /** Home city used for the plan's city + venue fallback (defaults to Sydney). */
  city?: string;
  onCreated?: (event: EventRecord) => void;
  upsertEvent: (input: Partial<EventRecord> & Pick<EventRecord, "name" | "flavour">) => Promise<EventRecord>;
  setEventStatus: (eventId: string, status: "going" | "interested" | null) => Promise<void>;
}

export function PersonalScheduleModal({
  open,
  onClose,
  defaultDate,
  city,
  onCreated,
  upsertEvent,
  setEventStatus,
}: PersonalScheduleModalProps) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(defaultDate || todayStr);
  const [time, setTime] = useState("18:00");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [venue, setVenue] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const activeTemplate = templateId ? getScheduleTemplate(templateId) : undefined;

  if (!open) return null;

  function applyTemplate(template: ScheduleTemplate) {
    void triggerHapticSelection();
    setTemplateId(template.id);
    setTitle(template.title);
    setTime(template.time);
    setDurationMinutes(template.durationMinutes);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Please enter a title for your schedule entry.");
      return;
    }
    setSaving(true);
    try {
      const cleanDate = date || todayStr;
      const cleanTime = time || "12:00";
      const startsAt = `${cleanDate}T${cleanTime}:00`;
      // Template length (or the 60-minute default) with midnight/day rollover
      const lengthMinutes = Math.min(480, Math.max(15, durationMinutes || 60));
      const startDate = new Date(`${cleanDate}T${cleanTime}:00`);
      const endDate = !isNaN(startDate.getTime())
        ? new Date(startDate.getTime() + lengthMinutes * 60 * 1000)
        : new Date(Date.now() + lengthMinutes * 60 * 1000);
      const endYear = endDate.getFullYear();
      const endMonth = String(endDate.getMonth() + 1).padStart(2, "0");
      const endDay = String(endDate.getDate()).padStart(2, "0");
      const endH = String(endDate.getHours()).padStart(2, "0");
      const endM = String(endDate.getMinutes()).padStart(2, "0");
      const endsAt = `${endYear}-${endMonth}-${endDay}T${endH}:${endM}:00`;

      const planCity = city?.trim() || "Sydney";
      const created = await upsertEvent({
        name: title.trim(),
        flavour: "event_space",
        venue: venue.trim() || planCity,
        city: planCity,
        startsAt,
        endsAt,
        description: notes.trim() || undefined,
        status: "live",
      });

      await setEventStatus(created.id, "going");
      void triggerHaptic("medium");
      toast.success(`"${title.trim()}" added to your schedule!`);
      onCreated?.(created);
      onClose();
      // Reset form
      setTitle("");
      setVenue("");
      setNotes("");
      setTemplateId(null);
      setDurationMinutes(60);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save to schedule.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Add Personal Schedule Entry"
      className="visual-viewport-modal z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          void triggerHaptic("light");
          onClose();
        }
      }}
    >
      <div className="w-full max-w-lg rounded-t-[32px] sm:rounded-[32px] bg-card p-6 ring-1 ring-line/80 shadow-clay max-h-[min(92dvh,calc(var(--visual-viewport-height,100dvh)-1.5rem))] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-line">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-brand/10 text-accent">
              <Sparkles size={16} />
            </span>
            <div>
              <h2 className="text-base font-bold text-ink">Add to Personal Schedule</h2>
              <p className="text-xs text-mute">Save a catch-up, reminder, or personal plan to your agenda</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              void triggerHaptic("light");
              onClose();
            }}
            aria-label="Close"
            className="grid h-11 w-11 min-h-[44px] min-w-[44px] cursor-pointer place-items-center rounded-full text-mute transition hover:bg-paper hover:text-ink active:scale-95 touch-manipulation"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <span id="sched-templates-label" className="block text-xs font-semibold text-ink">
              Quick start
            </span>
            <div
              role="group"
              aria-labelledby="sched-templates-label"
              className="no-scrollbar -mx-1 mt-1.5 flex gap-2 overflow-x-auto px-1 pb-1"
            >
              {SCHEDULE_TEMPLATES.map((template) => {
                const Icon = TEMPLATE_ICONS[template.id];
                const selected = templateId === template.id;
                return (
                  <button
                    key={template.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => applyTemplate(template)}
                    className={
                      selected
                        ? "inline-flex min-h-[44px] shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-brand px-3.5 text-xs font-bold text-white shadow-xs transition-[background-color,transform] active:scale-95"
                        : "inline-flex min-h-[44px] shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-paper px-3.5 text-xs font-bold text-ink ring-1 ring-line transition-[background-color,transform] active:scale-95"
                    }
                  >
                    <Icon size={14} className="shrink-0" aria-hidden="true" />
                    <span className="whitespace-nowrap">
                      {template.label} · {template.durationMinutes}m
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label htmlFor="sched-title" className="block text-xs font-semibold text-ink">
              Plan or Activity <span className="text-red-500">*</span>
            </label>
            <input
              id="sched-title"
              type="text"
              required
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setTemplateId(null);
              }}
              placeholder="e.g. Dinner with Sarah, Morning Run, Coffee Catch-Up"
              maxLength={120}
              className="mt-1.5 h-11 w-full rounded-2xl bg-paper px-3.5 text-[16px] text-ink ring-1 ring-line focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="sched-date" className="block text-xs font-semibold text-ink flex items-center gap-1">
                <Calendar size={13} className="text-mute" />
                <span>Date</span>
              </label>
              <input
                id="sched-date"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1.5 h-11 w-full rounded-2xl bg-paper px-3.5 text-[15px] text-ink ring-1 ring-line focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
            <div>
              <label htmlFor="sched-time" className="block text-xs font-semibold text-ink flex items-center gap-1">
                <Clock size={13} className="text-mute" />
                <span>Start Time</span>
              </label>
              <input
                id="sched-time"
                type="time"
                required
                value={time}
                onChange={(e) => {
                  setTime(e.target.value);
                  setTemplateId(null);
                }}
                className="mt-1.5 h-11 w-full rounded-2xl bg-paper px-3.5 text-[15px] text-ink ring-1 ring-line focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
          </div>

          <div>
            <label htmlFor="sched-venue" className="block text-xs font-semibold text-ink flex items-center gap-1">
              <MapPin size={13} className="text-mute" />
              <span>Location / Venue (Optional)</span>
            </label>
            <input
              id="sched-venue"
              type="text"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              placeholder={activeTemplate ? activeTemplate.venueHint : "e.g. Local café, park, Zoom"}
              maxLength={120}
              className="mt-1.5 h-11 w-full rounded-2xl bg-paper px-3.5 text-[16px] text-ink ring-1 ring-line focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>

          <div>
            <label htmlFor="sched-notes" className="block text-xs font-semibold text-ink flex items-center gap-1">
              <AlignLeft size={13} className="text-mute" />
              <span>Notes & Reminders (Optional)</span>
            </label>
            <textarea
              id="sched-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Meeting link, table reservation, or what to bring..."
              maxLength={500}
              className="mt-1.5 w-full rounded-2xl bg-paper p-3 text-[15px] text-ink ring-1 ring-line focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>

          <div className="pt-2 flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="h-11 flex-1 font-semibold ring-1 ring-line"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving || !title.trim()}
              className="h-11 flex-1 font-bold bg-brand text-white hover:bg-brand-ink"
            >
              {saving ? "Saving…" : "Save to Schedule"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
