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
  // In CI, Playwright manages infrastructure via webServer:
  //   - Docker compose (STDB + API server) on port 3001
  //   - Vite preview (built SPA) on port 5184
  // For local dev, start these manually:
  //   docker compose up -d spacetimedb api-server
  //   npx vite --port 5184
  webServer: process.env.CI
    ? [
        {
          command: "bash scripts/start-e2e-deps.sh",
          port: 3001,
          timeout: 120000,
          reuseExistingServer: false,
        },
        {
          command: "npm run build && npx vite preview --port 5184 --strictPort",
          port: 5184,
          timeout: 120000,
          reuseExistingServer: false,
        },
      ]
    : undefined,
});
