import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { collection, deleteDoc, doc, getDocs, onSnapshot, setDoc } from "firebase/firestore";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useBio } from "@/contexts/BioContext";
import { getFirebaseDb } from "@/lib/firebase";
import { clearPendingIntent, peekPendingIntent } from "@/lib/pending-intent";
import { toggleSocialId, type SocialKind } from "@/lib/social-store";

type SocialValue = {
  likedHandles: Set<string>;
  followedHandles: Set<string>;
  likedByHandles: Set<string>;
  followerHandles: Set<string>;
  isLiked: (handle: string) => boolean;
  isFollowing: (handle: string) => boolean;
  /**
   * Guest-gated toggles. Return the applied state (true = now liked/following),
   * or null when the guest was asked to sign in instead.
   */
  toggleLike: (handle: string, name?: string) => Promise<boolean | null>;
  toggleFollow: (handle: string, name?: string) => Promise<boolean | null>;
};

const SocialContext = createContext<SocialValue | undefined>(undefined);

function norm(handle: string): string {
  return handle.trim().toLowerCase().replace(/^@/, "");
}

async function syncRemote(
  kind: SocialKind,
  uid: string,
  targetHandle: string,
  added: boolean,
  fromHandle?: string,
  fromName?: string,
): Promise<void> {
  const db = getFirebaseDb();
  if (!db || !uid) throw new Error("Social saves need a signed-in account and server connection.");
  const col = kind === "like" ? "likes" : "follows";
  const graphCol = kind === "like" ? "likedBy" : "followers";
  if (added) {
    await setDoc(doc(db, "users", uid, col, targetHandle), {
      handle: targetHandle,
      updatedAt: new Date().toISOString(),
    });
  } else {
    await deleteDoc(doc(db, "users", uid, col, targetHandle));
  }
  if (fromHandle) {
    try {
      const graphRef = doc(db, "graph", targetHandle, graphCol, fromHandle);
      if (added) {
        await setDoc(graphRef, {
          uid,
          handle: fromHandle,
          name: fromName || fromHandle,
          updatedAt: new Date().toISOString(),
        });
      } else {
        await deleteDoc(graphRef);
      }
    } catch (err) {
      console.error("Could not update the social graph mirror.", err);
    }
  }
}

