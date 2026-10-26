import { toast } from "sonner";
import { triggerHaptic } from "./native";
import { cleanHandle as safeHandle } from "./profile-text";
import { publicSiteOrigin } from "./public-origin";
import type { BioKind } from "@shared/bio";

export interface ExportBioPassOptions {
  handle: string;
  name: string;
  kind?: BioKind | string | null;
  avatar?: string;
  city?: string;
  qrDataUrl?: string;
  url: string;
}

const FONT_STACK = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif";
const MONO_STACK = "ui-monospace, 'SF Mono', Menlo, Consolas, monospace";

/** Overlay zones measured from the card art (874×1409), never eyeballed. */
const ART_W = 874;
const ART_H = 1409;
const AVATAR = { x: 312, y: 191, s: 247 };
const QR = { x: 217, y: 747, s: 442 };

/**
 * Loads an image from a URL or data URL and returns an HTMLImageElement.
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  const ellipsis = "…";
  let end = text.length;
  while (end > 0 && ctx.measureText(text.slice(0, end) + ellipsis).width > maxWidth) end -= 1;
  return text.slice(0, end) + ellipsis;
}

/** Draws img cover-cropped into the square (x, y, s). */
function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, s: number): void {
  const scale = Math.max(s / img.naturalWidth, s / img.naturalHeight);
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  ctx.drawImage(img, x + (s - dw) / 2, y + (s - dh) / 2, dw, dh);
}

/**
 * Exports the AirPal Bio Pass on its exact card artwork as a
 * high-resolution PNG: identity over the baked disc and blue band, QR in
 * the baked QR box, profile link on the baked pill.
 */
export async function exportBioPassPng(options: ExportBioPassOptions): Promise<boolean> {
  if (typeof document === "undefined") return false;

  void triggerHaptic("medium");
  const cleanHandle = safeHandle(options.handle);
  const isBusiness = options.kind === "business";
  const displayUrl = options.url.replace(/^https?:\/\//, "");
  const origin = publicSiteOrigin();

  const canvas = document.createElement("canvas");
  canvas.width = ART_W;
  canvas.height = ART_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    toast.error("Unable to generate pass image");
    return false;
  }

  // 1. Card art (opaque white base; the art carries its own rounded corners).
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, ART_W, ART_H);
  try {
    const art = await loadImage(`${origin}/brand/bio-pass-template.png`).catch(() =>
      loadImage("/brand/bio-pass-template.png"),
    );
    ctx.drawImage(art, 0, 0, ART_W, ART_H);
  } catch {
    toast.error("Pass artwork unavailable — try again.");
    return false;
  }

  // 2. Wordmark.
  const logoSrc = isBusiness
    ? `${origin}/brand/airpal-pass-logo-white.png`
    : `${origin}/brand/airpal-me-logo-white.png`;
  try {
    const logoImg = await loadImage(logoSrc).catch(() =>
      loadImage(isBusiness ? "/brand/airpal-pass-logo-white.png" : "/brand/airpal-me-logo-white.png"),
    );
    const logoH = 80;
    const logoW = (logoImg.naturalWidth / logoImg.naturalHeight) * logoH;
    ctx.drawImage(logoImg, (ART_W - logoW) / 2, 90, logoW, logoH);
  } catch {
    ctx.fillStyle = "#ffffff";
    ctx.font = `800 34px ${FONT_STACK}`;
    ctx.textAlign = "center";
    ctx.fillText(isBusiness ? "AirPal Pass" : "AirPal Me", ART_W / 2, 148);
  }

  // 3. Avatar over the baked disc.
  const cx = AVATAR.x + AVATAR.s / 2;
  const cy = AVATAR.y + AVATAR.s / 2;
  const cr = AVATAR.s / 2 - 1;
  let drewAvatar = false;
  if (options.avatar) {
    try {
      const avatarImg = await loadImage(options.avatar);
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, cr, 0, Math.PI * 2);
      ctx.clip();
      drawCover(ctx, avatarImg, AVATAR.x, AVATAR.y, AVATAR.s);
      ctx.restore();
      drewAvatar = true;
    } catch {
      drewAvatar = false;
    }
  }
  if (!drewAvatar) {
    const initial = ((options.name ?? "").trim().charAt(0) || cleanHandle.charAt(0) || "A").toUpperCase();
    ctx.save();
    ctx.fillStyle = "#14215E";
    ctx.font = `900 88px ${FONT_STACK}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(initial, cx, cy + 4);
    ctx.restore();
  }
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(cx, cy, cr, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // 4. Identity on the open blue band.
  ctx.save();
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff";
  ctx.font = `900 56px ${FONT_STACK}`;
  ctx.fillText(fitText(ctx, options.name || `@${cleanHandle}`, 740), ART_W / 2, 535);
  ctx.fillStyle = "#C9D6FF";
  ctx.font = `700 30px ${MONO_STACK}`;
  ctx.fillText(fitText(ctx, `@${cleanHandle}`, 560), ART_W / 2, 580);
  const metaLine = [isBusiness ? "Business" : "Individual", options.city].filter(Boolean).join(" · ").toUpperCase();
  if (metaLine) {
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font = `800 24px ${FONT_STACK}`;
    ctx.fillText(fitText(ctx, metaLine, 640), ART_W / 2, 640);
  }
  ctx.restore();

  // 5. QR in the baked QR box.
  if (options.qrDataUrl) {
    try {
      const qrImg = await loadImage(options.qrDataUrl);
      ctx.drawImage(qrImg, QR.x, QR.y, QR.s, QR.s);
    } catch {
      // leave the baked box empty rather than failing the export
    }
  }
  // 6. Profile link on the baked pill.
  ctx.save();
  ctx.fillStyle = "#ffffff";
  ctx.font = `600 27px ${FONT_STACK}`;
  ctx.textAlign = "center";
  ctx.fillText(fitText(ctx, displayUrl, 600), ART_W / 2, 1310);
  ctx.restore();

  // 7. Trigger PNG download.
  return new Promise<boolean>((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        toast.error("Failed to generate PNG blob");
        resolve(false);
        return;
      }
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `airpal-${cleanHandle}-pass.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 5000);
      toast.success("Full pass card saved as PNG");
      resolve(true);
    }, "image/png");
  });
}
