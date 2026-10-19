import { useCallback, useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase";
import { useLocalNow } from "@/hooks/useLocalNow";
import type { Booking } from "@shared/booking";

export type BookingWithId = Booking & { id: string };

const CACHE_PREFIX = "airpal.wallet.bookings.";

export function readCachedBookings(uid: string): BookingWithId[] {
  if (typeof window === "undefined" || !uid) return [];
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + uid);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as BookingWithId[]) : [];
  } catch {
    return [];
  }
}

export function writeCachedBookings(uid: string, list: BookingWithId[]) {
  if (typeof window === "undefined" || !uid) return;
  try {
    localStorage.setItem(CACHE_PREFIX + uid, JSON.stringify(list));
  } catch {
    /* ignore storage quota exceptions */
  }
}

/**
 * Checks whether a booking is considered upcoming.
 * True if not explicitly expired by date and not cancelled or refunded.
 */
export function isUpcomingBooking(booking: Booking, today: string): boolean {
  if (booking.status === "cancelled" || booking.status === "refunded") {
    return false;
  }
  if (!booking.date) return true;
  return booking.date >= today;
}

export function useMyBookings() {
  const { user } = useAuth();
  const { today } = useLocalNow();

  const [bookings, setBookings] = useState<BookingWithId[] | undefined>(() => {
    const activeUid = user?.uid || (typeof window !== "undefined" ? localStorage.getItem("airpal.anon.id") : null);
    if (!activeUid) return undefined;
    const cached = readCachedBookings(activeUid);
    return cached.length > 0 ? cached : undefined;
  });
  const [loading, setLoading] = useState<boolean>(() => {
    const activeUid = user?.uid || (typeof window !== "undefined" ? localStorage.getItem("airpal.anon.id") : null);
    if (!activeUid) return false;
    return readCachedBookings(activeUid).length === 0;
  });
  const [failed, setFailed] = useState<boolean>(false);
  const [isOfflineCached, setIsOfflineCached] = useState<boolean>(false);
  const [attempt, setAttempt] = useState<number>(0);

  const refresh = useCallback(() => {
    setAttempt((prev) => prev + 1);
  }, []);

  useEffect(() => {
    const handleUpdated = () => {
      const activeUid = user?.uid || (typeof window !== "undefined" ? localStorage.getItem("airpal.anon.id") : null);
      if (activeUid) {
        const cached = readCachedBookings(activeUid);
        setBookings(cached);
      }
    };
    window.addEventListener("airpal:bookings-updated", handleUpdated);
    return () => {
      window.removeEventListener("airpal:bookings-updated", handleUpdated);
    };
  }, [user?.uid]);

  useEffect(() => {
    const uid = user?.uid;
    if (!uid) {
      const anonId = typeof window !== "undefined" ? localStorage.getItem("airpal.anon.id") : null;
      if (anonId) {
        const cached = readCachedBookings(anonId);
        setBookings(cached);
        setLoading(false);
        setIsOfflineCached(cached.length > 0);
      } else {
        setBookings([]);
        setLoading(false);
      }
      setFailed(false);
      return;
    }

    const db = getFirebaseDb();
    if (!db || !isFirebaseConfigured) {
      const cached = readCachedBookings(uid);
      setBookings(cached);
      setLoading(false);
      setIsOfflineCached(cached.length > 0);
      return;
    }

    let cancelled = false;
    setLoading(bookings === undefined);
    setFailed(false);

    let unsubscribe: (() => void) | undefined;
    try {
      const q = query(collection(db, "bookings"), where("customerUid", "==", uid));
      unsubscribe = onSnapshot(
        q,
        (snap) => {
          if (cancelled) return;
          const docs: BookingWithId[] = snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<Booking, "id">),
          }));
          docs.sort((a, b) => {
            const aTime = a.createdAt || a.date || "";
            const bTime = b.createdAt || b.date || "";
            return bTime.localeCompare(aTime);
          });
          writeCachedBookings(uid, docs);
          setBookings(docs);
          setIsOfflineCached(false);
          setLoading(false);
        },
        (_err) => {
          if (cancelled) return;
          const cached = readCachedBookings(uid);
          if (cached.length > 0) {
            setBookings(cached);
            setIsOfflineCached(true);
          } else {
            setFailed(true);
          }
          setLoading(false);
        },
      );
    } catch {
      if (!cancelled) {
        const cached = readCachedBookings(uid);
        if (cached.length > 0) {
          setBookings(cached);
          setIsOfflineCached(true);
        } else {
          setFailed(true);
        }
        setLoading(false);
      }
    }

    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
    };
  }, [user?.uid, attempt]);

  const upcomingBookings = useMemo(() => {
    if (!bookings) return [];
    return bookings.filter((b) => isUpcomingBooking(b, today));
  }, [bookings, today]);

  const pastBookings = useMemo(() => {
    if (!bookings) return [];
    return bookings.filter((b) => !isUpcomingBooking(b, today));
  }, [bookings, today]);

  const totalSpots = useMemo(() => {
    if (!bookings) return 0;
    return bookings.reduce((sum, b) => sum + (b.spots || 1), 0);
  }, [bookings]);

  const upcomingSpots = useMemo(() => {
    return upcomingBookings.reduce((sum, b) => sum + (b.spots || 1), 0);
  }, [upcomingBookings]);

  const admittedCount = useMemo(() => {
    if (!bookings) return 0;
    return bookings.filter((b) => Boolean(b.admittedAt)).length;
  }, [bookings]);

  return {
    bookings: bookings ?? [],
    upcomingBookings,
    pastBookings,
    totalSpots,
    upcomingSpots,
    admittedCount,
    loading: loading && bookings === undefined,
    failed,
    isOfflineCached,
    refresh,
  };
}
