import { test, expect } from "@playwright/test";

/**
 * Luma-parity event detail: every host-entered field must survive the full
 * chain (studio → record → public page) and render on web + mobile.
 */
test.describe("Event Detail — full field wiring", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        const d = new Date(Date.now() + 7 * 86400000);
        const iso = d.toISOString().slice(0, 10);
        localStorage.setItem(
          "airpal.location.v1",
          JSON.stringify({ mode: "city", city: "Sydney", lat: -33.8688, lng: 151.2093 }),
        );
        const base = {
          flavour: "event_space",
          city: "Sydney",
          venue: "Strike Chatswood",
          room: "Level 4 Bar",
          address: "Level 4/65 Albert Ave, Chatswood NSW 2067",
          description: "Networking, but with laser guns. Two games, snacks on us.",
          shortWhy: "Meet founders while doing something actually fun",
          directions: "Take the lift to Level 4 and meet at the bar from 6pm",
          refundPolicy: "No refunds, but tickets are transferable — message us to swap the name over.",
          agenda: [
            { time: "6:00pm", title: "Meet at the bar" },
            { time: "6:30pm", title: "Game 1 (starts on time!)" },
            { time: "7:15pm", title: "Game 2" },
          ],
          hostName: "Sip & Scale Sydney",
          hostHandle: "sipandscale",
          hostType: "business",
          collaboratorHandles: ["ethanw"],
          sponsorHandles: ["harbourbar"],
          startsAt: `${iso}T18:00:00+10:00`,
          endsAt: `${iso}T21:00:00+10:00`,
          status: "live",
          gatePath: "/e/evt-full-fields",
          categoryChips: ["community"],
          stallCount: 0,
          ticketPriceCents: 3000,
          capacity: 20,
        };
        const events = [
          { ...base, id: "evt-full-fields", name: "Laser Tag Mixer" },
          { ...base, id: "evt-closed-fields", name: "Laser Tag Mixer (Closed)", registrationClosed: true },
        ];
        localStorage.setItem("airpal.events.v1", JSON.stringify(events));
      } catch {
        /* ignore */
      }
    });
  });

  test("renders agenda, refund policy, directions, hosts and report affordance", async ({ page }) => {
    await page.goto("/e/evt-full-fields");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByRole("heading", { name: "Laser Tag Mixer" })).toBeVisible();
    // Schedule timeline rows
    await expect(page.getByText("Schedule & Timings")).toBeVisible();
    await expect(page.getByText("Game 1 (starts on time!)")).toBeVisible();
    // Refund & transfer policy
    await expect(page.getByText("Refunds & Transfers")).toBeVisible();
    await expect(page.getByText(/tickets are transferable/)).toBeVisible();
    // Finding-the-group directions inside the location card
    await expect(page.getByText(/Take the lift to Level 4/)).toBeVisible();
    // Host + extra host + sponsor + follow + report
    await expect(page.getByText("Sip & Scale Sydney").first()).toBeVisible();
    await expect(page.getByText("ethanw")).toBeVisible();
    await expect(page.getByText("Sponsors")).toBeVisible();
    await expect(page.getByText("harbourbar")).toBeVisible();
    await expect(page.getByRole("button", { name: /Report event/ })).toBeVisible();
    // Registration open: tier card present, no closed banner
    await expect(page.getByText("Registration & Passes")).toBeVisible();
    await expect(page.getByText("Registration Closed")).toHaveCount(0);
  });

  test("host-closed event shows closed card with notify-me form", async ({ page }) => {
    await page.goto("/e/evt-closed-fields");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByText("Registration Closed")).toBeVisible();
    await expect(page.getByText("Registration is closed")).toBeVisible();
    await expect(page.getByText("Notify me next time")).toBeVisible();
    await expect(page.getByPlaceholder("you@example.com")).toBeVisible();
    // Agenda and policy still visible — closing loses no data
    await expect(page.getByText("Game 1 (starts on time!)")).toBeVisible();
    await expect(page.getByText(/tickets are transferable/)).toBeVisible();
  });
});
