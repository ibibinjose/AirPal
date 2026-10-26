import type { ComponentType } from "react";
import { ChevronRight, Globe } from "lucide-react";
import { isSafeBioHref, socialLinks, type BioLink } from "@shared/bio";
import { cn } from "@/lib/cn";
import { triggerHaptic } from "@/lib/native";

type SocialIconProps = { size?: number; className?: string };

function InstagramMark({ size = 20, className }: SocialIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="2" />
      <circle cx="17.5" cy="6.5" r="1.25" fill="currentColor" />
    </svg>
  );
}

function TikTokMark({ size = 20, className }: SocialIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5c-1.42 0-2.6-1.16-2.6-2.6 0-1.72 1.66-3.01 3.37-2.48V9.66c-3.45-.46-6.47 2.22-6.47 5.64 0 3.33 2.76 5.7 5.69 5.7 3.14 0 5.69-2.55 5.69-5.7V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3s-1.88.09-3.24-1.48Z" />
    </svg>
  );
}

function YouTubeMark({ size = 20, className }: SocialIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M21.58 7.19a2.51 2.51 0 0 0-1.77-1.77C18.25 5 12 5 12 5s-6.25 0-7.81.42c-.86.23-1.54.91-1.77 1.77C2 8.75 2 12 2 12s0 3.25.42 4.81c.23.86.91 1.54 1.77 1.77C5.75 19 12 19 12 19s6.25 0 7.81-.42a2.51 2.51 0 0 0 1.77-1.77C22 15.25 22 12 22 12s0-3.25-.42-4.81ZM10 15V9l5.2 3-5.2 3Z" />
    </svg>
  );
}

function LinkedInMark({ size = 20, className }: SocialIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M6.94 5a2 2 0 1 1-4-.002 2 2 0 0 1 4 .002ZM7 8.48H3V21h4V8.48Zm6.32 0H9.34V21h3.94v-6.57c0-3.66 4.77-4 4.77 0V21H22v-7.93c0-6.17-7.06-5.94-8.72-2.91l.04-1.68Z" />
    </svg>
  );
}

function XMark({ size = 20, className }: SocialIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function FacebookMark({ size = 20, className }: SocialIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M14 13.5h2.5l1-4H14v-2c0-1.03 0-2 2-2h1.5V2.14c-.326-.043-1.557-.14-2.857-.14C11.928 2 10 3.657 10 6.7v2.8H7v4h3V22h4v-8.5Z" />
    </svg>
  );
}

function ThreadsMark({ size = 20, className }: SocialIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M16.5 11.75c-.2-2.75-1.95-4.25-4.5-4.25-2.55 0-4.25 1.75-4.25 4.5s1.65 4.5 4.25 4.5c1.85 0 3.15-.85 3.65-2.25m-3.65-4.5c1.45 0 2.5.9 2.5 2.25s-1.05 2.25-2.5 2.25-2.25-.9-2.25-2.25 1-2.25 2.25-2.25ZM19.25 12a7.25 7.25 0 1 0-3.2 6.02"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SnapchatMark({ size = 20, className }: SocialIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 3c2.8 0 4.9 1.9 5.1 4.7l.1 2.1c.2.2.7.4 1.2.5.5.1.8.4.8.8 0 .5-.5.8-1.2 1-.2.1-.6.2-.8.5-.2.3-.1.8.2 1.3.7 1.2 1.8 2.1 3.1 2.4.4.1.6.4.5.8-.1.4-.7.8-1.8 1-.4.1-.7.3-.8.8-.1.5-.4.7-.9.7-.4 0-.9-.2-1.6-.2-.8 0-1.5.2-2.2.7-.7.5-1.6.9-2.7.9s-2-.4-2.7-.9c-.7-.5-1.4-.7-2.2-.7-.7 0-1.2.2-1.6.2-.5 0-.8-.2-.9-.7-.1-.5-.4-.7-.8-.8-1.1-.2-1.7-.6-1.8-1-.1-.4.1-.7.5-.8 1.3-.3 2.4-1.2 3.1-2.4.3-.5.4-1 .2-1.3-.2-.3-.6-.4-.8-.5-.7-.2-1.2-.5-1.2-1 0-.4.3-.7.8-.8.5-.1 1-.3 1.2-.5L6.9 7.7C7.1 4.9 9.2 3 12 3Z" />
    </svg>
  );
}

