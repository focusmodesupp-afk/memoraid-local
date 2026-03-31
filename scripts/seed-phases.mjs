#!/usr/bin/env node
/**
 * Seed dev_phases via API. Requires server running and admin credentials.
 * Usage: ADMIN_EMAIL=x ADMIN_PASSWORD=y node scripts/seed-phases.mjs
 */
import 'dotenv/config';

const BASE = process.env.API_BASE || 'http://localhost:3001';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'yoav@memoraid.co';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'MeMo@@2025@@';

async function run() {
  // 1. Login
  const loginRes = await fetch(`${BASE}/api/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  if (!loginRes.ok) {
    const err = await loginRes.json().catch(() => ({}));
    throw new Error(err.error || `Login failed: ${loginRes.status}`);
  }
  const cookie = loginRes.headers.get('set-cookie');
  if (!cookie) throw new Error('No session cookie from login');

  // 2. Seed phases
  const seedRes = await fetch(`${BASE}/api/admin/phases/seed`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie.split(';')[0],
    },
  });
  const data = await seedRes.json().catch(() => ({}));
  if (!seedRes.ok) {
    throw new Error(data.error || `Seed failed: ${seedRes.status}`);
  }
  console.log('Phases seeded:', data.message || data);
}

run().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
