#!/usr/bin/env node
/**
 * בודק אם יש נתונים בטבלת ארכיון ה-AI
 * Usage: node scripts/check-ai-archive.mjs
 */
import 'dotenv/config';
import pg from 'pg';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL חסר ב-.env');
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: url,
  ssl: !url.includes('localhost') && !url.includes('127.0.0.1') ? { rejectUnauthorized: true } : false,
});

async function run() {
  try {
    const r = await pool.query(`
      SELECT id, type, LEFT(query, 80) as query_preview, LEFT(report, 80) as report_preview, created_at
      FROM admin_ai_analyses
      ORDER BY created_at DESC
      LIMIT 20
    `);
    if (r.rows.length === 0) {
      console.log('אין רשומות בטבלת admin_ai_analyses.');
      console.log('');
      console.log('אם היו ניתוחים בעבר – כנראה שהיו במסד נתונים אחר (לפני המעבר ל-Supabase).');
      console.log('לשחזור צריך גיבוי או גישה למסד הישן.');
      process.exit(0);
    }
    console.log(`נמצאו ${r.rows.length} ניתוחים בארכיון:`);
    r.rows.forEach((row, i) => {
      console.log(`  ${i + 1}. ${row.type} | ${row.created_at} | ${(row.query_preview || '').slice(0, 50)}...`);
    });
  } catch (err) {
    if (err.code === '42P01') {
      console.log('הטבלה admin_ai_analyses לא קיימת. הרץ: npm run create:ai-tables');
    } else {
      console.error('שגיאה:', err.message);
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
