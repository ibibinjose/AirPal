import { describe, expect, it } from "vitest";
import {
  profileMatchesSearch,
  searchNeedle,
  tokenizeSearchQuery,
  scoreSearchItem,
  highlightSearchMatch,
  isValidSearchQuery,
} from "./search-query";

describe("searchNeedle", () => {
  it("strips @ and flags handle lookups", () => {
    expect(searchNeedle("@theglenmore")).toEqual({
      text: "@theglenmore",
      handle: "theglenmore",
      looksLikeHandle: true,
    });
    expect(searchNeedle("theglenmore")).toMatchObject({ handle: "theglenmore", looksLikeHandle: true });
    expect(searchNeedle("coffee near me").looksLikeHandle).toBe(false);
  });
});

describe("profileMatchesSearch", () => {
  const profile = { handle: "theglenmore", name: "The Glenmore Hotel", shortWhy: "Harbour views" };

  it("matches @handle queries that currently return nothing in global search", () => {
    expect(profileMatchesSearch(profile, searchNeedle("@theglenmore"))).toBe(true);
    expect(profileMatchesSearch(profile, searchNeedle("glenmore"))).toBe(true);
    expect(profileMatchesSearch(profile, searchNeedle("Harbour"))).toBe(true);
    expect(profileMatchesSearch(profile, searchNeedle("xyzzy"))).toBe(false);
  });
});

describe("tokenizeSearchQuery", () => {
  it("splits punctuation and handles whitespace", () => {
    expect(tokenizeSearchQuery("Coffee & Brunch, Sydney!")).toEqual(["coffee", "brunch", "sydney"]);
    expect(tokenizeSearchQuery("@alex_99")).toEqual(["@alex_99"]);
  });
});

describe("scoreSearchItem", () => {
  const item = {
    title: "The Glenmore Hotel",
    subtitle: "Rooftop pub overlooking the harbour",
    category: "Pub & Bar",
    handle: "theglenmore",
    tags: ["rooftop", "views", "drinks"],
  };

  it("returns highest score for exact handle match", () => {
    const handleScore = scoreSearchItem(item, "@theglenmore");
    const partialScore = scoreSearchItem(item, "pub");
    expect(handleScore).toBeGreaterThan(partialScore);
  });

  it("rewards multi-token hits across fields", () => {
    const singleField = scoreSearchItem(item, "rooftop");
    const multiToken = scoreSearchItem(item, "glenmore rooftop");
    expect(multiToken).toBeGreaterThan(singleField);
  });

  it("returns 0 when nothing matches", () => {
    expect(scoreSearchItem(item, "nonexistentquery123")).toBe(0);
  });
});

describe("highlightSearchMatch", () => {
  it("extracts matching and non-matching text segments", () => {
    const segments = highlightSearchMatch("The Glenmore Hotel", "glenmore");
    expect(segments).toEqual([
      { text: "The ", match: false },
      { text: "Glenmore", match: true },
      { text: " Hotel", match: false },
    ]);
  });

  it("handles multi-token matching", () => {
    const segments = highlightSearchMatch("Coffee, Drinks and Brunch", "coffee brunch");
    expect(segments.find((s) => s.text === "Coffee")?.match).toBe(true);
    expect(segments.find((s) => s.text === "Brunch")?.match).toBe(true);
    expect(segments.find((s) => s.text === ", Drinks and ")?.match).toBe(false);
  });
});

describe("isValidSearchQuery", () => {
  it("accepts valid human search queries", () => {
    expect(isValidSearchQuery("Bondi Beach")).toBe(true);
    expect(isValidSearchQuery("coffee")).toBe(true);
    expect(isValidSearchQuery("@theglenmore")).toBe(true);
    expect(isValidSearchQuery("italian dinner")).toBe(true);
  });

  it("strictly rejects file paths, code URLs, and stack traces", () => {
    expect(
      isValidSearchQuery(
        "/Users/bibinjose/Projects/Codebase/Projects/AirPalMe/node_modules/@capacitor/app/ios/Sources/AppPlugin/AppPlugin.swift",
      ),
    ).toBe(false);
    expect(isValidSearchQuery("file:///path/to/something.ts")).toBe(false);
    expect(isValidSearchQuery("/Users/someone/Desktop")).toBe(false);
    expect(isValidSearchQuery("node_modules/package/index.js")).toBe(false);
    expect(isValidSearchQuery("something.swift")).toBe(false);
    expect(isValidSearchQuery("component.tsx")).toBe(false);
    expect(isValidSearchQuery("")).toBe(false);
    expect(isValidSearchQuery(null)).toBe(false);
    expect(isValidSearchQuery(undefined)).toBe(false);
  });
});
