import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("wouter", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => createElement("a", { href }, children),
}));

import { EventStudioNotFound } from "./EventStudioNotFound";

describe("EventStudioNotFound", () => {
  it("offers a way forward without fabricating an event", () => {
    const markup = renderToStaticMarkup(createElement(EventStudioNotFound));
    expect(markup).toContain("Couldn’t find that event");
    expect(markup).toContain('href="/event"');
    expect(markup).toContain('href="/events"');
    expect(markup).not.toContain("demo");
  });
});
