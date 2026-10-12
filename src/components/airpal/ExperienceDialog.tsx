import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, MapPin, Clock, Sparkles, CalendarDays, Check, Share2, Ticket } from "lucide-react";
import { type ExperienceItem } from "@/lib/curated-experiences";
import { usePlans } from "@/contexts/PlanContext";
import { useAuth } from "@/contexts/AuthContext";
import { useScrollLock } from "@/hooks/useScrollLock";
import { toZonedDateStr } from "@/lib/local-time";
import { triggerHaptic, shareNative } from "@/lib/native";
import { readCachedBookings, writeCachedBookings, type BookingWithId } from "@/hooks/useMyBookings";
import { toast } from "sonner";
import { cn } from "@/lib/cn";

interface Props {
  item: ExperienceItem | null;
  onClose: () => void;
}

export function ExperienceDialog({ item, onClose }: Props) {
  const { user } = useAuth();
  const { myPlans, createPlan } = usePlans();
  const [selectedDate, setSelectedDate] = useState(() =>
    item?.starts_at ? item.starts_at.split("T")[0] : toZonedDateStr(new Date()),
  );
  const [booked, setBooked] = useState(false);
  const [planning, setPlanning] = useState(false);

  useScrollLock(Boolean(item));

  // Support ESC key dismissal
  useEffect(() => {
    if (!item) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [item, onClose]);

  if (!item || typeof document === "undefined") return null;

  const isSavedInPlans = myPlans.some((p) => p.title.toLowerCase() === item.title.toLowerCase() || p.id === item.id);

  const handleAddToDay = async () => {
    setPlanning(true);
    try {
      void triggerHaptic("medium");
      await createPlan({
        title: item.title,
        type: "walk",
        theme: "sunset",
        date: selectedDate,
        time: item.open_hour ? `${String(item.open_hour).padStart(2, "0")}:00` : "14:00",
        destination: item.venue,
        heroImage: item.image,
        notes: item.description,
      });
      toast.success("Added to your day!");
    } catch {
      toast.error("Could not add to day.");
    } finally {
      setPlanning(false);
    }
  };

  const handleClaimPass = () => {
    void triggerHaptic("medium");
    setBooked(true);
    const passId = `pass-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const passUid =
      user?.uid || (typeof window !== "undefined" ? localStorage.getItem("airpal.anon.id") : null) || "guest";
    const newBooking: BookingWithId = {
      id: passId,
      requestId: "",
      planId: "",
      customerUid: passUid,
      providerUid: "airpal-experiences",
      providerKind: "business",
      providerName: item.venue,
      title: item.title,
      suburb: item.area,
      date: selectedDate,
      time: item.open_hour ? `${String(item.open_hour).padStart(2, "0")}:00` : "12:00",
      priceCents: 0,
      feeCents: 0,
      paymentStatus: "paid",
      status: "confirmed",
      cancelReason: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const cached = readCachedBookings(passUid);
    writeCachedBookings(passUid, [newBooking, ...cached]);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("airpal:bookings-updated"));
    }
    toast.success(
      item.kind === "deal"
        ? "Perk voucher claimed! Stored in your Passbook."
        : "Event pass reserved! Check your Passbook.",
    );
  };

  const handleShare = async () => {
    await shareNative({
      title: item.title,
      text: `${item.title} · ${item.venue} on AirPal`,
      url: window.location.href,
    });
  };

  const handleDownloadIcs = () => {
    const start = item.starts_at ? new Date(item.starts_at) : new Date();
    const end = new Date(start.getTime() + 7200000);
    const dateToCal = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    const escapeCal = (s: string) => s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/[,;]/g, "\\$&");

    const text = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//AirPal//Experience//EN",
      "BEGIN:VEVENT",
      `UID:${item.id}@airpal.me`,
      `DTSTAMP:${dateToCal(new Date())}`,
      `DTSTART:${dateToCal(start)}`,
      `DTEND:${dateToCal(end)}`,
      `SUMMARY:${escapeCal(item.title)}`,
      `LOCATION:${escapeCal(`${item.venue}, ${item.area}`)}`,
      `DESCRIPTION:${escapeCal(item.description)}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const blob = new Blob([text], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${item.id}-airpal.ics`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Calendar invite downloaded (.ics)");
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="exp-dialog-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 sm:p-6"
    >
      {/* Backdrop */}
      <div onClick={onClose} className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" />

      {/* Dialog / Bottom Sheet Card */}
      <div className="apple-mobile-sheet relative z-10 flex max-h-[92vh] sm:max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-t-[32px] sm:rounded-3xl border border-line bg-card shadow-2xl dark:border-line/70">
        {/* Photo Header */}
        <div className="relative aspect-[16/9] w-full shrink-0 bg-paper">
          <img src={item.image} alt={item.title} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />

          {/* Close button with HIG 44px touch target */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="absolute right-3.5 top-3.5 grid min-h-[44px] min-w-[44px] place-items-center rounded-full bg-black/60 text-white shadow-md backdrop-blur-md hover:bg-black/80 transition cursor-pointer touch-manipulation active:scale-95"
          >
            <X size={18} />
          </button>

          {/* Badges on image */}
          <div className="absolute bottom-3 left-4 flex items-center gap-2">
            <span className="rounded-full bg-brand/90 px-3 py-1 text-xs font-bold text-white shadow-xs backdrop-blur-md">
              {item.badge || item.category}
            </span>
            <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white shadow-xs backdrop-blur-md">
              {item.area}
            </span>
          </div>
        </div>

        {/* Content Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 pb-[max(1.75rem,calc(env(safe-area-inset-bottom,0px)+1.25rem))] sm:pb-6">
          <div className="text-[11px] font-bold uppercase tracking-wider text-accent">{item.category}</div>
          <h2 id="exp-dialog-title" className="font-display text-2xl font-bold text-ink mt-1 leading-snug">
            {item.title}
          </h2>

          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs font-medium text-mute">
            <div className="flex items-center gap-1.5">
              <MapPin size={15} className="text-accent/80" />
              <span>
                {item.venue} · {item.area}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock size={15} className="text-accent/80" />
              <span>
                {item.starts_at
                  ? new Intl.DateTimeFormat("en-AU", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(item.starts_at))
                  : `${String(item.open_hour ?? 9).padStart(2, "0")}:00 – ${String(item.close_hour ?? 22).padStart(2, "0")}:00`}
              </span>
            </div>
          </div>

          <p className="mt-4 text-sm text-ink/80 leading-relaxed">{item.description}</p>

          {/* Insider Tip / Deal Box */}
          {item.deal && (
            <div className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 dark:border-emerald-500/20">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-400">
                <Sparkles size={16} />
                <span>{item.deal.badge}</span>
              </div>
              <p className="mt-1 text-xs text-emerald-900/90 dark:text-emerald-200/90 leading-relaxed">
                {item.deal.detail}
              </p>
            </div>
          )}

          {item.insiderTip && !item.deal && (
            <div className="mt-4 rounded-2xl border border-line bg-paper/70 p-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-mute">INSIDER RECOMMENDATION</span>
              <p className="mt-1 text-xs text-ink/90 leading-relaxed">{item.insiderTip}</p>
            </div>
          )}

          {/* Date Picker for Adding to Day */}
          <div className="mt-5 border-t border-line/80 pt-4">
            <label className="block text-xs font-semibold text-ink mb-1.5">
              When would you like to experience this?
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="min-h-[46px] w-full rounded-2xl border border-line bg-paper px-3.5 py-2.5 text-[16px] text-ink outline-none transition focus:border-brand dark:bg-card"
            />
          </div>

          {/* Action Row */}
          <div className="mt-5 flex flex-col gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handleAddToDay}
                disabled={planning}
                className={cn(
                  "inline-flex min-h-[48px] items-center justify-center gap-1.5 rounded-full border px-5 text-sm font-semibold transition active:scale-95 cursor-pointer touch-manipulation",
                  isSavedInPlans
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                    : "border-line bg-card text-ink hover:bg-paper hover:border-brand/40",
                )}
              >
                {isSavedInPlans ? (
                  <>
                    <Check size={16} className="text-emerald-600" />
                    <span>In My Day</span>
                  </>
                ) : (
                  <>
                    <CalendarDays size={16} className="text-accent" />
                    <span>{planning ? "Saving…" : "Add to My Day"}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleClaimPass}
                className={cn(
                  "inline-flex min-h-[48px] items-center justify-center gap-1.5 rounded-full px-5 text-sm font-semibold shadow-xs transition active:scale-95 cursor-pointer touch-manipulation",
                  booked ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-brand text-white hover:bg-brand-ink",
                )}
              >
                <Ticket size={16} />
                <span>
                  {booked ? "Pass In Pocket ✓" : item.kind === "deal" ? "Claim Perk Pass" : "Reserve Free Pass"}
                </span>
              </button>
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={handleDownloadIcs}
                className="inline-flex min-h-[44px] items-center gap-1.5 text-xs sm:text-sm font-semibold text-mute hover:text-ink transition cursor-pointer touch-manipulation active:scale-95"
              >
                <Clock size={15} />
                <span>Add to Calendar (.ics)</span>
              </button>

              <button
                type="button"
                onClick={handleShare}
                className="inline-flex min-h-[44px] items-center gap-1.5 text-xs sm:text-sm font-semibold text-mute hover:text-ink transition cursor-pointer touch-manipulation active:scale-95"
              >
                <Share2 size={15} />
                <span>Share</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
