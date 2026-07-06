import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 2 : 1,
  reporter: process.env.CI
    ? [["list"], ["html", { open: "never" }]]
    : [["list"]],
  globalSetup: "./e2e/global-setup.ts",
  timeout: 60000,
  expect: {
    timeout: 15000,
  },
  use: {
    baseURL: "http://localhost:5184",
    headless: true,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // In CI, the app is built and served via Vite preview.
  // For local dev, start Vite dev server manually:
  //   npx vite --port 5184
  // Or use the Makefile:
  //   make dev
  webServer: process.env.CI
    ? {
        command: "npm run build && npx vite preview --port 5184 --strictPort",
        port: 5184,
        timeout: 120000,
        reuseExistingServer: false,
      }
    : undefined,
});
