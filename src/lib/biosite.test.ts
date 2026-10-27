import { describe, expect, it } from "vitest";
import { bioSiteDisplayOrigin, bioSiteOrigin, bioSitePath, bioSiteUrl, parseBioSiteHandle } from "./biosite";

describe("biosite links", () => {
  it("builds the /bio/@handle path from any handle form", () => {
    expect(bioSitePath("bibin")).toBe("/bio/@bibin");
    expect(bioSitePath("@bibin")).toBe("/bio/@bibin");
    expect(bioSitePath("  @BiBin ")).toBe("/bio/@bibin");
  });

  it("defaults the site origin to airpal.bio", () => {
    expect(bioSiteOrigin()).toBe("https://airpal.bio");
    expect(bioSiteUrl("bibin")).toBe("https://airpal.bio/bio/@bibin");
  });

  it("falls back to the site origin where no window exists", () => {
    expect(bioSiteDisplayOrigin()).toBe("https://airpal.bio");
  });

  it("parses the handle out of a biosite path and rejects the rest", () => {
    expect(parseBioSiteHandle("/bio/@bibin")).toBe("bibin");
    expect(parseBioSiteHandle("/bio/@bibin?x=1")).toBe("bibin");
    expect(parseBioSiteHandle("/bio/setup")).toBe("");
    expect(parseBioSiteHandle("/bio/edit")).toBe("");
    expect(parseBioSiteHandle("/bio/bibin")).toBe("");
    expect(parseBioSiteHandle("/@bibin")).toBe("");
    expect(parseBioSiteHandle("")).toBe("");
  });
});
