import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { sql } from 'drizzle-orm';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(process.cwd(), '.env'), override: true });
dotenv.config({ path: path.resolve(__dirname, '../../.env'), override: true });
dotenv.config({ path: path.resolve(__dirname, '../../../../.env'), override: true });

const BASE_PORT = Number(process.env.API_PORT ?? process.env.PORT ?? 3001);

async function verifyDatabaseConnection() {
  const { db } = await import('./db');
  await db.execute(sql`SELECT 1`);
}

async function main() {
  await verifyDatabaseConnection();
  console.log('DB: connected');

  const { createApp } = await import('./createApp');
  const app = createApp();
  const server = app.listen(BASE_PORT, () => {
    console.log(`Server running at http://localhost:${BASE_PORT}`);
    const hasCal = !!(
      process.env.GOOGLE_CALENDAR_CLIENT_ID?.trim() &&
      process.env.GOOGLE_CALENDAR_CLIENT_SECRET?.trim()
    );
    const appBase = process.env.APP_BASE_URL ?? 'http://localhost:5173';
    console.log(
      `Google Calendar: ${hasCal ? 'configured' : 'NOT configured (add GOOGLE_CALENDAR_CLIENT_ID/SECRET to .env)'}`,
    );
    if (hasCal) {
      console.log('  Add these Redirect URIs in Google Cloud Console -> Credentials -> OAuth client:');
      console.log(`    - ${appBase}/api/integrations/google/oauth/callback (Calendar from Settings)`);
      console.log(`    - ${appBase}/api/auth/google/callback (Login/Register with Gmail)`);
    }
  });

  server.on('error', (err: any) => {
    if (err?.code === 'EADDRINUSE') {
      console.error(`\nPort ${BASE_PORT} is in use. The API must use the same port as Vite proxy (API_PORT=${BASE_PORT}).`);
      console.error('   Stop other Node processes, or set API_PORT in .env to a free port (for example 3002) and restart.\n');
      process.exit(1);
    }
    throw err;
  });
}

main().catch((err: any) => {
  console.error('Server startup failed:', err?.code || '', err?.message || err);
  console.error('  Check DATABASE_URL and make sure schema migrations were applied before startup.');
  process.exit(1);
});
