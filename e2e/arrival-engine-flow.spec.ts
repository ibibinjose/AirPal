import { test, expect } from "@playwright/test";

test.describe("Arrival Engine & Redirect Flows", () => {
  test("legacy /concierge route redirects to home", async ({ page }) => {
    await page.goto("/concierge");
    await page.waitForLoadState("domcontentloaded");
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("heading", { level: 1, name: /good to see you/i })).toBeVisible();
  });

  test("removed Discovery routes redirect to home", async ({ page }) => {
    for (const route of ["/now", "/explore", "/explore/attractions", "/guide", "/p/glenmore", "/tour/abc"]) {
      await page.goto(route);
      await page.waitForLoadState("domcontentloaded");
      await expect(page).toHaveURL(/\/$/);
    }
  });

  test("legacy /g/:id route redirects to /join/:id arrival engine", async ({ page }) => {
    await page.goto("/g/unsw-village");
    await page.waitForLoadState("domcontentloaded");
    await expect(page).toHaveURL(/\/join\/unsw-village/);
    await expect(page.getByText("AirPal Arrival Engine")).toBeVisible();
    await expect(page.getByRole("heading", { name: "I Just Got Here" })).toBeVisible();
  });

  test("arrival engine renders institution presets and join input", async ({ page }) => {
    await page.goto("/join");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByRole("heading", { name: "I Just Got Here" })).toBeVisible();
    await expect(page.getByPlaceholder(/e\.g\. SCAPE26, STPAULS/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Join Cohort/i })).toBeVisible();
  });
});
