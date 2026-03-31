import 'dotenv/config';
import pg from 'pg';

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

const fixes = [
  // medical_documents: sync_status, sync_completed_at
  `ALTER TABLE medical_documents ADD COLUMN IF NOT EXISTS sync_status VARCHAR(32)`,
  `ALTER TABLE medical_documents ADD COLUMN IF NOT EXISTS sync_completed_at TIMESTAMP WITH TIME ZONE`,
  // tasks: source_entity_type, source_entity_id, linked_referral_id
  `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS source_entity_type VARCHAR(32)`,
  `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS source_entity_id UUID`,
  `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS linked_referral_id UUID`,
  // tasks: position, scheduled_start, scheduled_end
  `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS position INTEGER`,
  `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS scheduled_start TIMESTAMP WITH TIME ZONE`,
  `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS scheduled_end TIMESTAMP WITH TIME ZONE`,
];

for (const sql of fixes) {
  try {
    await client.query(sql);
    console.log('✓', sql.slice(0, 70));
  } catch (err) {
    console.error('✗', sql.slice(0, 70), '→', err.message);
  }
}

await client.end();
console.log('\nDone.');
