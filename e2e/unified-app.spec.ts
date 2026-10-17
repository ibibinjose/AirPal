import { test, expect } from "@playwright/test";

/**
 * One AirPal App: every restored first-class route renders its own page
 * for guests (never a redirect maze, never a dead end).
 */
test.describe("Unified app pages", () => {
  const cases: Array<{ route: string; heading: RegExp }> = [
    { route: "/host", heading: /host something people belong to/i },
    { route: "/host/pulse", heading: /did people feel they belonged/i },
    { route: "/pulse", heading: /did people feel they belonged/i },
    { route: "/business/onboard", heading: /put your venue on airpal/i },
    { route: "/business/setup", heading: /finish your venue setup/i },
    { route: "/business/helpdesk", heading: /talk to a human/i },
    { route: "/business/promotions", heading: /^promotions$/i },
    { route: "/business/promotions/new", heading: /new promotion/i },
    { route: "/admin/promotions", heading: /promotions review/i },
    { route: "/admin/notifications", heading: /notifications/i },
    { route: "/birthday-freebies", heading: /birthday month/i },
    { route: "/birthday-freebies/au", heading: /birthday treats in australia/i },
    { route: "/bio/recover", heading: /lost your @handle/i },
    { route: "/getAirPalApp", heading: /one account, every screen/i },
    { route: "/helpdesk", heading: /help|support/i },
  ];

  for (const { route, heading } of cases) {
    test(`${route} renders`, async ({ page }) => {
      await page.goto(route);
      await page.waitForLoadState("domcontentloaded");
      await expect(page.getByRole("heading", { level: 1 }).first()).toContainText(heading);
    });
  }

  test("/alternatives/:slug renders a comparison landing", async ({ page }) => {
    await page.goto("/alternatives/luma");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/coming from luma/i);
  });

  test("/e/:id/manage asks guests to sign in before any lookup", async ({ page }) => {
    await page.goto("/e/no-such-event/manage");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByText(/event organiser/i).first()).toBeVisible();
  });

  test("/events/new asks guests to sign in", async ({ page }) => {
    await page.goto("/events/new");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByText(/event organiser/i).first()).toBeVisible();
  });

  test("/places renders the venue directory", async ({ page }) => {
    await page.goto("/places");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/find your kind of place/i);
  });

  test("/communities renders organiser communities", async ({ page }) => {
    await page.goto("/communities");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/find your people/i);
  });

  test("/friends renders the friends hub", async ({ page }) => {
    await page.goto("/friends");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/never go alone/i);
  });

  test("/me asks guests to sign in", async ({ page }) => {
    await page.goto("/me");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByText(/sign in or create an account/i).first()).toBeVisible();
  });
});
