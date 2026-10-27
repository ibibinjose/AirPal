import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  AtSign,
  Check,
  Copy,
  ExternalLink,
  Facebook,
  Globe,
  Instagram,
  Link2,
  Linkedin,
  MapPin,
  MessageCircle,
  Phone,
  QrCode,
  Twitter,
  X,
  Youtube,
  type LucideIcon,
} from "lucide-react";
import type { BioLink, BioProfile } from "@shared/bio";
import { isSafeBioHref, socialLinks, visibleBioLinks } from "@shared/bio";
import { useScrollLock } from "@/hooks/useScrollLock";
import { triggerHaptic } from "@/lib/native";
import { toast } from "sonner";

const LINK_ICONS: Partial<Record<BioLink["type"], LucideIcon>> = {
  website: Globe,
  instagram: Instagram,
  facebook: Facebook,
  youtube: Youtube,
  linkedin: Linkedin,
  x: Twitter,
  threads: AtSign,
  book: Link2,
  order: Link2,
  menu: Link2,
  call: Phone,
  whatsapp: MessageCircle,
  maps: MapPin,
};

function LinkIcon({ type }: { type: BioLink["type"] }) {
  const Icon = LINK_ICONS[type] ?? Link2;
  return <Icon size={16} className="shrink-0 text-accent" aria-hidden="true" />;
}

export function BioSiteLinks({ profile, onTap }: { profile: BioProfile; onTap?: (link: BioLink) => void }) {
  const links = visibleBioLinks(profile.links);
  if (links.length === 0) return null;
  return (
    <div className="space-y-2.5">
      {links.map((link) => {
        const href = isSafeBioHref(link.href) ? link.href : undefined;
        if (!href) return null;
        return (
          <a
            key={link.id}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => onTap?.(link)}
            className="neu-btn flex min-h-[52px] w-full items-center gap-3 px-4 text-sm font-bold text-ink transition-[box-shadow,transform] active:scale-[0.98]"
          >
            <LinkIcon type={link.type} />
            <span className="flex-1 truncate text-left">{link.label}</span>
            <ExternalLink size={13} className="shrink-0 text-mute" aria-hidden="true" />
          </a>
        );
      })}
    </div>
  );
}

export function BioSiteSocials({ profile }: { profile: BioProfile }) {
  const socials = socialLinks(profile.links).filter((l) => isSafeBioHref(l.href));
  if (socials.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {socials.map((link) => {
        const Icon = LINK_ICONS[link.type] ?? AtSign;
        return (
          <a
            key={link.id}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={link.label}
            title={link.label}
            className="neu-btn grid h-11 w-11 min-h-[44px] min-w-[44px] place-items-center text-accent transition-[box-shadow,transform] active:scale-95"
          >
            <Icon size={17} aria-hidden="true" />
          </a>
        );
      })}
    </div>
  );
}

/**
 * Biosites-style link-in-bio card for a handle. Presentational: the page
 * feeds it the resolved profile, the modal wraps it in a dialog.
 */
