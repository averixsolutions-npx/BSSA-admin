import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,        // tests run in sequence (they share state: login → create → verify)
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,                  // single worker — sequential execution
  reporter: process.env.CI ? "github" : "list",
  timeout: 30_000,             // 30s per test

  use: {
    baseURL: process.env.ADMIN_URL || "http://localhost:3001",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  // Start the dev server automatically if not running
  webServer: process.env.CI
    ? undefined
    : {
        command: "npm run dev",
        port: 3001,
        reuseExistingServer: true,
        timeout: 30_000,
      },
});
