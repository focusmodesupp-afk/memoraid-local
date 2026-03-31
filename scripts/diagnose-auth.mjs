#!/usr/bin/env node
/**
 * אבחון בעיות התחברות – בודק DB, טבלאות, ומבצע התחברות בדיקה.
 * Usage: node scripts/diagnose-auth.mjs
 *   (השרת חייב לרוץ: npm run dev)
 */
import 'dotenv/config';
import pg from 'pg';

const BASE = process.env.API_BASE || 'http://localhost:3001';
const EMAIL = process.env.ADMIN_EMAIL || process.argv[2];
const PASSWORD = process.env.ADMIN_PASSWORD || process.argv[3];
if (!EMAIL || !PASSWORD) {
  console.error('❌ Credentials required: set ADMIN_EMAIL and ADMIN_PASSWORD, or pass as arguments.');
  console.error('   Usage: node scripts/diagnose-auth.mjs <email> <password>');
  process.exit(1);
}

async function api(path, opts = {}) {
  const url = path.startsWith('http') ? path : BASE + path;
  const res = await fetch(url, {
    method: opts.method || 'GET',
    headers: opts.headers || { 'Content-Type': 'application/json' },
    body: opts.body,
    redirect: 'manual',
  });
  let data = {};
  try {
    const text = await res.text();
    data = text ? JSON.parse(text) : {};
  } catch (_) {
    data = { raw: (await res.text()).slice(0, 200) };
  }
  return { ok: res.ok, status: res.status, data };
}

async function run() {
  console.log('MemorAid – אבחון התחברות\n');
  console.log('אימייל:', EMAIL);
  console.log('סיסמה:', PASSWORD.replace(/./g, '*'));
  console.log('API:', BASE, '\n');

  // 1. DB connection + tables
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.log('❌ DATABASE_URL חסר ב-.env');
    process.exit(1);
  }
  const useSsl = !url.includes('localhost') && !url.includes('127.0.0.1');
  const pool = new pg.Pool({
    connectionString: url,
    ssl: useSsl ? { rejectUnauthorized: true } : false,
  });
  try {
    await pool.query('SELECT 1');
    console.log('✓ חיבור למסד הנתונים');
  } catch (err) {
    console.log('❌ חיבור ל-DB נכשל:', err.message);
    process.exit(1);
  }

  const tables = ['users', 'sessions', 'families', 'admin_users', 'admin_sessions'];
  for (const t of tables) {
    const r = await pool.query(
      `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=$1)`,
      [t],
    );
    const exists = r.rows[0]?.exists;
    console.log(exists ? `✓ טבלה ${t}` : `❌ טבלה ${t} חסרה`);
    if (!exists && ['users', 'sessions'].includes(t)) {
      console.log('   → הרץ: npm run db:push');
    }
    if (!exists && ['admin_users', 'admin_sessions'].includes(t)) {
      console.log('   → הרץ: npm run seed:dev');
    }
  }
  await pool.end();
  console.log('');

  // 2. Server health
  try {
    const r = await api('/api/health');
    if (r.ok) console.log('✓ GET /api/health');
    else console.log('❌ GET /api/health', r.status, '- ודא שהשרת רץ (npm run dev)');
  } catch (e) {
    console.log('❌ שרת לא מגיב:', e.message);
    console.log('   → הרץ: npm run dev');
    process.exit(1);
  }

  const ar = await api('/api/admin/health');
  if (ar.ok) console.log('✓ GET /api/admin/health');
  else console.log('❌ GET /api/admin/health', ar.status);

  const tasksCheck = await api('/api/tasks');
  if (tasksCheck.status === 401) console.log('✓ GET /api/tasks (route exists, 401 = not logged in – expected)');
  else if (tasksCheck.status === 404) console.log('❌ GET /api/tasks → 404 (route not found – server may need restart)');
  else if (tasksCheck.ok) console.log('✓ GET /api/tasks – OK');
  else console.log('⚠ GET /api/tasks –', tasksCheck.status, tasksCheck.data?.error || '');
  console.log('');

  // 3. User login – with cookie capture to show real error
  console.log('--- התחברות משתמש (משתמשים רגילים) ---');
  const loginRes = await api('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: EMAIL, password: PASSWORD, rememberMe: false }),
  });
  if (loginRes.ok) {
    console.log('✓ POST /api/auth/login – התחברות הצליחה');
  } else {
    console.log('❌ POST /api/auth/login –', loginRes.status);
    const err = loginRes.data?.error || loginRes.data?.message || JSON.stringify(loginRes.data);
    console.log('   שגיאה:', err);
    if (loginRes.status === 401) {
      console.log('   → סיסמה שגויה, או משתמש לא קיים. הרץ: npm run seed:dev');
    }
    if (loginRes.status === 500) {
      console.log('   → שגיאת שרת. בדוק את הטרמינל של השרת לשגיאה מפורטת.');
    }
  }

  // 4. Admin login
  console.log('\n--- התחברות אדמין ---');
  const adminRes = await api('/api/admin/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (adminRes.ok) {
    console.log('✓ POST /api/admin/auth/login – אדמין התחבר');
  } else {
    console.log('❌ POST /api/admin/auth/login –', adminRes.status);
    const err = adminRes.data?.error || adminRes.data?.message || JSON.stringify(adminRes.data);
    console.log('   שגיאה:', err);
    if (adminRes.status === 401) {
      console.log('   → הרץ: node scripts/create-admin.mjs', EMAIL, '"YourPassword"');
    }
    if (adminRes.status === 500 && (err + '').includes('42P01')) {
      console.log('   → טבלאות אדמין חסרות. הרץ: npm run seed:dev');
    }
  }

  console.log('\n--- סיום אבחון ---');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
