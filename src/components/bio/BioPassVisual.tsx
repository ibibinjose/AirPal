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
 * The AirPal Bio Pass, on the exact 2:3 image template frame. Every size is
 * expressed in container-query units so the whole pass — wordmark, avatar,
 * identity, divider, QR card, link pill — scales as one artwork at any width
 * and the frame ratio never breaks. Every detail renders from the profile it
 * is given; one component backs the dashboard pass, the edit studio, and the
 * share sheet so they can never drift apart.
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
          className="aspect-square w-full object-contain"
        />
      ) : (
        <div className="flex aspect-square w-full flex-col items-center justify-center gap-[2cqw] text-neutral-400 animate-pulse">
          <QrCode className="h-[9cqw] w-[9cqw] text-neutral-300" aria-hidden="true" />
          <span className="text-[3cqw]">Loading QR…</span>
        </div>
      )}
      <p className="mt-[2.5cqw] text-center text-[3cqw] font-bold uppercase tracking-[0.3em] text-[#1a2560]">
        Scan to connect
      </p>
    </>
  );

  const linkPillInner = (
    <>
      <Link2 className="h-[4.2cqw] w-[4.2cqw] shrink-0 text-white/90" aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate text-center text-[3.8cqw] font-semibold text-white">{displayUrl}</span>
      {copied ? (
        <Check className="h-[4.2cqw] w-[4.2cqw] shrink-0 text-emerald-300" aria-hidden="true" />
      ) : (
        <Copy className="h-[4.2cqw] w-[4.2cqw] shrink-0 text-white/90" aria-hidden="true" />
      )}
    </>
  );

  return (
    <div
      className={cn(
        "@container relative mx-auto flex aspect-[2/3] w-full max-w-[400px] flex-col overflow-hidden rounded-[28px] px-[9cqw] pb-[6cqw] pt-[6cqw] text-center text-white select-none",
        "bg-[linear-gradient(165deg,#3d8bff_0%,#1a56f0_22%,#0e38d8_48%,#0a28b4_75%,#0a229c_100%)]",
        "shadow-[0_24px_50px_-12px_rgba(10,45,180,0.55),inset_0_1px_1.5px_rgba(255,255,255,0.5)] ring-1 ring-white/25",
        className,
      )}
    >
      {/* Wave + paper-plane motifs */}
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 400 600"
        preserveAspectRatio="xMidYMid slice"
      >
        <path d="M-40 140 C 90 65, 170 160, 440 45 L 440 -40 L -40 -40 Z" fill="#ffffff" opacity="0.10" />
        <path
          d="M-40 225 C 110 140, 220 245, 440 130 L 440 45 C 220 160, 110 65, -40 140 Z"
          fill="#ffffff"
          opacity="0.07"
        />
        <path d="M-40 600 C 120 450, 200 515, 440 365 L 440 600 Z" fill="#02165e" opacity="0.28" />
        <path
          d="M-40 600 C 140 492, 240 535, 440 428 L 440 472 C 240 575, 140 532, -40 600 Z"
          fill="#ffffff"
          opacity="0.06"
        />
      </svg>
      <Send
        aria-hidden="true"
        className="pointer-events-none absolute right-[7cqw] top-[24cqw] h-[15cqw] w-[15cqw] rotate-[24deg] text-white/20"
      />
      <Send
        aria-hidden="true"
        className="pointer-events-none absolute -left-[3cqw] top-[72cqw] h-[9cqw] w-[9cqw] -rotate-[24deg] text-white/10"
      />
      {/* Top specular line */}
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />

      <div className="relative flex flex-1 flex-col">
        {/* Script wordmark */}
        <img
          src={isBusiness ? "/brand/airpal-pass-logo-white.png" : "/brand/airpal-me-logo-white.png"}
          alt={isBusiness ? "AirPal Pass" : "AirPal Me"}
          className="mx-auto h-[9cqw] w-auto object-contain"
        />

        {/* Avatar */}
        <div className="mx-auto mt-[4cqw] h-[22cqw] w-[22cqw] overflow-hidden rounded-full bg-white/15 ring-[1cqw] ring-white shadow-[0_0_45px_rgba(255,255,255,0.45)]">
          {avatar ? (
            <img src={avatar} alt={name} width={128} height={128} className="h-full w-full object-cover" />
          ) : (
            <span className="grid h-full w-full place-items-center font-display text-[11cqw] font-black text-white">
              {initial}
            </span>
          )}
        </div>

        {/* Identity */}
        <h3 className="mt-[3cqw] truncate font-display text-[7.5cqw] font-black leading-tight tracking-tight text-white">
          {name || `@${cleanHandle}`}
        </h3>
        <p className="mt-[0.8cqw] truncate text-[4.2cqw] font-semibold text-[#c3d4ff]">@{cleanHandle}</p>
        {city && (
          <p className="mt-[1.5cqw] flex items-center justify-center gap-[1.5cqw] text-[3.2cqw] font-semibold uppercase tracking-[0.35em] text-white/90">
            <MapPin className="h-[3.8cqw] w-[3.8cqw] shrink-0" aria-hidden="true" />
            <span className="truncate">{city}</span>
          </p>
        )}

        {/* Dashed divider */}
        <div className="mx-[1cqw] mt-[4cqw] border-t border-dashed border-white/40" aria-hidden="true" />

        {/* White QR card (flex-1 absorbs slack so the frame ratio holds) */}
        <div className="flex flex-1 flex-col items-center justify-center">
          {onQrTap ? (
            <button
              type="button"
              onClick={onQrTap}
              aria-label={`Enlarge QR code for @${cleanHandle}`}
              title="Tap to enlarge QR pass"
              className="block w-[50cqw] rounded-[6cqw] bg-white p-[3.5cqw] shadow-lg ring-1 ring-black/5 transition active:scale-[0.98] cursor-pointer"
            >
              {qrCard}
            </button>
          ) : (
            <div className="w-[50cqw] rounded-[6cqw] bg-white p-[3.5cqw] shadow-lg ring-1 ring-black/5">{qrCard}</div>
          )}
        </div>

        {/* Copyable link pill */}
        {onCopyLink ? (
          <button
            type="button"
            onClick={onCopyLink}
            title="Tap to copy link"
            aria-label={copied ? "Link copied" : `Copy link ${displayUrl}`}
            className="mt-[3.5cqw] flex min-h-[max(52px,12cqw)] w-full items-center gap-[2.5cqw] rounded-full bg-white/20 px-[4cqw] ring-1 ring-white/30 backdrop-blur-md transition hover:bg-white/25 active:scale-[0.99] cursor-pointer"
          >
            {linkPillInner}
          </button>
        ) : (
          <div className="mt-[3.5cqw] flex min-h-[max(52px,12cqw)] w-full items-center gap-[2.5cqw] rounded-full bg-white/20 px-[4cqw] ring-1 ring-white/30 backdrop-blur-md">
            {linkPillInner}
          </div>
        )}
      </div>
    </div>
  );
}
