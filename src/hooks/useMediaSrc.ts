import { useEffect, useState } from "react";
import { localImageUrl, privateStorageImageUrl } from "@/lib/image-store";

export function useMediaSrc(src?: string) {
  const local = src?.startsWith("idb:");
  const privateRemote = src?.startsWith("storage://");
  const remote = src && !local && !privateRemote ? src : undefined;
  const [url, setUrl] = useState(remote);

  useEffect(() => {
    let objectUrl: string | undefined;
    if (!src) {
      setUrl(undefined);
      return;
    }
    if (!src.startsWith("idb:") && !src.startsWith("storage://")) {
      setUrl(src);
      return;
    }
    let live = true;
    const load = src.startsWith("idb:") ? localImageUrl(src) : privateStorageImageUrl(src);
    void load
      .then((next) => {
        if (live) {
          objectUrl = next;
          setUrl(next);
        }
      })
      .catch(() => {
        if (live) setUrl(undefined);
      });
    return () => {
      live = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src]);

  return url;
}
