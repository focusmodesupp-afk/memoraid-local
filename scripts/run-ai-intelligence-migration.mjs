#!/usr/bin/env node
/**
 * Run AI Intelligence Hub migration (0026).
 * Creates ai_model_benchmarks, ai_insights, ai_usage_daily_summary, adds columns to ai_usage and admin_ai_analyses.
 * Usage: node scripts/run-ai-intelligence-migration.mjs
 */
import 'dotenv/config';
import pg from 'pg';
import fs from 'fs';
import path from 'path';

const { Client } = pg;

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL not set. Add it to .env');
    process.exit(1);
  }

  const migrationPath = path.resolve(process.cwd(), 'server/db/migrations/0026_ai_intelligence_hub.sql');
  const sql = fs.readFileSync(migrationPath, 'utf-8');

  const client = new Client({ connectionString: url });
  try {
    await client.connect();
    await client.query(sql);
    console.log('✅ AI Intelligence Hub migration (0026) completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
