import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Contact, Download, Share2, X } from "lucide-react";
import { toast } from "sonner";
import { makeQrDataUrl } from "@/lib/qr";
import { saveBioContact } from "@/lib/people";
import { shareBioPass } from "@/lib/share";
import { useScrollLock } from "@/hooks/useScrollLock";
import { exportBioPassPng } from "@/lib/bio-pass-export";
import { BioPassVisual } from "@/components/bio/BioPassVisual";
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

  const [exportingPass, setExportingPass] = useState(false);

  async function handleDownloadFullPass() {
    if (exportingPass) return;
    setExportingPass(true);
    try {
      await exportBioPassPng({
        handle: cleanHandle,
        name,
        kind,
        avatar,
        city,
        qrDataUrl: qrData,
        url,
      });
    } finally {
      setExportingPass(false);
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

  async function handleSaveVCard() {
    void triggerHaptic("medium");
    await saveBioContact({
      name,
      handle: cleanHandle,
      url,
      phone,
      headline,
      city,
    });
  }

  async function handleNativeShare() {
    void triggerHaptic("light");
    await shareBioPass({
      name,
      handle: cleanHandle,
      url,
      headline,
    });
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

        {/* Bio Pass — same designed visual as everywhere else, per-user details */}
        <BioPassVisual
          handle={cleanHandle}
          name={name}
          kind={kind === "business" ? "business" : "person"}
          avatar={avatar}
          city={city}
          qrSrc={qrData}
          url={url}
          copied={copied}
          onCopyLink={() => void handleCopy()}
          className="mt-1"
        />

        {/* ============================================================== */}
        {/* CLEAN QUICK ACTION BUTTONS */}
        {/* ============================================================== */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
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
            onClick={() => void handleDownloadFullPass()}
            disabled={exportingPass}
            className="flex min-h-[44px] flex-col items-center justify-center gap-1 rounded-2xl bg-brand/10 p-2 text-xs font-semibold text-accent ring-1 ring-brand/20 hover:bg-brand/15 active:scale-95 transition cursor-pointer disabled:opacity-40"
          >
            <Download size={16} className="text-accent" />
            <span>{exportingPass ? "Saving…" : "Save Card"}</span>
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
