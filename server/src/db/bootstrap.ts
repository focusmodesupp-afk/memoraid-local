import fs from 'fs/promises';
import path from 'path';
import { Pool } from 'pg';
import { sql } from 'drizzle-orm';
import { createDatabaseClient } from './factory';
import { seedMinimalTestData } from '../migrations/ensure-schema';

const LOCAL_TEST_GUARD = 'MEMORAID_ALLOW_TEST_DB_BOOTSTRAP';
const DEFAULT_ADMIN_DB = 'postgres';
const VALID_LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);
const LEGACY_MIGRATION_ALLOWLIST = [
  {
    file: '0040_performance_indexes.sql',
    code: '42P01',
    messagePattern: /relation "professionals" does not exist/i,
    logLabel: 'Skipping known legacy index migration against professionals before table creation',
  },
  {
    file: '0041_nexus_task_context.sql',
    code: '42P01',
    messagePattern: /relation "nexus_extracted_tasks" does not exist/i,
    logLabel: 'Skipping known legacy Nexus context migration before nexus_extracted_tasks creation',
  },
];

export type LocalTestDatabaseTarget = {
  testDbUrl: string;
  adminDbUrl?: string;
};

function parsePostgresUrl(connectionString: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(connectionString);
  } catch {
    throw new Error(`Invalid PostgreSQL connection string: ${connectionString}`);
  }

  if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) {
    throw new Error(`Unsupported database protocol for integration bootstrap: ${parsed.protocol}`);
  }

  return parsed;
}

function quoteIdentifier(identifier: string): string {
  if (!/^[A-Za-z0-9_]+$/.test(identifier)) {
    throw new Error(`Unsafe database identifier: ${identifier}`);
  }

  return `"${identifier}"`;
}

function getDatabaseName(connectionUrl: URL): string {
  const dbName = connectionUrl.pathname.replace(/^\//, '');
  if (!dbName) {
    throw new Error(`Connection string is missing a database name: ${connectionUrl.toString()}`);
  }
  return dbName;
}

function assertSafeLocalHost(connectionUrl: URL, label: string) {
  if (!VALID_LOCAL_HOSTS.has(connectionUrl.hostname)) {
    throw new Error(`${label} must target localhost or 127.0.0.1. Refusing to use host ${connectionUrl.hostname}.`);
  }
}

export function assertSafeLocalTestDatabaseUrl(connectionString: string): string {
  const parsed = parsePostgresUrl(connectionString);
  assertSafeLocalHost(parsed, 'Integration test database');
  const dbName = getDatabaseName(parsed);

  if (!/_test$/i.test(dbName) && !/test/i.test(dbName)) {
    throw new Error(
      `Integration test database name must clearly identify itself as a test database. Refusing to use ${dbName}.`,
    );
  }

  return dbName;
}

export function buildAdminDatabaseUrl(testDbUrl: string): string {
  const parsed = parsePostgresUrl(testDbUrl);
  assertSafeLocalHost(parsed, 'Integration admin database');
  parsed.pathname = `/${DEFAULT_ADMIN_DB}`;
  parsed.search = '';
  parsed.hash = '';
  return parsed.toString();
}

function assertExplicitBootstrapGuard() {
  if (process.env[LOCAL_TEST_GUARD] !== '1') {
    throw new Error(
      `Refusing to bootstrap a test database without ${LOCAL_TEST_GUARD}=1. This guard prevents accidental destructive execution.`,
    );
  }
}

function isAllowedLegacyMigrationError(migrationFile: string, error: any) {
  return LEGACY_MIGRATION_ALLOWLIST.find((entry) => (
    entry.file === migrationFile &&
    error?.code === entry.code &&
    entry.messagePattern.test(String(error?.message ?? ''))
  ));
}

async function applyCanonicalSchema(connectionString: string): Promise<void> {
  const { pool, db } = createDatabaseClient(connectionString);
  try {
    const migrationsDir = path.resolve(process.cwd(), 'server/db/migrations');
    const migrationFiles = (await fs.readdir(migrationsDir))
      .filter((entry) => entry.endsWith('.sql'))
      .sort();

    for (const migrationFile of migrationFiles) {
      const migrationSql = await fs.readFile(path.join(migrationsDir, migrationFile), 'utf8');
      try {
        await pool.query(migrationSql);
      } catch (error: any) {
        const allowedLegacySkip = isAllowedLegacyMigrationError(migrationFile, error);
        if (!allowedLegacySkip) {
          throw error;
        }

        console.warn(
          `[integration-bootstrap] ${allowedLegacySkip.logLabel}: ${migrationFile} (${String(error?.message ?? '').split('\n')[0]})`,
        );
      }
    }

    await seedMinimalTestData(db as any);
  } finally {
    await pool.end();
  }
}

async function verifyCanonicalSchema(connectionString: string): Promise<void> {
  const { pool, db } = createDatabaseClient(connectionString);
  try {
    await db.execute(sql`SELECT 1 FROM admin_users LIMIT 1`);
    await db.execute(sql`SELECT 1 FROM nexus_briefs LIMIT 1`);
    await db.execute(sql`SELECT 1 FROM nexus_decision_reviews LIMIT 1`);
  } finally {
    await pool.end();
  }
}

export async function dropLocalTestDatabase(target: LocalTestDatabaseTarget): Promise<void> {
  assertExplicitBootstrapGuard();
  const testDbName = assertSafeLocalTestDatabaseUrl(target.testDbUrl);
  const adminDbUrl = target.adminDbUrl ?? buildAdminDatabaseUrl(target.testDbUrl);
  const adminParsed = parsePostgresUrl(adminDbUrl);
  assertSafeLocalHost(adminParsed, 'Integration admin database');

  const adminPool = new Pool({ connectionString: adminDbUrl, ssl: false });
  try {
    await adminPool.query(
      `
        SELECT pg_terminate_backend(pid)
        FROM pg_stat_activity
        WHERE datname = $1 AND pid <> pg_backend_pid()
      `,
      [testDbName],
    );
    await adminPool.query(`DROP DATABASE IF EXISTS ${quoteIdentifier(testDbName)}`);
  } finally {
    await adminPool.end();
  }
}

export async function bootstrapLocalTestDatabase(target: LocalTestDatabaseTarget): Promise<void> {
  assertExplicitBootstrapGuard();
  const testDbName = assertSafeLocalTestDatabaseUrl(target.testDbUrl);
  const adminDbUrl = target.adminDbUrl ?? buildAdminDatabaseUrl(target.testDbUrl);
  const adminParsed = parsePostgresUrl(adminDbUrl);
  assertSafeLocalHost(adminParsed, 'Integration admin database');
  const adminDbName = getDatabaseName(adminParsed);

  if (adminDbName !== DEFAULT_ADMIN_DB) {
    throw new Error(`Integration admin database must be ${DEFAULT_ADMIN_DB}. Refusing to use ${adminDbName}.`);
  }

  const adminPool = new Pool({ connectionString: adminDbUrl, ssl: false });
  try {
    await adminPool.query(
      `
        SELECT pg_terminate_backend(pid)
        FROM pg_stat_activity
        WHERE datname = $1 AND pid <> pg_backend_pid()
      `,
      [testDbName],
    );
    await adminPool.query(`DROP DATABASE IF EXISTS ${quoteIdentifier(testDbName)}`);
    await adminPool.query(`CREATE DATABASE ${quoteIdentifier(testDbName)}`);
  } finally {
    await adminPool.end();
  }

  await applyCanonicalSchema(target.testDbUrl);
  await verifyCanonicalSchema(target.testDbUrl);
}
