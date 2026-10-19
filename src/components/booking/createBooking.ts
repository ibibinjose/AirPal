import { createEventBookingRemote } from "@/lib/functions";

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
  // All display and money arguments above are deliberately ignored. The
  // callable derives them from the authoritative event document and caller.
  const result = await createEventBookingRemote({
    eventId: args.eventId,
    spots: args.spots,
    tierId: args.tierId,
    couponCode: args.couponCode,
  });
  return result.bookingId;
}
