import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Sparkles } from "lucide-react";
import { bioPath } from "@shared/bio";
import { useBio } from "@/contexts/BioContext";
import { BioSiteView } from "@/components/bio/BioSiteView";
import { bioSiteDisplayOrigin, bioSiteUrl, parseBioSiteHandle } from "@/lib/biosite";
import { fetchPublicBio } from "@/lib/bio-store";
import { resolvePublicBio } from "@/lib/bio-handle";
import { makeQrDataUrl } from "@/lib/qr";
import { track } from "@/lib/analytics";

/**
 * Public BioSite page: biosites-style link-in-bio for a handle at
 * /bio/@handle (and airpal.bio/bio/@handle once the domain is connected).
 * Data comes from the same universal-account bio store as /@handle —
 * nothing is duplicated, the presentation is a second lens.
 */
export function BioSitePage() {
  const [path, nav] = useLocation();
  const handle = useMemo(() => parseBioSiteHandle(path.split("?")[0] || ""), [path]);
  const { byHandle, recordTap } = useBio();

  const local = resolvePublicBio(handle, byHandle);
  const [remote, setRemote] = useState<typeof local>();
  const [tried, setTried] = useState(!handle);
  const viewed = useRef("");

  useEffect(() => {
    let live = true;
    setRemote(undefined);
    if (!handle) {
      setTried(true);
      return;
    }
    setTried(false);
    void fetchPublicBio(handle)
      .then((row) => {
        if (!live) return;
        if (row) setRemote(row);
        setTried(true);
      })
      .catch(() => {
        if (live) setTried(true);
      });
    return () => {
      live = false;
    };
  }, [handle]);

  const profile = remote || local;
  const siteUrl = profile ? bioSiteUrl(profile.handle, bioSiteDisplayOrigin()) : "";
  const [qrDataUrl, setQrDataUrl] = useState("");

  useEffect(() => {
    if (!siteUrl) return;
    let live = true;
    void makeQrDataUrl(siteUrl, 320).then((url) => {
      if (live) setQrDataUrl(url);
    });
    return () => {
      live = false;
    };
  }, [siteUrl]);

  useEffect(() => {
    if (!profile || viewed.current === profile.handle) return;
    viewed.current = profile.handle;
    recordTap(profile.handle, "view");
    void track("context_view", { contextType: "bio", contextId: profile.handle, loadStatus: "ok" });
  }, [profile, recordTap]);

  useEffect(() => {
    if (!tried || profile || !handle) return;
    void track("context_load_failed", { contextType: "biosite", contextId: handle, errorClass: "not_found" });
  }, [tried, profile, handle]);

  return (
    <div
      data-theme="light"
      className="mx-auto flex min-h-dvh w-full max-w-xl flex-col bg-paper px-4 py-[max(1rem,env(safe-area-inset-top,0px))] pb-[max(4rem,calc(env(safe-area-inset-bottom,0px)+3rem))]"
    >
      <button
        type="button"
        onClick={() => nav("/")}
        className="inline-flex min-h-[44px] items-center gap-1.5 self-start text-xs font-bold text-accent hover:text-brand transition-colors cursor-pointer"
      >
        <ArrowLeft size={14} aria-hidden="true" />
        <span>AirPal home</span>
      </button>

      <p className="mt-4 inline-flex items-center gap-1.5 self-center rounded-full bg-brand/10 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-accent">
        <Sparkles size={12} aria-hidden="true" />
        <span>AirPal BioSite</span>
      </p>

      <div className="neu-section mt-4 p-6 sm:p-8">
        {!profile ? (
          tried ? (
            <div className="text-center">
              <h1 className="font-display text-xl font-black text-ink">Couldn&apos;t find that BioSite</h1>
              <p className="mx-auto mt-2 max-w-sm text-xs text-mute leading-relaxed">
                {handle ? (
                  <>
                    No public bio for <span className="font-bold text-ink">@{handle}</span> yet. Handles are first-come
                    — claim it before someone else does.
                  </>
                ) : (
                  "That BioSite link looks incomplete."
                )}
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={() => nav("/bio/setup")}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-brand px-5 text-xs font-bold text-white shadow-xs hover:bg-brand-ink transition-[background-color,transform] active:scale-95 cursor-pointer"
                >
                  Claim your @handle
                </button>
                <button
                  type="button"
                  onClick={() => nav("/")}
                  className="neu-btn inline-flex min-h-[44px] items-center justify-center px-5 text-xs font-bold text-ink transition-[box-shadow,transform] active:scale-95 cursor-pointer"
                >
                  Back home
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3" role="status" aria-label="Loading BioSite">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="neu-row animate-pulse p-4" aria-hidden="true">
                  <div className="h-3 w-2/3 rounded-full bg-line/40" />
                </div>
              ))}
              <span className="sr-only">Loading BioSite…</span>
            </div>
          )
        ) : (
          <BioSiteView
            profile={profile}
            siteUrl={siteUrl}
            qrDataUrl={qrDataUrl || undefined}
            onTap={(link) => recordTap(profile.handle, "link", link.id)}
            onOpenFullBio={() => nav(bioPath(profile.handle))}
          />
        )}
      </div>

      {profile && (
        <p className="mt-4 text-center text-[11px] text-mute">
          Want one like this?{" "}
          <button
            type="button"
            onClick={() => nav("/bio/setup")}
            className="font-bold text-accent hover:text-brand transition-colors cursor-pointer"
          >
            Claim your @handle
          </button>
        </p>
      )}
    </div>
  );
}
