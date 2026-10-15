import { test, expect } from "@playwright/test";

/**
 * Home exposes the AirPal journey: Discover → Connect → Go.
 * Tests the editorial hero, primary CTAs, and events navigation.
 */
test.describe("Home journey", () => {
  test("home exposes the journey: editorial greeting, hero banner, and discovery CTA", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // Hero title and editorial greeting
    await expect(page.getByRole("heading", { level: 1, name: /good to see you/i })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: /Less scrolling\./i })).toBeVisible();

    // Primary CTA buttons
    await expect(page.getByRole("link", { name: "What's on" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Find your circle" })).toBeVisible();
  });

  test("events CTA navigates to /events", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // Click What's on CTA
    await page.getByRole("link", { name: "What's on" }).click();
    await expect(page).toHaveURL(/\/events/);
  });
});
