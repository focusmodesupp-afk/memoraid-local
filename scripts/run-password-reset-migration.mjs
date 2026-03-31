import { db } from '../server/src/db.ts';
import { sql } from 'drizzle-orm';

async function runMigration() {
  try {
    console.log('🔧 Creating password_reset_tokens table...');

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "token" varchar(128) NOT NULL UNIQUE,
        "expires_at" timestamp with time zone NOT NULL,
        "used" boolean DEFAULT false NOT NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL
      )
    `);

    console.log('✅ Table created successfully!');

    await db.execute(sql`CREATE INDEX IF NOT EXISTS "password_reset_tokens_token_idx" ON "password_reset_tokens"("token")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "password_reset_tokens_user_id_idx" ON "password_reset_tokens"("user_id")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "password_reset_tokens_expires_at_idx" ON "password_reset_tokens"("expires_at")`);

    console.log('✅ Indexes created successfully!');
    console.log('');
    console.log('🎉 Password reset system is ready!');
    console.log('   You can now use the forgot password feature.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

runMigration();
