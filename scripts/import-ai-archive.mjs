#!/usr/bin/env node
/**
 * מייבא ניתוחי AI מקובץ JSON לארכיון
 * אם יש לך גיבוי/ייצוא מהמסד הישן – שמור כ-ai-archive-backup.json והרץ:
 *   node scripts/import-ai-archive.mjs ai-archive-backup.json
 *
 * פורמט הקובץ: מערך של אובייקטים עם: type, query, report, depth?, scope?, model?, tokensUsed?, costUsd?, createdAt?
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

const filePath = process.argv[2];
if (!filePath) {
  console.error('שימוש: npm run ai:archive:import -- <path-to-backup.json>');
  console.error('דוגמה: npm run ai:archive:import -- ai-backup.json');
  process.exit(1);
}
const resolvedPath = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
if (!fs.existsSync(resolvedPath)) {
  console.error('הקובץ לא נמצא:', resolvedPath);
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: url,
  ssl: !url.includes('localhost') && !url.includes('127.0.0.1') ? { rejectUnauthorized: true } : false,
});

async function run() {
  const raw = fs.readFileSync(resolvedPath, 'utf8');
  let items;
  try {
    items = JSON.parse(raw);
  } catch (e) {
    console.error('קובץ JSON לא תקין:', e.message);
    process.exit(1);
  }
  // Accept backup format { data: { admin_ai_analyses: [...] } } or plain array
  if (!Array.isArray(items)) {
    if (items?.data?.admin_ai_analyses && Array.isArray(items.data.admin_ai_analyses)) {
      items = items.data.admin_ai_analyses;
    } else {
      console.error('הקובץ צריך להכיל מערך או אובייקט עם data.admin_ai_analyses');
      process.exit(1);
    }
  }

  let imported = 0;
  for (const item of items) {
    const type = item.type || 'project_analysis';
    const query = item.query ?? null;
    const report = item.report ?? '';
    const depth = item.depth ?? null;
    const scope = item.scope ?? null;
    const model = item.model ?? null;
    const tokensUsed = item.tokensUsed ?? item.tokens_used ?? 0;
    const costUsd = item.costUsd ?? item.cost_usd ?? '0';

    try {
      await pool.query(
        `INSERT INTO admin_ai_analyses (type, query, report, depth, scope, model, tokens_used, cost_usd)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [type, query, report, depth, scope, model, tokensUsed, costUsd]
      );
      imported++;
      console.log(`  יובא: ${type} – ${(query || report || '').slice(0, 50)}...`);
    } catch (e) {
      console.error('  שגיאה בייבוא רשומה:', e.message);
    }
  }

  console.log(`\n✅ יובאו ${imported} מתוך ${items.length} רשומות.`);
  await pool.end();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
