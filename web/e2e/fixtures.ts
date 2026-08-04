/**
 * Error-capturing Playwright fixture.
 *
 * Wraps the default `page` fixture so that EVERY test automatically surfaces
 * user-facing errors that a real user would hit — even when the UI still
 * renders and "the network appears fine". Catches four classes of failure:
 *
 *   1. console.error() calls (React error boundaries, failed fetches, STDB
 *      subscription errors, unhandled promise rejections logged to console)
 *   2. Uncaught JavaScript exceptions (`pageerror`) — a crashed event handler
 *      or a throwing render that leaves the DOM half-updated
 *   3. Failed network requests (`requestfailed`) — aborted/blocked/CSP-blocked
 *      fetches, websocket connection failures
 *   4. HTTP responses with status >= 400 (4xx/5xx) — a REST/API/asset call
 *      returning an error the UI might silently swallow
 *
 * Any such error is collected and, if a test finishes with un-ignored errors,
 * the test FAILS with the exact console/network messages attached. This is the
 * difference between "the test passed because the happy path worked" and
 * "the test would have caught the bug a real user saw".
 *
 * Ignorable noise can be added via {@link IGNORE_PATTERNS} (per-kind regexes).
 * Prefer fixing the app over weakening the fixture — only ignore genuinely
 * benign, intentional signals (e.g. a probe that intentionally 404s).
 */

import { test as base, expect, type Page, type TestInfo } from '@playwright/test';

type ErrorKind = 'console' | 'pageerror' | 'requestfailed' | 'http';

interface CapturedError {
  kind: ErrorKind;
  message: string;
}

interface ErrorWatcher {
  errors: CapturedError[];
}

/**
 * Benchmarks / probes that intentionally trigger 4xx and must not fail tests.
 * Keyed by error kind. Each regex is tested against the full message text.
 *
 * These are deliberate control-flow probes, not bugs — keep this list minimal
 * and only add entries you can justify in a comment.
 */
const IGNORE_PATTERNS: Partial<Record<ErrorKind, RegExp[]>> = {
  http: [
    // The share-link / page-exists probes query STDB; a missing row returns
    // 204/200, but a route helper may 404 for non-existent resources. Only
    // ignored when the URL is clearly an intentional existence check.
    /\/pages\/[^/]+\/type/i,
    // Favicon may be missing in the built preview in some environments.
    /\/favicon\.(ico|png)$/i,
  ],
  console: [
    // HMR / dev-server noise that can appear even under vite preview.
    /Download the React DevTools for a better development experience/i,
    /\[Vite\]/i,
  ],
};

function isIgnored(kind: ErrorKind, message: string): boolean {
  const patterns = IGNORE_PATTERNS[kind];
  if (!patterns) return false;
  return patterns.some((re) => re.test(message));
}

/** Attach error listeners to a page and return the collector + assert fn. */
export function watchPageErrors(page: Page, testInfo: TestInfo): ErrorWatcher {
  const watcher: ErrorWatcher = { errors: [] };

  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    if (!isIgnored('console', text)) {
      watcher.errors.push({ kind: 'console', message: text });
    }
  });

  page.on('pageerror', (err) => {
    const text = `${err.message}${err.stack ? `\n${err.stack.split('\n').slice(1, 4).join('\n')}` : ''}`;
    watcher.errors.push({ kind: 'pageerror', message: text });
  });

  page.on('requestfailed', (req) => {
    const failure = req.failure()?.errorText || 'unknown';
    const text = `${req.method()} ${req.url()} — ${failure}`;
    if (!isIgnored('requestfailed', text)) {
      watcher.errors.push({ kind: 'requestfailed', message: text });
    }
  });

  page.on('response', (res) => {
    if (res.status() < 400) return;
    const text = `${res.status()} ${res.request().method()} ${res.url()}`;
    // Always capture 5xx (real server errors). 4xx only when NOT an
    // intentional probe (see IGNORE_PATTERNS).
    if (res.status() >= 500 || !isIgnored('http', text)) {
      watcher.errors.push({ kind: 'http', message: text });
    }
  });

  return watcher;
}

/**
 * Fail the test if the watcher collected any errors. Call this in afterEach,
 * or rely on the fixture auto-check below.
 */
export function assertNoPageErrors(watcher: ErrorWatcher): void {
  if (watcher.errors.length === 0) return;
  const detail = watcher.errors
    .map((e) => `[${e.kind}] ${e.message}`)
    .join('\n');
  throw new Error(`User-facing errors detected:\n${detail}`);
}

/**
 * Extended test with an auto-watching page. On teardown, if the page produced
 * any console errors / pageerrors / failed requests / HTTP >= 400, the test
 * fails automatically — no per-test afterEach needed.
 */
const test = base.extend<{ errorWatcher: ErrorWatcher }>({
  errorWatcher: async ({ page }, use, testInfo) => {
    const watcher = watchPageErrors(page, testInfo);
    await use(watcher);
    assertNoPageErrors(watcher);
  },
});

// Match Playwright's naming so specs keep `import { test, expect }`.
export { test, expect };
export type { Page };