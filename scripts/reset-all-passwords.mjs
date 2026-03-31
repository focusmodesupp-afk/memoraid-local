#!/usr/bin/env node
/**
 * איפוס סיסמאות לכל המשתמשים (אדמינים + משתמשים רגילים) לסיסמה אחת.
 * Usage: node scripts/reset-all-passwords.mjs
 */
import 'dotenv/config';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dotenv = await import('dotenv');
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const DATABASE_URL = process.env.DATABASE_URL;
const NEW_PASSWORD = process.env.DEV_RESET_PASSWORD;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in .env');
  process.exit(1);
}
if (!NEW_PASSWORD) {
  console.error('❌ DEV_RESET_PASSWORD not set in .env (dev only)');
  process.exit(1);
}

const useSsl = !DATABASE_URL.includes('localhost') && !DATABASE_URL.includes('127.0.0.1');
const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  ssl: useSsl ? { rejectUnauthorized: true } : false,
});

async function run() {
  const hash = await bcrypt.hash(NEW_PASSWORD, 10);
  let adminCount = 0;
  let userCount = 0;

  try {
    // Admins
    try {
      const adminRes = await pool.query(
        'UPDATE admin_users SET password_hash = $1 RETURNING id, email',
        [hash]
      );
      adminCount = adminRes.rowCount ?? 0;
      if (adminCount > 0) {
        console.log('✅ אדמינים – עודכנו', adminCount, 'סיסמאות');
        adminRes.rows.forEach((r) => console.log('   -', r.email));
      }
    } catch (e) {
      if (e.code === '42P01') console.log('⚠️ טבלת admin_users לא קיימת, דילוג');
      else throw e;
    }

    // Regular users
    try {
      const userRes = await pool.query(
        'UPDATE users SET password_hash = $1 RETURNING id, email, full_name',
        [hash]
      );
      userCount = userRes.rowCount ?? 0;
      if (userCount > 0) {
        console.log('✅ משתמשים – עודכנו', userCount, 'סיסמאות');
        userRes.rows.forEach((r) => console.log('   -', r.email, '(' + (r.full_name || '') + ')'));
      }
    } catch (e) {
      if (e.code === '42P01') console.log('⚠️ טבלת users לא קיימת, דילוג');
      else throw e;
    }

    console.log('\n🔑 סיסמה חדשה לכולם:', NEW_PASSWORD);
    console.log('   Admin: http://localhost:5173/admin/login');
    console.log('   Users: http://localhost:5173/login\n');
  } finally {
    await pool.end();
  }
}

run().catch((err) => {
  console.error('❌', err.message);
  process.exit(1);
});
