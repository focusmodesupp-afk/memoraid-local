#!/usr/bin/env node
/**
 * Verify that dev_phases and ai_usage tables exist.
 * Run: node scripts/verify-db-tables.mjs
 */
import 'dotenv/config';
import pg from 'pg';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const useSsl = !url.includes('localhost') && !url.includes('127.0.0.1');
const client = new pg.Client({
  connectionString: url,
  ssl: useSsl ? { rejectUnauthorized: true } : false,
});

async function verify() {
  try {
    await client.connect();
    const tables = ['dev_phases', 'ai_usage', 'admin_users', 'sprints', 'dev_tasks'];
    for (const table of tables) {
      const res = await client.query(
        `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1)`,
        [table]
      );
      const exists = res.rows[0]?.exists ?? false;
      console.log(exists ? `  ✓ ${table}` : `  ✗ ${table} (missing)`);
    }
    console.log('\nDB verification complete.');
  } catch (err) {
    console.error('Verify failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

verify();
