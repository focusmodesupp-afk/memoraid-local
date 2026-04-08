/**
 * Vitest globalSetup — runs ONCE before all integration tests.
 *
 * 1. Safety guard: refuse to run against cloud databases
 * 2. Create the memoraid_test database (drop first if exists)
 * 3. Apply schema snapshot (pg_dump of production public schema)
 * 4. Apply additional schema patches from ensure-schema.ts
 */

import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_DB = 'memoraid_test';
const PG_USER = 'postgres';
const PG_PASS = 'postgres';
const PG_HOST = 'localhost';
const PG_PORT = 5432;
const TEST_URL = `postgresql://${PG_USER}:${PG_PASS}@${PG_HOST}:${PG_PORT}/${TEST_DB}`;
const ADMIN_URL = `postgresql://${PG_USER}:${PG_PASS}@${PG_HOST}:${PG_PORT}/postgres`;

// Cloud guard — refuse to run against production/cloud databases
const BLOCKED_HOSTS = ['neon.tech', 'supabase.co', 'render.com', 'amazonaws.com', 'azure.com'];

function guardAgainstCloud(url: string) {
  for (const host of BLOCKED_HOSTS) {
    if (url.includes(host)) {
      throw new Error(
        `SAFETY: Refusing to run integration tests against cloud database (${host}). ` +
        `Tests must use a local PostgreSQL instance.`
      );
    }
  }
}

export async function setup() {
  guardAgainstCloud(TEST_URL);

  // Step 1: Connect to default 'postgres' database to manage test DB lifecycle
  const adminPool = new Pool({ connectionString: ADMIN_URL });
  try {
    // Terminate existing connections to test DB
    await adminPool.query(`
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = '${TEST_DB}' AND pid <> pg_backend_pid()
    `).catch(() => {});

    // Drop + recreate for a clean slate
    await adminPool.query(`DROP DATABASE IF EXISTS ${TEST_DB}`);
    await adminPool.query(`CREATE DATABASE ${TEST_DB}`);
    console.log(`[integration-setup] Created database: ${TEST_DB}`);
  } finally {
    await adminPool.end();
  }

  // Step 2: Apply schema snapshot (pg_dump of production public schema)
  const testPool = new Pool({ connectionString: TEST_URL, ssl: false });
  try {
    const snapshotPath = path.join(__dirname, 'schema-snapshot.sql');
    const snapshotSql = fs.readFileSync(snapshotPath, 'utf-8');

    // pg_dump output uses semicolons to delimit statements
    // Run the entire file as a single transaction for atomicity
    await testPool.query(snapshotSql);
    // Restore search_path (pg_dump sets it to empty)
    await testPool.query(`SET search_path TO public`);
    console.log('[integration-setup] Schema snapshot applied');

    // Step 3: Run additional schema patches (future DDL not yet in snapshot)
    const testDb = drizzle(testPool);
    const { applySchemaPatches } = await import('../../src/migrations/ensure-schema');
    await applySchemaPatches(testDb as any);
    console.log('[integration-setup] Schema patches applied');
  } finally {
    await testPool.end();
  }

  // Store the test URL in process env for child processes
  process.env.DATABASE_URL = TEST_URL;
}

export async function teardown() {
  const adminPool = new Pool({ connectionString: ADMIN_URL });
  try {
    await adminPool.query(`
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = '${TEST_DB}' AND pid <> pg_backend_pid()
    `).catch(() => {});

    await adminPool.query(`DROP DATABASE IF EXISTS ${TEST_DB}`);
    console.log(`[integration-teardown] Dropped database: ${TEST_DB}`);
  } finally {
    await adminPool.end();
  }
}
