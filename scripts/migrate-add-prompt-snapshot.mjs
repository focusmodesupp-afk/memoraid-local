import { config } from 'dotenv';
import pg from 'pg';

config({ path: '.env', override: true });

const { Client } = pg;

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  console.log('Connected to database');

  await client.query(`
    ALTER TABLE nexus_brief_departments
    ADD COLUMN IF NOT EXISTS prompt_snapshot TEXT;
  `);
  console.log('✅ Added prompt_snapshot column to nexus_brief_departments');

  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
