import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ArrivalAssistantCard } from "./ArrivalAssistantCard";

describe("ArrivalAssistantCard", () => {
  const enmoreGeo = { lat: -33.8992, lng: 151.1744 };

  it("renders arrival header and walking badge accessibly", () => {
    const markup = renderToStaticMarkup(
      createElement(ArrivalAssistantCard, {
        destination: enmoreGeo,
        destinationName: "Enmore Theatre",
        address: "118 Enmore Rd, Newtown",
        initialExpanded: true,
      }),
    );

    expect(markup).toContain("Arrival &amp; Parking");
    expect(markup).toContain("Edgeware Rd Car Park");
    expect(markup).toContain("min walk");
    expect(markup).toContain("Walk to Entrance");
    expect(markup).toContain('aria-label="Arrival and parking options for Enmore Theatre"');
  });

  it("enforces touch ergonomics and explicit transitions", () => {
    const src = readFileSync(resolve(import.meta.dirname, "./ArrivalAssistantCard.tsx"), "utf8");
    expect(src).not.toContain("transition-all");
    expect(src).not.toMatch(/[^a-z-:]transition[" ]/);
    expect(src).toContain("min-h-[44px]");
  });
});
