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

    await expect(page.getByPlaceholder("412 345 678")).toBeVisible();
    await expect(page.getByPlaceholder("••••••••")).toBeVisible();
    await expect(page.getByRole("button", { name: "Forgot password?" })).toBeVisible();
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

  test("mobile sign-in offers password and SMS", async ({ page }) => {
    await expect(page.getByRole("button", { name: "Password", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "SMS Code", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "SMS Code", exact: true }).click();
    await expect(page.getByPlaceholder("412 345 678")).toBeVisible();
    await expect(page.getByRole("button", { name: /Send SMS Code/i })).toBeVisible();
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
    await expect(page.getByPlaceholder("412 345 678")).toBeVisible();
  });

  test("displays AuthGate when navigating to protected role routes", async ({ page }) => {
    await page.goto("/event");
    await expect(page.getByRole("heading", { name: "Create an event" })).toBeVisible();
    await expect(page.getByText("Event Organiser", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Sign In with Mobile or Social/i })).toBeVisible();

    await page.getByRole("button", { name: /Sign In with Mobile or Social/i }).click();
    await expect(page).toHaveURL(/\/start\?tab=signin&next=%2Fevent/);
  });
});
