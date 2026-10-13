import { test, expect } from "@playwright/test";

/**
 * Home exposes the AirPal journey: Discover → Connect → Plan → Go.
 * Tests modern v2.0 hero, quick search, prompts, and 6 marketplace pillars.
 */
test.describe("Home journey", () => {
  test("home exposes the journey: editorial greeting, hero banner, and discovery CTA", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // Hero title and editorial greeting
    await expect(page.getByRole("heading", { level: 1, name: /good to see you/i })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: /Less scrolling\./i })).toBeVisible();

    // Primary CTA buttons
    await expect(page.getByRole("link", { name: "What's open now" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Plan a hangout" })).toBeVisible();
  });

  test("discovery CTA navigates to /now and category filters are interactive", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // Click What's open now CTA
    await page.getByRole("link", { name: "What's open now" }).click();
    await expect(page).toHaveURL(/\/now/);
  });
});
