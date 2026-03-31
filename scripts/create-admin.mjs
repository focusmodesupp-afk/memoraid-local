#!/usr/bin/env node
/**
 * Create first admin user.
 * Usage: ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=secret node scripts/create-admin.mjs
 * Or: node scripts/create-admin.mjs  (prompts for email/password)
 */
import 'dotenv/config';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const { Pool } = pg;
const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL required');
  process.exit(1);
}

const email = process.env.ADMIN_EMAIL || process.argv[2];
const password = process.env.ADMIN_PASSWORD || process.argv[3];

if (!email || !password) {
  console.log('Usage: ADMIN_EMAIL=x ADMIN_PASSWORD=y node scripts/create-admin.mjs');
  console.log('   Or: node scripts/create-admin.mjs admin@example.com yourPassword');
  process.exit(1);
}

const useSsl = !url.includes('localhost') && !url.includes('127.0.0.1');
const pool = new Pool({
  connectionString: url,
  ssl: useSsl ? { rejectUnauthorized: true } : false,
});

async function run() {
  const client = await pool.connect();
  try {
    await client.query({
      text: `CREATE TABLE IF NOT EXISTS admin_users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        email varchar(255) NOT NULL UNIQUE,
        password_hash text NOT NULL,
        full_name varchar(255),
        role varchar(32) DEFAULT 'super_admin' NOT NULL,
        is_active boolean DEFAULT true NOT NULL,
        last_login_at timestamptz,
        created_at timestamptz DEFAULT now() NOT NULL
      )`,
      prepare: false,
    });
    await client.query({
      text: `CREATE TABLE IF NOT EXISTS admin_sessions (
        id varchar(255) PRIMARY KEY,
        admin_user_id uuid NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
        expires_at timestamptz NOT NULL,
        created_at timestamptz DEFAULT now() NOT NULL
      )`,
      prepare: false,
    });

    const hash = await bcrypt.hash(password, 10);
    await client.query({
      text: `INSERT INTO admin_users (email, password_hash, full_name, role)
       VALUES ($1, $2, $3, 'super_admin')
       ON CONFLICT (email) DO UPDATE SET password_hash = $2`,
      values: [email, hash, email.split('@')[0]],
      prepare: false,
    });
    console.log('Admin user created:', email);
  } finally {
    client.release();
    pool.end();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
