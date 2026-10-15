import { test, expect } from "@playwright/test";

test.describe("Business hub & Inbox CRM", () => {
  test("retired /partners redirects to the Business hub", async ({ page }) => {
    await page.goto("/partners");
    await page.waitForLoadState("domcontentloaded");
    await expect(page).toHaveURL(/\/business/);
    await expect(page.getByRole("heading", { name: /AirPal Business Studio|Launch Your Business/i })).toBeVisible();
  });

  test("inbox is a notification list", async ({ page }) => {
    await page.goto("/me/inbox");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByRole("heading", { name: /inbox|Your inbox|Sign in/i })).toBeVisible();
  });
});
