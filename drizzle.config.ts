import { readFileSync } from 'fs';
import { resolve } from 'path';
import { defineConfig } from 'drizzle-kit';

// Load .env manually (no dotenv dependency for drizzle-kit)
const envPath = resolve(process.cwd(), '.env');
try {
  const env = readFileSync(envPath, 'utf8');
  for (const line of env.split('\n')) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) process.env[match[1].trim()] = match[2].trim();
  }
} catch {
  // .env optional
}

export default defineConfig({
  schema: './shared/schemas/schema.ts',
  out: './server/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
