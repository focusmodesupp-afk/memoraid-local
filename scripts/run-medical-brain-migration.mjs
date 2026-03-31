#!/usr/bin/env node
/**
 * Run Medical Brain & Heart migration (0035).
 * Adds 9 new clinical tables + extends patients, tasks, medical_documents.
 * Usage: node scripts/run-medical-brain-migration.mjs
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

  const migrationPath = path.resolve(process.cwd(), 'server/db/migrations/0035_medical_brain.sql');
  if (!fs.existsSync(migrationPath)) {
    console.error('Migration file not found:', migrationPath);
    process.exit(1);
  }
  const sql = fs.readFileSync(migrationPath, 'utf-8');

  const client = new Client({ connectionString: url });
  try {
    await client.connect();
    console.log('Connected. Applying Medical Brain & Heart migration...');
    await client.query(sql);
    console.log('Migration 0035 completed successfully.');
    console.log('  New tables: vitals, lab_results, referrals, appointments,');
    console.log('              patient_diagnoses, patient_allergies, patient_assessments,');
    console.log('              patient_health_insights, sync_events');
    console.log('  Extended:   patients, tasks, medical_documents');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