export function BioSiteView({
  profile,
  siteUrl,
  qrDataUrl,
  onTap,
  onOpenFullBio,
}: {
  profile: BioProfile;
  siteUrl: string;
  qrDataUrl?: string;
  onTap?: (link: BioLink) => void;
  onOpenFullBio?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const phoneDigits = profile.phone?.replace(/[^0-9]/g, "");

  const copyLink = async () => {
    void triggerHaptic("light");
    try {
      await navigator.clipboard.writeText(siteUrl);
      setCopied(true);
      toast.success("BioSite link copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.message(siteUrl);
    }
  };

  return (
    <div className="text-center">
      <div className="mx-auto h-22 w-22 overflow-hidden rounded-full neu-avatar bg-paper">
        {profile.avatar ? (
          <img src={profile.avatar} alt="" className="h-full w-full object-cover rounded-full" />
        ) : (
          <span className="grid h-full w-full place-items-center bg-neutral-900 font-display text-3xl font-extrabold text-white rounded-full">
            {(profile.name || profile.handle || "?")[0]?.toUpperCase()}
          </span>
        )}
      </div>

      <h2 className="font-display mt-3 text-xl font-black text-ink text-balance">{profile.name}</h2>
      <p className="mt-1 text-sm font-bold text-accent">@{profile.handle}</p>
      {(profile.city || profile.pronouns) && (
        <p className="mt-1 text-xs text-mute">{[profile.city, profile.pronouns].filter(Boolean).join(" · ")}</p>
      )}
      {profile.shortWhy && (
        <p className="mx-auto mt-2 max-w-sm text-xs text-mute leading-relaxed text-pretty">{profile.shortWhy}</p>
      )}

      {phoneDigits && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {phoneDigits && (
            <a
              href={`tel:${phoneDigits}`}
              onClick={() => onTap?.({ id: "call", type: "call", label: "Call", href: `tel:${phoneDigits}` })}
              className="neu-btn inline-flex min-h-[44px] items-center gap-1.5 px-4 text-xs font-bold text-ink transition-[box-shadow,transform] active:scale-95"
            >
              <Phone size={14} className="text-accent" aria-hidden="true" />
              <span>Call</span>
            </a>
          )}
          {phoneDigits && (
            <a
              href={`https://wa.me/${phoneDigits}`}
              target="_blank"
              rel="noopener noreferrer"
              className="neu-btn inline-flex min-h-[44px] items-center gap-1.5 px-4 text-xs font-bold text-ink transition-[box-shadow,transform] active:scale-95"
            >
              <MessageCircle size={14} className="text-emerald-600" aria-hidden="true" />
              <span>WhatsApp</span>
            </a>
          )}
        </div>
      )}

      <div className="mt-5 text-left">
        <BioSiteLinks profile={profile} onTap={onTap} />
      </div>

      <div className="mt-5">
        <BioSiteSocials profile={profile} />
      </div>

      <div className="mt-5 flex items-center justify-center gap-2">
        {qrDataUrl && (
          <span className="grid h-16 w-16 place-items-center rounded-2xl bg-white p-1.5 neu-card">
            <img src={qrDataUrl} alt="" className="h-full w-full rounded-xl" />
          </span>
        )}
        <button
          type="button"
          onClick={copyLink}
          className="neu-btn inline-flex min-h-[44px] items-center gap-1.5 px-4 text-xs font-bold text-ink transition-[box-shadow,transform] active:scale-95 cursor-pointer"
        >
          {copied ? (
            <Check size={14} className="text-emerald-600" aria-hidden="true" />
          ) : (
            <Copy size={14} className="text-accent" aria-hidden="true" />
          )}
          <span>{copied ? "Copied" : "Copy BioSite link"}</span>
        </button>
        {onOpenFullBio && (
          <button
            type="button"
            onClick={() => {
              void triggerHaptic("light");
              onOpenFullBio();
            }}
            className="neu-btn inline-flex min-h-[44px] items-center gap-1.5 px-4 text-xs font-bold text-accent transition-[box-shadow,transform] active:scale-95 cursor-pointer"
          >
            <QrCode size={14} aria-hidden="true" />
            <span>Full bio</span>
          </button>
        )}
      </div>
      <p className="mt-3 text-[10px] text-mute">Powered by AirPal · {siteUrl.replace(/^https?:\/\//, "")}</p>
    </div>
  );
}

export function BioSiteModal({
  open,
  onClose,
  profile,
  siteUrl,
  qrDataUrl,
  onTap,
  onOpenFullBio,
}: {
  open: boolean;
  onClose: () => void;
  profile: BioProfile;
  siteUrl: string;
  qrDataUrl?: string;
  onTap?: (link: BioLink) => void;
  onOpenFullBio?: () => void;
}) {
  useScrollLock(open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`BioSite preview for @${profile.handle}`}
      className="visual-viewport-modal z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          void triggerHaptic("light");
          onClose();
        }
      }}
    >
      <div className="relative w-full max-w-md rounded-t-[32px] sm:rounded-[32px] bg-card p-6 max-h-[min(92dvh,calc(var(--visual-viewport-height,100dvh)-1.5rem))] overflow-y-auto">
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-line/60 sm:hidden" aria-hidden="true" />
        <button
          type="button"
          onClick={() => {
            void triggerHaptic("light");
            onClose();
          }}
          aria-label="Close BioSite preview"
          className="absolute top-4 right-4 grid h-11 w-11 min-h-[44px] min-w-[44px] cursor-pointer place-items-center rounded-full text-mute transition hover:bg-paper hover:text-ink active:scale-95 touch-manipulation"
        >
          <X size={18} />
        </button>
        <BioSiteView
          profile={profile}
          siteUrl={siteUrl}
          qrDataUrl={qrDataUrl}
          onTap={onTap}
          onOpenFullBio={onOpenFullBio}
        />
      </div>
    </div>,
    document.body,
  );
}
