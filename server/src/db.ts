import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load .env before anything – override: true ensures .env values win over empty system env vars
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env'), override: true });
dotenv.config({ path: path.resolve(process.cwd(), '.env'), override: true });

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../../shared/schemas/schema';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

// localhost = אין SSL. Supabase/Neon = דורשים SSL
const useSsl = !connectionString.includes('localhost') && !connectionString.includes('127.0.0.1');
const pool = new Pool({
  connectionString,
  ssl: useSsl ? { rejectUnauthorized: process.env.NODE_ENV === 'production' } : false,
  prepare: false, // Required for Supabase pooler (transaction mode)
});
export const db = drizzle(pool, { schema });
