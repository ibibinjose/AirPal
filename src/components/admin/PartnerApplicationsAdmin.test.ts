import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { PartnerApplication } from "@shared/partner";
import { PartnerApplicationQueue } from "./PartnerApplicationsAdmin";

const noop = () => undefined;

function application(overrides: Partial<PartnerApplication>): PartnerApplication {
  return {
    id: "app-1",
    applicantUid: "u-applicant",
    businessName: "Demo Coffee House",
    category: "coffee",
    contactName: "Sam Owner",
    contactEmail: "owner@example.com",
    pitch: "An obviously-fake demo pitch for testing.",
    status: "submitted",
    createdAt: "2026-02-01T00:00:00.000Z",
    updatedAt: "2026-02-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("PartnerApplicationsAdmin queue", () => {
  it("lists pending applications with audit-friendly timestamps and review actions", () => {
    const html = renderToStaticMarkup(
      createElement(PartnerApplicationQueue, {
        rows: [application({})],
        loading: false,
        busyId: null,
        onReview: noop,
      }),
    );

    expect(html).toContain("Demo Coffee House");
    expect(html).toContain("owner@example.com");
    expect(html).toContain("filed");
    expect(html).toContain("Reviewer note");
    expect(html).toContain("Approve");
    expect(html).toContain("Reject with reason");
  });

  it("shows an empty state when the filter has no rows", () => {
    const html = renderToStaticMarkup(
      createElement(PartnerApplicationQueue, { rows: [], loading: false, busyId: null, onReview: noop }),
    );

    expect(html).toContain("No applications in this state");
  });

  it("shows a loading status while fetching", () => {
    const html = renderToStaticMarkup(
      createElement(PartnerApplicationQueue, { rows: [], loading: true, busyId: null, onReview: noop }),
    );

    expect(html).toContain('role="status"');
  });

  it("hides review actions on decided applications but keeps the note", () => {
    const html = renderToStaticMarkup(
      createElement(PartnerApplicationQueue, {
        rows: [application({ status: "rejected", adminNote: "Outside coverage area." })],
        loading: false,
        busyId: null,
        onReview: noop,
      }),
    );

    expect(html).not.toContain("Reject with reason");
    expect(html).toContain("Outside coverage area.");
  });
});