function PinterestMark({ size = 20, className }: SocialIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12.2 3C7.1 3 4.5 6.4 4.5 10.1c0 1.7.9 3.8 2.4 4.5.2.1.4 0 .4-.2l.3-1.3c0-.2 0-.3-.1-.4-.5-.6-.8-1.5-.8-2.5 0-3.1 2.4-5.4 5.8-5.4 3.1 0 5.2 2 5.2 4.8 0 3.4-1.6 5.8-3.8 5.8-1.2 0-2.1-.9-1.8-2.1.3-1.4 1-2.9 1-3.9 0-.9-.5-1.7-1.5-1.7-1.2 0-2.1 1.2-2.1 2.9 0 1.1.4 1.8.4 1.8l-1.5 6.2c-.3 1.2-.1 2.8 0 3 .1.1.2.1.3 0 .2-.3 1.5-2 1.9-3.5l.7-2.6c.4.8 1.5 1.4 2.7 1.4 3.6 0 6.2-3.3 6.2-7.5C20 5.9 16.7 3 12.2 3Z" />
    </svg>
  );
}

interface PlatformConfig {
  name: string;
  action: string;
  defaultSubtitle: string;
  icon: ComponentType<SocialIconProps>;
  iconBg: string;
  iconColor: string;
  hoverBorder: string;
  badgeBg: string;
  badgeText: string;
}

const PLATFORM_CONFIGS: Record<string, PlatformConfig> = {
  instagram: {
    name: "Instagram",
    action: "Follow",
    defaultSubtitle: "Photos, stories & reels",
    icon: InstagramMark,
    iconBg: "bg-gradient-to-tr from-[#f09433] via-[#e6683c] to-[#bc1888] shadow-sm shadow-rose-500/20",
    iconColor: "text-white",
    hoverBorder: "hover:border-rose-400/50 hover:bg-rose-500/[0.02]",
    badgeBg: "bg-rose-500/10",
    badgeText: "text-rose-700",
  },
  tiktok: {
    name: "TikTok",
    action: "Watch",
    defaultSubtitle: "Shorts & trending videos",
    icon: TikTokMark,
    iconBg: "bg-black text-white shadow-sm shadow-black/20 dark:bg-zinc-800",
    iconColor: "text-white",
    hoverBorder: "hover:border-zinc-500/50 hover:bg-black/[0.02]",
    badgeBg: "bg-zinc-500/10",
    badgeText: "text-zinc-800 dark:text-zinc-200",
  },
  youtube: {
    name: "YouTube",
    action: "Subscribe",
    defaultSubtitle: "Videos, shorts & podcasts",
    icon: YouTubeMark,
    iconBg: "bg-[#ff0000] text-white shadow-sm shadow-red-600/20",
    iconColor: "text-white",
    hoverBorder: "hover:border-red-500/50 hover:bg-red-500/[0.02]",
    badgeBg: "bg-red-500/10",
    badgeText: "text-red-700",
  },
  linkedin: {
    name: "LinkedIn",
    action: "Connect",
    defaultSubtitle: "Professional career & articles",
    icon: LinkedInMark,
    iconBg: "bg-[#0a66c2] text-white shadow-sm shadow-blue-600/20",
    iconColor: "text-white",
    hoverBorder: "hover:border-blue-500/50 hover:bg-blue-500/[0.02]",
    badgeBg: "bg-blue-500/10",
    badgeText: "text-blue-700",
  },
  x: {
    name: "X",
    action: "Follow",
    defaultSubtitle: "Live thoughts, news & updates",
    icon: XMark,
    iconBg: "bg-black text-white shadow-sm shadow-black/20 dark:bg-zinc-800",
    iconColor: "text-white",
    hoverBorder: "hover:border-zinc-500/50 hover:bg-black/[0.02]",
    badgeBg: "bg-zinc-500/10",
    badgeText: "text-zinc-800 dark:text-zinc-200",
  },
  facebook: {
    name: "Facebook",
    action: "Follow",
    defaultSubtitle: "Community, posts & events",
    icon: FacebookMark,
    iconBg: "bg-[#1877f2] text-white shadow-sm shadow-blue-600/20",
    iconColor: "text-white",
    hoverBorder: "hover:border-blue-600/50 hover:bg-blue-600/[0.02]",
    badgeBg: "bg-blue-600/10",
    badgeText: "text-blue-800",
  },
  threads: {
    name: "Threads",
    action: "Follow",
    defaultSubtitle: "Discussions & conversations",
    icon: ThreadsMark,
    iconBg: "bg-black text-white shadow-sm shadow-black/20 dark:bg-zinc-800",
    iconColor: "text-white",
    hoverBorder: "hover:border-zinc-500/50 hover:bg-black/[0.02]",
    badgeBg: "bg-zinc-500/10",
    badgeText: "text-zinc-800 dark:text-zinc-200",
  },
  snapchat: {
    name: "Snapchat",
    action: "Add",
    defaultSubtitle: "Behind the scenes & snaps",
    icon: SnapchatMark,
    iconBg: "bg-[#fffc00] text-black shadow-sm shadow-yellow-400/20",
    iconColor: "text-black",
    hoverBorder: "hover:border-yellow-400/60 hover:bg-yellow-400/[0.03]",
    badgeBg: "bg-yellow-500/15",
    badgeText: "text-yellow-900",
  },
  pinterest: {
    name: "Pinterest",
    action: "Follow",
    defaultSubtitle: "Inspiration boards & ideas",
    icon: PinterestMark,
    iconBg: "bg-[#e60023] text-white shadow-sm shadow-red-600/20",
    iconColor: "text-white",
    hoverBorder: "hover:border-red-600/50 hover:bg-red-600/[0.02]",
    badgeBg: "bg-red-600/10",
    badgeText: "text-red-700",
  },
};

