import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FALLBACK_EVENT_IMAGE, mediaSrcSet, sizedImageUrl } from "./media-srcset";

describe("mediaSrcSet", () => {
  it("builds webp variants for bundled media", () => {
    expect(mediaSrcSet("/media/harbour.jpg")).toBe("/media/harbour-800.webp 800w, /media/harbour-full.webp 1600w");
  });

  it("returns undefined for remote, idb, and unknown sources", () => {
    expect(mediaSrcSet("https://cdn.example/x.jpg")).toBeUndefined();
    expect(mediaSrcSet("idb:abc")).toBeUndefined();
    expect(mediaSrcSet("/media/unknown.jpg")).toBeUndefined();
    expect(mediaSrcSet(undefined)).toBeUndefined();
  });
});

describe("sizedImageUrl", () => {
  it("downsizes Unsplash originals to the requested width", () => {
    expect(sizedImageUrl("https://images.unsplash.com/photo-1?auto=format&fit=crop&w=1200&q=80", 600)).toBe(
      "https://images.unsplash.com/photo-1?auto=format&fit=crop&w=600&q=80",
    );
  });

  it("passes through local, idb, and other remote sources untouched", () => {
    expect(sizedImageUrl("/media/harbour.jpg", 600)).toBe("/media/harbour.jpg");
    expect(sizedImageUrl("https://cdn.example/x.jpg", 600)).toBe("https://cdn.example/x.jpg");
    expect(sizedImageUrl(undefined, 600)).toBeUndefined();
  });
});

describe("bundled image literals", () => {
  it("event fallback image exists on disk with responsive variants", () => {
    const rel = FALLBACK_EVENT_IMAGE.replace(/^\//, "");
    expect(existsSync(join(process.cwd(), "public", rel))).toBe(true);
    expect(mediaSrcSet(FALLBACK_EVENT_IMAGE)).toContain(".webp");
  });

  it("every /media/* and /brand/* literal in src resolves to a file in public/", () => {
    const roots = ["src/pages", "src/components", "src/lib"].map((d) => join(process.cwd(), d));
    const found = new Map<string, string>();
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) {
          walk(full);
          continue;
        }
        if (!/\.(tsx?|jsx?)$/.test(entry) || entry.endsWith(".test.ts") || entry.endsWith(".test.tsx")) continue;
        const text = readFileSync(full, "utf8");
        for (const m of text.matchAll(/"(\/(?:media|brand)\/[A-Za-z0-9@._-]+)"/g)) {
          found.set(m[1], full);
        }
      }
    };
    roots.forEach(walk);
    expect(found.size).toBeGreaterThan(0);
    const missing = [...found.entries()].filter(
      ([rel]) => !existsSync(join(process.cwd(), "public", rel.replace(/^\//, ""))),
    );
    expect(missing.map(([rel, file]) => `${rel} (from ${file})`)).toEqual([]);
  });
});
