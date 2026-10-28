import type { Phone } from "lucide-react";
import { triggerHaptic } from "@/lib/native";

/** Round action circle button with brand icon and subtitle. */
export function BizCircle({
  label,
  Icon,
  href,
  onClick,
}: {
  label: string;
  Icon: typeof Phone;
  href?: string;
  onClick?: () => void;
}) {
  const handleClick = () => {
    void triggerHaptic("light");
    onClick?.();
  };
  const circle =
    "neu-card grid h-12 w-12 sm:h-14 sm:w-14 place-items-center text-accent transition-all duration-150 group-hover:scale-105 active:scale-95";
  const wrap =
    "flex min-w-[56px] sm:min-w-[64px] touch-manipulation flex-col items-center gap-1.5 group cursor-pointer";
  const caption = "text-[11px] sm:text-xs font-semibold text-ink/90 group-hover:text-accent transition-colors";

  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer" onClick={handleClick} className={wrap} aria-label={label}>
        <span className={circle}>
          <Icon size={20} className="sm:w-[22px] sm:h-[22px]" />
        </span>
        <span className={caption}>{label}</span>
      </a>
    );
  }
  return (
    <button type="button" onClick={handleClick} className={wrap} aria-label={label}>
      <span className={circle}>
        <Icon size={20} className="sm:w-[22px] sm:h-[22px]" />
      </span>
      <span className={caption}>{label}</span>
    </button>
  );
}
