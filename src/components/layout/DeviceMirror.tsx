import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { pullDeviceMirror, wireAutoPush } from "@/lib/device-mirror";

/**
 * Loads the signed-in account's people + memories cache from Firestore.
 */
export function DeviceMirror() {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const wired = useRef<string | null>(null);

  useEffect(() => {
    if (!uid || wired.current === uid) return;
    wired.current = uid;
    wireAutoPush(uid);
    void pullDeviceMirror(uid).catch(() => {
      toast.error("Could not load your saved people and memories from the server.");
    });
  }, [uid]);

  useEffect(() => {
    if (uid) return;
    wired.current = null;
    wireAutoPush(null);
  }, [uid]);

  return null;
}
