/**
 * Creates admin_ai_analyses table for AI analysis archive.
 * Run: node scripts/create-admin-ai-analyses.mjs
 */
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in .env');
  process.exit(1);
}

const useSsl = !DATABASE_URL.includes('localhost') && !DATABASE_URL.includes('127.0.0.1');
const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  ssl: useSsl ? { rejectUnauthorized: true } : false,
  prepare: false, // Required for Supabase pooler
});

const SQL = `
CREATE TABLE IF NOT EXISTS "admin_ai_analyses" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "type" varchar(32) NOT NULL,
  "query" text,
  "report" text NOT NULL,
  "depth" varchar(16),
  "scope" varchar(16),
  "model" varchar(64),
  "tokens_used" integer DEFAULT 0,
  "cost_usd" varchar(24) DEFAULT '0',
  "admin_user_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "admin_ai_analyses_type_idx" ON "admin_ai_analyses"("type");
CREATE INDEX IF NOT EXISTS "admin_ai_analyses_admin_user_idx" ON "admin_ai_analyses"("admin_user_id");
CREATE INDEX IF NOT EXISTS "admin_ai_analyses_created_at_idx" ON "admin_ai_analyses"("created_at");
`;

const ALTER_SQL = `
ALTER TABLE "admin_ai_analyses"
  ADD COLUMN IF NOT EXISTS "attached_file_ids" uuid[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "admin_full_name" varchar(255),
  ADD COLUMN IF NOT EXISTS "analysis_metadata" jsonb DEFAULT '{}';
`;

async function run() {
  console.log('🚀 Creating admin_ai_analyses table...');
  try {
    await pool.query(SQL);
    await pool.query(ALTER_SQL);
    console.log('✅ Table admin_ai_analyses created successfully!');
  } catch (err) {
    console.error('❌ Failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
