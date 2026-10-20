import { test, expect } from "@playwright/test";

test.describe("Authentication & Security Flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/start");
    await page.waitForLoadState("domcontentloaded");
  });

  test("renders login and signup segmented controls on /start", async ({ page }) => {
    await expect(page.getByRole("button", { name: "Sign In", exact: true }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Create Account", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /Continue with Google/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Continue with Apple/i })).toBeVisible();

    await expect(page.getByLabel("Email Address")).toBeVisible();
    await expect(page.getByPlaceholder("••••••••")).toBeVisible();
    await expect(page.getByRole("button", { name: "Forgot password?" })).toBeVisible();
    await expect(page.getByRole("button", { name: "SMS Code", exact: true })).toHaveCount(0);
  });

  test("create account starts with mobile number and handle, followed by account info", async ({ page }) => {
    await page.getByRole("button", { name: "Create Account", exact: true }).click();

    // Step 1: Mobile & Handle
    await expect(page.getByPlaceholder("412 345 678")).toBeVisible();
    await expect(page.getByPlaceholder("maya")).toBeVisible();
    await expect(page.getByRole("button", { name: "Send SMS code" })).toBeVisible();
  });

  test("toggles password visibility with Eye icon", async ({ page }) => {
    const passwordInput = page.getByPlaceholder("••••••••");
    await expect(passwordInput).toHaveAttribute("type", "password");

    const toggleBtn = page.getByRole("button", { name: "Show password" });
    await toggleBtn.click();
    await expect(passwordInput).toHaveAttribute("type", "text");

    const hideBtn = page.getByRole("button", { name: "Hide password" });
    await hideBtn.click();
    await expect(passwordInput).toHaveAttribute("type", "password");
  });

  test("email sign-in is available without phone sign-in controls", async ({ page }) => {
    await expect(page.getByLabel("Email Address")).toBeVisible();
    await expect(page.getByPlaceholder("••••••••")).toBeVisible();
    await expect(page.getByPlaceholder("412 345 678")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "SMS Code", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Continue with Google/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Continue with Apple/i })).toBeVisible();
  });

  test("displays context-aware role banner for Host and Business", async ({ page }) => {
    await page.goto("/start?role=host");
    await expect(page.getByText("Host Workspace")).toBeVisible();
    await expect(page.getByText(/Sign in to Host Console|Sign in to Host Tools/i)).toBeVisible();

    await page.goto("/start?role=business");
    await expect(page.getByText("Local Business Hub", { exact: true }).first()).toBeVisible();
    await expect(page.getByText(/Sign in to Business Hub|Open a Business Account/i)).toBeVisible();
  });

  test("renders password reset view and navigates back to Sign In", async ({ page }) => {
    await page.getByRole("button", { name: "Forgot password?" }).click();

    await expect(page.getByRole("heading", { name: "Forgot your password?" })).toBeVisible();
    await expect(page.getByPlaceholder("you@domain.com")).toBeVisible();
    await expect(page.getByRole("button", { name: "Email reset link" })).toBeVisible();

    await page.getByRole("button", { name: "Back to Sign In" }).click();
    await expect(page.getByRole("button", { name: "Create Account", exact: true })).toBeVisible();
    await expect(page.getByLabel("Email Address")).toBeVisible();
  });

  test("displays AuthGate when navigating to protected role routes", async ({ page }) => {
    await page.goto("/event");
    await expect(page.getByRole("heading", { name: "Create an event" })).toBeVisible();
    await expect(page.getByText("Event Organiser", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Sign In with Email or Social/i })).toBeVisible();

    await page.getByRole("button", { name: /Sign In with Email or Social/i }).click();
    await expect(page).toHaveURL(/\/start\?tab=signin&next=%2Fevent/);
  });

  test("renders side-by-side product intro showcase on desktop viewport", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/start");

    // Desktop left column product showcase
    await expect(page.getByText("Events & Access").first()).toBeVisible();
    await expect(page.getByText("Perks & Local Business").first()).toBeVisible();
    await expect(page.getByText("Universal Identity & Digital Bio").first()).toBeVisible();

    // Right column auth card simultaneously visible side-by-side
    const authCard = page.locator("#auth-card");
    await expect(authCard).toBeVisible();
  });

  test("renders mobile view with keyboard-safe inputs and responsive positioning", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/start");

    // Mobile auth card is immediately visible
    const authCard = page.locator("#auth-card");
    await expect(authCard).toBeVisible();

    // Inputs have font-size >= 16px to prevent iOS auto-zoom
    const emailInput = page.getByLabel("Email Address");
    await expect(emailInput).toBeVisible();
    const fontSize = await emailInput.evaluate((el) => window.getComputedStyle(el).fontSize);
    expect(parseFloat(fontSize)).toBeGreaterThanOrEqual(16);
  });
});
