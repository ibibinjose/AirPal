import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Contact, Copy, Download, MapPin, QrCode, Share2, ShieldCheck, Sparkles, Wifi, X } from "lucide-react";
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
      toast.success("Profile pass link copied!");
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
    toast.success("Pass QR Code downloaded for print & counters");
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
      className="visual-viewport-modal z-50 flex items-end sm:items-center justify-center bg-black/75 p-0 sm:p-4 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="modal-safe relative w-full max-w-sm rounded-t-[36px] sm:rounded-[36px] bg-paper p-5 sm:p-6 text-center shadow-2xl ring-1 ring-line animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 max-h-[min(94dvh,calc(var(--visual-viewport-height,100dvh)-1rem))] overflow-y-auto pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)] sm:pb-6 no-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Mobile Pull Tab */}
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-line/80 sm:hidden" />

        {/* Top Modal Header */}
        <div className="flex items-center justify-between pb-3">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-accent">
            <Sparkles size={14} className="text-amber-400" />
            <span>AirPal Wallet Card</span>
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
        {/* LUXURY AIRPAL-BRANDED METALLIC WALLET CARD */}
        {/* ============================================================== */}
        <div className="relative mt-1 overflow-hidden rounded-[26px] bg-gradient-to-b from-[#0d122b] via-[#101736] to-[#070a16] p-5 text-white shadow-[0_20px_50px_-12px_rgba(0,0,0,0.85),inset_0_1px_1.5px_rgba(255,255,255,0.45),0_0_35px_rgba(24,5,219,0.3)] ring-1 ring-white/20 select-none">
          {/* Ambient Sheen & Holographic Light Effects */}
          <div className="pointer-events-none absolute -top-16 -right-16 h-44 w-44 rounded-full bg-blue-500/25 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-16 -left-16 h-44 w-44 rounded-full bg-indigo-600/20 blur-2xl" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />

          {/* Card Top Brand Row */}
          <div className="relative z-10 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <BrandMark compact invert className="h-6 w-auto drop-shadow-sm" />
              <div className="flex flex-col text-left">
                <span className="font-display text-[11px] font-black uppercase tracking-[0.22em] text-white/95">
                  AirPal<span className="text-amber-400">.Me</span>
                </span>
                <span className="text-[9px] font-bold tracking-widest uppercase text-white/55">Digital Bio Pass</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/90 backdrop-blur-md ring-1 ring-white/15">
                <ShieldCheck size={11} className="text-emerald-400" />
                <span className="tracking-wide text-[10px]">{kind === "business" ? "PRO" : "VIP"}</span>
              </span>
              <span
                className="grid h-7 w-7 place-items-center rounded-full bg-white/10 text-white/80 backdrop-blur-md ring-1 ring-white/15"
                title="NFC Contactless Ready"
                aria-label="NFC Contactless"
              >
                <Wifi size={13} className="rotate-90 text-amber-300" />
              </span>
            </div>
          </div>

          {/* Member Identity Row */}
          <div className="relative z-10 mt-4 flex items-center gap-3.5 border-t border-white/10 pt-4">
            <div className="relative h-13 w-13 shrink-0 overflow-hidden rounded-full ring-2 ring-amber-400/80 p-0.5 bg-gradient-to-tr from-amber-400 to-indigo-500 shadow-md">
              {avatar ? (
                <img src={avatar} alt={name} className="h-full w-full rounded-full object-cover" />
              ) : (
                <div className="grid h-full w-full place-items-center rounded-full bg-[#141b38] font-display text-base font-black text-white">
                  {name[0]?.toUpperCase() || cleanHandle[0]?.toUpperCase() || "A"}
                </div>
              )}
              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-[#0d122b]" />
            </div>

            <div className="min-w-0 flex-1 text-left">
              <div className="flex items-center gap-1.5">
                <h3 className="truncate font-display text-lg font-bold tracking-tight text-white">
                  {name || `@${cleanHandle}`}
                </h3>
              </div>
              <p className="truncate font-mono text-xs font-semibold text-amber-300">@{cleanHandle}</p>
              {(city || headline) && (
                <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-white/60">
                  {city && (
                    <>
                      <MapPin size={10} className="shrink-0 text-white/40" />
                      <span className="truncate">{city}</span>
                    </>
                  )}
                  {city && headline && <span>·</span>}
                  {headline && <span className="truncate">{headline}</span>}
                </p>
              )}
            </div>
          </div>

          {/* High-Contrast Ceramic QR Plate */}
          <div className="relative z-10 mt-4 rounded-2xl bg-white p-3.5 shadow-[inset_0_2px_4px_rgba(0,0,0,0.06),0_12px_28px_-8px_rgba(0,0,0,0.45)] ring-1 ring-black/10">
            <div className="relative mx-auto flex aspect-square max-h-[210px] w-full max-w-[210px] items-center justify-center">
              {qrData ? (
                <img
                  src={qrData}
                  alt={`QR Code for @${cleanHandle}`}
                  width={210}
                  height={210}
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-xs text-neutral-400 animate-pulse">
                  <QrCode size={32} className="text-neutral-300" />
                  <span>Generating Pass QR…</span>
                </div>
              )}
            </div>

            {/* Clickable Quick URL Pill */}
            <button
              type="button"
              onClick={() => void handleCopy()}
              className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl bg-neutral-100 px-3 py-2 text-center font-mono text-[11px] font-semibold text-neutral-700 transition hover:bg-neutral-200 active:scale-[0.98] cursor-pointer"
              title="Tap to copy link"
            >
              <QrCode size={12} className="text-brand shrink-0" />
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

          {/* Authentic Pass Number & Specimen Details */}
          <div className="relative z-10 mt-3.5 flex items-center justify-between border-t border-white/10 pt-2.5 text-[9px] uppercase tracking-wider text-white/50">
            <span className="font-medium">Universal Contact Pass</span>
            <span className="font-mono text-white/40 tracking-widest">
              AP·{cleanHandle.slice(0, 4).toUpperCase()}·MEMBER
            </span>
          </div>
        </div>

        {/* ============================================================== */}
        {/* APPLE WALLET & GOOGLE WALLET INTEGRATION */}
        {/* ============================================================== */}
        <div className="mt-4 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-mute text-center">
            Save to Mobile Passbook
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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

        {/* ============================================================== */}
        {/* ACTION SHORTCUT TILES */}
        {/* ============================================================== */}
        <div className="mt-3.5 grid grid-cols-4 gap-2">
          <button
            type="button"
            onClick={() => void handleCopy()}
            className="flex min-h-[48px] flex-col items-center justify-center gap-1 rounded-2xl bg-card p-2 text-[11px] font-semibold text-ink ring-1 ring-line hover:bg-paper active:scale-95 transition cursor-pointer"
          >
            {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} className="text-accent" />}
            <span>{copied ? "Copied" : "Copy Link"}</span>
          </button>
          <button
            type="button"
            onClick={handleSaveVCard}
            className="flex min-h-[48px] flex-col items-center justify-center gap-1 rounded-2xl bg-card p-2 text-[11px] font-semibold text-ink ring-1 ring-line hover:bg-paper active:scale-95 transition cursor-pointer"
          >
            <Contact size={16} className="text-emerald-600" />
            <span>Save Contact</span>
          </button>
          <button
            type="button"
            onClick={() => void handleNativeShare()}
            className="flex min-h-[48px] flex-col items-center justify-center gap-1 rounded-2xl bg-card p-2 text-[11px] font-semibold text-ink ring-1 ring-line hover:bg-paper active:scale-95 transition cursor-pointer"
          >
            <Share2 size={16} className="text-indigo-600" />
            <span>Share</span>
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={!qrData}
            className="flex min-h-[48px] flex-col items-center justify-center gap-1 rounded-2xl bg-card p-2 text-[11px] font-semibold text-ink ring-1 ring-line hover:bg-paper active:scale-95 transition cursor-pointer disabled:opacity-40"
          >
            <Download size={16} className="text-amber-500" />
            <span>Save PNG</span>
          </button>
        </div>

        {/* Dismiss Button */}
        <button
          type="button"
          onClick={() => {
            void triggerHaptic("light");
            onClose();
          }}
          className="mt-3 flex min-h-[44px] w-full items-center justify-center rounded-full bg-card text-xs font-semibold text-ink ring-1 ring-line hover:bg-paper transition active:scale-95 cursor-pointer touch-manipulation"
        >
          Done
        </button>
      </div>
    </div>,
    document.body,
  );
}
