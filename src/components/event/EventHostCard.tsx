import { useEffect, useState } from "react";
import { Link } from "wouter";
import { AtSign, BadgeCheck, Building2, Handshake, MessageCircle, User, UserCheck, UserPlus } from "lucide-react";
import { fetchPublicBio } from "@/lib/bio-store";
import { bioPath, type BioProfile } from "@shared/bio";
import { useSocial } from "@/contexts/SocialContext";
import { triggerHaptic } from "@/lib/native";
import { cn } from "@/lib/cn";

export interface EventHostCardProps {
  hostName?: string;
  hostHandle?: string;
  hostType?: "business" | "individual";
  collaboratorHandles?: string[];
  sponsorHandles?: string[];
  /** Luma-style row: Follow the host plus a Contact the Host link. Off in previews. */
  showActions?: boolean;
  className?: string;
}

export function EventHostCard({
  hostName,
  hostHandle,
  hostType = "individual",
  collaboratorHandles = [],
  sponsorHandles = [],
  showActions = false,
  className,
}: EventHostCardProps) {
  const [profile, setProfile] = useState<BioProfile | null>(null);
  const { isFollowing, toggleFollow } = useSocial();
  const cleanHandle = hostHandle ? hostHandle.replace(/^@+/, "").toLowerCase() : "";

  useEffect(() => {
    if (!cleanHandle) return;
    let alive = true;
    void fetchPublicBio(cleanHandle).then((bio) => {
      if (alive && bio) setProfile(bio);
    });
    return () => {
      alive = false;
    };
  }, [cleanHandle]);

  const displayName = profile?.name || hostName || (hostType === "business" ? "Event Partner" : "Community Host");
  const avatarUrl = profile?.avatar;
  const isBusiness = hostType === "business" || profile?.kind === "business";

  return (
    <div className={cn("rounded-3xl bg-card p-4 sm:p-5 ring-1 ring-line space-y-4", className)}>
      <div className="flex items-center justify-between border-b border-line/50 pb-3">
        <span className="text-xs font-bold uppercase tracking-wider text-mute">Hosted By</span>
        <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-bold text-accent">
          {isBusiness ? <Building2 size={11} aria-hidden="true" /> : <User size={11} aria-hidden="true" />}
          <span>{isBusiness ? "Business / Venue" : "AirPal Host"}</span>
        </span>
      </div>

      {/* Main Host Row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link href={cleanHandle ? bioPath(cleanHandle) : "#"} className="relative shrink-0 group block">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                className="h-11 w-11 rounded-full object-cover ring-2 ring-line/80 group-hover:ring-brand transition"
              />
            ) : (
              <div className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-tr from-brand/20 to-amber-500/20 text-sm font-black text-accent ring-2 ring-line/80">
                {displayName.slice(0, 1).toUpperCase()}
              </div>
            )}
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-card" />
          </Link>

          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <Link
                href={cleanHandle ? bioPath(cleanHandle) : "#"}
                className="text-sm font-bold text-ink hover:text-accent transition truncate"
              >
                {displayName}
              </Link>
              <BadgeCheck size={14} className="text-amber-500 shrink-0 fill-amber-500/20" />
            </div>

            {cleanHandle ? (
              <Link
                href={bioPath(cleanHandle)}
                className="text-xs font-semibold text-mute hover:text-accent transition flex items-center gap-0.5"
              >
                <span>@{cleanHandle}</span>
              </Link>
            ) : (
              <p className="text-xs text-mute truncate">{profile?.shortWhy || "Verified Event Host"}</p>
            )}
          </div>
        </div>

        {cleanHandle && (
          <Link
            href={bioPath(cleanHandle)}
            className="inline-flex min-h-[44px] items-center gap-1 rounded-full bg-paper px-4 text-sm font-semibold text-ink ring-1 ring-line hover:bg-card hover:ring-brand/30 transition shrink-0 active:scale-95 touch-manipulation"
          >
            <span>View Bio</span>
          </Link>
        )}
      </div>

      {/* Extra Hosts / Co-Hosts List */}
      {collaboratorHandles.length > 0 && (
        <div className="border-t border-line/50 pt-3">
          <span className="text-xs font-bold uppercase tracking-wider text-mute block mb-2">
            Extra Hosts &amp; Co-hosts
          </span>
          <div className="flex flex-wrap gap-1.5">
            {collaboratorHandles.map((handle) => {
              const clean = handle.replace(/^@+/, "");
              return (
                <Link
                  key={clean}
                  href={bioPath(clean)}
                  className="inline-flex min-h-[44px] items-center gap-1 rounded-full bg-paper px-2.5 py-1 text-xs font-medium text-ink ring-1 ring-line hover:ring-brand hover:text-accent transition touch-manipulation"
                >
                  <AtSign size={11} className="text-accent" aria-hidden="true" />
                  <span>{clean}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Sponsors List */}
      {sponsorHandles.length > 0 && (
        <div className="border-t border-line/50 pt-3">
          <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-mute mb-2">
            <Handshake size={12} className="text-amber-600 dark:text-amber-400" aria-hidden="true" />
            <span>Sponsors</span>
          </span>
          <div className="flex flex-wrap gap-1.5">
            {sponsorHandles.map((handle) => {
              const clean = handle.replace(/^@+/, "");
              return (
                <Link
                  key={clean}
                  href={bioPath(clean)}
                  className="inline-flex min-h-[44px] items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-ink ring-1 ring-amber-500/25 hover:ring-amber-500/50 hover:text-accent transition touch-manipulation"
                >
                  <AtSign size={11} className="text-amber-600 dark:text-amber-400" aria-hidden="true" />
                  <span>{clean}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Follow + Contact the Host (event page only) */}
      {showActions && cleanHandle && (
        <div className="flex items-center gap-2 border-t border-line/50 pt-3">
          <button
            type="button"
            onClick={() => {
              void triggerHaptic("light");
              toggleFollow(cleanHandle, displayName);
            }}
            aria-pressed={isFollowing(cleanHandle)}
            className={cn(
              "inline-flex min-h-[44px] min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full px-3 text-sm font-bold transition active:scale-95 cursor-pointer touch-manipulation ring-1",
              isFollowing(cleanHandle)
                ? "bg-paper text-ink ring-line hover:bg-card"
                : "bg-brand text-white ring-brand hover:bg-brand-ink",
            )}
          >
            {isFollowing(cleanHandle) ? (
              <UserCheck size={15} className="shrink-0" aria-hidden="true" />
            ) : (
              <UserPlus size={15} className="shrink-0" aria-hidden="true" />
            )}
            <span className="truncate">{isFollowing(cleanHandle) ? "Following" : `Follow ${displayName}`}</span>
          </button>
          <Link
            href={bioPath(cleanHandle)}
            className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-paper px-3 text-sm font-bold text-ink ring-1 ring-line hover:bg-card transition active:scale-95 touch-manipulation"
          >
            <MessageCircle size={15} className="shrink-0 text-accent" aria-hidden="true" />
            <span>Contact the Host</span>
          </Link>
        </div>
      )}
    </div>
  );
}
