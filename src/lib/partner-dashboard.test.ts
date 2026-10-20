import { describe, expect, it } from "vitest";
import { APPLICATION_STEPS, applicationStepFor, applicationStepLabel } from "./partner-dashboard";

describe("partner-dashboard application steps", () => {
  it("passes pipeline states through unchanged", () => {
    expect(applicationStepFor("submitted")).toBe("submitted");
    expect(applicationStepFor("under_review")).toBe("under_review");
    expect(applicationStepFor("approved")).toBe("approved");
    expect(applicationStepFor("rejected")).toBe("rejected");
    expect(applicationStepFor("withdrawn")).toBe("withdrawn");
  });

  it("surfaces under-review with a reviewer note as needs-info", () => {
    expect(applicationStepFor("under_review", "Please add opening hours.")).toBe("needs_info");
    expect(applicationStepFor("under_review", "   ")).toBe("under_review");
    expect(applicationStepFor("under_review", undefined)).toBe("under_review");
  });

  it("labels every step for the tracker", () => {
    expect(applicationStepLabel("submitted")).toBe("Submitted");
    expect(applicationStepLabel("under_review", "More detail please.")).toBe("Needs info");
    expect(applicationStepLabel("approved")).toBe("Approved");
    expect(applicationStepLabel("rejected", "Outside coverage.")).toBe("Rejected");
    for (const step of APPLICATION_STEPS) {
      expect(step.label.length).toBeGreaterThan(0);
    }
  });
});
