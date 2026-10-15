import { httpsCallable } from "firebase/functions";
import type { EnterPromotionRequest, EnterPromotionResponse, RedeemPointsRequest } from "@shared/promotions";
import { getFirebaseFunctions } from "./firebase";

async function callPromotion<Req, Res>(name: string, data: Req): Promise<Res> {
  const functions = getFirebaseFunctions();
  if (!functions) throw new Error("Firebase is not configured.");
  const callable = httpsCallable<Req, Res>(functions, name);
  const result = await callable(data);
  return result.data;
}

export function enterPromotionRemote(data: EnterPromotionRequest) {
  return callPromotion<EnterPromotionRequest, EnterPromotionResponse>("enterPromotion", data);
}

export function recordPromotionViewRemote(promotionId: string) {
  return callPromotion<{ promotionId: string }, { ok: boolean }>("recordPromotionView", { promotionId });
}

export function recordPromotionClickRemote(promotionId: string) {
  return callPromotion<{ promotionId: string }, { ok: boolean }>("recordPromotionClick", { promotionId });
}

export function redeemPointsRemote(data: RedeemPointsRequest) {
  return callPromotion<RedeemPointsRequest, { ok: boolean; code: string }>("redeemPoints", data);
}

export function seedPromotionDemoRemote() {
  return callPromotion<Record<string, never>, { ok: boolean; created: number }>("seedPromotionDemo", {});
}

/**
 * Category fallback art from the bundled Kerala photo set.
 * Used when a campaign has no hero image of its own.
 */
export function promoArtFor(category: string, heroImage?: string): string {
  if (heroImage) return heroImage;
  switch (category) {
    case "Stays":
      return "/media/room.jpg";
    case "Experiences":
      return "/media/walk.jpg";
    case "Travel":
      return "/media/harbour.jpg";
    case "Local":
      return "/media/laneway.jpg";
    case "Events":
      return "/media/campus.jpg";
    case "AirPal":
      return "/brand/og-share-preview.jpg";
    default:
      return "";
  }
}

export function friendlyPromotionError(err: unknown): string {
  const code = (err as { code?: string } | null)?.code || "";
  const message = err instanceof Error ? err.message : "";
  if (code === "functions/failed-precondition" || code === "failed-precondition") {
    return message || "This campaign is not open right now.";
  }
  if (code === "functions/permission-denied" || code === "permission-denied") {
    return "You do not have permission for that action.";
  }
  if (code === "functions/unauthenticated" || code === "unauthenticated") {
    return "Sign in to continue.";
  }
  return message || "Something went wrong. Please try again.";
}
