import { Check, Copy, Link2, MapPin, QrCode, Send } from "lucide-react";
import type { BioKind } from "@shared/bio";
import { cn } from "@/lib/cn";

export interface BioPassVisualProps {
  handle: string;
  name: string;
  kind?: BioKind | null;
  avatar?: string;
  city?: string;
  /** Rendered QR data URL. Empty while loading. */
  qrSrc?: string;
  /** Full profile URL copied by the link pill. */
  url: string;
  copied?: boolean;
  onCopyLink?: () => void;
  /** When set, the QR card becomes a button (e.g. open the share sheet). */
  onQrTap?: () => void;
  className?: string;
}

/**
 * The AirPal Bio Pass, exactly as designed: deep-blue gradient card with wave
 * and paper-plane motifs, script wordmark, ringed avatar, identity block,
 * dashed divider, white QR card, and copyable link pill. Every detail renders
 * from the profile it is given — one component backs the dashboard pass, the
 * edit studio, and the share sheet so they can never drift apart.
 */
export function BioPassVisual({
  handle,
  name,
  kind,
  avatar,
  city,
  qrSrc,
  url,
  copied = false,
  onCopyLink,
  onQrTap,
  className,
}: BioPassVisualProps) {
  const cleanHandle = handle.trim().replace(/^@+/, "").toLowerCase();
  const isBusiness = kind === "business";
  const displayUrl = url.replace(/^https?:\/\//, "");
  const initial = (name.trim().charAt(0) || cleanHandle.charAt(0) || "A").toUpperCase();

  const qrCard = (
    <>
      {qrSrc ? (
        <img
          src={qrSrc}
          alt={`QR Code for @${cleanHandle}`}
          width={240}
          height={240}
          className="w-full aspect-square object-contain"
        />
      ) : (
        <div className="flex w-full aspect-square flex-col items-center justify-center gap-2 text-sm text-neutral-400 animate-pulse">
          <QrCode size={40} className="text-neutral-300" aria-hidden="true" />
          <span>Loading QR…</span>
        </div>
      )}
      <p className="mt-4 text-center text-xs font-bold uppercase tracking-[0.3em] text-[#1a2560]">Scan to connect</p>
    </>
  );

  const linkPillInner = (
    <>
      <Link2 size={18} className="shrink-0 text-white/90" aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate text-center text-[15px] font-semibold text-white">{displayUrl}</span>
      {copied ? (
        <Check size={18} className="shrink-0 text-emerald-300" aria-hidden="true" />
      ) : (
        <Copy size={18} className="shrink-0 text-white/90" aria-hidden="true" />
      )}
    </>
  );

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[28px] px-6 pb-7 pt-8 text-center text-white select-none",
        "bg-[linear-gradient(165deg,#3d8bff_0%,#1a56f0_22%,#0e38d8_48%,#0a28b4_75%,#0a229c_100%)]",
        "shadow-[0_24px_50px_-12px_rgba(10,45,180,0.55),inset_0_1px_1.5px_rgba(255,255,255,0.5)] ring-1 ring-white/25",
        className,
      )}
    >
      {/* Wave + paper-plane motifs */}
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 400 560"
        preserveAspectRatio="xMidYMid slice"
      >
        <path d="M-40 130 C 90 60, 170 150, 440 40 L 440 -40 L -40 -40 Z" fill="#ffffff" opacity="0.10" />
        <path
          d="M-40 210 C 110 130, 220 230, 440 120 L 440 40 C 220 150, 110 60, -40 130 Z"
          fill="#ffffff"
          opacity="0.07"
        />
        <path d="M-40 560 C 120 420, 200 480, 440 340 L 440 560 Z" fill="#02165e" opacity="0.28" />
        <path
          d="M-40 560 C 140 460, 240 500, 440 400 L 440 440 C 240 540, 140 500, -40 560 Z"
          fill="#ffffff"
          opacity="0.06"
        />
      </svg>
      <Send
        aria-hidden="true"
        className="pointer-events-none absolute right-8 top-[168px] h-16 w-16 rotate-[24deg] text-white/20"
      />
      <Send
        aria-hidden="true"
        className="pointer-events-none absolute -left-4 top-[300px] h-10 w-10 -rotate-[24deg] text-white/10"
      />
      {/* Top specular line */}
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />

      <div className="relative">
        {/* Script wordmark */}
        <img
          src={isBusiness ? "/brand/airpal-pass-logo-white.png" : "/brand/airpal-me-logo-white.png"}
          alt={isBusiness ? "AirPal Pass" : "AirPal Me"}
          className="mx-auto h-14 w-auto object-contain sm:h-16"
        />

        {/* Avatar */}
        <div className="mx-auto mt-5 h-32 w-32 overflow-hidden rounded-full bg-white/15 ring-4 ring-white shadow-[0_0_45px_rgba(255,255,255,0.45)]">
          {avatar ? (
            <img src={avatar} alt={name} width={128} height={128} className="h-full w-full object-cover" />
          ) : (
            <span className="grid h-full w-full place-items-center font-display text-5xl font-black text-white">
              {initial}
            </span>
          )}
        </div>

        {/* Identity */}
        <h3 className="mt-4 truncate font-display text-[32px] font-black leading-tight tracking-tight text-white">
          {name || `@${cleanHandle}`}
        </h3>
        <p className="mt-1 truncate text-lg font-semibold text-[#c3d4ff]">@{cleanHandle}</p>
        {city && (
          <p className="mt-2 flex items-center justify-center gap-2 text-sm font-semibold uppercase tracking-[0.35em] text-white/90">
            <MapPin size={15} className="shrink-0" aria-hidden="true" />
            <span className="truncate">{city}</span>
          </p>
        )}

        {/* Dashed divider */}
        <div className="mx-1 mt-5 border-t border-dashed border-white/40" aria-hidden="true" />

        {/* White QR card */}
        {onQrTap ? (
          <button
            type="button"
            onClick={onQrTap}
            aria-label={`Enlarge QR code for @${cleanHandle}`}
            title="Tap to enlarge QR pass"
            className="mx-auto mt-5 block w-full max-w-[280px] rounded-[24px] bg-white p-5 pb-5 shadow-lg ring-1 ring-black/5 transition active:scale-[0.98] cursor-pointer"
          >
            {qrCard}
          </button>
        ) : (
          <div className="mx-auto mt-5 w-full max-w-[280px] rounded-[24px] bg-white p-5 shadow-lg ring-1 ring-black/5">
            {qrCard}
          </div>
        )}

        {/* Copyable link pill */}
        {onCopyLink ? (
          <button
            type="button"
            onClick={onCopyLink}
            title="Tap to copy link"
            aria-label={copied ? "Link copied" : `Copy link ${displayUrl}`}
            className="mt-4 flex min-h-[52px] w-full items-center gap-2.5 rounded-full bg-white/20 px-4 ring-1 ring-white/30 backdrop-blur-md transition hover:bg-white/25 active:scale-[0.99] cursor-pointer"
          >
            {linkPillInner}
          </button>
        ) : (
          <div className="mt-4 flex min-h-[52px] w-full items-center gap-2.5 rounded-full bg-white/20 px-4 ring-1 ring-white/30 backdrop-blur-md">
            {linkPillInner}
          </div>
        )}
      </div>
    </div>
  );
}
