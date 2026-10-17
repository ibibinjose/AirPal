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
    await expect(page.getByRole("link", { name: "What's on" })).toBeVisible();
  });

  test("desktop top navigation links between major application hubs", async ({ page, isMobile }) => {
    test.skip(isMobile, "Desktop top navigation is only visible on large viewports");
    // TopNav is visible on large screens (default viewport in playwright desktop is 1280x720)
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    const header = page.locator("header.hidden.lg\\:block");
    await expect(header).toBeVisible();

    await header.getByRole("button", { name: "Communities" }).click();
    await expect(page).toHaveURL(/\/events/);

    await header.getByRole("button", { name: "Me", exact: true }).click();
    await expect(page).toHaveURL(/\/me/);

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

    // Shipped companion dock: Home / Place / Community / Friends / Me.
    await tabNav.getByRole("button", { name: "Place" }).click();
    await expect(page).toHaveURL(/\/places/);

    await tabNav.getByRole("button", { name: "Community" }).click();
    await expect(page).toHaveURL(/\/communities/);

    await tabNav.getByRole("button", { name: "Friends" }).click();
    await expect(page).toHaveURL(/\/friends/);

    await tabNav.getByRole("button", { name: "Me dashboard" }).click();
    await expect(page).toHaveURL(/\/me/);

    await tabNav.getByRole("button", { name: "Home" }).click();
    await expect(page).toHaveURL(/localhost:3000\/$/);
  });

  test("universal quick search command palette opens and navigates to explore shortcuts", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // Open search modal via search button (on mobile) or Cmd+K / Ctrl+K keyboard shortcut
    const searchBtn = page.getByRole("button", { name: "Search", exact: true });
    if (await searchBtn.isVisible()) {
      await searchBtn.click();
    } else {
      await page.keyboard.press("Meta+k");
      if (!(await page.getByPlaceholder(/Search people, places, events/i).isVisible())) {
        await page.keyboard.press("Control+k");
      }
    }
    const searchInput = page.getByPlaceholder(/Search people, places, events/i);
    await expect(searchInput).toBeVisible();

    // Static Explore shortcuts resolve without backend data.
    const shortcut = page.getByRole("button", { name: /Circle & Presence/i });
    await expect(shortcut).toBeVisible();
    await shortcut.click();
    await expect(page).toHaveURL(/\/circle/);
  });

  test("header create button opens creation sheet and navigates to event hosting", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    const createBtn = page.getByRole("button", { name: /Create/i }).first();
    await expect(createBtn).toBeVisible();
    await createBtn.click();

    await expect(page.getByRole("heading", { name: /What do you want to create\?/i })).toBeVisible();
    const hostEventOption = page.getByRole("button", { name: /host an event/i });
    await expect(hostEventOption).toBeVisible();

    await hostEventOption.click();
    await expect(page).toHaveURL(/\/event/);
  });
});
