#!/usr/bin/env node
/**
 * Verify that at least one admin user exists in the database.
 * Run: node scripts/verify-admin-exists.mjs
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
    const res = await client.query(
      `SELECT id, email, role FROM admin_users WHERE is_active = true LIMIT 5`
    );
    if (res.rows.length === 0) {
      console.log('No admin users found. Run: npm run admin:create');
      process.exit(1);
    }
    console.log(`Found ${res.rows.length} admin user(s):`);
    res.rows.forEach((r) => console.log(`  - ${r.email} (${r.role})`));
    console.log('\nAdmin verification complete.');
  } catch (err) {
    if (err.code === '42P01') {
      console.error('admin_users table missing. Run: npm run db:push');
    } else {
      console.error('Verify failed:', err.message);
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

verify();
