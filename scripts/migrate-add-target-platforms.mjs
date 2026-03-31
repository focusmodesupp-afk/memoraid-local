/**
 * Migration: add target_platforms column to nexus_briefs
 */
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

try {
  await pool.query(`
    ALTER TABLE nexus_briefs
    ADD COLUMN IF NOT EXISTS target_platforms TEXT[] NOT NULL DEFAULT '{}';
  `);
  console.log('✅ target_platforms column added to nexus_briefs');
} catch (err) {
  console.error('Migration failed:', err.message);
  process.exit(1);
} finally {
  await pool.end();
}
