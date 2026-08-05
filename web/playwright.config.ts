import { defineConfig, devices } from '@playwright/test';

// Allow E2E runs to use isolated DB + ports so parallel runs (e.g. local dev
// vs the CI self-hosted runner) never collide on the shared spacetime-wiki-e2e
// DB or the 8711/5184 ports. CI keeps the defaults.
const API_PORT = process.env.API_PORT || '8711';
const WEB_PORT = process.env.WEB_PORT || '5184';
const STDB_DB = process.env.STDB_DATABASE || process.env.STDB_DB || 'spacetime-wiki-e2e';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // Two-layer retry strategy for STDB timing flakiness:
  //   Layer 1 — actionRetries: retries individual actions (click, fill, etc.)
  //     before test-level retry. Handles transient timing issues cheaply.
  //   Layer 2 — retries: retries the entire test if action retries exhausted.
  actionRetries: 1,
  retries: process.env.CI ? 3 : 1,
  workers: process.env.CI ? 2 : 1,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  globalSetup: './e2e/global-setup.ts',
  timeout: 90000,
  expect: {
    timeout: 20000,
  },
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  // In CI (self-hosted runner):
  //   - STDB must be running natively (port 3001) — it's NOT managed here
  //   - API server is started via web/scripts/setup-e2e-deps.sh
  //     which publishes the module, starts uvicorn, and self-cleans on exit
  //   - The frontend Vite preview is managed here as another webServer
  // For local dev, start these manually:
  //   docker compose up -d spacetimedb api-server
  //   npx vite --port 5184
  // To run with an isolated DB/ports (avoid CI collision): set
  //   STDB_DATABASE, API_PORT, WEB_PORT env before `npx playwright test`.
  webServer: process.env.CI
    ? [
        // API deps: publishes module to native STDB → starts API server → waits for health
        {
          command: `API_PORT=${API_PORT} STDB_DATABASE=${STDB_DB} bash scripts/setup-e2e-deps.sh`,
          port: Number(API_PORT),
          // Cold module build (wasm-opt) + seed can exceed 3 min on the first
          // run after a module change — allow 5 min.
          timeout: 300000,
          reuseExistingServer: false,
        },
        // Frontend: builds + serves Vite preview
        {
          command: `VITE_STDB_HOST=${process.env.VITE_STDB_HOST || 'localhost:3001'} VITE_STDB_DB=${STDB_DB} VITE_API_BASE=${process.env.VITE_API_BASE || `http://localhost:${API_PORT}`} npm run build && npx vite preview --port ${WEB_PORT} --strictPort`,
          port: Number(WEB_PORT),
          timeout: 180000,
          reuseExistingServer: false,
        },
      ]
    : undefined,
});
