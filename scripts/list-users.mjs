#!/usr/bin/env node
/**
 * רשימת משתמשים מה-DB + אופציה לעדכון סיסמה
 * Usage: node scripts/list-users.mjs
 *        node scripts/list-users.mjs set-password <email> <new-password>
 */
import 'dotenv/config';
import pg from 'pg';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL לא מוגדר ב-.env');
  process.exit(1);
}

const useSsl = !url.includes('localhost') && !url.includes('127.0.0.1');
const client = new pg.Client({ connectionString: url, ssl: useSsl ? { rejectUnauthorized: true } : false });

async function listUsers() {
  const res = await client.query(`
    SELECT id, email, full_name, role, family_id, created_at
    FROM users
    ORDER BY created_at DESC
    LIMIT 50
  `);
  return res.rows;
}

async function setPassword(email, newPassword) {
  const bcrypt = await import('bcryptjs');
  const hash = await bcrypt.default.hash(newPassword, 10);
  const res = await client.query(
    'UPDATE users SET password_hash = $1 WHERE email = $2 RETURNING id, email, full_name',
    [hash, email]
  );
  return res.rows[0];
}

async function run() {
  await client.connect();

  const [, , cmd, email, password] = process.argv;

  if (cmd === 'set-password' && email && password) {
    const updated = await setPassword(email.trim(), password);
    if (updated) {
      console.log('סיסמה עודכנה בהצלחה!\n');
      console.log('פרטי התחברות:');
      console.log('  אימייל:', updated.email);
      console.log('  סיסמה:', password);
      console.log('  שם:', updated.full_name);
    } else {
      console.error('משתמש לא נמצא עם האימייל:', email);
      process.exit(1);
    }
  } else {
    const users = await listUsers();
    console.log('משתמשים ב-DB:\n');
    if (users.length === 0) {
      console.log('  אין משתמשים.');
    } else {
      for (const u of users) {
        console.log('  -', u.email, '|', u.full_name, '|', u.role);
      }
      console.log('\nלעדכון סיסמה: node scripts/list-users.mjs set-password <email> <סיסמה חדשה>');
    }
  }

  await client.end();
}

run().catch((e) => {
  console.error(e?.message || e);
  if (e?.code === '42P01') {
    console.error('\nטבלת users אינה קיימת. הרץ: npm run db:push');
  }
  process.exit(1);
});
