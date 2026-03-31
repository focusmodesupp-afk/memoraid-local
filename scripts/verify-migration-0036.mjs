import 'dotenv/config';
import pg from 'pg';

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

const res = await client.query(`
  SELECT column_name, data_type 
  FROM information_schema.columns 
  WHERE table_name = 'patients' 
    AND column_name IN ('care_stage', 'stage_updated_at', 'family_history') 
  ORDER BY column_name
`);
console.log('patients columns:', res.rows);

const res2 = await client.query(`
  SELECT column_name 
  FROM information_schema.columns 
  WHERE table_name = 'memory_stories' AND column_name = 'care_stage'
`);
console.log('memory_stories.care_stage:', res2.rows.length > 0 ? 'EXISTS ✓' : 'MISSING ✗');

await client.end();
