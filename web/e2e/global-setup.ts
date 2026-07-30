/**
 * Playwright global setup — seeds E2E test data into a fresh STDB instance.
 *
 * Checks if seed data already exists; if not, creates:
 *   - Admin user (admin@spacetimewiki.local / admin123)
 *   - "Uncategorized" default collection
 *   - Sample published and draft pages
 *
 * Environment variables:
 *   STDB_HOST      — default: localhost:3001
 *   STDB_DATABASE  — default: spacetime-wiki (URL-safe name, see docker-compose)
 *   STDB_DB        — alias for STDB_DATABASE (legacy)
 *
 * The database name MUST be URL-safe — STDB 2.x rejects underscores in paths.
 * Both docker-compose and this fixture default to "spacetime-wiki".
 *
 * IMPORTANT: In CI mode, seeding is deferred to webServer (setup-e2e-deps.sh)
 * because this globalSetup runs before webServer processes start. The
 * setup-e2e-deps.sh script calls seed-e2e-data.py after the module has been
 * published and the API server is healthy.
 */

import type { FullConfig } from '@playwright/test';

const STDB_HOST = process.env.STDB_HOST || 'localhost:3001';
const DB_NAME = process.env.STDB_DATABASE || process.env.STDB_DB || 'spacetime-wiki';

function genId(prefix: string): string {
  const ts = Date.now();
  const rand = ((ts * 1103515245 + 12345) >>> 0).toString(16);
  return `${prefix}_${rand}`;
}

async function callReducer(reducer: string, args: unknown[]): Promise<void> {
  const url = `http://${STDB_HOST}/v1/database/${DB_NAME}/call/${reducer}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Reducer '${reducer}' failed (${response.status}): ${text}`);
  }
}

async function sqlExists(sql: string): Promise<boolean> {
  const url = `http://${STDB_HOST}/v1/database/${DB_NAME}/sql`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: sql,
  });
  if (!response.ok) return false;
  const data = (await response.json()) as Array<{ rows?: unknown[][] }>;
  const rows = data[0]?.rows || [];
  return rows.length > 0;
}

async function stdbHealthCheck(): Promise<boolean> {
  try {
    // STDB 2.6+ uses /v1/health; fall back to /health for older versions
    const res = await fetch(`http://${STDB_HOST}/v1/health`, { signal: AbortSignal.timeout(3000) });
    if (res.ok) return true;
    const resLegacy = await fetch(`http://${STDB_HOST}/health`, {
      signal: AbortSignal.timeout(2000),
    });
    return resLegacy.ok;
  } catch {
    return false;
  }
}

async function globalSetup(_config: FullConfig): Promise<void> {
  // In CI, the webServer (setup-e2e-deps.sh) handles seeding after module
  // publish + API server start — short-circuit here to avoid racing with
  // startup (globalSetup runs before webServer processes).
  if (process.env.CI) {
    console.log('[e2e-setup] CI mode: seeding deferred to webServer (setup-e2e-deps.sh).');
    return;
  }

  // ── Wait for STDB to be ready (up to 30s) ───────────────────────────────
  console.log(`[e2e-setup] Connecting to STDB at ${STDB_HOST} (db: ${DB_NAME})...`);
  for (let attempt = 1; attempt <= 10; attempt++) {
    if (await stdbHealthCheck()) break;
    if (attempt === 10) {
      console.log(`[e2e-setup] WARN: STDB not reachable at ${STDB_HOST} — seed data not created.`);
      return;
    }
    await new Promise((r) => setTimeout(r, 3000));
  }

  // ── Check if seed data already exists ───────────────────────────────────
  const adminExists = await sqlExists(
    `SELECT id FROM "user" WHERE email = 'admin@spacetimewiki.local'`,
  );
  if (adminExists) {
    console.log('[e2e-setup] Seed data already exists, skipping.');
    return;
  }

  console.log('[e2e-setup] Seeding E2E test data...');

  // ── 1. Create admin user ────────────────────────────────────────────────
  const adminId = genId('user');
  await callReducer('register_user', [
    adminId,
    'Admin',
    'admin@spacetimewiki.local',
    'admin123',
    'admin',
  ]);
  console.log(`[e2e-setup] Admin user created: ${adminId}`);

  // ── 2. Create Uncategorized collection ──────────────────────────────────
  const collId = genId('col');
  await callReducer('create_collection', [
    collId,
    'Uncategorized',
    'Default collection for uncategorized pages',
    '',
    '\ud83d\udcc4',
    '#808080',
    adminId,
  ]);
  console.log(`[e2e-setup] Collection created: ${collId}`);

  // ── 3. Create sample pages (published + draft) ──────────────────────────
  const page1Id = genId('page');
  await callReducer('create_page', [
    page1Id,
    'Welcome to SpacetimeWiki',
    JSON.stringify({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Welcome to SpacetimeWiki \u2014 a collaborative wiki powered by SpacetimeDB.',
            },
          ],
        },
      ],
    }),
    collId,
    '',
    adminId,
  ]);
  await callReducer('set_page_status', [page1Id, 'published']);
  console.log(`[e2e-setup] Published page created: ${page1Id}`);

  const page2Id = genId('page');
  await callReducer('create_page', [
    page2Id,
    'Draft Page Example',
    JSON.stringify({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'This is a draft page for E2E testing.' }],
        },
      ],
    }),
    collId,
    '',
    adminId,
  ]);
  console.log(`[e2e-setup] Draft page created: ${page2Id}`);

  const page3Id = genId('page');
  await callReducer('create_page', [
    page3Id,
    'Getting Started Guide',
    JSON.stringify({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'This guide helps you get started with SpacetimeWiki.',
            },
          ],
        },
      ],
    }),
    collId,
    '',
    adminId,
  ]);
  await callReducer('set_page_status', [page3Id, 'published']);
  console.log(`[e2e-setup] Published page created: ${page3Id}`);

  console.log('[e2e-setup] Seed data created successfully.');
}

export default globalSetup;
