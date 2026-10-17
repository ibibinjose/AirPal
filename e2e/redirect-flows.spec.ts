import { test, expect } from "@playwright/test";

test.describe("Retired route redirects", () => {
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

  test("arrival routes render the unified arrival page", async ({ page }) => {
    for (const route of ["/join", "/join/SCAPE26", "/arrival", "/arrival/SCAPE26"]) {
      await page.goto(route);
      await page.waitForLoadState("domcontentloaded");
      await expect(page).toHaveURL(new RegExp(`${route.replace(/[/]/g, "\\/")}$`));
    }

    await page.goto("/join/SCAPE26");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/crew/i);
    await expect(page.getByText("SCAPE26", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: /events/i }).first()).toBeVisible();

    await page.goto("/arrival");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/welcome in/i);

    await page.goto("/g/unsw-village");
    await page.waitForLoadState("domcontentloaded");
    await expect(page).toHaveURL(/\/business/);

    await page.goto("/c/unsw-village");
    await page.waitForLoadState("domcontentloaded");
    await expect(page).toHaveURL(/\/events/);
  });
});
