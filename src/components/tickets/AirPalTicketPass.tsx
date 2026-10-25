import { useEffect, useState } from "react";
import { Link } from "wouter";
import { CheckCircle2, Download, Share2, Sun, SunMedium, Ticket, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { AppleWalletButton } from "@/components/ui/AppleWalletButton";
import { GoogleWalletButton } from "@/components/ui/GoogleWalletButton";
import { AddToCalendarMenu } from "@/components/calendar/AddToCalendarMenu";
import { googleWalletTicketUrl, openAppleWalletPass, openGoogleWalletPass, ticketWalletPassUrl } from "@/lib/wallet";
import { makeQrDataUrl } from "@/lib/qr";
import { publicSiteOrigin } from "@/lib/public-origin";
import { shareNative, triggerHaptic } from "@/lib/native";
import { useLocalNow } from "@/hooks/useLocalNow";
import { bookingDisplayPaid, ticketGateUrl, type Booking } from "@shared/booking";
import { cn } from "@/lib/cn";

interface Props {
  booking: Booking & { id: string };
  guestName?: string;
  hostName?: string;
  showActions?: boolean;
}

/** Gate-scan URL for the ticket QR. Same path the Apple and Google wallet barcodes encode. */
export function ticketQrHref(booking: Booking & { id: string }): string {
  return ticketGateUrl(booking, publicSiteOrigin());
}

/**
 * AirPal ticket pass — the wallet face for every booking. AirPal brand
 * chrome, same information architecture as a wallet pass: brand, event,
 * date/time, location, guest, host, and a gate QR.
 */
export function AirPalTicketPass({ booking, guestName, hostName, showActions = true }: Props) {
  const [qr, setQr] = useState("");
  const [highContrast, setHighContrast] = useState(false);
  const paid = bookingDisplayPaid(booking);
  const { today } = useLocalNow();

  useEffect(() => {
    let cancelled = false;
    void makeQrDataUrl(ticketQrHref(booking), 320)
      .then((url) => {
        if (!cancelled) setQr(url);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [booking.id, booking.eventId]);

  const when = [booking.date, booking.time].filter(Boolean).join(" · ");
  const where = [booking.suburb].filter(Boolean).join("");
  const isToday = booking.date === today;
  const isAdmitted = Boolean(booking.admittedAt);
  const spots = booking.spots || 1;

  function print() {
    if (typeof document !== "undefined") document.body.classList.add("printing-ticket");
    if (typeof window !== "undefined") window.print();
    if (typeof document !== "undefined") {
      window.setTimeout(() => document.body.classList.remove("printing-ticket"), 500);
    }
  }

  async function share() {
    void triggerHaptic("light");
    await shareNative({
      title: `Ticket — ${booking.title}`,
      text: `My ticket for ${booking.title} (${when})`,
      url: ticketQrHref(booking).replace(publicSiteOrigin(), ""),
    });
  }

  const toggleHighContrast = () => {
    void triggerHaptic("selection");
    setHighContrast((prev) => !prev);
  };

  return (
    <article className="ticket-pass overflow-hidden rounded-[28px] sm:rounded-3xl bg-brand text-white shadow-md ring-1 ring-white/15 transition-[box-shadow,transform]">
      {/* Top Banner & Date Header */}
      <div className="flex items-start justify-between px-5 pt-4">
        <div>
          <p className="font-display text-2xl font-black tracking-tight text-white">
            airpal<span className="text-amber-300"> pass</span>
          </p>
          {spots > 1 && (
            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-bold text-white backdrop-blur-sm">
              <Users size={11} /> {spots} Passes
            </span>
          )}
        </div>

        <div className="text-right">
          <p className="text-[13px] font-bold leading-tight text-white/95">{booking.date}</p>
          {booking.time && <p className="text-xs font-semibold text-white/80">{booking.time}</p>}
          {isToday && !isAdmitted && (
            <span className="mt-1 inline-block rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-black shadow-xs motion-safe:animate-pulse">
              Today
            </span>
          )}
        </div>
      </div>

      <h3 className="px-5 pt-3 font-display text-[22px] font-bold leading-snug text-balance">{booking.title}</h3>

      {/* Booking Details Grid */}
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 px-5 pt-3 text-[14px]">
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">Location</dt>
          <dd className="font-semibold leading-snug">{where || "See event page"}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">Booking ID</dt>
          <dd className="font-mono text-[12px] leading-snug">{booking.id.slice(0, 12)}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">Pass Holder</dt>
          <dd className="font-semibold leading-snug truncate">{guestName || "Ticket holder"}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">Organiser</dt>
          <dd className="font-semibold leading-snug truncate">{hostName || booking.providerName}</dd>
        </div>
      </dl>

      {/* QR Code Canvas with optional Contrast Boost for Dark Entrance Gates */}
      <div
        className={cn(
          "relative flex flex-col items-center justify-center px-5 pb-2 pt-4 transition-colors",
          highContrast ? "bg-white p-6" : "",
        )}
      >
        {qr ? (
          <div className="relative">
            <img
              src={qr}
              alt={`Ticket QR for ${booking.title}`}
              className={cn(
                "h-44 w-44 rounded-2xl bg-white p-2.5 shadow-sm transition-[transform,box-shadow] duration-200",
                highContrast ? "scale-105 shadow-xl ring-4 ring-black" : "",
              )}
            />
          </div>
        ) : (
          <p className="py-8 text-[13px] opacity-70">Preparing secure QR pass…</p>
        )}

        <button
          type="button"
          onClick={toggleHighContrast}
          aria-label={highContrast ? "Switch to normal contrast" : "Boost screen contrast for gate scanners"}
          className={cn(
            "mt-2.5 inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-3.5 text-xs font-bold transition-[background-color,transform] active:scale-95 cursor-pointer touch-manipulation",
            highContrast
              ? "bg-black text-white hover:bg-neutral-800"
              : "bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm",
          )}
          title="Enhance contrast for dark venue door scanners"
        >
          {highContrast ? <SunMedium size={12} /> : <Sun size={12} />}
          <span>{highContrast ? "Normal Contrast" : "Boost Brightness for Gate"}</span>
        </button>
      </div>

      {/* Gate Status Pill */}
      <p className="flex items-center justify-center gap-1.5 px-5 pb-4 pt-1 text-[12px] font-semibold text-white/95">
        {isAdmitted ? (
          <>
            <CheckCircle2 size={14} className="text-emerald-300" />
            <span>Admitted at gate · Enjoy the experience!</span>
          </>
        ) : (
          <>
            <Ticket size={14} />
            <span>{paid ? "Paid on AirPal — scan at the door" : "Unpaid hold — complete payment to activate"}</span>
          </>
        )}
      </p>

      {showActions && (
        <div className="no-print flex flex-col gap-2.5 bg-card px-4 py-3.5 text-ink border-t border-line/60">
          {booking.eventId ? (
            <Link
              href={`/e/${booking.eventId}`}
              className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-2xl bg-brand/10 px-4 py-2 text-xs font-bold text-accent transition hover:bg-brand/20 active:scale-[0.98]"
            >
              <Ticket size={14} /> View Event &amp; Details
            </Link>
          ) : null}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <AppleWalletButton
              className="w-full justify-center min-h-[44px]"
              onClick={() => {
                const url = ticketWalletPassUrl(booking.id);
                void openAppleWalletPass(url, "AirPal-Ticket-" + booking.title);
              }}
            />
            <GoogleWalletButton
              className="w-full justify-center min-h-[44px]"
              onClick={() => {
                void openGoogleWalletPass(googleWalletTicketUrl(booking.id));
              }}
            />
          </div>

          <AddToCalendarMenu
            event={{
              id: booking.id,
              title: booking.title,
              venue: booking.suburb || "Sydney",
              city: booking.suburb || "Sydney",
              description: `AirPal Pass Ticket: ${booking.title}. Booking ID: ${booking.id}`,
              startsAt: booking.date
                ? `${booking.date}T${booking.time ? booking.time : "19:00"}:00`
                : new Date().toISOString(),
            }}
            label="1-Tap Add to Calendar"
            buttonClassName="w-full justify-center rounded-2xl bg-paper px-4 py-2 text-xs font-semibold text-ink ring-1 ring-line hover:bg-card transition min-h-[44px]"
          />

          <div className="flex gap-2">
            <Link
              href={`/ticket/${booking.id}`}
              className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-2xl bg-paper px-3 text-xs font-semibold text-accent ring-1 ring-line hover:bg-card transition"
            >
              <Ticket size={13} className="shrink-0" /> Full Pass
            </Link>
            <Button
              size="sm"
              variant="ghost"
              className="flex-1 gap-1.5 whitespace-nowrap ring-1 ring-line min-h-[44px]"
              onClick={print}
            >
              <Download size={14} className="shrink-0" /> PDF
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="flex-1 gap-1.5 whitespace-nowrap ring-1 ring-line min-h-[44px]"
              onClick={() => void share()}
            >
              <Share2 size={14} className="shrink-0" /> Share
            </Button>
          </div>
        </div>
      )}
    </article>
  );
}
