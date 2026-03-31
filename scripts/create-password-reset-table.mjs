import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const { Pool } = pg;

async function createTable() {
  const dbUrl = process.env.DATABASE_URL;
  console.log('📍 Database URL:', dbUrl?.replace(/:[^:@]+@/, ':****@')); // Hide password
  
  const useSsl = !dbUrl?.includes('localhost') && !dbUrl?.includes('127.0.0.1');
  const pool = new Pool({
    connectionString: dbUrl,
    ssl: useSsl ? { rejectUnauthorized: true } : false,
  });

  try {
    console.log('🔧 Creating password_reset_tokens table...');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "token" varchar(128) NOT NULL UNIQUE,
        "expires_at" timestamp with time zone NOT NULL,
        "used" boolean DEFAULT false NOT NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL
      );
    `);

    console.log('✅ Table created successfully!');

    await pool.query(`
      CREATE INDEX IF NOT EXISTS "password_reset_tokens_token_idx" ON "password_reset_tokens"("token");
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS "password_reset_tokens_user_id_idx" ON "password_reset_tokens"("user_id");
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS "password_reset_tokens_expires_at_idx" ON "password_reset_tokens"("expires_at");
    `);

    console.log('✅ Indexes created successfully!');
    console.log('');
    console.log('🎉 Password reset system is ready!');
    console.log('   You can now use the forgot password feature.');

  } catch (error) {
    console.error('❌ Error creating table:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

createTable();
