#!/usr/bin/env node
/**
 * הפעלת סביבת הפיתוח – קודם fix:login + db:push, ואז npm run dev
 * הרץ: node scripts/start-dev.mjs
 */
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const isWin = process.platform === 'win32';

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const proc = isWin ? spawn('cmd', ['/c', cmd, ...args], { stdio: 'inherit', cwd: root, ...opts }) : spawn(cmd, args, { stdio: 'inherit', cwd: root, ...opts });
    proc.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`Exit ${code}`))));
    proc.on('error', reject);
  });
}

async function main() {
  console.log('\n=== MemorAId – הפעלת סביבת פיתוח ===\n');

  try {
    console.log('1. fix:login (טבלאות אדמין)...');
    await run('node', ['scripts/fix-login.mjs']).catch(() => {
      console.log('   (fix:login נכשל – ממשיך בכל זאת)');
    });
  } catch (_) {}

  try {
    console.log('2. db:push (סנכרון סכמה)...');
    await run('npx', ['drizzle-kit', 'push']).catch(() => {
      console.log('   (db:push נכשל – ממשיך בכל זאת)');
    });
  } catch (_) {}

  console.log('3. npm run dev (client + server)...\n');
  await run('npm', ['run', 'dev']);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
