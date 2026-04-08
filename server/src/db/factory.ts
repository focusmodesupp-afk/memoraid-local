import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool, type PoolConfig } from 'pg';
import * as schema from '../../../shared/schemas/schema';

export type AppDb = NodePgDatabase<typeof schema>;

export function buildPoolConfig(connectionString: string): PoolConfig {
  const isLocal =
    connectionString.includes('localhost') ||
    connectionString.includes('127.0.0.1');

  return {
    connectionString,
    ssl: isLocal ? false : { rejectUnauthorized: process.env.NODE_ENV === 'production' },
    prepare: false,
  };
}

export function createDatabaseClient(connectionString: string): { pool: Pool; db: AppDb } {
  const pool = new Pool(buildPoolConfig(connectionString));
  const db = drizzle(pool, { schema });
  return { pool, db };
}
