#!/usr/bin/env node
/**
 * Safe migrate: backup, generate, show SQL, ask confirmation, migrate.
 * Usage: node scripts/safe-migrate.mjs
 */
import 'dotenv/config';
import { spawnSync } from 'child_process';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import { createInterface } from 'readline';

const cwd = process.cwd();
const migrationsDir = resolve(cwd, 'server/db/migrations');
const metaDir = join(migrationsDir, 'meta');

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { stdio: 'inherit', cwd, ...opts });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

function runCapture(cmd, args) {
  const r = spawnSync(cmd, args, { cwd, encoding: 'utf8' });
  return { status: r.status, stdout: r.stdout || '', stderr: r.stderr || '' };
}

function ask(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (ans) => {
      rl.close();
      resolve(ans.trim().toLowerCase());
    });
  });
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not set. Add it to .env');
    process.exit(1);
  }

  console.log('--- שלב 1: גיבוי נתונים ---');
  const backup = runCapture('node', ['scripts/backup-data.mjs']);
  if (backup.status !== 0) {
    console.error('גיבוי נכשל');
    process.exit(1);
  }
  console.log('');

  console.log('--- שלב 2: יצירת migration (drizzle-kit generate) ---');
  run('npx', ['drizzle-kit', 'generate']);
  console.log('');

  const journalPath = join(metaDir, '_journal.json');
  if (!existsSync(journalPath)) {
    console.log('לא נמצא קובץ _journal.json – אין migrations להציג');
  } else {
    const journal = JSON.parse(readFileSync(journalPath, 'utf8'));
    const entries = journal.entries || [];
    const sqlFiles = readdirSync(migrationsDir).filter((f) => f.endsWith('.sql'));
    const latest = entries[entries.length - 1];
    if (latest) {
      const sqlName = `${latest.tag}.sql`;
      const sqlPath = join(migrationsDir, sqlName);
      if (existsSync(sqlPath)) {
        console.log('--- SQL שיופעל (migration אחרון):', sqlName, '---');
        console.log(readFileSync(sqlPath, 'utf8'));
        console.log('');
      } else {
        console.log('Migrations זמינים:', sqlFiles.join(', '));
      }
    }
  }

  const ans = await ask('להריץ migrate? (y/n): ');
  if (ans !== 'y' && ans !== 'yes') {
    console.log('בוטל.');
    process.exit(0);
  }

  console.log('--- שלב 3: הרצת migrate ---');
  run('npx', ['drizzle-kit', 'migrate']);
  console.log('סיום.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
