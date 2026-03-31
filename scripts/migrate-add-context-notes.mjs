#!/usr/bin/env node
/**
 * Migration: add context_notes column to nexus_briefs
 * Safe to run multiple times (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).
 * Usage: node scripts/migrate-add-context-notes.mjs
 */
import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;
const url = process.env.DATABASE_URL;
if (!url) { console.error('DATABASE_URL required'); process.exit(1); }

const useSsl = !url.includes('localhost') && !url.includes('127.0.0.1');
const pool = new Pool({ connectionString: url, ssl: useSsl ? { rejectUnauthorized: false } : false });

async function run() {
  const client = await pool.connect();
  try {
    await client.query(`
      ALTER TABLE nexus_briefs
      ADD COLUMN IF NOT EXISTS context_notes TEXT
    `);
    console.log('✅ context_notes column added to nexus_briefs');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(() => process.exit(1));
