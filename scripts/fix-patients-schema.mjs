#!/usr/bin/env node
/**
 * מוסיף עמודות חסרות לטבלת patients.
 * הרץ: node scripts/fix-patients-schema.mjs
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
});

const alters = [
  'ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "profile_completion_score" integer DEFAULT 0',
  'ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "onboarding_step" integer DEFAULT 1',
  'ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "insurance_number" text',
  'ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "blood_type" varchar(8)',
  'ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "mobility_status" varchar(32)',
  'ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "cognitive_status" varchar(32)',
  'ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "care_level" varchar(32)',
  'ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "last_assessment_date" date',
];

async function run() {
  console.log('MemorAId – תיקון סכמת patients\n');
  try {
    for (const sql of alters) {
      await pool.query(sql);
      const col = sql.match(/"([^"]+)"/)?.[1] ?? '?';
      console.log('  ✓', col);
    }
    console.log('\n✅ הושלם! נסה שוב ליצור פרופיל מטופל.');
  } catch (err) {
    console.error('\n❌ שגיאה:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
