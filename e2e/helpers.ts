import { type Page, expect } from "@playwright/test";

/** Log in as admin. Call at the start of the test suite. */
export async function adminLogin(page: Page) {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) throw new Error("ADMIN_PASSWORD env var required");

  await page.goto("/login");
  await page.waitForSelector('input[id="username"]');

  await page.fill('input[id="username"]', process.env.ADMIN_USERNAME || "admin");
  await page.fill('input[id="password"]', password);
  await page.click('button[type="submit"]');

  // Wait for redirect to dashboard
  await page.waitForURL("**/dashboard", { timeout: 10_000 });
  await expect(page.locator("h1")).toContainText("Welcome back");
}

/** Navigate to a sidebar section. */
export async function navigateTo(page: Page, label: string) {
  await page.click(`nav >> text="${label}"`);
  // Small wait for route transition
  await page.waitForTimeout(500);
}

/**
 * Pick a date in the nth DateTimePicker on screen. The picker is a popover with
 * a day grid, not a native input — clicking a day and confirming is the only way
 * to set it.
 */
export async function pickDateTime(page: Page, index = 0, day = 15) {
  await page.locator('button:has-text("Pick date & time")').nth(index).click();
  const popover = page.locator('div.absolute:has-text("Time")').first();
  await popover.getByRole("button", { name: String(day), exact: true }).click();
  await popover.getByRole("button", { name: "Done" }).click();
}

/** Switch to a tab inside a tabbed form (event form, About content, …). */
export async function openTab(page: Page, name: string) {
  await page.getByRole("tab", { name }).click();
}

/** Wait for a toast message to appear. */
export async function expectToast(page: Page, text: string) {
  const toast = page.locator(`[data-sonner-toast] >> text="${text}"`).first();
  await expect(toast).toBeVisible({ timeout: 5_000 });
}

/** Click the row action menu for a specific row, then click a menu item. */
export async function clickRowAction(page: Page, rowText: string, action: string) {
  const row = page.locator("tr", { hasText: rowText }).first();
  await row.locator("button >> svg").last().click(); // the ⋯ menu trigger
  await page.click(`[role="menuitem"] >> text="${action}"`);
}

/** Confirm a destructive dialog. */
export async function confirmDialog(page: Page, buttonLabel = "Delete") {
  const dialog = page.locator('[role="dialog"]');
  await expect(dialog).toBeVisible();
  await dialog.locator(`button >> text="${buttonLabel}"`).click();
  await expect(dialog).not.toBeVisible({ timeout: 5_000 });
}
