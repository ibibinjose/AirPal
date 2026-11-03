import { describe, expect, it } from "vitest";
import { onboardingPath } from "./signup-draft";

describe("onboardingPath", () => {
  it("carries the chosen name and handle into onboarding", () => {
    const href = onboardingPath("/circle", { name: "Test Guest", handle: "testguest" });
    const params = new URLSearchParams(href.split("?")[1]);
    expect(href.startsWith("/onboarding?")).toBe(true);
    expect(params.get("next")).toBe("/circle");
    expect(params.get("name")).toBe("Test Guest");
    expect(params.get("handle")).toBe("testguest");
  });

  it("drops a non-path next target", () => {
    expect(onboardingPath("https://evil.example", { name: "A" })).toBe("/onboarding?next=%2F&name=A");
  });
});
