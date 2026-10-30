import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("@/contexts/BioContext", () => ({
  useBio: () => ({
    mine: { handle: "bibinjose" },
  }),
}));

vi.mock("@/lib/qr", () => ({
  makeQrDataUrl: vi.fn(async () => "data:image/png;base64,mock"),
}));

vi.mock("@/components/ui/Sheet", () => ({
  Sheet: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? createElement("div", { "data-testid": "sheet" }, children) : null,
}));

import { EventShareModal } from "./EventShareModal";

describe("EventShareModal", () => {
  it("renders referral link with user handle", () => {
    const markup = renderToStaticMarkup(
      createElement(EventShareModal, {
        open: true,
        onClose: () => {},
        eventId: "evt-7OjACzef",
        title: "Sydney Tech Catch-up",
      }),
    );
    expect(markup).toContain("evt-7OjACzef?ref=bibinjose");
    expect(markup).toContain("Sydney Tech Catch-up");
  });

  it("shows draft warning when event is in draft mode", () => {
    const markup = renderToStaticMarkup(
      createElement(EventShareModal, {
        open: true,
        onClose: () => {},
        eventId: "evt-7OjACzef",
        title: "Sydney Tech Catch-up",
        isDraft: true,
      }),
    );
    expect(markup).toContain("This event is in Draft mode");
    expect(markup).toContain("404 · Page Not Found");
  });
});
