import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import type { Pool } from 'pg';
import type { AppDb } from './db/factory';
import { createDatabaseClient } from './db/factory';
import { getDbContext } from './db/context';

// Load .env before anything – override: true ensures .env values win over empty system env vars
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env'), override: true });
dotenv.config({ path: path.resolve(process.cwd(), '.env'), override: true });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

let defaultPool: Pool | null = null;
let defaultDb: AppDb | null = null;

function getDefaultDb(): AppDb {
  if (defaultDb) return defaultDb;
  const created = createDatabaseClient(connectionString);
  defaultPool = created.pool;
  defaultDb = created.db;
  return defaultDb;
}

export function resolveDb(): AppDb {
  return getDbContext()?.db ?? getDefaultDb();
}

export async function closeDefaultDbPool(): Promise<void> {
  if (!defaultPool) return;
  await defaultPool.end();
  defaultPool = null;
  defaultDb = null;
}

// Stable backward-compatible entry point. Existing `import { db } from './db'`
// sites continue to work, while tests can inject a request-scoped DB context.
export const db = new Proxy({} as AppDb, {
  get(_target, prop, receiver) {
    return Reflect.get(resolveDb() as object, prop, receiver);
  },
});
