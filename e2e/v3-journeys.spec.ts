import { test, expect, type Page } from "@playwright/test";

/**
 * V3 rules journeys against the seeded emulator stack.
 *
 * Run: npm run emu:v3 (terminal 1), npm run emu:v3:seed (terminal 2),
 * then V3_E2E=true npx playwright test e2e/v3-journeys.spec.ts
 *
 * These run real browser-context fetches against the Firestore emulator REST
 * API, so they exercise firestore.rules.v3 exactly as the web client would.
 * They stay skipped in normal runs: the UI does not consume V3 adapters yet.
 */
const V3_E2E = process.env.V3_E2E === "true";
const PROJECT = process.env.GCLOUD_PROJECT || "demo-v3local";
const DOCS = `http://127.0.0.1:8080/v1/projects/${PROJECT}/databases/(default)/documents`;

async function getInBrowser(page: Page, docPath: string): Promise<{ status: number; body: unknown }> {
  return page.evaluate(
    async ({ base, path }) => {
      const res = await fetch(`${base}/${path}`);
      let body: unknown = null;
      try {
        body = await res.json();
      } catch {
        body = null;
      }
      return { status: res.status, body };
    },
    { base: DOCS, path: docPath },
  );
}

test.describe("V3 rules journeys", () => {
  test.skip(!V3_E2E, "V3 emulator journeys need V3_E2E=true with the seeded V3 stack.");

  test("anonymous reads see published content and nothing private", async ({ page }) => {
    await page.goto("/");

    const place = await getInBrowser(page, "places/v3-place-pub");
    expect(place.status).toBe(200);

    const draft = await getInBrowser(page, "events/v3-event-draft");
    expect(draft.status).toBe(403);

    const user = await getInBrowser(page, "users/v3-owner-1");
    expect(user.status).toBe(403);

    const publicBio = await getInBrowser(page, "profiles/v3-owner-1");
    expect(publicBio.status).toBe(200);

    const privateBio = await getInBrowser(page, "profiles/v3-guest-1");
    expect(privateBio.status).toBe(403);

    const audit = await getInBrowser(page, "audits/v3-audit-seed");
    expect(audit.status).toBe(403);
  });

  test("plans, deals, tickets, orders, cohorts, and chats stay scoped", async ({ page }) => {
    await page.goto("/");

    expect((await getInBrowser(page, "events/v3-event-pub")).status).toBe(200);
    expect((await getInBrowser(page, "plans/v3-plan-open")).status).toBe(200);
    expect((await getInBrowser(page, "plans/v3-plan-private")).status).toBe(403);
    expect((await getInBrowser(page, "plans/v3-plan-open/members/v3-owner-1")).status).toBe(403);
    expect((await getInBrowser(page, "deals/v3-deal-pub")).status).toBe(200);
    expect((await getInBrowser(page, "dealClaims/v3-claim-1")).status).toBe(403);
    expect((await getInBrowser(page, "tickets/v3-ticket-1")).status).toBe(403);
    expect((await getInBrowser(page, "orders/v3-order-pending")).status).toBe(403);
    expect((await getInBrowser(page, "cohorts/v3-cohort-open")).status).toBe(403);
    expect((await getInBrowser(page, "conversations/v3-chat-1")).status).toBe(403);
  });
});
