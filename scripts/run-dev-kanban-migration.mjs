import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

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

async function runMigration() {
  console.log('🚀 Running Dev Kanban migration...');

  try {
    const migrationPath = path.resolve(__dirname, '../server/db/migrations/0015_dev_kanban_system.sql');
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    console.log('📄 Executing SQL...');
    await pool.query(sql);

    console.log('✅ Migration completed successfully!');
    console.log('📊 Tables created:');
    console.log('   - dev_columns (with 6 default columns)');
    console.log('   - dev_tasks');
    console.log('   - dev_comments');
    console.log('\n🎉 Dev Kanban system is ready!');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    if (err.code === '42P07') {
      console.log('ℹ️  Tables already exist. Skipping migration.');
    } else {
      throw err;
    }
  } finally {
    await pool.end();
  }
}

runMigration().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
