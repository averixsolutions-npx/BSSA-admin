import { test, expect } from "@playwright/test";
import {
  adminLogin,
  navigateTo,
  expectToast,
  clickRowAction,
  confirmDialog,
} from "./helpers";

// ─── All tests run sequentially in one browser context ──
// This mirrors a real admin session: login once, then do everything.

test.describe.serial("Admin Panel E2E", () => {
  test.beforeAll(async ({ browser }) => {
    // Verify the backend is reachable
    const context = await browser.newContext();
    const page = await context.newPage();
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
    const res = await page.request.get(`${apiUrl.replace("/api/v1", "")}/health`);
    expect(res.ok()).toBeTruthy();
    await context.close();
  });

  // ════════════════════════════════════════════════════
  // Phase 1 — Login
  // ════════════════════════════════════════════════════

  test("1.1 — Login page loads", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("text=BSSA Admin")).toBeVisible();
    await expect(page.locator('input[id="username"]')).toBeVisible();
    await expect(page.locator('input[id="password"]')).toBeVisible();
  });

  test("1.2 — Wrong password shows error", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[id="username"]', "admin");
    await page.fill('input[id="password"]', "wrong-password-123");
    await page.click('button[type="submit"]');
    await expectToast(page, "Invalid username or password");
  });

  test("1.3 — Correct password → dashboard", async ({ page }) => {
    await adminLogin(page);
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator("h1")).toContainText("Welcome back");
  });

  // ════════════════════════════════════════════════════
  // Phase 2 — News lifecycle
  // ════════════════════════════════════════════════════

  let newsTitle: string;

  test("2.1 — Navigate to News, see empty or populated list", async ({ page }) => {
    await adminLogin(page);
    await navigateTo(page, "News");
    await expect(page).toHaveURL(/\/news/);
    await expect(page.locator("table, text=No news articles yet")).toBeVisible();
  });

  test("2.2 — Create a news article", async ({ page }) => {
    await adminLogin(page);
    await navigateTo(page, "News");
    await page.click("text=New article");
    await expect(page).toHaveURL(/\/news\/new/);

    newsTitle = `E2E Test Article ${Date.now()}`;
    await page.fill('input[id="title"]', newsTitle);
    await page.fill('input[id="category"]', "E2E Testing");

    const editor = page.locator(".ProseMirror");
    await editor.click();
    await editor.fill("This is a test article body created by Playwright.");

    await page.click("text=Create draft");
    await expectToast(page, "Article created as draft");

    await expect(page).toHaveURL(/\/news\/[a-z0-9]/);
  });

  test("2.3 — Publish the article from list", async ({ page }) => {
    await adminLogin(page);
    await navigateTo(page, "News");
    await clickRowAction(page, newsTitle, "Publish");
    await expectToast(page, "Article published");
    const row = page.locator("tr", { hasText: newsTitle }).first();
    await expect(row.locator("text=Published")).toBeVisible();
  });

  test("2.4 — Unpublish and re-publish", async ({ page }) => {
    await adminLogin(page);
    await navigateTo(page, "News");
    await clickRowAction(page, newsTitle, "Unpublish");
    await expectToast(page, "Article unpublished");

    const row = page.locator("tr", { hasText: newsTitle }).first();
    await expect(row.locator("text=Draft")).toBeVisible();

    await clickRowAction(page, newsTitle, "Publish");
    await expectToast(page, "Article published");
  });

  test("2.5 — Delete the article", async ({ page }) => {
    await adminLogin(page);
    await navigateTo(page, "News");
    await clickRowAction(page, newsTitle, "Delete");
    await confirmDialog(page, "Delete");
    await expectToast(page, "Article deleted");
    await expect(page.locator(`tr >> text="${newsTitle}"`)).not.toBeVisible();
  });

  // ════════════════════════════════════════════════════
  // Phase 3 — Events + nested results
  // ════════════════════════════════════════════════════

  let eventTitle: string;

  test("3.1 — Create an event", async ({ page }) => {
    await adminLogin(page);
    await navigateTo(page, "Events");
    await page.click("text=New event");
    await expect(page).toHaveURL(/\/events\/new/);

    eventTitle = `E2E Championship ${Date.now()}`;
    await page.fill('input[name="title"]', eventTitle);
    await page.fill('input[name="venue"]', "Auli");
    await page.fill('input[name="startDate"]', "2025-02-01T09:00");
    await page.fill('input[name="endDate"]', "2025-02-05T18:00");

    await page.click("text=Create event");
    await expectToast(page, "Saved");
  });

  test("3.2 — Add results to the event", async ({ page }) => {
    await adminLogin(page);
    await navigateTo(page, "Events");

    await page.click(`text="${eventTitle}"`);
    await expect(page).toHaveURL(/\/events\/[a-z0-9]/);

    await page.click("text=Add result");

    await page.fill('input[placeholder="Rank"]', "1");
    await page.fill('input[placeholder*="Athlete"]', "Test Runner A");
    await page.fill('input[placeholder="State"]', "HP");
    await page.fill('input[placeholder*="Result"]', "01:23.45");
    await page.click("form >> text=Add");
    await expectToast(page, "Result added");

    await expect(page.locator("td >> text=Test Runner A")).toBeVisible();
  });

  test("3.3 — Delete the event", async ({ page }) => {
    await adminLogin(page);
    await navigateTo(page, "Events");
    await clickRowAction(page, eventTitle, "Delete");
    await confirmDialog(page, "Delete");
    await expectToast(page, "Deleted");
  });

  // ════════════════════════════════════════════════════
  // Phase 4 — About content editing
  // ════════════════════════════════════════════════════

  test("4.1 — Edit mission content", async ({ page }) => {
    await adminLogin(page);
    await navigateTo(page, "About content");
    await expect(page).toHaveURL(/\/about/);

    const editor = page.locator(".ProseMirror");
    await editor.click();
    await page.keyboard.press("Meta+a");
    await editor.fill("E2E test mission content.");

    await page.click("text=Save mission");
    await expectToast(page, "Saved");
  });

  test("4.2 — Switch tabs and verify persistence", async ({ page }) => {
    await adminLogin(page);
    await navigateTo(page, "About content");

    await page.click("button >> text=Vision");
    await page.click("button >> text=Mission");

    const editor = page.locator(".ProseMirror");
    await expect(editor).toContainText("mission");
  });

  // ════════════════════════════════════════════════════
  // Phase 5 — Hero slides
  // ════════════════════════════════════════════════════

  test("5.1 — Create a hero slide form renders", async ({ page }) => {
    await adminLogin(page);
    await navigateTo(page, "Hero slides");
    await page.click("text=New slide");
    await expect(page).toHaveURL(/\/hero\/new/);
    await expect(page.locator("text=Headline")).toBeVisible();
  });

  // ════════════════════════════════════════════════════
  // Phase 6 — Enquiry inbox (read-only)
  // ════════════════════════════════════════════════════

  test("6.1 — Enquiries page loads", async ({ page }) => {
    await adminLogin(page);
    await navigateTo(page, "Enquiries");
    await expect(page).toHaveURL(/\/enquiries/);
    await expect(page.locator("table, text=No enquiries yet")).toBeVisible();
  });

  // ════════════════════════════════════════════════════
  // Phase 7 — Newsletter export
  // ════════════════════════════════════════════════════

  test("7.1 — Newsletter page loads and export button exists", async ({ page }) => {
    await adminLogin(page);
    await navigateTo(page, "Newsletter");
    await expect(page).toHaveURL(/\/newsletter/);
    await expect(page.locator("text=Download CSV")).toBeVisible();
  });

  // ════════════════════════════════════════════════════
  // Phase 8 — Dashboard data
  // ════════════════════════════════════════════════════

  test("8.1 — Dashboard shows stat cards", async ({ page }) => {
    await adminLogin(page);
    await expect(page.locator("text=Published news")).toBeVisible();
    await expect(page.locator("text=Upcoming events")).toBeVisible();
    await expect(page.locator("text=Registered athletes")).toBeVisible();
    await expect(page.locator("text=Enquiries")).toBeVisible();
  });

  // ════════════════════════════════════════════════════
  // Phase 9 — Auth boundaries
  // ════════════════════════════════════════════════════

  test("9.1 — Unauthenticated user redirected to login", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });

  test("9.2 — Logout clears session", async ({ page }) => {
    await adminLogin(page);

    await page.click('[class*="rounded-full"]');
    await page.click("text=Log out");
    await expectToast(page, "Logged out");
    await expect(page).toHaveURL(/\/login/);

    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });

  // ════════════════════════════════════════════════════
  // Phase 10 — Sidebar navigation
  // ════════════════════════════════════════════════════

  test("10.1 — Every sidebar link resolves (no 404)", async ({ page }) => {
    await adminLogin(page);

    const sections = [
      "Dashboard", "Hero slides", "News", "Events", "Disciplines",
      "Programs", "Media", "Committee", "State associations",
      "About content", "Site stats", "Athletes", "Associations",
      "Enquiries", "Newsletter",
    ];

    for (const section of sections) {
      await navigateTo(page, section);
      const heading = page.locator("h1").first();
      const content = await heading.textContent().catch(() => null);
      expect(content, `${section} page should have an h1`).toBeTruthy();
    }
  });
});
