#!/usr/bin/env node
/**
 * יוצר משתמש אדמין + משתמש רגיל לבדיקות
 * כך אפשר להתחבר גם לאדמין וגם למערכת המשתמשים עם אותם פרטים
 *
 * Usage: node scripts/seed-dev-accounts.mjs
 *   או:  node scripts/seed-dev-accounts.mjs email@example.com "YourPassword"
 */
import 'dotenv/config';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const { Pool } = pg;
const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL required in .env');
  process.exit(1);
}

const email = process.env.ADMIN_EMAIL || process.argv[2];
const password = process.env.ADMIN_PASSWORD || process.argv[3];
if (!email || !password) {
  console.error('❌ Credentials required: ADMIN_EMAIL and ADMIN_PASSWORD env vars, or pass as arguments.');
  console.error('   Example: node scripts/seed-dev-accounts.mjs admin@example.com "YourPassword"');
  process.exit(1);
}

const useSsl = !url.includes('localhost') && !url.includes('127.0.0.1');
const pool = new Pool({ connectionString: url, ssl: useSsl ? { rejectUnauthorized: true } : false });

async function run() {
  const client = await pool.connect();
  try {
    console.log('MemorAid – יצירת חשבונות פיתוח\n');
    console.log('אימייל:', email);
    console.log('סיסמה:', password.replace(/./g, '*'), '\n');

    // 1. Admin tables + admin user
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        email varchar(255) NOT NULL UNIQUE,
        password_hash text NOT NULL,
        full_name varchar(255),
        role varchar(32) DEFAULT 'super_admin' NOT NULL,
        is_active boolean DEFAULT true NOT NULL,
        last_login_at timestamptz,
        created_at timestamptz DEFAULT now() NOT NULL
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_sessions (
        id varchar(255) PRIMARY KEY,
        admin_user_id uuid NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
        expires_at timestamptz NOT NULL,
        created_at timestamptz DEFAULT now() NOT NULL
      )
    `);

    const hash = await bcrypt.hash(password, 10);
    await client.query(
      `INSERT INTO admin_users (email, password_hash, full_name, role)
       VALUES ($1, $2, $3, 'super_admin')
       ON CONFLICT (email) DO UPDATE SET password_hash = $2`,
      [email, hash, email.split('@')[0]],
    );
    console.log('✓ משתמש אדמין נוצר/עודכן');

    // 2. Create test user for regular login (requires users + families tables from migrations)
    const userTableCheck = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'users' LIMIT 1
    `);
    if (userTableCheck.rows.length === 0) {
      console.log('  (טבלת users לא קיימת – הרץ: npm run db:push)');
      console.log('\nאדמין מוכן. להתחבר: http://localhost:5173/admin/login\n');
      return;
    }

    let familyId;
    const fam = await client.query(
      "SELECT id FROM families WHERE invite_code = 'TEST123' OR family_name = 'משפחת בדיקה' LIMIT 1",
    );
    if (fam.rows.length > 0) {
      familyId = fam.rows[0].id;
    } else {
      const ins = await client.query(
        `INSERT INTO families (family_name, invite_code) VALUES ('משפחת בדיקה', 'TEST123') RETURNING id`,
      );
      familyId = ins.rows[0].id;
    }

    const existingUser = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [email],
    );

    if (existingUser.rows.length > 0) {
      await client.query(
        'UPDATE users SET password_hash = $1 WHERE email = $2',
        [hash, email],
      );
      console.log('✓ משתמש רגיל קיים – סיסמה עודכנה');
    } else {
      const userIns = await client.query(
        `INSERT INTO users (family_id, full_name, email, password_hash, role)
         VALUES ($1, $2, $3, $4, 'manager') RETURNING id`,
        [familyId, email.split('@')[0], email, hash],
      );
      const userId = userIns.rows[0].id;
      try {
        await client.query(
          `INSERT INTO family_members (user_id, family_id, role) VALUES ($1, $2, 'manager')`,
          [userId, familyId],
        );
      } catch (_) {
        /* family_members might not exist */
      }
      console.log('✓ משתמש רגיל נוצר');
    }

    console.log('\n--- פרטי התחברות ---');
    console.log('אדמין:  http://localhost:5173/admin/login');
    console.log('משתמשים: http://localhost:5173/login');
    console.log('\nאימייל:', email);
    console.log('סיסמה:', password);
  } finally {
    client.release();
    pool.end();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
