import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PossieTicket, stubCode } from "./PossieTicket";
import { PlanBeforeYouGo } from "./PlanBeforeYouGo";
import { DirectionsHandoff, appleMapsUrl } from "./DirectionsHandoff";

vi.mock("wouter", () => ({
  useLocation: () => ["/pass", vi.fn()],
  Link: ({
    children,
    href,
    className,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
    className?: string;
  } & Record<string, unknown>) => createElement("a", { href, className, ...rest }, children),
}));

vi.mock("@/lib/native", () => ({
  triggerHapticSelection: () => undefined,
  triggerHaptic: () => undefined,
}));

describe("stubCode", () => {
  it("derives a 3-letter code from a city", () => {
    expect(stubCode("Sydney")).toBe("SYD");
    expect(stubCode("Melbourne")).toBe("MEL");
  });

  it("falls back to AIR for empty values", () => {
    expect(stubCode("")).toBe("AIR");
    expect(stubCode(undefined)).toBe("AIR");
  });
});

describe("PossieTicket", () => {
  it("renders stub, title, and walk estimate on a 44px+ target", () => {
    const html = renderToStaticMarkup(
      createElement(PossieTicket, { stub: "SYD", title: "Town Hall", subtitle: "Sydney", walk: "12 min walk" }),
    );
    expect(html).toContain("SYD");
    expect(html).toContain("Town Hall");
    expect(html).toContain("~12 min walk");
    expect(html).toContain("min-h-[60px]");
    expect(html).toContain("<button");
  });

  it("renders an aria label that names the walk time", () => {
    const html = renderToStaticMarkup(
      createElement(PossieTicket, { stub: "SYD", title: "Town Hall", walk: "12 min walk" }),
    );
    expect(html).toContain("about 12 min walk away");
  });

  it("renders a link when href is given", () => {
    const html = renderToStaticMarkup(createElement(PossieTicket, { stub: "SYD", title: "Town Hall", href: "/e/abc" }));
    expect(html).toContain('href="/e/abc"');
  });
});

describe("PlanBeforeYouGo", () => {
  it("shows the safety notice with a dismiss action", () => {
    const html = renderToStaticMarkup(createElement(PlanBeforeYouGo, { storageKey: "test:possie-plan-1" }));
    expect(html).toContain("Plan before you go");
    expect(html).toContain("Got it");
  });

  it("stays hidden once dismissed on-device", () => {
    const store: Record<string, string> = { "test:possie-plan-2": "1" };
    (globalThis as unknown as { localStorage: Storage }).localStorage = {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
      removeItem: (k: string) => {
        delete store[k];
      },
      clear: () => {
        for (const k in store) delete store[k];
      },
      length: 0,
      key: () => null,
    } as unknown as Storage;
    try {
      expect(renderToStaticMarkup(createElement(PlanBeforeYouGo, { storageKey: "test:possie-plan-2" }))).toBe("");
    } finally {
      delete (globalThis as unknown as { localStorage?: Storage }).localStorage;
    }
  });
});

describe("DirectionsHandoff", () => {
  it("hands off to Google and Apple Maps with venue coordinates", () => {
    const html = renderToStaticMarkup(
      createElement(DirectionsHandoff, {
        geo: { lat: -33.86, lng: 151.2 },
        label: "Town Hall",
      }),
    );
    expect(html).toContain("Google Maps");
    expect(html).toContain("Apple Maps");
    expect(html).toContain("maps.apple.com");
    expect(html).toContain("-33.86%2C151.2");
  });

  it("renders nothing without a destination", () => {
    expect(renderToStaticMarkup(createElement(DirectionsHandoff, { label: "" }))).toBe("");
  });

  it("builds an Apple Maps link without coordinates", () => {
    expect(appleMapsUrl(undefined, "Bondi")).toBe("https://maps.apple.com/?q=Bondi");
  });
});
