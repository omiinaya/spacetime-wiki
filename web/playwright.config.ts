import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // Two-layer retry strategy for STDB timing flakiness:
  //   Layer 1 — actionRetries: retries individual actions (click, fill, etc.)
  //     before test-level retry. Handles transient timing issues cheaply.
  //   Layer 2 — retries: retries the entire test if action retries exhausted.
  actionRetries: 1,
  retries: process.env.CI ? 3 : 1,
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
  // In CI:
  //   - STDB (port 3001) and API server (port 8711) are started via webServer
  //     using web/scripts/start-e2e-deps.sh (publishes module, starts uvicorn,
  //     self-cleans on test completion via SIGTERM trap)
  //   - The frontend Vite preview (port 5184) is managed here as another webServer
  // For local dev, start these manually:
  //   docker compose up -d spacetimedb api-server
  //   npx vite --port 5184
  webServer: process.env.CI
    ? [
        // API deps: checks STDB → publishes module → starts API server → waits for health
        {
          command: "bash scripts/start-e2e-deps.sh",
          port: 8711,
          timeout: 120000,
          reuseExistingServer: false,
        },
        // Frontend: builds + serves Vite preview
        {
          command:
            "VITE_STDB_HOST=${VITE_STDB_HOST:-localhost:3001} VITE_STDB_DB=${VITE_STDB_DB:-spacetime-wiki} VITE_API_BASE=${VITE_API_BASE:-http://localhost:8711} npm run build && npx vite preview --port 5184 --strictPort",
          port: 5184,
          timeout: 120000,
          reuseExistingServer: false,
        },
      ]
    : undefined,
});
