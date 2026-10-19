import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Contact, Copy, Download, QrCode, Share2, Wifi, X } from "lucide-react";
import { toast } from "sonner";
import { makeQrDataUrl } from "@/lib/qr";
import { openVCardContact } from "@/lib/people";
import { useScrollLock } from "@/hooks/useScrollLock";
import { BrandMark } from "@/components/brand/BrandMark";
import { AppleWalletButton } from "@/components/ui/AppleWalletButton";
import { GoogleWalletButton } from "@/components/ui/GoogleWalletButton";
import {
  businessCardWalletPassUrl,
  googleWalletCardUrl,
  openAppleWalletPass,
  openGoogleWalletPass,
} from "@/lib/wallet";
import { triggerHaptic } from "@/lib/native";

export type BioShareModalProps = {
  open: boolean;
  onClose: () => void;
  handle: string;
  name: string;
  url: string;
  avatar?: string;
  city?: string;
  headline?: string;
  kind?: string | null;
  phone?: string;
};

export function BioShareModal({
  open,
  onClose,
  handle,
  name,
  url,
  avatar,
  city,
  headline,
  kind,
  phone,
}: BioShareModalProps) {
  useScrollLock(open);

  const cleanHandle = handle.trim().replace(/^@+/, "").toLowerCase();
  const [qrData, setQrData] = useState<string>("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    let live = true;
    void makeQrDataUrl(url, 400).then((data) => {
      if (live) setQrData(data);
    });
    return () => {
      live = false;
    };
  }, [open, url]);

  if (!open || typeof document === "undefined") return null;

  async function handleCopy() {
    void triggerHaptic("selection");
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Pass link copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.message(url);
    }
  }

  function handleDownload() {
    if (!qrData) return;
    void triggerHaptic("medium");
    const a = document.createElement("a");
    a.href = qrData;
    a.download = `airpal-${cleanHandle}-pass-qr.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success("Pass QR code saved");
  }

  function handleSaveVCard() {
    void triggerHaptic("medium");
    void openVCardContact({
      name: name || `@${cleanHandle}`,
      url,
      phone,
      note: `AirPal Digital Bio Pass (@${cleanHandle})${headline ? ` · ${headline}` : ""}${city ? ` · ${city}` : ""}`,
    });
  }

  async function handleNativeShare() {
    void triggerHaptic("light");
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${name} (@${cleanHandle}) · AirPal Bio Pass`,
          text: headline || `Connect with ${name} on AirPal`,
          url,
        });
      } catch {
        /* user cancelled */
      }
    } else {
      void handleCopy();
    }
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="My Digital Bio Pass"
      className="visual-viewport-modal z-50 flex items-end sm:items-center justify-center bg-black/70 p-0 sm:p-4 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="modal-safe relative w-full max-w-sm rounded-t-[32px] sm:rounded-[32px] bg-paper p-5 sm:p-6 text-center shadow-2xl ring-1 ring-line animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 max-h-[min(94dvh,calc(var(--visual-viewport-height,100dvh)-1rem))] overflow-y-auto pb-[calc(env(safe-area-inset-bottom,0px)+1.25rem)] sm:pb-6 no-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Mobile Drag Indicator */}
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-line/80 sm:hidden" />

        {/* Modal Top Bar */}
        <div className="flex items-center justify-between pb-3">
          <div className="text-left">
            <h2 className="font-display text-base font-bold text-ink">AirPal Pass</h2>
            <p className="text-[11px] text-mute font-medium">Digital Bio &amp; Networking Card</p>
          </div>
          <button
            type="button"
            onClick={() => {
              void triggerHaptic("light");
              onClose();
            }}
            className="grid h-9 w-9 min-h-[44px] min-w-[44px] place-items-center rounded-full bg-card text-mute ring-1 ring-line hover:text-ink hover:bg-paper transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            aria-label="Close"
          >
            <X size={17} />
          </button>
        </div>

        {/* ============================================================== */}
        {/* CLEAN LUXURY BRAND BLUE PASS CARD */}
        {/* ============================================================== */}
        <div className="relative mt-1 overflow-hidden rounded-[24px] bg-gradient-to-br from-[#0055ff] via-[#0047eb] to-[#002f9e] p-5 text-white shadow-[0_16px_36px_-10px_rgba(0,78,255,0.45),inset_0_1px_1px_rgba(255,255,255,0.4)] ring-1 ring-white/20 select-none">
          {/* Subtle Specular Highlights */}
          <div className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />

          {/* Card Top Brand Row - Balanced & Symmetrical */}
          <div className="relative z-10 flex items-center justify-between">
            <span
              className="grid h-7 w-7 place-items-center rounded-full bg-white/15 text-white/90 backdrop-blur-md ring-1 ring-white/20"
              title="Contactless NFC Ready"
              aria-label="NFC Contactless"
            >
              <Wifi size={13} className="rotate-90 text-white" />
            </span>

            <div className="flex items-center gap-1.5">
              <BrandMark compact invert className="h-5 w-auto" />
              <div className="flex items-baseline gap-1">
                <span className="font-display text-[13px] font-black uppercase tracking-wider text-white">
                  airpal<span className="opacity-90">.me</span>
                </span>
                <span className="text-[9px] font-bold tracking-widest uppercase text-white/70">PASS</span>
              </div>
            </div>

            <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-white/95 backdrop-blur-md ring-1 ring-white/20">
              {kind === "business" ? "PRO" : "MEMBER"}
            </span>
          </div>

          {/* Member Identity - Perfectly Centered & Symmetrical */}
          <div className="relative z-10 mt-3.5 border-t border-white/15 pt-3 text-center">
            <div className="mx-auto relative h-12 w-12 overflow-hidden rounded-full ring-2 ring-white/90 shadow-sm bg-white/10">
              {avatar ? (
                <img src={avatar} alt={name} className="h-full w-full rounded-full object-cover" />
              ) : (
                <div className="grid h-full w-full place-items-center rounded-full bg-white/15 font-display text-sm font-black text-white">
                  {name[0]?.toUpperCase() || cleanHandle[0]?.toUpperCase() || "A"}
                </div>
              )}
            </div>

            <h3 className="mt-2 truncate font-display text-base font-bold tracking-tight text-white leading-tight">
              {name || `@${cleanHandle}`}
            </h3>
            <p className="mt-0.5 truncate font-mono text-xs font-semibold text-white/85">@{cleanHandle}</p>
          </div>

          {/* Clean Ceramic White QR Plate */}
          <div className="relative z-10 mt-3.5 rounded-2xl bg-white p-3.5 shadow-sm">
            <div className="relative mx-auto flex aspect-square max-h-[190px] w-full max-w-[190px] items-center justify-center">
              {qrData ? (
                <img
                  src={qrData}
                  alt={`QR Code for @${cleanHandle}`}
                  width={190}
                  height={190}
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-xs text-neutral-400 animate-pulse">
                  <QrCode size={32} className="text-neutral-300" />
                  <span>Loading QR…</span>
                </div>
              )}
            </div>

            {/* Clean 1-Tap Copy Link Button */}
            <button
              type="button"
              onClick={() => void handleCopy()}
              className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 px-3 py-1.5 text-center font-mono text-[11px] font-semibold text-neutral-700 transition active:scale-[0.98] cursor-pointer"
              title="Tap to copy link"
            >
              <span className="truncate">airpal.me/@{cleanHandle}</span>
              {copied ? (
                <span className="ml-1 inline-flex items-center gap-0.5 font-sans text-[10px] font-bold text-emerald-600">
                  <Check size={11} /> Copied
                </span>
              ) : (
                <Copy size={11} className="text-neutral-400 shrink-0 ml-0.5" />
              )}
            </button>
          </div>
        </div>

        {/* ============================================================== */}
        {/* CLEAN QUICK ACTION BUTTONS */}
        {/* ============================================================== */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => void handleNativeShare()}
            className="flex min-h-[44px] flex-col items-center justify-center gap-1 rounded-2xl bg-card p-2 text-xs font-semibold text-ink ring-1 ring-line hover:bg-paper active:scale-95 transition cursor-pointer"
          >
            <Share2 size={16} className="text-brand" />
            <span>Share</span>
          </button>
          <button
            type="button"
            onClick={handleSaveVCard}
            className="flex min-h-[44px] flex-col items-center justify-center gap-1 rounded-2xl bg-card p-2 text-xs font-semibold text-ink ring-1 ring-line hover:bg-paper active:scale-95 transition cursor-pointer"
          >
            <Contact size={16} className="text-brand" />
            <span>Save Contact</span>
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={!qrData}
            className="flex min-h-[44px] flex-col items-center justify-center gap-1 rounded-2xl bg-card p-2 text-xs font-semibold text-ink ring-1 ring-line hover:bg-paper active:scale-95 transition cursor-pointer disabled:opacity-40"
          >
            <Download size={16} className="text-brand" />
            <span>Save QR</span>
          </button>
        </div>

        {/* ============================================================== */}
        {/* APPLE WALLET & GOOGLE WALLET INTEGRATION */}
        {/* ============================================================== */}
        <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-2 gap-2">
          <AppleWalletButton
            className="w-full justify-center min-h-[44px]"
            onClick={() => {
              void triggerHaptic("medium");
              const passUrl = businessCardWalletPassUrl(cleanHandle);
              void openAppleWalletPass(passUrl, "@" + cleanHandle + "-AirPal-Pass");
            }}
          />
          <GoogleWalletButton
            className="w-full justify-center min-h-[44px]"
            onClick={() => {
              void triggerHaptic("medium");
              void openGoogleWalletPass(googleWalletCardUrl(cleanHandle));
            }}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}
