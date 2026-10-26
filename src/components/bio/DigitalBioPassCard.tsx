import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "wouter";
import { ArrowRight, Check, Contact, Copy, Download, PencilLine, QrCode, Share2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { bioPath, type BioKind } from "@shared/bio";
import { BioKindBadge } from "@/components/bio/BioKindBadge";
import { BioPassVisual } from "@/components/bio/BioPassVisual";
import { BioShareModal } from "@/components/bio/BioShareModal";
import { AppleWalletButton } from "@/components/ui/AppleWalletButton";
import { GoogleWalletButton } from "@/components/ui/GoogleWalletButton";
import { makeQrDataUrl } from "@/lib/qr";
import { cleanHandle as safeHandle } from "@/lib/profile-text";
import { saveBioContact } from "@/lib/people";
import { shareBioPass } from "@/lib/share";
import { toPublicUrl } from "@/lib/public-origin";
import { exportBioPassPng } from "@/lib/bio-pass-export";
import {
  businessCardWalletPassUrl,
  googleWalletCardUrl,
  openAppleWalletPass,
  openGoogleWalletPass,
} from "@/lib/wallet";
import { triggerHaptic } from "@/lib/native";
import { cn } from "@/lib/cn";

export interface DigitalBioPassCardProps {
  handle: string;
  name: string;
  kind?: BioKind | null;
  avatar?: string;
  city?: string;
  headline?: string;
  phone?: string;
  email?: string;
  qrDataUrl?: string;
  title?: string;
  subtitle?: string;
  tapsTodayCount?: number;
  showViewBioLink?: boolean;
  showEditBioLink?: boolean;
  className?: string;
  children?: ReactNode;
}

/** Shared pill-button shell: one class source so all pass actions align. */
const ACTION_CORE =
  "inline-flex min-h-[44px] justify-center whitespace-nowrap items-center gap-1.5 rounded-full bg-card px-3.5 text-xs font-bold text-ink ring-1 ring-line hover:bg-paper transition-[background-color,transform] active:scale-95 shadow-2xs";
const ACTION_ACCENT =
  "inline-flex min-h-[44px] justify-center whitespace-nowrap items-center gap-1.5 rounded-full bg-brand/10 text-accent font-bold px-3.5 text-xs ring-1 ring-brand/20 hover:bg-brand/15 transition-[background-color,transform] active:scale-95 shadow-2xs";

function PassActionButton({
  icon,
  label,
  onClick,
  disabled,
  accent,
  title,
  ariaLabel,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  accent?: boolean;
  title?: string;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={ariaLabel}
      className={cn(accent ? ACTION_ACCENT : ACTION_CORE, "cursor-pointer", accent && "disabled:opacity-50")}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function PassActionLink({ children, href }: { children: ReactNode; href: string }) {
  return (
    <Link href={href} className={ACTION_CORE}>
      {children}
    </Link>
  );
}

function PassHeader({
  title,
  subtitle,
  kind,
  cleanHandle,
  tapsTodayCount,
}: {
  title: string;
  subtitle: string;
  kind: BioKind | null;
  cleanHandle: string;
  tapsTodayCount?: number;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
      <div className="flex items-center gap-3 min-w-0">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-brand/10 text-accent">
          <QrCode size={18} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-display text-lg sm:text-xl font-black text-ink truncate">{title}</h2>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-500/20">
              <ShieldCheck size={11} aria-hidden="true" />
              <span>Verified ID</span>
            </span>
          </div>
          <p className="text-xs text-mute font-medium truncate">{subtitle}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {typeof tapsTodayCount === "number" && (
          <span className="whitespace-nowrap rounded-full bg-brand/10 px-2.5 py-1 text-[11px] font-bold text-accent tabular-nums">
            {tapsTodayCount} {tapsTodayCount === 1 ? "tap" : "taps"} today
          </span>
        )}
        <BioKindBadge kind={kind} />
        <span className="truncate max-w-[160px] sm:max-w-none text-xs font-mono font-bold text-ink bg-paper px-3 py-1 rounded-full ring-1 ring-line/80">
          @{cleanHandle}
        </span>
      </div>
    </div>
  );
}

function PassWallets({ cleanHandle }: { cleanHandle: string }) {
  return (
    <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-2.5 pt-5 border-t border-line/60">
      <AppleWalletButton
        className="w-full justify-center min-h-[44px]"
        onClick={() => {
          const passUrl = businessCardWalletPassUrl(cleanHandle);
          void openAppleWalletPass(passUrl, "@" + cleanHandle + "-AirPal-Pass");
        }}
      />
      <GoogleWalletButton
        className="w-full justify-center min-h-[44px]"
        onClick={() => {
          const gUrl = googleWalletCardUrl(cleanHandle);
          void openGoogleWalletPass(gUrl);
        }}
      />
    </div>
  );
}

export function DigitalBioPassCard({
  handle,
  name,
  kind = "person",
  avatar,
  city,
  headline,
  phone,
  email,
  qrDataUrl: externalQr,
  title = "My Digital Bio Pass",
  subtitle = "Universal Contact Pass · Apple & Google Wallet",
  tapsTodayCount,
  showViewBioLink = true,
  showEditBioLink = false,
  className,
  children,
}: DigitalBioPassCardProps) {
  const cleanHandle = safeHandle(handle);
  const [internalQr, setInternalQr] = useState<string>("");
  const [qrFailed, setQrFailed] = useState(false);
  const [qrAttempt, setQrAttempt] = useState(0);
  const [copied, setCopied] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);

  const profileUrl = useMemo(() => toPublicUrl(bioPath(cleanHandle)), [cleanHandle]);

  const qrSrc = externalQr || internalQr;

  useEffect(() => {
    if (externalQr || !cleanHandle) return;
    let active = true;
    setQrFailed(false);
    void makeQrDataUrl(profileUrl, 320)
      .then((url) => {
        if (active) setInternalQr(url);
      })
      .catch(() => {
        if (active) setQrFailed(true);
      });
    return () => {
      active = false;
    };
  }, [externalQr, cleanHandle, profileUrl, qrAttempt]);

  const handleCopyLink = async () => {
    void triggerHaptic("light");
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      toast.success("Bio pass link copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.message(profileUrl);
    }
  };

  const handleNativeShare = async () => {
    void triggerHaptic("medium");
    await shareBioPass({
      name,
      handle: cleanHandle,
      url: profileUrl,
      headline,
    });
  };

  const handleSaveVCard = async () => {
    void triggerHaptic("medium");
    await saveBioContact({
      name,
      handle: cleanHandle,
      phone,
      email,
      url: profileUrl,
      headline,
      city,
    });
  };

  const [exportingPass, setExportingPass] = useState(false);

  const handleDownloadFullPass = async () => {
    if (exportingPass) return;
    setExportingPass(true);
    try {
      await exportBioPassPng({
        handle: cleanHandle,
        name,
        kind,
        avatar,
        city,
        qrDataUrl: qrSrc,
        url: profileUrl,
      });
    } finally {
      setExportingPass(false);
    }
  };

  const handleDownloadQr = () => {
    if (!qrSrc) return;
    void triggerHaptic("light");
    const a = document.createElement("a");
    a.href = qrSrc;
    a.download = `airpal-${cleanHandle}-qr.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success("High-res QR code downloaded");
  };

  return (
    <section className={cn("rounded-[36px] ring-1 ring-line/80 bg-card p-5 sm:p-7 shadow-clay", className)}>
      <PassHeader
        title={title}
        subtitle={subtitle}
        kind={kind}
        cleanHandle={cleanHandle}
        tapsTodayCount={tapsTodayCount}
      />

      {/* Bio Pass — renders exactly like the designed AirPal pass, per-user details */}
      <BioPassVisual
        handle={cleanHandle}
        name={name}
        kind={kind}
        avatar={avatar}
        city={city}
        qrSrc={qrSrc}
        qrFailed={qrFailed && !qrSrc}
        url={profileUrl}
        copied={copied}
        onCopyLink={() => void handleCopyLink()}
        onQrTap={() => {
          if (qrFailed && !qrSrc) {
            setQrFailed(false);
            setQrAttempt((attempt) => attempt + 1);
            return;
          }
          void triggerHaptic("light");
          setShareModalOpen(true);
        }}
      />

      {/* Action Buttons Row */}
      <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center justify-center sm:justify-start gap-2 mt-5">
        <PassActionButton
          icon={
            copied ? (
              <Check size={14} className="shrink-0 text-emerald-600" />
            ) : (
              <Copy size={14} className="shrink-0 text-accent" />
            )
          }
          label={copied ? "Copied" : "Share Bio Link"}
          onClick={() => void handleCopyLink()}
        />

        <PassActionButton
          icon={<Share2 size={14} className="shrink-0 text-accent" aria-hidden="true" />}
          label="Share Pass"
          onClick={() => void handleNativeShare()}
        />

        <PassActionButton
          icon={<Contact size={14} className="shrink-0 text-emerald-600" aria-hidden="true" />}
          label="Save Contact"
          onClick={handleSaveVCard}
          ariaLabel={`Save contact card for ${name}`}
        />

        <PassActionButton
          icon={<Download size={14} className="shrink-0 text-accent" aria-hidden="true" />}
          label={exportingPass ? "Generating…" : "Pass Card PNG"}
          onClick={() => void handleDownloadFullPass()}
          disabled={exportingPass}
          accent
          ariaLabel="Download Full Pass Card PNG"
        />

        {qrSrc && (
          <PassActionButton
            icon={<Download size={14} className="shrink-0 text-mute" aria-hidden="true" />}
            label="QR PNG"
            onClick={handleDownloadQr}
            ariaLabel="Download QR image"
          />
        )}

        {showViewBioLink && (
          <PassActionLink href={bioPath(cleanHandle)}>
            <span>View Bio</span>
            <ArrowRight size={13} className="shrink-0 text-mute" aria-hidden="true" />
          </PassActionLink>
        )}

        {showEditBioLink && (
          <PassActionLink href="/bio/edit">
            <PencilLine size={13} className="shrink-0 text-mute" aria-hidden="true" />
            <span>Edit Bio</span>
          </PassActionLink>
        )}
      </div>

      <PassWallets cleanHandle={cleanHandle} />

      {children && <div className="mt-5 pt-5 border-t border-line/60">{children}</div>}

      <BioShareModal
        open={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        handle={cleanHandle}
        name={name}
        url={profileUrl}
        avatar={avatar}
        city={city}
        headline={headline}
        kind={kind}
        phone={phone}
      />
    </section>
  );
}
