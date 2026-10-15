import { test, expect } from "@playwright/test";

/**
 * P0 loop proof: Want → Discover → Connect → Go → Experience →
 * Remember → Repeat. Guest-visible chain — every handoff must resolve to a
 * real surface (never a dead link), and money steps must sit behind auth,
 * never exposed or broken for guests.
 */
test.describe("AirPal loop proof (P0)", () => {
  test("home answers what you want to do and offers What's on and Find your circle", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByRole("heading", { level: 1, name: /good to see you/i })).toBeVisible();
    await expect(page.getByRole("link", { name: "What's on" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Find your circle" })).toBeVisible();
  });

  test("home hero CTA deep-links straight to events", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await page.getByRole("link", { name: "What's on" }).click();
    await expect(page).toHaveURL(/\/events/);
  });

  test("canceled ticket checkout shows a no-charge notice", async ({ page }) => {
    await page.goto("/me/tickets?canceled=true");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByText(/payment canceled/i)).toBeVisible();
  });

  test("canceled ticket checkout notice can be dismissed", async ({ page }) => {
    await page.goto("/me/tickets?canceled=true");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByText(/payment canceled/i)).toBeVisible();
    await page.getByRole("button", { name: "Dismiss" }).click();
    await expect(page.getByText(/payment canceled/i)).toHaveCount(0);
  });

  test("removed plan and invite routes redirect home", async ({ page }) => {
    for (const path of ["/plan", "/plan/new", "/plan/abc123", "/invite/abc123"]) {
      await page.goto(path);
      await page.waitForLoadState("domcontentloaded");
      await expect(page).toHaveURL(/localhost:3000\/$/);
    }
  });

  test("calendar renders the event calendar", async ({ page }) => {
    await page.goto("/calendar");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByRole("heading", { name: /event calendar/i })).toBeVisible();
  });

  test("money surfaces stay behind auth for guests", async ({ page }) => {
    await page.goto("/business");
    await page.waitForLoadState("domcontentloaded");
    const gate = page.getByText(/sign in/i).first();
    const placeForm = page.getByRole("heading", { name: /list your business|open it on this login/i });
    await expect(gate.or(placeForm)).toBeVisible();
  });

  test("events surface renders without a second app", async ({ page }) => {
    await page.goto("/events");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});
