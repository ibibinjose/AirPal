import { test, expect } from "@playwright/test";

test.describe("Join & business profile", () => {
  test("join explains personal account vs business profile", async ({ page }) => {
    await page.goto("/start?role=business");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByText("Local Business Hub", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: /Sign in to Business Hub|Open a Business Account/i })).toBeVisible();
  });

  test("partner account uses the same login, then onboard", async ({ page }) => {
    await page.goto("/start?role=business");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByText("Local Business Hub", { exact: true }).first()).toBeVisible();
    await expect(page.getByText(/Publish verified perks and dining deals/i)).toBeVisible();
  });

  test("business studio renders Google Places import and launch guide", async ({ page }) => {
    await page.goto("/business");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByRole("heading", { name: /AirPal Business Studio|Launch Your Business/i })).toBeVisible();
  });

  test("personal bio setup requires universal login before handle claim", async ({ page }) => {
    await page.goto("/bio/setup");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByRole("heading", { name: /Your AirPal Me profile|Your handle/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Create Free Account|Claim/i })).toBeVisible();
  });
});
