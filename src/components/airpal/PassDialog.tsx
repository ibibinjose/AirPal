import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { makeQrDataUrl } from "@/lib/qr";
import { AppleWalletButton } from "@/components/ui/AppleWalletButton";
import { GoogleWalletButton } from "@/components/ui/GoogleWalletButton";
import { openAppleWalletPass, openGoogleWalletPass } from "@/lib/wallet";
import { useScrollLock } from "@/hooks/useScrollLock";
import { triggerHaptic } from "@/lib/native";

interface PassData {
  id: string;
  title: string;
  venue?: string;
  date?: string;
  time?: string;
  code?: string;
  kind?: string;
  badge?: string;
}

interface Props {
  pass: PassData | null;
  onClose: () => void;
}

export function PassDialog({ pass, onClose }: Props) {
  const [qr, setQr] = useState<string>("");

  useScrollLock(Boolean(pass));

  useEffect(() => {
    if (!pass) return;
    let cancelled = false;
    const gateCode = pass.code || pass.id.slice(0, 8).toUpperCase();
    const qrPayload = `https://airpal.me/ticket/${pass.id}?code=${gateCode}`;
    makeQrDataUrl(qrPayload, 300)
      .then((url) => {
        if (!cancelled) setQr(url);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [pass]);

  if (!pass || typeof document === "undefined") return null;

  const displayCode = pass.code || pass.id.slice(0, 8).toUpperCase();

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pass-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
    >
      {/* Backdrop */}
      <div onClick={onClose} className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" />

      {/* Modal card */}
      <div className="relative z-10 w-full max-w-sm overflow-hidden rounded-3xl border border-line bg-card p-6 shadow-2xl text-center dark:border-line/70">
        <div className="flex items-start justify-between">
          <div className="text-left">
            <span className="text-[10px] font-bold uppercase tracking-wider text-accent">AIRPAL · DIGITAL PASS</span>
            <h2 id="pass-dialog-title" className="font-display text-xl font-bold text-ink mt-0.5">
              {pass.title}
            </h2>
            <p className="text-xs text-mute mt-0.5">{pass.venue || "Sydney"}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="grid h-8 w-8 place-items-center rounded-full bg-paper text-mute hover:bg-card hover:text-ink ring-1 ring-line transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* QR Code Container */}
        <div className="mt-5 rounded-2xl border border-line bg-white p-4 shadow-xs dark:border-line/60">
          {qr ? (
            <img src={qr} alt={`QR entry pass for ${pass.title}`} className="mx-auto h-48 w-48 object-contain" />
          ) : (
            <div className="flex h-48 w-48 items-center justify-center mx-auto text-xs text-mute">
              Generating pass QR…
            </div>
          )}
          <code className="mt-3 block font-mono text-xs font-bold tracking-widest text-ink">{displayCode}</code>
        </div>

        {/* Valid for entry text */}
        <p className="mt-3 text-[11px] text-mute leading-relaxed">
          Show this code or tap your wallet at the door for entry.
        </p>

        {/* Apple & Google Wallet Buttons */}
        <div className="mt-4 flex flex-col gap-2">
          <AppleWalletButton
            onClick={() => {
              void triggerHaptic("medium");
              openAppleWalletPass(pass.id);
            }}
          />
          <GoogleWalletButton
            onClick={() => {
              void triggerHaptic("medium");
              openGoogleWalletPass(pass.id);
            }}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}
