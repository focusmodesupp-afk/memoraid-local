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

const isWin = process.platform === 'win32';
const cwd = process.cwd();

// drizzle-kit 0.21+ uses config file (drizzle.config.ts) – just run 'push'
const npxArgs = ['drizzle-kit', 'push'];

const child = isWin
  ? spawn('cmd', ['/c', 'npx', ...npxArgs], { stdio: 'inherit', cwd, env: { ...process.env, DATABASE_URL: url } })
  : spawn('npx', npxArgs, { stdio: 'inherit', cwd, env: { ...process.env, DATABASE_URL: url } });

child.on('exit', (code) => process.exit(code ?? 0));
child.on('error', (err) => {
  console.error('spawn error:', err);
  process.exit(1);
});
