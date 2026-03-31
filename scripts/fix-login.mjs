#!/usr/bin/env node
/**
 * תיקון מהיר ללוגין – יוצר טבלאות אדמין ומשתמש אם חסרים.
 * Usage: node scripts/fix-login.mjs
 */
import 'dotenv/config';
import pg from 'pg';
import bcrypt from 'bcryptjs';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('❌ DATABASE_URL חסר ב-.env');
  process.exit(1);
}

const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;
if (!email || !password) {
  console.error('❌ ADMIN_EMAIL ו-ADMIN_PASSWORD חייבים להיות מוגדרים ב-.env');
  process.exit(1);
}

const useSsl = !url.includes('localhost') && !url.includes('127.0.0.1');

const pool = new pg.Pool({
  connectionString: url,
  ssl: useSsl ? { rejectUnauthorized: true } : false,
  prepare: false,
});

async function run() {
  console.log('MemorAid – תיקון לוגין אדמין\n');
  try {
    // 1. Test connection
    await pool.query('SELECT 1');
    console.log('✓ חיבור ל-DB עובד');

    // 2. Create admin tables
    await pool.query(`
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
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin_sessions (
        id varchar(255) PRIMARY KEY,
        admin_user_id uuid NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
        expires_at timestamptz NOT NULL,
        created_at timestamptz DEFAULT now() NOT NULL
      )
    `);
    console.log('✓ טבלאות אדמין קיימות');

    // 3. Create/update admin users
    const adminAccounts = [
      { email, password, name: email.split('@')[0], role: 'super_admin' },
    ];
    for (const acc of adminAccounts) {
      const hash = await bcrypt.hash(acc.password, 10);
      await pool.query(
        `INSERT INTO admin_users (email, password_hash, full_name, role)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (email) DO UPDATE SET password_hash = $2, role = $4`,
        [acc.email, hash, acc.name, acc.role]
      );
      console.log('✓ משתמש אדמין מוכן:', acc.email);
    }

    console.log('\n✅ התיקון הצליח!');
    console.log('   משתמשים שנוצרו/עודכנו:');
    adminAccounts.forEach(a => {
      console.log(`   • ${a.email} / ${a.password.replace(/./g, '*')}`);
    });
    console.log('\n   הרץ: npm run dev');
    console.log('   התחבר: http://localhost:5173/admin/login\n');
  } catch (err) {
    console.error('\n❌ שגיאה:', err.message);
    if (err.code === '28P01') console.error('   💡 סיסמה/משתמש שגויים – בדוק DATABASE_URL');
    if (err.code === 'ECONNREFUSED') console.error('   💡 אין חיבור – PostgreSQL או Supabase לא פעיל');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
