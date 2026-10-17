import { useState } from "react";
import { Link, useRoute } from "wouter";
import { ArrowLeft, Clock, MapPin, Share2, Sparkles, Ticket } from "lucide-react";
import { toast } from "sonner";
import { CURATED_EXPERIENCES } from "@/lib/curated-experiences";
import { toZonedDateStr } from "@/lib/local-time";
import { shareNative } from "@/lib/native";
import { NotFoundPage } from "./NotFoundPage";

/**
 * /experience/:id — every curated experience opens as a full shareable page,
 * never a popup. Same reserve/share/calendar actions the dialog used to own.
 */
export function ExperienceDetailPage() {
  const [, params] = useRoute("/experience/:id");
  const id = params?.id || "";
  const item = CURATED_EXPERIENCES.find((e) => e.id === id);
  if (!item) return <NotFoundPage />;
  return <ExperienceDetailView key={item.id} itemId={item.id} />;
}

function ExperienceDetailView({ itemId }: { itemId: string }) {
  const item = CURATED_EXPERIENCES.find((e) => e.id === itemId)!;
  const [selectedDate, setSelectedDate] = useState(() =>
    item.starts_at ? item.starts_at.split("T")[0] : toZonedDateStr(new Date()),
  );
  // Curated picks are discovery teasers: tickets and perks live on the real
  // Events and Deals pillars, so this page hands off instead of minting
  // wallet bookings for listings with no provider behind them.
  const liveHref = item.kind === "deal" ? "/deals" : "/events";
  const liveLabel = item.kind === "deal" ? "Find live perks" : "Find live tickets";

  const handleShare = async () => {
    await shareNative({
      title: item.title,
      text: `${item.title} · ${item.venue} on AirPal`,
      url: `https://airpal.me/experience/${item.id}`,
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

  return (
    <div className="mx-auto max-w-2xl px-4 pb-[calc(env(safe-area-inset-bottom,0px)+6.5rem)] pt-4 md:px-6 md:pt-6">
      <Link
        href="/"
        aria-label="Back to Home"
        className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-card px-3.5 text-sm font-semibold text-mute hover:text-ink ring-1 ring-line hover:bg-paper transition"
      >
        <ArrowLeft size={14} aria-hidden="true" />
        <span>Home</span>
      </Link>

      <div className="relative mt-4 aspect-[16/9] w-full overflow-hidden rounded-[28px] bg-paper ring-1 ring-line/80">
        <img
          src={item.image}
          alt={item.title}
          loading="eager"
          decoding="async"
          className="h-full w-full object-cover"
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"
          aria-hidden="true"
        />
        <div className="absolute bottom-3 left-4 flex items-center gap-2">
          <span className="rounded-full bg-brand/90 px-3 py-1 text-xs font-bold text-white shadow-xs">
            {item.badge || item.category}
          </span>
          <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white">{item.area}</span>
        </div>
      </div>

      <div className="human-eyebrow mt-5">{item.category}</div>
      <h1 className="human-title mt-1 text-3xl text-balance">{item.title}</h1>

      <div className="mt-3 flex flex-wrap items-center gap-4 text-sm font-medium text-mute">
        <div className="flex items-center gap-1.5">
          <MapPin size={15} className="text-accent/80" aria-hidden="true" />
          <span>
            {item.venue} · {item.area}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock size={15} className="text-accent/80" aria-hidden="true" />
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

      <p className="human-lede mt-4 text-sm sm:text-base">{item.description}</p>

      {item.deal && (
        <div className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 dark:border-emerald-500/20">
          <div className="flex items-center gap-2 text-sm font-bold text-emerald-800 dark:text-emerald-400">
            <Sparkles size={16} aria-hidden="true" />
            <span>{item.deal.badge}</span>
          </div>
          <p className="mt-1 text-sm text-emerald-900/90 dark:text-emerald-200/90 leading-relaxed">
            {item.deal.detail}
          </p>
        </div>
      )}

      {item.insiderTip && !item.deal && (
        <div className="human-card mt-4 p-4">
          <span className="human-eyebrow">Insider recommendation</span>
          <p className="mt-1 text-sm text-ink/90 leading-relaxed">{item.insiderTip}</p>
        </div>
      )}

      <div className="mt-5 border-t border-line/80 pt-4">
        <label htmlFor="experience-date" className="block text-sm font-semibold text-ink mb-1.5">
          When would you like to experience this?
        </label>
        <input
          id="experience-date"
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="min-h-[46px] w-full rounded-2xl border border-line bg-paper px-3.5 py-2.5 text-[16px] text-ink outline-none transition focus:border-brand dark:bg-card"
        />
      </div>

      <div className="mt-5 flex flex-col gap-3">
        <Link
          href={liveHref}
          className="inline-flex min-h-[48px] items-center justify-center gap-1.5 rounded-full bg-brand px-5 text-sm font-semibold text-white shadow-xs transition hover:bg-brand-ink active:scale-95 cursor-pointer touch-manipulation"
        >
          <Ticket size={16} aria-hidden="true" />
          <span>{liveLabel}</span>
        </Link>

        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            onClick={handleDownloadIcs}
            className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-mute hover:text-ink transition cursor-pointer touch-manipulation active:scale-95"
          >
            <Clock size={15} aria-hidden="true" />
            <span>Add to Calendar (.ics)</span>
          </button>

          <button
            type="button"
            onClick={handleShare}
            className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-mute hover:text-ink transition cursor-pointer touch-manipulation active:scale-95"
          >
            <Share2 size={15} aria-hidden="true" />
            <span>Share</span>
          </button>
        </div>
      </div>
    </div>
  );
}
