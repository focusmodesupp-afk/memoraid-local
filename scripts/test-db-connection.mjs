#!/usr/bin/env node
/**
 * בודק חיבור למסד הנתונים – מציג את השגיאה המדויקת אם יש
 * Usage: node scripts/test-db-connection.mjs
 */
import 'dotenv/config';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dotenv = await import('dotenv');
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('❌ DATABASE_URL חסר ב-.env');
  process.exit(1);
}

const useSsl = !url.includes('localhost') && !url.includes('127.0.0.1');
console.log('בודק חיבור ל-DB...');
console.log('  Host:', url.replace(/:[^:@]+@/, ':****@').split('@')[1]?.split('/')[0] || '(ממוסך)');
console.log('  SSL:', useSsl ? 'כן' : 'לא');

const pool = new pg.Pool({
  connectionString: url,
  ssl: useSsl ? { rejectUnauthorized: true } : false,
});

try {
  await pool.query('SELECT 1');
  console.log('\n✅ חיבור למסד הנתונים עובד!');
} catch (err) {
  console.error('\n❌ שגיאת חיבור:');
  console.error('  קוד:', err.code);
  console.error('  הודעה:', err.message);
  if (err.code === 'ECONNREFUSED') {
    console.error('\n  💡 PostgreSQL לא רץ, או ה-host/port שגויים.');
  }
  if (err.code === '28P01') {
    console.error('\n  💡 סיסמה או משתמש שגויים – בדוק DATABASE_URL.');
  }
  if (url.includes('supabase') && err.message?.includes('timeout')) {
    console.error('\n  💡 פרויקט Supabase עשוי להיות במצב רדום – הפעל מ-Dashboard.');
  }
  if (err.code === 'SELF_SIGNED_CERT_IN_CHAIN' || err.code === 'DEPTH_ZERO_SELF_SIGNED_CERT') {
    console.error('\n  💡 תעודת SSL עצמית-חתימה – אם זה שרת מקומי ודאי, הוסף DATABASE_URL עם localhost.');
  }
  process.exit(1);
} finally {
  await pool.end();
}
