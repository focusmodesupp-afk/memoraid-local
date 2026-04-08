/**
 * Legacy integration harness.
 *
 * This file remains the Vitest setup hook while the DB hardening refactor is
 * being proven. Its responsibilities are now narrowed to:
 *   - transaction lifecycle bound to a single test DB connection
 *   - savepoint isolation between tests
 *   - app creation through the real app factory with injected DB context
 *
 * Database creation / schema bootstrap / teardown are handled by
 * global-setup.ts + server/src/db/bootstrap.ts.
 */

import { Pool, type PoolClient } from 'pg';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../../shared/schemas/schema';
import { createApp } from '../../src/createApp';

let pool: Pool | null = null;
let client: PoolClient | null = null;
let testDb: NodePgDatabase<typeof schema> | null = null;
let savepointCounter = 0;
let currentSavepointName: string | null = null;

export function getTestDb(): NodePgDatabase<typeof schema> {
  if (!testDb) {
    throw new Error('Test DB not initialized. The integration harness did not finish bootstrapping.');
  }
  return testDb;
}

beforeAll(async () => {
  const url = process.env.MEMORAID_TEST_DB_URL ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error('Integration test DATABASE_URL is not set');
  }

  pool = new Pool({ connectionString: url, ssl: false });
  client = await pool.connect();
  testDb = drizzle(client, { schema });
  await client.query('BEGIN');
});

beforeEach(async () => {
  if (!client) {
    throw new Error('Integration harness client is not initialized');
  }

  savepointCounter += 1;
  currentSavepointName = `test_sp_${savepointCounter}`;
  await client.query(`SAVEPOINT ${currentSavepointName}`);
});

afterEach(async () => {
  if (!client || !currentSavepointName) {
    throw new Error('Integration harness savepoint cleanup ran without an active savepoint');
  }

  await client.query(`ROLLBACK TO SAVEPOINT ${currentSavepointName}`);
  currentSavepointName = null;
});

afterAll(async () => {
  currentSavepointName = null;

  if (client) {
    await client.query('ROLLBACK').catch(() => {});
    client.release();
    client = null;
  }

  if (pool) {
    await pool.end();
    pool = null;
  }

  testDb = null;
});

export async function createTestApp() {
  return createApp({
    dbContext: { db: getTestDb() },
    serveClient: false,
  });
}
