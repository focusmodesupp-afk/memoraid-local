#!/usr/bin/env node
/**
 * בודק שכניסה למערכת משתמשים ו-Admin עובדת.
 * דורש: שרת רץ (npm run dev), ומשתמש admin קיים.
 *
 * Usage: node scripts/check-auth.mjs
 *   או:  ADMIN_EMAIL=x ADMIN_PASSWORD=y node scripts/check-auth.mjs
 */
import 'dotenv/config';

const BASE = process.env.API_BASE || 'http://localhost:3001';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'yoav@memoraid.co';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'MeMo@@2025@@';

async function api(path, opts = {}) {
  const url = path.startsWith('http') ? path : BASE + path;
  const res = await fetch(url, {
    method: opts.method || 'GET',
    headers: opts.headers || {},
    body: opts.body,
  });
  let data = {};
  try {
    data = await res.json();
  } catch (_) {}
  return { ok: res.ok, status: res.status, data };
}

async function run() {
  console.log('MemorAid – Auth Check\n');
  let failed = 0;

  // 1. Admin health
  try {
    const r = await api('/api/admin/health');
    if (r.ok) {
      console.log('  ✓ GET /api/admin/health');
    } else {
      console.log('  ✗ GET /api/admin/health', r.status);
      failed++;
    }
  } catch (e) {
    console.log('  ✗ GET /api/admin/health –', e.message || e);
    console.log('    וודא שהשרת רץ: npm run dev');
    failed++;
    process.exit(1);
  }

  // 2. Admin login
  try {
    const r = await api('/api/admin/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
    });
    if (r.ok) {
      console.log('  ✓ POST /api/admin/auth/login');
    } else {
      console.log('  ✗ POST /api/admin/auth/login', r.status, r.data?.error || '');
      failed++;
    }
  } catch (e) {
    console.log('  ✗ POST /api/admin/auth/login –', e.message || e);
    failed++;
  }

  // 3. User health
  try {
    const r = await api('/api/health');
    if (r.ok || r.status === 200) {
      console.log('  ✓ GET /api/health');
    } else {
      console.log('  ✗ GET /api/health', r.status);
      failed++;
    }
  } catch (e) {
    console.log('  ✗ GET /api/health –', e.message || e);
    failed++;
  }

  // 4. User login (משתמשים רגילים)
  const userEmail = process.env.ADMIN_EMAIL || 'yoav@memoraid.co';
  const userPass = process.env.ADMIN_PASSWORD || 'MeMo@@2025@@';
  try {
    const r = await api('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userEmail, password: userPass, rememberMe: false }),
    });
    if (r.ok) {
      console.log('  ✓ POST /api/auth/login (משתמשים)');
    } else {
      console.log('  ✗ POST /api/auth/login', r.status, r.data?.error || '');
      failed++;
      if (r.status === 500) {
        console.log('    שגיאה:', r.data?.error || r.data?.message || '');
      }
    }
  } catch (e) {
    console.log('  ✗ POST /api/auth/login –', e.message || e);
    failed++;
  }

  console.log('');
  if (failed > 0) {
    console.log(`${failed} בדיקות נכשלו. ראה docs/AUTH_DEVELOPMENT.md`);
    process.exit(1);
  }
  console.log('כל הבדיקות עברו בהצלחה.');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
