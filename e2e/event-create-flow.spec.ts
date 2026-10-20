import { test, expect } from "@playwright/test";

test.describe("Event creation entry points", () => {
  test("create event asks for an account then shows the simple form after sign-in wall", async ({ page }) => {
    await page.goto("/event/new");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByRole("heading", { name: /Create an event/i })).toBeVisible();
    await expect(page.getByText(/Sign in or create an account first|Event Organiser/i).first()).toBeVisible();
  });

  test("calendar Host Event link opens the organiser event flow", async ({ page }) => {
    await page.goto("/calendar");
    await page.waitForLoadState("domcontentloaded");
    await page.locator("#main-content").getByRole("link", { name: "Host Event" }).first().click();
    await expect(page).toHaveURL(/\/event$/);
    await expect(page.getByRole("heading", { name: "Create an event" })).toBeVisible();
  });
});
