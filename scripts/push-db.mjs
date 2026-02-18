import { readFileSync } from 'fs';
import { resolve } from 'path';
import { spawn } from 'child_process';

const envPath = resolve(process.cwd(), '.env');
try {
  const env = readFileSync(envPath, 'utf8');
  for (const line of env.split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  }
} catch {}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL not set. Add it to .env');
  process.exit(1);
}

const child = spawn(
  'npx',
  ['drizzle-kit', 'push:pg', '--driver', 'pg', '--schema', './shared/schemas/schema.ts', '--connectionString', url],
  { stdio: 'inherit', cwd: process.cwd() }
);
child.on('exit', (code) => process.exit(code ?? 0));
