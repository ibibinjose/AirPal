import { Check, Copy, Link2, MapPin, QrCode, Send } from "lucide-react";
import type { BioKind } from "@shared/bio";
import { cn } from "@/lib/cn";
import { cleanHandle as safeHandle } from "@/lib/profile-text";

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
 * and the frame ratio never breaks. Built with Apple HIG Liquid Glass depth,
 * specular rim highlights, and authentic Apple Wallet card proportions.
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
  const cleanHandle = safeHandle(handle);
  const isBusiness = kind === "business";
  const displayUrl = (url ?? "").replace(/^https?:\/\//, "");
  const initial = ((name ?? "").trim().charAt(0) || cleanHandle.charAt(0) || "A").toUpperCase();

  const qrCard = (
    <>
      {qrSrc ? (
        <img
          src={qrSrc}
          alt={`QR Code for @${cleanHandle}`}
          width={240}
          height={240}
          className="aspect-square w-full object-contain rounded-[1.5cqw]"
        />
      ) : (
        <div className="flex aspect-square w-full flex-col items-center justify-center gap-[2cqw] text-neutral-400 animate-pulse">
          <QrCode className="h-[9cqw] w-[9cqw] text-neutral-300" aria-hidden="true" />
          <span className="text-[3cqw]">Loading QR…</span>
        </div>
      )}
      <p className="mt-[2.2cqw] text-center text-[2.8cqw] font-black uppercase tracking-[0.3em] indent-[0.3em] text-[#0f2878]">
        Scan to connect
      </p>
    </>
  );

  const linkPillInner = (
    <>
      <Link2 className="h-[4.2cqw] w-[4.2cqw] shrink-0 text-white/90" aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate text-center text-[3.6cqw] font-semibold text-white drop-shadow-xs">
        {displayUrl}
      </span>
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
        "@container relative mx-auto flex aspect-[2/3] w-full max-w-[400px] flex-col overflow-hidden rounded-[28px] px-[8.5cqw] pb-[5.5cqw] pt-[5.5cqw] text-center text-white select-none",
        "bg-[radial-gradient(125%_95%_at_50%_-10%,#5a9eff_0%,#2563eb_26%,#1d4ed8_50%,#0e2d9b_76%,#07164a_100%)]",
        "shadow-[0_28px_60px_-12px_rgba(10,38,180,0.55),0_10px_24px_-8px_rgba(10,38,180,0.35),inset_0_1.5px_2px_rgba(255,255,255,0.65),inset_0_-1.5px_2px_rgba(0,0,0,0.3)] ring-1 ring-white/30",
        className,
      )}
    >
      {/* Specular highlights & holographic soft sheen */}
      <div
        className="pointer-events-none absolute -inset-[20%] bg-[radial-gradient(ellipse_at_30%_10%,rgba(255,255,255,0.22)_0%,rgba(255,255,255,0)_50%)]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-x-8 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/80 to-transparent"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-x-12 bottom-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"
        aria-hidden="true"
      />

      {/* Security guilloche arcs & vector waves */}
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 400 600"
        preserveAspectRatio="xMidYMid slice"
      >
        <path d="M-40 140 C 90 65, 170 160, 440 45 L 440 -40 L -40 -40 Z" fill="#ffffff" opacity="0.09" />
        <path
          d="M-40 225 C 110 140, 220 245, 440 130 L 440 45 C 220 160, 110 65, -40 140 Z"
          fill="#ffffff"
          opacity="0.06"
        />
        <path d="M-40 600 C 120 450, 200 515, 440 365 L 440 600 Z" fill="#02165e" opacity="0.25" />
        <path
          d="M-40 600 C 140 492, 240 535, 440 428 L 440 472 C 240 575, 140 532, -40 600 Z"
          fill="#ffffff"
          opacity="0.05"
        />
      </svg>

      {/* Floating AirPal paper plane watermarks */}
      <Send
        aria-hidden="true"
        className="pointer-events-none absolute right-[7cqw] top-[24cqw] h-[15cqw] w-[15cqw] rotate-[24deg] text-white/18"
      />
      <Send
        aria-hidden="true"
        className="pointer-events-none absolute -left-[3cqw] top-[72cqw] h-[9cqw] w-[9cqw] -rotate-[24deg] text-white/10"
      />

      {/* Apple Wallet / NFC contactless indicator */}
      <div
        className="pointer-events-none absolute right-[6.5cqw] top-[6cqw] flex items-center opacity-70"
        aria-hidden="true"
        title="Contactless Pass"
      >
        <svg
          className="h-[4.8cqw] w-[4.8cqw] text-white"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        >
          <path d="M8 15a4.5 4.5 0 0 1 0-6" />
          <path d="M11 18a8.5 8.5 0 0 1 0-12" />
          <path d="M14 21a12.5 12.5 0 0 1 0-18" />
        </svg>
      </div>

      <div className="relative flex flex-1 flex-col">
        {/* Wordmark logo */}
        <div className="relative flex items-center justify-center pt-[0.5cqw]">
          <img
            src={isBusiness ? "/brand/airpal-pass-logo-white.png" : "/brand/airpal-me-logo-white.png"}
            alt={isBusiness ? "AirPal Pass" : "AirPal Me"}
            className="h-[8.5cqw] w-auto max-w-[55cqw] object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.25)]"
          />
        </div>

        {/* Liquid Glass Avatar Halo */}
        <div className="relative mx-auto mt-[3.5cqw]">
          <div className="relative h-[21cqw] w-[21cqw] rounded-full p-[0.6cqw] bg-white/20 backdrop-blur-xs ring-1 ring-white/40 shadow-[0_0_36px_rgba(255,255,255,0.45),0_8px_20px_rgba(0,0,0,0.25)]">
            <div className="h-full w-full overflow-hidden rounded-full bg-white/10 ring-[0.8cqw] ring-white">
              {avatar ? (
                <img src={avatar} alt={name} width={128} height={128} className="h-full w-full object-cover" />
              ) : (
                <span className="grid h-full w-full place-items-center font-display text-[10cqw] font-black text-white">
                  {initial}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Identity */}
        <h3 className="mt-[2.5cqw] truncate px-[2cqw] font-display text-[7.2cqw] font-black leading-tight tracking-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.35)]">
          {name || `@${cleanHandle}`}
        </h3>
        <p className="mt-[0.6cqw] truncate text-[4cqw] font-semibold text-[#c8d8ff] drop-shadow-[0_1px_4px_rgba(0,0,0,0.25)]">
          @{cleanHandle}
        </p>
        {city && (
          <div className="mt-[1.5cqw] flex items-center justify-center">
            <span className="inline-flex items-center gap-[1.2cqw] rounded-full bg-white/12 px-[3cqw] py-[0.6cqw] text-[3cqw] font-semibold uppercase tracking-[0.28em] text-white/95 ring-1 ring-white/20 backdrop-blur-xs">
              <MapPin className="h-[3.4cqw] w-[3.4cqw] shrink-0 text-white" aria-hidden="true" />
              <span className="truncate">{city}</span>
            </span>
          </div>
        )}

        {/* Ticket Perforation Dashed Line */}
        <div className="relative mx-[1cqw] mt-[3.5cqw] mb-[1cqw] flex items-center" aria-hidden="true">
          <div className="h-px w-full border-t border-dashed border-white/35" />
        </div>

        {/* Crisp QR Card Container */}
        <div className="flex flex-1 flex-col items-center justify-center">
          {onQrTap ? (
            <button
              type="button"
              onClick={onQrTap}
              aria-label={`Enlarge QR code for @${cleanHandle}`}
              title="Tap to enlarge QR pass"
              className="group block w-[50cqw] rounded-[5.5cqw] bg-white p-[3.2cqw] shadow-[0_16px_36px_-6px_rgba(0,0,0,0.35),0_4px_12px_rgba(0,0,0,0.15)] ring-1 ring-black/5 transition-transform active:scale-[0.98] cursor-pointer"
            >
              {qrCard}
            </button>
          ) : (
            <div className="w-[50cqw] rounded-[5.5cqw] bg-white p-[3.2cqw] shadow-[0_16px_36px_-6px_rgba(0,0,0,0.35),0_4px_12px_rgba(0,0,0,0.15)] ring-1 ring-black/5">
              {qrCard}
            </div>
          )}
        </div>

        {/* Liquid Glass Link Pill */}
        {onCopyLink ? (
          <button
            type="button"
            onClick={onCopyLink}
            title="Tap to copy link"
            aria-label={copied ? "Link copied" : `Copy link ${displayUrl}`}
            className="mt-[3.5cqw] flex min-h-[max(50px,11.5cqw)] w-full items-center gap-[2.5cqw] rounded-full bg-white/[0.18] px-[4cqw] ring-1 ring-white/35 backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_8px_20px_-6px_rgba(0,0,0,0.25)] transition-[background-color,transform] hover:bg-white/[0.24] active:scale-[0.98] cursor-pointer"
          >
            {linkPillInner}
          </button>
        ) : (
          <div className="mt-[3.5cqw] flex min-h-[max(50px,11.5cqw)] w-full items-center gap-[2.5cqw] rounded-full bg-white/[0.18] px-[4cqw] ring-1 ring-white/35 backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_8px_20px_-6px_rgba(0,0,0,0.25)]">
            {linkPillInner}
          </div>
        )}
      </div>
    </div>
  );
}
