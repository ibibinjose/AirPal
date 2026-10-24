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

/**
 * Exports the complete AirPal Bio Pass card as a high-resolution PNG image.
 * Uses the exact blue card artwork template and renders user avatar, name,
 * handle, city, scannable QR, and link pill.
 */
export async function exportBioPassPng(options: ExportBioPassOptions): Promise<boolean> {
  if (typeof document === "undefined") return false;

  void triggerHaptic("medium");
  const cleanHandle = safeHandle(options.handle);
  const isBusiness = options.kind === "business";
  const displayUrl = options.url.replace(/^https?:\/\//, "");
  const origin = publicSiteOrigin();

  const width = 682;
  const height = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    toast.error("Unable to generate pass image");
    return false;
  }

  // 1. Draw Template Background
  try {
    const templateImg = await loadImage(`${origin}/brand/bio-pass-template.webp`).catch(() =>
      loadImage("/brand/bio-pass-template.webp"),
    );
    ctx.drawImage(templateImg, 0, 0, width, height);
  } catch {
    // Fallback: draw vector gradient and card elements if static image is unavailable
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "#3d8bff");
    gradient.addColorStop(0.25, "#1a56f0");
    gradient.addColorStop(0.5, "#0e38d8");
    gradient.addColorStop(0.75, "#0a28b4");
    gradient.addColorStop(1, "#0a229c");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // QR container box
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.roundRect(140, 520, 402, 330, 24);
    ctx.fill();

    // Link pill
    ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
    ctx.beginPath();
    ctx.roundRect(110, 870, 462, 54, 27);
    ctx.fill();
  }

  // 2. Draw Top Wordmark Logo
  const logoSrc = isBusiness
    ? `${origin}/brand/airpal-pass-logo-white.png`
    : `${origin}/brand/airpal-me-logo-white.png`;
  try {
    const logoImg = await loadImage(logoSrc).catch(() =>
      loadImage(isBusiness ? "/brand/airpal-pass-logo-white.png" : "/brand/airpal-me-logo-white.png"),
    );
    const logoWidth = 280;
    const logoHeight = (logoImg.naturalHeight / logoImg.naturalWidth) * logoWidth;
    ctx.drawImage(logoImg, (width - logoWidth) / 2, 85, logoWidth, logoHeight);
  } catch {
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 34px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(isBusiness ? "AirPal Pass" : "AirPal Me", width / 2, 120);
  }

  // 3. Draw Avatar
  const avatarCenterX = 341;
  const avatarCenterY = 240;
  const avatarRadius = 76;

  if (options.avatar) {
    try {
      const avatarImg = await loadImage(options.avatar);
      ctx.save();
      ctx.beginPath();
      ctx.arc(avatarCenterX, avatarCenterY, avatarRadius, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(
        avatarImg,
        avatarCenterX - avatarRadius,
        avatarCenterY - avatarRadius,
        avatarRadius * 2,
        avatarRadius * 2,
      );
      ctx.restore();

      // Outer white ring
      ctx.beginPath();
      ctx.arc(avatarCenterX, avatarCenterY, avatarRadius, 0, Math.PI * 2);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 4;
      ctx.stroke();
    } catch {
      drawAvatarInitial();
    }
  } else {
    drawAvatarInitial();
  }

  function drawAvatarInitial() {
    if (!ctx) return;
    const initial = ((options.name ?? "").trim().charAt(0) || cleanHandle.charAt(0) || "A").toUpperCase();
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarCenterX, avatarCenterY, avatarRadius, 0, Math.PI * 2);
    ctx.fillStyle = "#0e38d8";
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.font = "900 60px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(initial, avatarCenterX, avatarCenterY + 4);
    ctx.restore();
  }

  // 4. Draw Identity Text (Name, Handle, City)
  ctx.save();
  ctx.textAlign = "center";

  // Name
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 32px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  const displayName = options.name || `@${cleanHandle}`;
  ctx.fillText(displayName.slice(0, 28), width / 2, 375);

  // Handle
  ctx.fillStyle = "#c3d4ff";
  ctx.font = "600 20px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillText(`@${cleanHandle}`, width / 2, 412);

  // City
  if (options.city) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.font = "700 13px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillText(`📍 ${options.city.toUpperCase()}`, width / 2, 448);
  }
  ctx.restore();

  // 5. Draw QR Code and "SCAN TO CONNECT"
  if (options.qrDataUrl) {
    try {
      const qrImg = await loadImage(options.qrDataUrl);
      const qrSize = 210;
      ctx.drawImage(qrImg, width / 2 - qrSize / 2, 545, qrSize, qrSize);
    } catch {
      // ignore
    }
  }

  ctx.save();
  ctx.fillStyle = "#1a2560";
  ctx.font = "800 13px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("SCAN TO CONNECT", width / 2, 808);
  ctx.restore();

  // 6. Draw Link Text inside bottom pill
  ctx.save();
  ctx.fillStyle = "#ffffff";
  ctx.font = "600 16px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`🔗 ${displayUrl}`, width / 2, 902);
  ctx.restore();

  // 7. Trigger PNG Download
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
