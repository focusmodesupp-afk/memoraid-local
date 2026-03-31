#!/usr/bin/env node
/**
 * מוסיף עמודות חסרות לטבלת admin_ai_analyses
 * פותר: column "attached_file_ids" of relation "admin_ai_analyses" does not exist
 * Usage: node scripts/fix-ai-analyses-schema.mjs
 */
import 'dotenv/config';
import pg from 'pg';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL חסר ב-.env');
  process.exit(1);
}

const useSsl = !url.includes('localhost') && !url.includes('127.0.0.1');
const pool = new pg.Pool({
  connectionString: url,
  ssl: useSsl ? { rejectUnauthorized: true } : false,
  prepare: false, // Required for Supabase pooler
});

async function run() {
  console.log('מעדכן סכמת admin_ai_analyses...');
  try {
    await pool.query(`
      ALTER TABLE "admin_ai_analyses"
        ADD COLUMN IF NOT EXISTS "attached_file_ids" uuid[] DEFAULT '{}',
        ADD COLUMN IF NOT EXISTS "admin_full_name" varchar(255),
        ADD COLUMN IF NOT EXISTS "analysis_metadata" jsonb DEFAULT '{}',
        ADD COLUMN IF NOT EXISTS "output_quality" integer,
        ADD COLUMN IF NOT EXISTS "dev_quality" integer,
        ADD COLUMN IF NOT EXISTS "process_speed" varchar(16),
        ADD COLUMN IF NOT EXISTS "rated_at" timestamp with time zone,
        ADD COLUMN IF NOT EXISTS "rated_by" uuid REFERENCES admin_users(id) ON DELETE SET NULL
    `);
    console.log('✅ העמודות נוספו בהצלחה');
  } catch (err) {
    console.error('❌ שגיאה:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
