import { test, expect } from "@playwright/test";

test.describe("Search Engine Flow", () => {
  test("loads /search and redirects cleanly to /now discovery radar", async ({ page }) => {
    await page.goto("/search");
    await page.waitForLoadState("domcontentloaded");

    await expect(page).toHaveURL(/\/now/);
    await expect(page.getByRole("heading", { level: 1, name: "What now?" })).toBeVisible();
  });

  test("loads discovery feed with category filters on /now", async ({ page }) => {
    await page.goto("/now");
    await page.waitForLoadState("domcontentloaded");

    // Verify mood chips exist on /now
    await expect(page.getByRole("radio", { name: /Coffee/i })).toBeVisible();
    await expect(page.getByRole("radio", { name: /Eat/i })).toBeVisible();
  });

  test("category pill clicks filter discovery results on /now", async ({ page }) => {
    await page.goto("/now");
    await page.waitForLoadState("domcontentloaded");

    // Click Coffee chip
    const coffeeChip = page.getByRole("radio", { name: /Coffee/i });
    await coffeeChip.click();
    await expect(coffeeChip).toHaveAttribute("aria-checked", "true");
  });

  test("modal command palette opens and navigates directly to /now", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // Open search modal via button or keyboard shortcut
    const searchBtn = page.getByRole("button", { name: "Search", exact: true });
    if (await searchBtn.isVisible().catch(() => false)) {
      await searchBtn.click();
    } else {
      await page.keyboard.press("Meta+k");
    }
    let modalInput = page.getByPlaceholder(/Search people, places, events/i);
    if (!(await modalInput.isVisible().catch(() => false))) {
      await page.keyboard.press("Control+k");
    }
    if (!(await modalInput.isVisible().catch(() => false))) {
      const fallbackBtn = page.getByLabel("Search").first();
      if (await fallbackBtn.isVisible().catch(() => false)) {
        await fallbackBtn.click();
      }
    }
    await expect(modalInput).toBeVisible();

    // Type query
    await modalInput.fill("harbour");

    // Click full search banner
    const fullSearchBtn = page.getByRole("button", { name: /Full AirPal Search/i });
    await expect(fullSearchBtn).toBeVisible();
    await fullSearchBtn.click();

    // Navigates to /now?q=harbour
    await expect(page).toHaveURL(/\/now\?q=harbour/);
  });
});
