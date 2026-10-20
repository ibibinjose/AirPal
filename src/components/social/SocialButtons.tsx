import { Heart, UserCheck, UserPlus } from "lucide-react";
import { useSocial } from "@/contexts/SocialContext";
import { cn } from "@/lib/cn";

/**
 * Like / Follow buttons for businesses and bios. Signed-in users toggle
 * immediately (Liked / Following states persist + sync); guests get the
 * sign-in prompt and the tap resumes after login. No fixed min-widths —
 * the parent row controls sizing so the buttons never push siblings
 * (Website / QR) off-screen on small phones.
 */
export function LikeButton({
  handle,
  name,
  className,
  iconOnly,
}: {
  handle: string;
  name?: string;
  className?: string;
  iconOnly?: boolean;
}) {
  const { isLiked, toggleLike } = useSocial();
  const liked = isLiked(handle);
  return (
    <button
      type="button"
      aria-pressed={liked}
      aria-label={liked ? `Liked ${name || handle}` : `Like ${name || handle}`}
      title={liked ? "Liked" : "Like"}
      onClick={() => toggleLike(handle, name)}
      className={cn(
        "inline-flex min-h-[44px] min-w-0 cursor-pointer items-center justify-center gap-1 sm:gap-1.5 rounded-full px-3 sm:px-4 text-xs font-semibold whitespace-nowrap transition active:scale-95",
        liked
          ? "bg-rose-500 text-white shadow-sm ring-1 ring-rose-600"
          : "bg-rose-50 text-rose-700 ring-1 ring-rose-200 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/30 dark:hover:bg-rose-500/20",
        className,
      )}
    >
      <Heart size={iconOnly ? 18 : 14} aria-hidden="true" className={cn("shrink-0", liked && "fill-current")} />
      {!iconOnly && <span className="truncate">{liked ? "Liked" : "Like"}</span>}
    </button>
  );
}

export function FollowButton({
  handle,
  name,
  className,
  iconOnly,
}: {
  handle: string;
  name?: string;
  className?: string;
  iconOnly?: boolean;
}) {
  const { isFollowing, toggleFollow } = useSocial();
  const following = isFollowing(handle);
  const Icon = following ? UserCheck : UserPlus;
  return (
    <button
      type="button"
      aria-pressed={following}
      aria-label={following ? `Following ${name || handle}` : `Follow ${name || handle}`}
      title={following ? "Following" : "Follow"}
      onClick={() => toggleFollow(handle, name)}
      className={cn(
        "inline-flex min-h-[44px] min-w-0 cursor-pointer items-center justify-center gap-1 sm:gap-1.5 rounded-full px-3 sm:px-4 text-xs font-semibold whitespace-nowrap transition active:scale-95 touch-manipulation",
        following
          ? "bg-paper text-ink ring-1 ring-line/80 hover:bg-card shadow-2xs font-semibold"
          : "bg-brand text-white shadow-sm hover:brightness-110 font-bold",
        className,
      )}
    >
      <Icon size={iconOnly ? 18 : 15} className={cn("shrink-0", following ? "text-accent" : "")} />
      {!iconOnly && <span className="truncate">{following ? "Following" : "Follow"}</span>}
    </button>
  );
}
