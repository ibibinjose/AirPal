import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "wouter";
import {
  ArrowRight,
  Check,
  Contact,
  Copy,
  Download,
  MapPin,
  Maximize2,
  PencilLine,
  QrCode,
  Share2,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { bioPath, type BioKind } from "@shared/bio";
import { BrandMark } from "@/components/brand/BrandMark";
import { BioKindBadge, BioKindIcon } from "@/components/bio/BioKindBadge";
import { BioShareModal } from "@/components/bio/BioShareModal";
import { AppleWalletButton } from "@/components/ui/AppleWalletButton";
import { GoogleWalletButton } from "@/components/ui/GoogleWalletButton";
import { makeQrDataUrl } from "@/lib/qr";
import { saveBioContact } from "@/lib/people";
import { shareBioPass } from "@/lib/share";
import { publicSiteOrigin } from "@/lib/public-origin";
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
  compact?: boolean;
  className?: string;
  children?: ReactNode;
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
  compact = false,
  className,
  children,
}: DigitalBioPassCardProps) {
  const cleanHandle = handle.trim().replace(/^@+/, "").toLowerCase();
  const [internalQr, setInternalQr] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);

  const profileUrl = useMemo(() => {
    const origin =
      typeof window !== "undefined" && window.location?.origin ? window.location.origin : publicSiteOrigin();
    return `${origin}${bioPath(cleanHandle)}`;
  }, [cleanHandle]);

  const qrSrc = externalQr || internalQr;

  useEffect(() => {
    if (externalQr || !cleanHandle) return;
    let active = true;
    void makeQrDataUrl(profileUrl, 320)
      .then((url) => {
        if (active) setInternalQr(url);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [externalQr, cleanHandle, profileUrl]);

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
    <section
      className={cn("rounded-[32px] sm:rounded-[36px] ring-1 ring-line/80 bg-card p-5 sm:p-7 shadow-clay", className)}
    >
      {/* Top Header Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3 min-w-0">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-brand/10 text-accent ring-1 ring-brand/20">
            <QrCode size={19} aria-hidden="true" />
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

      {/* Wallet Pass Card Body */}
      <div className="overflow-hidden rounded-3xl ring-1 ring-line/80 bg-paper/60">
        {/* Brand Blue Passbook Banner */}
        <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-[#0055ff] via-[#0047eb] to-[#0035b8] px-4 sm:px-5 py-3.5 text-white">
          <div className="flex items-center gap-2.5 min-w-0">
            <BrandMark compact invert />
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/95 truncate">
              AirPal.Me · Digital Bio Pass
            </span>
          </div>
          <span className="truncate max-w-[46%] sm:max-w-none sm:shrink-0 text-xs font-mono font-semibold text-white/95">
            airpal.me/@{cleanHandle}
          </span>
        </div>

        <div className={cn("flex flex-col sm:flex-row items-center gap-5 sm:gap-6 p-5 sm:p-6", compact && "p-4")}>
          {/* Interactive QR Pass Frame */}
          <button
            type="button"
            onClick={() => {
              void triggerHaptic("light");
              setShareModalOpen(true);
            }}
            className="group relative grid h-36 w-36 sm:h-40 sm:w-40 shrink-0 place-items-center rounded-[24px] bg-white p-3 shadow-sm ring-1 ring-black/10 transition hover:ring-brand/50 active:scale-95 cursor-pointer"
            aria-label={`Enlarge QR code for @${cleanHandle}`}
            title="Tap to enlarge QR pass"
          >
            {qrSrc ? (
              <img
                src={qrSrc}
                alt={`QR for @${cleanHandle}`}
                width={144}
                height={144}
                className="h-full w-full object-contain"
              />
            ) : (
              <div className="text-xs text-mute animate-pulse">Loading QR…</div>
            )}
            <span className="absolute bottom-2 right-2 grid h-7 w-7 place-items-center rounded-full bg-ink/80 text-white opacity-0 shadow-xs transition-opacity group-hover:opacity-100">
              <Maximize2 size={12} aria-hidden="true" />
            </span>
          </button>

          {/* Identity & Actions Column */}
          <div className="min-w-0 flex-1 w-full space-y-3.5 text-center sm:text-left">
            {/* Identity Summary */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3">
              <div className="relative shrink-0">
                {avatar ? (
                  <img
                    src={avatar}
                    alt={name}
                    width={48}
                    height={48}
                    className="h-12 w-12 rounded-2xl object-cover ring-1 ring-line shadow-2xs"
                  />
                ) : (
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand/15 font-display text-lg font-black text-accent ring-1 ring-brand/25">
                    {(name || cleanHandle || "A").charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="absolute -bottom-1 -right-1">
                  <BioKindIcon kind={kind} className="h-5 w-5" />
                </span>
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="font-display text-base sm:text-lg font-bold text-ink truncate">{name}</h3>
                <div className="mt-0.5 flex flex-wrap items-center justify-center sm:justify-start gap-x-2 gap-y-1 text-xs text-mute">
                  <span className="font-semibold text-accent">@{cleanHandle}</span>
                  {city && (
                    <span className="inline-flex items-center gap-1">
                      <span>·</span>
                      <MapPin size={11} aria-hidden="true" />
                      <span>{city}</span>
                    </span>
                  )}
                </div>
                {headline ? (
                  <p className="mt-1 text-xs text-mute line-clamp-2">{headline}</p>
                ) : (
                  <p className="mt-1 text-xs text-mute leading-relaxed">
                    Present this pass in person to exchange contact details or save directly to Apple &amp; Google
                    Wallet.
                  </p>
                )}
              </div>
            </div>

            {/* Action Buttons Row */}
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
              <button
                type="button"
                onClick={() => void handleCopyLink()}
                className="inline-flex min-h-[44px] justify-center whitespace-nowrap items-center gap-1.5 rounded-full bg-card px-3.5 text-xs font-bold text-ink ring-1 ring-line hover:bg-paper transition active:scale-95 cursor-pointer shadow-2xs"
              >
                {copied ? (
                  <Check size={14} className="shrink-0 text-emerald-600" />
                ) : (
                  <Copy size={14} className="shrink-0 text-accent" />
                )}
                <span>{copied ? "Copied" : "Share Bio Link"}</span>
              </button>

              <button
                type="button"
                onClick={() => void handleNativeShare()}
                className="inline-flex min-h-[44px] justify-center whitespace-nowrap items-center gap-1.5 rounded-full bg-card px-3.5 text-xs font-bold text-ink ring-1 ring-line hover:bg-paper transition active:scale-95 cursor-pointer shadow-2xs"
              >
                <Share2 size={14} className="shrink-0 text-accent" aria-hidden="true" />
                <span>Share Pass</span>
              </button>

              <button
                type="button"
                onClick={handleSaveVCard}
                className="inline-flex min-h-[44px] justify-center whitespace-nowrap items-center gap-1.5 rounded-full bg-card px-3.5 text-xs font-bold text-ink ring-1 ring-line hover:bg-paper transition active:scale-95 cursor-pointer shadow-2xs"
                aria-label={`Save contact card for ${name}`}
              >
                <Contact size={14} className="shrink-0 text-emerald-600" aria-hidden="true" />
                <span>Save Contact</span>
              </button>

              {qrSrc && (
                <button
                  type="button"
                  onClick={handleDownloadQr}
                  className="inline-flex min-h-[44px] justify-center whitespace-nowrap items-center gap-1.5 rounded-full bg-card px-3.5 text-xs font-bold text-ink ring-1 ring-line hover:bg-paper transition active:scale-95 cursor-pointer shadow-2xs"
                  aria-label="Download QR image"
                >
                  <Download size={14} className="shrink-0 text-mute" aria-hidden="true" />
                  <span>QR PNG</span>
                </button>
              )}

              {showViewBioLink && (
                <Link
                  href={bioPath(cleanHandle)}
                  className="inline-flex min-h-[44px] justify-center whitespace-nowrap items-center gap-1.5 rounded-full bg-card px-3.5 text-xs font-bold text-ink ring-1 ring-line hover:bg-paper transition active:scale-95 shadow-2xs"
                >
                  <span>View Bio</span>
                  <ArrowRight size={13} className="shrink-0 text-mute" aria-hidden="true" />
                </Link>
              )}

              {showEditBioLink && (
                <Link
                  href="/bio/edit"
                  className="inline-flex min-h-[44px] justify-center whitespace-nowrap items-center gap-1.5 rounded-full bg-card px-3.5 text-xs font-bold text-ink ring-1 ring-line hover:bg-paper transition active:scale-95 shadow-2xs"
                >
                  <PencilLine size={13} className="shrink-0 text-mute" aria-hidden="true" />
                  <span>Edit Bio</span>
                </Link>
              )}
            </div>

            {/* Apple & Google Wallet Pass Buttons */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5 pt-3 border-t border-line/60">
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
                  void openGoogleWalletPass(googleWalletCardUrl(cleanHandle));
                }}
              />
            </div>
          </div>
        </div>
      </div>

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