function extractSubtitle(link: BioLink, cfg: PlatformConfig): string {
  if (!link.href) return cfg.defaultSubtitle;
  try {
    const url = new URL(link.href.startsWith("http") ? link.href : `https://${link.href}`);
    const pathname = url.pathname.replace(/^\/+|\/+$/g, "");
    if (pathname && !["channel", "c", "user", "in", "profile", "feed"].includes(pathname.toLowerCase())) {
      const parts = pathname.split("/");
      const last = parts[parts.length - 1];
      if (last && last.length <= 25 && !last.includes("?") && !last.includes("=")) {
        return `@${last.replace(/^@/, "")}`;
      }
    }
  } catch {
    /* fallback */
  }
  return cfg.defaultSubtitle;
}

export function BioSocials({
  links,
  onTap,
  className,
}: {
  links: BioLink[];
  onTap: (kind: string, linkId?: string) => void;
  className?: string;
}) {
  const rows = socialLinks(links).filter((link) => isSafeBioHref(link.href));
  if (!rows.length) return null;

  return (
    <div className={cn("space-y-2.5", className)}>
      {rows.map((link) => {
        const cfg = PLATFORM_CONFIGS[link.type] || {
          name: link.label || link.type,
          action: "Open",
          defaultSubtitle: "Official social link",
          icon: Globe,
          iconBg: "bg-brand text-white shadow-sm shadow-brand/20",
          iconColor: "text-white",
          hoverBorder: "hover:border-brand/40 hover:bg-brand/[0.02]",
          badgeBg: "bg-brand/10",
          badgeText: "text-accent",
        };

        const Icon = cfg.icon;
        const title = link.label && link.label.toLowerCase() !== link.type ? link.label : cfg.name;
        const subtitle = extractSubtitle(link, cfg);

        return (
          <a
            key={link.id}
            href={link.href}
            target="_blank"
            rel="noreferrer"
            onClick={() => {
              void triggerHaptic("light");
              onTap(link.type, link.id);
            }}
            aria-label={`${title} (${cfg.action})`}
            className={cn(
              "group flex w-full items-center justify-between rounded-2xl sm:rounded-[22px] bg-card p-3.5 sm:p-4 text-left ring-1 ring-line/80 shadow-2xs transition-[box-shadow,transform,border-color] duration-200 hover:shadow-xs active:scale-[0.99] touch-manipulation cursor-pointer",
              cfg.hoverBorder,
            )}
          >
            {/* Left: Brand Icon & Platform Info */}
            <div className="flex items-center gap-3.5 min-w-0">
              <span
                className={cn(
                  "grid h-11 w-11 sm:h-12 sm:w-12 shrink-0 place-items-center rounded-xl sm:rounded-2xl transition-transform duration-200 group-hover:scale-105",
                  cfg.iconBg,
                  cfg.iconColor,
                )}
              >
                <Icon size={20} className="sm:w-[22px] sm:h-[22px]" />
              </span>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-display text-sm sm:text-[15px] font-bold text-ink truncate group-hover:text-accent transition-colors">
                    {title}
                  </h4>
                  <span
                    className={cn(
                      "hidden xs:inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                      cfg.badgeBg,
                      cfg.badgeText,
                    )}
                  >
                    {cfg.action}
                  </span>
                </div>
                <p className="text-xs text-mute truncate mt-0.5">{subtitle}</p>
              </div>
            </div>

            {/* Right: Action Chevron */}
            <div className="flex items-center gap-1 shrink-0 ml-2">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-paper/80 text-mute transition-[background-color,color,transform] duration-200 group-hover:bg-brand group-hover:text-white group-hover:translate-x-0.5 shadow-2xs">
                <ChevronRight size={15} />
              </span>
            </div>
          </a>
        );
      })}
    </div>
  );
}
