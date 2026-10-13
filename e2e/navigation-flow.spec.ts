import { test, expect } from "@playwright/test";

test.describe("Global Navigation & Profile Flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem("airpal.door.v1", "explore");
      } catch {
        /* ignore */
      }
    });
  });

  test("initial visit displays home hero and quick navigation", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByRole("heading", { level: 1, name: /good to see you/i })).toBeVisible();
    await expect(page.getByRole("link", { name: "What's open now" })).toBeVisible();
  });

  test("desktop top navigation links between major application hubs", async ({ page, isMobile }) => {
    test.skip(isMobile, "Desktop top navigation is only visible on large viewports");
    // TopNav is visible on large screens (default viewport in playwright desktop is 1280x720)
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    const header = page.locator("header.hidden.lg\\:block");
    await expect(header).toBeVisible();

    await header.getByRole("button", { name: "Places" }).click();
    await expect(page).toHaveURL(/\/explore/);

    await header.getByRole("button", { name: "Communities" }).click();
    await expect(page).toHaveURL(/\/events/);

    await header.getByRole("button", { name: "Friends" }).click();
    await expect(page).toHaveURL(/\/plan/);

    await header.getByRole("button", { name: "AirPal Home" }).click();
    await expect(page).toHaveURL("/");
  });

  test("unauthenticated profile menu provides entry to auth and partner tracks", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // Open profile menu
    const menuTrigger = page
      .getByRole("button", { name: /menu and sign in/i })
      .filter({ visible: true })
      .first();
    await expect(menuTrigger).toBeVisible();
    await menuTrigger.click({ force: true });

    // Dropdown options (filter visible since desktop and mobile markup coexist in DOM)
    await expect(page.getByText("Welcome to AirPal").filter({ visible: true })).toBeVisible();
    await expect(
      page.getByRole("menuitem", { name: /Sign in \/ Create account/i }).filter({ visible: true }),
    ).toBeVisible();
    await expect(page.getByRole("menuitem", { name: /Partner account/i }).filter({ visible: true })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: /Become a Host/i }).filter({ visible: true })).toBeVisible();

    // Click Sign in / Create account -> goes to /start
    await page
      .getByRole("menuitem", { name: /Sign in \/ Create account/i })
      .filter({ visible: true })
      .click();
    await expect(page).toHaveURL(/\/start/);
  });

  test("mobile bottom tab bar enables smooth thumb navigation", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    const tabNav = page.locator("nav.lg\\:hidden");
    await expect(tabNav).toBeVisible();

    // Shipped companion dock: Home / Now / Plan / Me / Bio.
    await tabNav.getByRole("button", { name: "Now" }).click();
    await expect(page).toHaveURL(/\/now/);

    await tabNav.getByRole("button", { name: /Plan|Trips/i }).click();
    await expect(page).toHaveURL(/\/plan/);

    await tabNav.getByRole("button", { name: "Home" }).click();
    await expect(page).toHaveURL("/");

    await tabNav.getByRole("button", { name: "Me dashboard" }).click();
    await expect(page).toHaveURL(/\/me|\/start/);

    await tabNav.getByRole("button", { name: "My bio" }).click();
    await expect(page).toHaveURL(/\/start|\/bio\/setup|\/@|\/bio/);
  });

  test("universal quick search command palette opens and navigates to places and tools", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // Open search modal via Cmd+K / Ctrl+K keyboard shortcut
    await page.keyboard.press("Meta+k");
    let searchInput = page.getByPlaceholder(/Search people, places, events/i);
    if (!(await searchInput.isVisible())) {
      await page.keyboard.press("Control+k");
    }
    await expect(searchInput).toBeVisible();

    // Search for Glenmore
    await searchInput.fill("Glenmore");
    const result = page.getByRole("button", { name: /The Glenmore/i }).first();
    await expect(result).toBeVisible();

    // Click the result to navigate
    await result.click();
    await expect(page).toHaveURL(/\/@glenmore|\/p\/glenmore/);
  });

  test("showcase tour opens for guests and links live stops", async ({ page }) => {
    await page.goto("/guide");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const tourBtn = page.getByRole("button", { name: /min|km|walk/i }).first();
    const placeLink = page.locator("a[href^='/@'], a[href^='/p/']").first();
    await expect(tourBtn.or(placeLink)).toBeVisible();
  });
});
