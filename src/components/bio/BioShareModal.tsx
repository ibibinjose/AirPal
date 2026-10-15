import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Copy, Check, Download, Share2, X, QrCode } from "lucide-react";
import { toast } from "sonner";
import { makeQrDataUrl } from "@/lib/qr";
import { useScrollLock } from "@/hooks/useScrollLock";
import { BrandMark } from "@/components/brand/BrandMark";
import { Button } from "@/components/ui/Button";
import { AppleWalletButton } from "@/components/ui/AppleWalletButton";
import { GoogleWalletButton } from "@/components/ui/GoogleWalletButton";
import {
  businessCardWalletPassUrl,
  googleWalletCardUrl,
  openAppleWalletPass,
  openGoogleWalletPass,
} from "@/lib/wallet";

import { triggerHaptic } from "@/lib/native";

type BioShareModalProps = {
  open: boolean;
  onClose: () => void;
  handle: string;
  name: string;
  url: string;
};

export function BioShareModal({ open, onClose, handle, name, url }: BioShareModalProps) {
  useScrollLock(open);

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
    void makeQrDataUrl(url, 360).then((data) => {
      if (live) setQrData(data);
    });
    return () => {
      live = false;
    };
  }, [open, url]);

  if (!open || typeof document === "undefined") return null;

  async function handleCopy() {
    void triggerHaptic("light");
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Profile link copied!");
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
    a.download = `airpal-${handle}-qr.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success("QR Code downloaded for print & counters");
  }

  async function handleNativeShare() {
    void triggerHaptic("light");
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${name} (@${handle})`,
          text: `Check out ${name} on AirPal`,
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
      aria-label="Share Profile"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="modal-safe relative w-full max-w-sm rounded-t-[32px] sm:rounded-[32px] bg-paper p-6 text-center shadow-2xl ring-1 ring-line animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)] sm:pb-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute left-1/2 top-2.5 z-10 h-1.5 w-12 -translate-x-1/2 rounded-full bg-white/25 sm:hidden" />
        <button
          type="button"
          onClick={() => {
            void triggerHaptic("light");
            onClose();
          }}
          className="absolute right-4 top-4 z-10 grid h-10 w-10 min-h-[44px] min-w-[44px] place-items-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        {/* AirPal-branded Bio Pass header */}
        <div className="-mx-6 -mt-6 overflow-hidden rounded-t-[32px] bg-gradient-to-br from-[#0c1024] via-[#141b38] to-[#0a0d1e] px-6 pb-5 pt-7 text-center sm:rounded-t-[32px]">
          <div className="flex items-center justify-center gap-2">
            <BrandMark compact invert />
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/80">
              AirPal.me · Bio Pass
            </span>
          </div>
          <h2 className="font-display mt-2 truncate text-2xl font-bold text-white">@{handle}</h2>
          <p className="mt-0.5 truncate text-xs text-white/60">{name}</p>
        </div>

        <div className="mx-auto mt-5 flex h-56 w-56 max-h-[62vw] max-w-[62vw] items-center justify-center rounded-2xl bg-white p-3 shadow-inner ring-1 ring-black/5 sm:h-60 sm:w-60 sm:max-h-none sm:max-w-none">
          {qrData ? (
            <img
              src={qrData}
              alt={`QR Code for @${handle}`}
              width={224}
              height={224}
              className="h-full w-full object-contain"
            />
          ) : (
            <div className="text-xs text-mute animate-pulse">Generating QR…</div>
          )}
        </div>

        <p className="mt-3 flex items-center justify-center gap-1.5 font-mono text-[13px] text-mute break-all">
          <QrCode size={13} className="shrink-0 text-accent" aria-hidden="true" />
          <span className="truncate">{url.replace(/^https?:\/\//, "")}</span>
        </p>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="min-h-[44px] gap-1.5 rounded-full font-semibold"
          >
            {copied ? <Check size={15} className="text-emerald-500" /> : <Copy size={15} />}
            {copied ? "Copied" : "Copy Link"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownload}
            className="min-h-[44px] gap-1.5 rounded-full font-semibold"
            disabled={!qrData}
          >
            <Download size={15} />
            Download
          </Button>
        </div>

        <AppleWalletButton
          className="mt-3 w-full justify-center min-h-[44px]"
          onClick={() => {
            void triggerHaptic("medium");
            const passUrl = businessCardWalletPassUrl(handle);
            void openAppleWalletPass(passUrl, "@" + handle + "-AirPal-BusinessCard");
          }}
        />
        <GoogleWalletButton
          className="mt-2 w-full justify-center min-h-[44px]"
          onClick={() => {
            void triggerHaptic("medium");
            void openGoogleWalletPass(googleWalletCardUrl(handle));
          }}
        />

        {typeof navigator !== "undefined" && "share" in navigator && (
          <Button
            size="sm"
            onClick={handleNativeShare}
            className="mt-2.5 w-full min-h-[44px] gap-1.5 rounded-full bg-brand text-white font-bold"
          >
            <Share2 size={15} />
            Share via…
          </Button>
        )}

        <button
          type="button"
          onClick={() => {
            void triggerHaptic("light");
            onClose();
          }}
          className="mt-4 min-h-[44px] inline-flex items-center justify-center text-xs font-semibold text-mute hover:text-ink cursor-pointer touch-manipulation"
        >
          Done
        </button>
      </div>
    </div>,
    document.body,
  );
}
