import pg from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in .env');
  process.exit(1);
}

const useSsl = !DATABASE_URL.includes('localhost') && !DATABASE_URL.includes('127.0.0.1');
const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  ssl: useSsl ? { rejectUnauthorized: true } : false,
});

async function updatePassword() {
  console.log('🔐 מעדכן סיסמה לאדמין...\n');

  const email = process.env.ADMIN_EMAIL;
  const newPassword = process.env.ADMIN_PASSWORD;
  if (!email || !newPassword) {
    console.error('❌ ADMIN_EMAIL and ADMIN_PASSWORD must be set in environment variables.');
    process.exit(1);
  }

  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the password (prepare: false for Supabase pooler)
    const result = await pool.query({
      text: 'UPDATE admin_users SET password_hash = $1 WHERE email = $2 RETURNING id, full_name, email',
      values: [hashedPassword, email],
      prepare: false,
    });

    if (result.rows.length === 0) {
      console.log('❌ משתמש לא נמצא עם המייל:', email);
      console.log('\n💡 אולי צריך ליצור משתמש חדש?');
      console.log('הרץ: node scripts/create-admin.mjs\n');
      process.exit(1);
    }

    const user = result.rows[0];
    console.log('✅ הסיסמה עודכנה בהצלחה!\n');
    console.log('📋 פרטי המשתמש:');
    console.log('   ID:', user.id);
    console.log('   Name:', user.full_name);
    console.log('   Email:', user.email);
    console.log('\n🔑 פרטי התחברות:');
    console.log('   Email:', email);
    console.log('   Password:', newPassword);
    console.log('\n🌐 כתובת לוגין:');
    console.log('   http://localhost:5173/admin/login\n');

  } catch (err) {
    if (err.code === '42P01') {
      console.error('❌ טבלת admin_users לא קיימת!');
      console.log('\n💡 הרץ קודם:');
      console.log('   node scripts/create-admin.mjs\n');
    } else {
      console.error('❌ שגיאה:', err.message);
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

updatePassword();
