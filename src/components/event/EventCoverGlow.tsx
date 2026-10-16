import { useState } from "react";
import { Sparkles, Ticket } from "lucide-react";
import { cn } from "@/lib/cn";

export interface EventCoverGlowProps {
  src?: string;
  alt: string;
  themeColor?: string;
  className?: string;
  aspectRatio?: "square" | "video";
}

export function EventCoverGlow({ src, alt, className, aspectRatio = "square" }: EventCoverGlowProps) {
  const [loaded, setLoaded] = useState(false);
  const aspectClass = aspectRatio === "square" ? "aspect-square" : "aspect-[16/9]";

  return (
    <div className={cn("relative group w-full select-none", className)}>
      {/* Main Card Media — plain cover photo, no ambient glow halos */}
      <div
        className={cn(
          "relative w-full overflow-hidden rounded-[26px] sm:rounded-[30px] bg-paper ring-1 ring-line",
          aspectClass,
        )}
      >
        {src ? (
          <img
            src={src}
            alt={alt}
            loading="eager"
            decoding="async"
            onLoad={() => setLoaded(true)}
            className={cn(
              "h-full w-full object-cover transition-opacity duration-300",
              loaded ? "opacity-100" : "opacity-0",
            )}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-brand/20 via-paper to-amber-500/10 p-6 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-card shadow-sm ring-1 ring-line text-accent">
              <Ticket size={28} />
            </div>
            <p className="mt-3 text-xs font-bold uppercase tracking-wider text-accent flex items-center gap-1">
              <Sparkles size={12} /> AirPal Experience
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