export function SocialProvider({ children }: { children: ReactNode }) {
  const { user, requireUser } = useAuth();
  const { mine } = useBio();
  const [liked, setLiked] = useState<Set<string>>(() => new Set());
  const [followed, setFollowed] = useState<Set<string>>(() => new Set());
  const [likedBy, setLikedBy] = useState<Set<string>>(() => new Set());
  const [followers, setFollowers] = useState<Set<string>>(() => new Set());
  const [loadedUid, setLoadedUid] = useState<string | null>(null);
  const pendingToggles = useRef(new Set<string>());

  // Merge the signed-in user's cloud likes/follows once per login.
  useEffect(() => {
    const uid = user?.uid;
    const db = getFirebaseDb();
    setLiked(new Set());
    setFollowed(new Set());
    setLoadedUid(null);
    if (!db || !uid) return;
    let live = true;
    void Promise.all([getDocs(collection(db, "users", uid, "likes")), getDocs(collection(db, "users", uid, "follows"))])
      .then(([likeSnap, followSnap]) => {
        if (!live) return;
        setLiked(new Set(likeSnap.docs.map((d) => norm(d.id))));
        setFollowed(new Set(followSnap.docs.map((d) => norm(d.id))));
        setLoadedUid(uid);
      })
      .catch(() => toast.error("Could not load your saved likes and follows from the server."));
    return () => {
      live = false;
    };
  }, [user?.uid]);

  // Live counters: realtime listeners so a counterparty unfollow/like-remove
  // reflects instantly instead of going stale until the next reload.
  useEffect(() => {
    const db = getFirebaseDb();
    const handle = mine?.handle;
    if (!db || !user || !handle) {
      setLikedBy(new Set());
      setFollowers(new Set());
      return;
    }
    const offLikes = onSnapshot(
      collection(db, "graph", handle, "likedBy"),
      (snap) => setLikedBy(new Set(snap.docs.map((d) => norm(d.id)))),
      () => undefined,
    );
    const offFollowers = onSnapshot(
      collection(db, "graph", handle, "followers"),
      (snap) => setFollowers(new Set(snap.docs.map((d) => norm(d.id)))),
      () => undefined,
    );
    return () => {
      offLikes();
      offFollowers();
    };
  }, [mine?.handle, user]);

  const applyToggle = useCallback(
    async (kind: SocialKind, rawHandle: string, name?: string): Promise<boolean> => {
      const handle = norm(rawHandle);
      if (!handle) return false;
      if (!user?.uid || loadedUid !== user.uid) {
        toast.message("Your saved likes and follows are still loading. Try again shortly.");
        return false;
      }
      const current = kind === "like" ? liked : followed;
      const { added } = toggleSocialId(current, handle);
      const label = name?.trim() || `@${handle}`;
      const pendingKey = `${kind}:${handle}`;
      if (pendingToggles.current.has(pendingKey)) return false;
      pendingToggles.current.add(pendingKey);
      try {
        await syncRemote(kind, user.uid, handle, added, mine?.handle, mine?.name);
        if (kind === "like") setLiked((currentSet) => toggleSocialId(currentSet, handle).next);
        else setFollowed((currentSet) => toggleSocialId(currentSet, handle).next);
        toast.success(added ? (kind === "like" ? `Liked ${label}` : `Following ${label}`) : `Removed ${label}`);
        return added;
      } catch {
        toast.error("Could not save this change. Check your connection and try again.");
        return false;
      } finally {
        pendingToggles.current.delete(pendingKey);
      }
    },
    [followed, liked, loadedUid, mine?.handle, mine?.name, user],
  );

  const toggleLike = useCallback(
    async (rawHandle: string, name?: string): Promise<boolean | null> => {
      const handle = norm(rawHandle);
      if (
        !requireUser("Sign in to like places — your liked list syncs across devices.", {
          kind: "like-handle",
          id: handle,
        })
      )
        return null;
      return applyToggle("like", handle, name);
    },
    [applyToggle, requireUser],
  );

  const toggleFollow = useCallback(
    async (rawHandle: string, name?: string): Promise<boolean | null> => {
      const handle = norm(rawHandle);
      if (
        !requireUser("Sign in to follow places — we will flag their new offers and events for you.", {
          kind: "follow-handle",
          id: handle,
        })
      )
        return null;
      return applyToggle("follow", handle, name);
    },
    [applyToggle, requireUser],
  );

  // Resume the guest's pending follow/like once they finish signing in.
  useEffect(() => {
    if (!user) return;
    const intent = peekPendingIntent();
    if (!intent) return;
    if (intent.kind === "follow-handle") {
      clearPendingIntent();
      applyToggle("follow", intent.id);
    } else if (intent.kind === "like-handle") {
      clearPendingIntent();
      applyToggle("like", intent.id);
    }
  }, [user, applyToggle]);

  const value = useMemo<SocialValue>(
    () => ({
      likedHandles: liked,
      followedHandles: followed,
      likedByHandles: likedBy,
      followerHandles: followers,
      isLiked: (handle) => liked.has(norm(handle)),
      isFollowing: (handle) => followed.has(norm(handle)),
      toggleLike,
      toggleFollow,
    }),
    [followed, followers, liked, likedBy, toggleFollow, toggleLike],
  );

  return <SocialContext.Provider value={value}>{children}</SocialContext.Provider>;
}

export function useSocial() {
  const ctx = useContext(SocialContext);
  if (!ctx) throw new Error("useSocial");
  return ctx;
}
