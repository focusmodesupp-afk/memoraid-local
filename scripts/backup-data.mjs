#!/usr/bin/env node
/**
 * גיבוי נתונים למסד הנתונים – שומר את הטבלאות העיקריות לקובץ JSON
 * Usage: node scripts/backup-data.mjs [output-file]
 * Default: backup-YYYY-MM-DD-HHmm.json
 */
import 'dotenv/config';
import pg from 'pg';
import fs from 'fs';
import path from 'path';

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

// Core identity & auth (no sensitive medical data – fast)
const TABLES_CORE = [
  'families',
  'users',
  'family_members',
  'family_invites',
  'sessions',
  'admin_users',
  'admin_sessions',
  'password_reset_tokens',
];

// Medical & clinical (potentially large – included in full backup)
const TABLES_MEDICAL = [
  'patients',
  'medications',
  'vitals',
  'lab_results',
  'referrals',
  'appointments',
  'patient_diagnoses',
  'patient_allergies',
  'patient_assessments',
  'patient_health_insights',
  'medical_documents',
  'memory_stories',
];

// Tasks & workflows
const TABLES_WORKFLOW = [
  'tasks',
  'task_checklists',
  'questionnaires',
  'questionnaire_responses',
  'professionals',
  'rights_requests',
  'notifications',
];

// Admin & system
const TABLES_ADMIN = [
  'admin_ai_analyses',
  'ai_usage',
  'ai_insights',
  'ai_usage_daily_summary',
  'audit_log',
  'error_logs',
  'feature_flags',
  'app_versions',
  'content_pages',
  'media_library',
];

// Dev / project management
const TABLES_DEV = [
  'dev_columns',
  'dev_tasks',
  'dev_phases',
  'sprints',
  'sprint_tasks',
];

// Determine which tables to backup based on --scope argument
// Usage: node scripts/backup-data.mjs [output-file] [--scope=core|medical|all]
const scopeArg = process.argv.find(a => a.startsWith('--scope='))?.split('=')[1] ?? 'all';

let TABLES;
if (scopeArg === 'core') {
  TABLES = TABLES_CORE;
} else if (scopeArg === 'medical') {
  TABLES = [...TABLES_CORE, ...TABLES_MEDICAL];
} else {
  // 'all' (default)
  TABLES = [...TABLES_CORE, ...TABLES_MEDICAL, ...TABLES_WORKFLOW, ...TABLES_ADMIN, ...TABLES_DEV];
}

async function run() {
  const outFileArg = process.argv.find(a => !a.startsWith('--') && a !== process.argv[0] && a !== process.argv[1]);
  const outFile = outFileArg || `backup-${scopeArg}-${new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-').replace(/-+/g, '-')}.json`;
  const outPath = path.resolve(process.cwd(), outFile);

  console.log(`גיבוי – scope: ${scopeArg} (${TABLES.length} טבלאות)`);
  const backup = { _meta: { exportedAt: new Date().toISOString(), scope: scopeArg, tables: TABLES }, data: {} };

  // All allowed table names – prevents accidental injection if TABLES is extended
  const ALL_ALLOWED = new Set([
    ...TABLES_CORE, ...TABLES_MEDICAL, ...TABLES_WORKFLOW, ...TABLES_ADMIN, ...TABLES_DEV,
  ]);

  for (const table of TABLES) {
    if (!ALL_ALLOWED.has(table)) {
      console.warn(`  ${table}: שם טבלה לא מורשה – דולג`);
      continue;
    }
    try {
      const r = await pool.query({ text: `SELECT * FROM "${table}"`, prepare: false });
      backup.data[table] = r.rows;
      console.log(`  ${table}: ${r.rows.length} רשומות`);
    } catch (err) {
      if (err.code === '42P01') {
        console.log(`  ${table}: הטבלה לא קיימת – דילגנו`);
        backup.data[table] = [];
      } else {
        console.error(`  ${table}: שגיאה –`, err.message);
        backup.data[table] = [];
      }
    }
  }

  fs.writeFileSync(outPath, JSON.stringify(backup, null, 2), 'utf8');
  console.log(`\n✅ גיבוי נשמר ב: ${outPath}`);
  await pool.end();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
