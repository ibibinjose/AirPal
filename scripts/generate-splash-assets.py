#!/usr/bin/env python3
"""
Generate iOS and Android native splash screen assets using Tantumi.jpg.
Centers the artwork, blends edges with a seamless vignette, and outputs
all standard iOS and Android density targets.
"""

import os
from PIL import Image, ImageDraw

SRC_PATH = "public/brand/tantumi.jpg"
BG_COLOR = (20, 22, 27, 255) # #14161b

def get_feathered_source(path):
    src = Image.open(path).convert("RGBA")
    sw, sh = src.size
    feather = 40
    mask = Image.new("L", (sw, sh), 255)
    draw = ImageDraw.Draw(mask)
    for i in range(feather):
        alpha = int(255 * (i / feather))
        draw.rectangle([i, i, sw - 1 - i, sh - 1 - i], outline=alpha)
    src.putalpha(mask)
    return src

def render_splash(target_w, target_h, src_img, is_ios_square=False):
    canvas = Image.new("RGBA", (target_w, target_h), BG_COLOR)
    sw, sh = src_img.size

    if is_ios_square:
        # In iOS 2732x2732 with scaleAspectFill, portrait iPhones see a window ~1260px wide.
        # Scale to width 1080px to preserve comfortable margins on all devices.
        nw = 1080
        nh = int(sh * (nw / sw))
    else:
        # For standard screens, fit within 82% width and 70% height
        scale = min((target_w * 0.82) / sw, (target_h * 0.70) / sh)
        nw = int(sw * scale)
        nh = int(sh * scale)

    resized = src_img.resize((nw, nh), Image.Resampling.LANCZOS)
    x = (target_w - nw) // 2
    # Place slightly above center (48% vertical) for visual balance with home bar / chin
    y = int((target_h - nh) * (0.50 if is_ios_square else 0.48))
    canvas.alpha_composite(resized, (x, y))
    return canvas.convert("RGB")

def main():
    if not os.path.exists(SRC_PATH):
        raise FileNotFoundError(f"Source image not found: {SRC_PATH}")

    src_img = get_feathered_source(SRC_PATH)

    # 1. iOS Assets (Universal square for scaleAspectFill)
    ios_splash_dir = "ios/App/App/Assets.xcassets/Splash.imageset"
    if os.path.exists(ios_splash_dir):
        ios_img = render_splash(2732, 2732, src_img, is_ios_square=True)
        for fname in ["splash-2732x2732.png", "splash-2732x2732-1.png", "splash-2732x2732-2.png"]:
            dest = os.path.join(ios_splash_dir, fname)
            ios_img.save(dest, format="PNG", optimize=True)
            print(f"Generated iOS asset: {dest}")

    # 2. Android Assets
    android_targets = [
        # Portrait
        ("android/app/src/main/res/drawable-port-xxxhdpi/splash.png", 1280, 1920),
        ("android/app/src/main/res/drawable-port-xxhdpi/splash.png", 960, 1600),
        ("android/app/src/main/res/drawable-port-xhdpi/splash.png", 720, 1280),
        ("android/app/src/main/res/drawable-port-hdpi/splash.png", 480, 800),
        ("android/app/src/main/res/drawable-port-mdpi/splash.png", 320, 480),
        # Landscape
        ("android/app/src/main/res/drawable-land-xxxhdpi/splash.png", 1920, 1280),
        ("android/app/src/main/res/drawable-land-xxhdpi/splash.png", 1600, 960),
        ("android/app/src/main/res/drawable-land-xhdpi/splash.png", 1280, 720),
        ("android/app/src/main/res/drawable-land-hdpi/splash.png", 800, 480),
        ("android/app/src/main/res/drawable-land-mdpi/splash.png", 480, 320),
        # Fallback default
        ("android/app/src/main/res/drawable/splash.png", 480, 320),
    ]

    for dest, tw, th in android_targets:
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        img = render_splash(tw, th, src_img)
        img.save(dest, format="PNG", optimize=True)
        print(f"Generated Android asset: {dest} ({tw}x{th})")

    print("All native splash assets generated successfully!")

if __name__ == "__main__":
    main()
