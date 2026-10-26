import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DigitalBioPassCard } from "./DigitalBioPassCard";

vi.mock("wouter", () => ({
  useLocation: () => ["/me", vi.fn()],
  Link: ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) =>
    createElement("a", { href, className }, children),
}));

function read(name: string): string {
  return readFileSync(resolve(import.meta.dirname, name), "utf8");
}

describe("DigitalBioPassCard", () => {
  it("renders the pass title, handle, and actions accessibly", () => {
    const markup = renderToStaticMarkup(
      createElement(DigitalBioPassCard, {
        handle: "testmate",
        name: "Test User",
        city: "Sydney",
        qrDataUrl: "data:image/png;base64,AAA",
      }),
    );
    expect(markup).toContain("My Digital Bio Pass");
    expect(markup).toContain("Verified ID");
    expect(markup).toContain("Individual");
    expect(markup).toContain("@testmate");
    expect(markup).toContain("QR Code for @testmate");
    expect(markup).not.toContain("Scan to connect");
    expect(markup).toContain("airpal-me-logo-white.png");
    expect(markup).toContain('aria-label="Download QR image"');
    expect(markup).toContain("Enlarge QR code for @testmate");
  });

  it("marks business profiles with the Business chip", () => {
    const markup = renderToStaticMarkup(
      createElement(DigitalBioPassCard, {
        handle: "testmate",
        name: "Test User",
        kind: "business",
        qrDataUrl: "data:image/png;base64,AAA",
      }),
    );
    expect(markup).toContain("Business");
    expect(markup).not.toContain("Individual");
  });

  it("matches sibling section rhythm with explicit motion", () => {
    const card = read("./DigitalBioPassCard.tsx");
    const visual = read("./BioPassVisual.tsx");
    expect(card).toContain("rounded-[36px] ring-1 ring-line/80 bg-card p-5 sm:p-7");
    expect(card).toContain("grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-brand/10 text-accent");
    expect(card).toContain("mt-5 grid grid-cols-1 lg:grid-cols-2 gap-2.5 pt-5 border-t border-line/60");
    expect(visual).toContain("aspect-[874/1409]");
    expect(visual).toContain("bio-pass-template.png");
    expect(visual).toContain("airpal-me-logo-white.png");
    for (const src of [card, visual]) {
      expect(src).not.toContain("transition-all");
      expect(src).not.toMatch(/[^a-z-:]transition[" ]/);
    }
  });
});
