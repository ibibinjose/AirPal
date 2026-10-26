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
  /** True when QR generation failed and the stub should offer a retry. */
  qrFailed?: boolean;
  /** Full profile URL copied by the link pill. */
  url: string;
  copied?: boolean;
  onCopyLink?: () => void;
  /** When set, the QR stub becomes a button (e.g. open the share sheet). */
  onQrTap?: () => void;
  className?: string;
}

/**
 * The AirPal Bio Pass on its exact card artwork (`bio-pass-template.png`,
 * 874:1409). Nothing is added beyond the card's own shapes: the avatar
 * fills the baked disc, identity sits on the open band, the QR stub fills
 * the baked QR box, and the link action rides the baked pill. Zone geometry
 * was measured from the art, never eyeballed.
 */
export function BioPassVisual({
  handle,
  name,
  kind,
  avatar,
  city,
  qrSrc,
  qrFailed = false,
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
  const showRetry = qrFailed && !qrSrc;
  const meta = [isBusiness ? "Business" : "Individual", city].filter(Boolean).join(" · ");

  const qrBody = (
    <>
      {qrSrc ? (
        <img
          src={qrSrc}
          alt={`QR Code for @${cleanHandle}`}
          width={360}
          height={360}
          className="aspect-square w-[84%] rounded-sm object-contain"
          draggable={false}
        />
      ) : (
        <span className="flex aspect-square w-[84%] flex-col items-center justify-center text-center text-[#14215E] motion-safe:animate-pulse">
          <span className="px-[2cqw] text-[3cqw] font-bold leading-snug">
            {showRetry ? "Tap to retry" : "Loading QR…"}
          </span>
        </span>
      )}
    </>
  );

  return (
    <div
      className={cn(
        "@container relative mx-auto aspect-[874/1409] w-full max-w-[400px] select-none overflow-hidden rounded-[3.2cqw] text-white",
        "shadow-[0_24px_48px_-16px_rgba(2,8,30,0.5),0_8px_20px_-8px_rgba(2,8,30,0.35)] ring-1 ring-black/10",
        className,
      )}
    >
      <img
        src="/brand/bio-pass-template.png"
        alt=""
        aria-hidden="true"
        draggable={false}
        className="absolute inset-0 h-full w-full"
      />

      {/* Brand mark */}
      <img
        src={isBusiness ? "/brand/airpal-pass-logo-white.png" : "/brand/airpal-me-logo-white.png"}
        alt=""
        aria-hidden="true"
        draggable={false}
        className="absolute left-1/2 top-[6.5%] h-[9cqw] w-auto max-w-[64cqw] -translate-x-1/2 object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)]"
      />

      {/* Avatar fills the baked disc */}
      <span className="absolute left-[35.4%] top-[13.3%] grid aspect-square w-[28.9%] place-items-center overflow-hidden rounded-full">
        {avatar ? (
          <img src={avatar} alt={name} width={256} height={256} className="h-full w-full object-cover" />
        ) : (
          <span className="font-display text-[13cqw] font-black leading-none text-[#14215E]">{initial}</span>
        )}
      </span>

      {/* Identity on the open blue band */}
      <div className="absolute left-[8%] right-[8%] top-[34.5%] text-center">
        <p className="truncate font-display text-[6.4cqw] font-black leading-[1.05] tracking-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.35)]">
          {name || `@${cleanHandle}`}
        </p>
        <p className="mt-[0.8cqw] truncate font-mono text-[3.6cqw] font-bold text-[#C9D6FF] drop-shadow-[0_1px_4px_rgba(0,0,0,0.25)]">
          @{cleanHandle}
        </p>
        {meta && (
          <p className="mt-[1.6cqw] truncate text-[3cqw] font-bold uppercase tracking-[0.18em] text-white/85 drop-shadow">
            {meta}
          </p>
        )}
      </div>

      {/* QR stub sits on the baked QR box — the art is the chrome */}
      {onQrTap ? (
        <button
          type="button"
          onClick={onQrTap}
          aria-label={showRetry ? `Retry QR code for @${cleanHandle}` : `Enlarge QR code for @${cleanHandle}`}
          title={showRetry ? "Tap to retry QR code" : "Tap to enlarge QR pass"}
          className="absolute left-[20%] top-[51%] flex h-[35.4%] w-[60.2%] cursor-pointer flex-col items-center justify-center rounded-[3cqw] px-[4%] py-[3%] transition-transform focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/70 active:scale-[0.98]"
        >
          {qrBody}
        </button>
      ) : (
        <div className="absolute left-[20%] top-[51%] flex h-[35.4%] w-[60.2%] flex-col items-center justify-center px-[4%] py-[3%]">
          {qrBody}
        </div>
      )}

      {/* Link action sits on the baked pill */}
      {onCopyLink ? (
        <button
          type="button"
          onClick={onCopyLink}
          title="Tap to copy link"
          aria-label={copied ? "Link copied" : `Copy link ${displayUrl}`}
          className="absolute left-[13.5%] top-[88.6%] flex h-[7.4%] w-[73%] cursor-pointer items-center justify-center rounded-full px-[3%] text-center text-[3.2cqw] font-semibold text-white drop-shadow transition-[background-color,transform] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/70 active:scale-[0.98] after:absolute after:-inset-2"
        >
          <span className="min-w-0 flex-1 truncate">{copied ? "Link copied" : displayUrl}</span>
        </button>
      ) : (
        <div className="absolute left-[13.5%] top-[88.6%] flex h-[7.4%] w-[73%] items-center justify-center rounded-full px-[3%] text-center text-[3.2cqw] font-semibold text-white drop-shadow">
          <span className="min-w-0 flex-1 truncate">{displayUrl}</span>
        </div>
      )}
    </div>
  );
}
