import { addDoc, collection, doc } from "firebase/firestore";
import { getDoc } from "firebase/firestore";
import { getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase";
import {
  bookingValid,
  DEFAULT_FEE_CONFIG,
  paymentStatusForPrice,
  payoutStatusForPrice,
  quoteFees,
  type FeeConfig,
} from "@shared/booking";

async function loadFeeConfig(): Promise<FeeConfig> {
  const db = getFirebaseDb();
  if (!db || !isFirebaseConfigured) return DEFAULT_FEE_CONFIG;
  try {
    const snap = await getDoc(doc(db, "platform_settings", "marketplace"));
    if (!snap.exists()) return DEFAULT_FEE_CONFIG;
    const row = snap.data() as Partial<FeeConfig>;
    return {
      platformFeeBps: Number(row.platformFeeBps) || DEFAULT_FEE_CONFIG.platformFeeBps,
      minimumPlatformFeeCents: Number(row.minimumPlatformFeeCents) || 0,
    };
  } catch {
    return DEFAULT_FEE_CONFIG;
  }
}

export async function createBookingForEvent(args: {
  eventId: string;
  providerUid: string;
  providerName: string;
  title: string;
  suburb: string;
  date: string;
  time: string;
  priceCents: number;
  customerUid: string;
  spots?: number;
  tierId?: string;
  couponCode?: string;
}): Promise<string> {
  const db = getFirebaseDb();
  if (!db || !isFirebaseConfigured) throw new Error("Connect Firebase first.");
  const priceCents = Math.max(0, Math.round(args.priceCents || 0));
  const input = {
    requestId: args.eventId,
    providerUid: args.providerUid,
    providerKind: "business" as const,
    providerName: args.providerName,
    title: args.title,
    suburb: args.suburb,
    date: args.date,
    time: args.time,
    priceCents,
    eventId: args.eventId,
  };
  if (!bookingValid(input)) throw new Error("Booking details are incomplete.");
  const fees = quoteFees(priceCents, await loadFeeConfig());
  const now = new Date().toISOString();
  const ref = await addDoc(collection(db, "bookings"), {
    requestId: args.eventId,
    customerUid: args.customerUid,
    providerUid: input.providerUid,
    providerKind: input.providerKind,
    providerName: input.providerName,
    title: input.title,
    suburb: input.suburb,
    date: input.date,
    time: input.time,
    priceCents,
    feeCents: fees.feeCents,
    paymentStatus: paymentStatusForPrice(priceCents),
    payoutStatus: payoutStatusForPrice(priceCents),
    status: "pending",
    cancelReason: "",
    eventId: args.eventId,
    spots: args.spots || 1,
    ...(args.tierId ? { tierId: args.tierId } : {}),
    ...(args.couponCode ? { couponCode: args.couponCode.trim().toUpperCase() } : {}),
    createdAt: now,
    updatedAt: now,
  });
  return ref.id;
}
