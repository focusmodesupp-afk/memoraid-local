import fs from 'fs';
import path from 'path';
import express from 'express';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { sql } from 'drizzle-orm';
import { db as sharedDb } from './db';
import { withDbContext, type DbContext } from './db/context';
import { routes } from './routes';
import { adminRoutes } from './adminRoutes';
import { nexusAdminRoutes } from './nexusAdminRoutes';
import { integrationRoutes } from './integrationRoutes';
import { userExtRoutes } from './userExtRoutes';
import { handleBillingWebhook } from './billingWebhook';
import { errorLogs } from '../../shared/schemas/schema';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

function getClientDistDir(): string | null {
  const candidates = [
    path.resolve(__dirname, '../../dist'),
    path.resolve(__dirname, '../../../../dist'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, 'index.html'))) return candidate;
  }

  return null;
}

export type CreateAppOptions = {
  dbContext?: DbContext;
  serveClient?: boolean;
};

export function createApp(options: CreateAppOptions = {}): express.Express {
  if (process.env.NODE_ENV === 'production' && process.env.DEV_SKIP_AUTH === '1') {
    throw new Error('DEV_SKIP_AUTH=1 must never be enabled in production');
  }

  const app = express();

  if (options.dbContext) {
    app.use((req, res, next) => withDbContext(options.dbContext!.db, next));
  }

  app.post('/api/billing/webhook', express.raw({ type: 'application/json' }), handleBillingWebhook);

  app.use(express.json());
  app.use(cookieParser());

  app.use((req, res, next) => {
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.removeHeader('X-Powered-By');

    if (IS_PRODUCTION) {
      res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
    }

    if (req.path.startsWith('/api')) {
      res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none';");
    } else {
      res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; img-src 'self' data: blob: https:; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; connect-src 'self' https: wss:;",
      );
    }

    res.setHeader('Permissions-Policy', 'geolocation=(), camera=(), microphone=()');
    next();
  });

  app.get('/api/admin/health', (_req, res) => res.json({ ok: true, admin: true }));

  app.get('/api/admin/health/tables', async (_req, res) => {
    try {
      await sharedDb.execute(sql`SELECT 1 FROM admin_users LIMIT 1`);
      res.json({ ok: true });
    } catch (err: any) {
      const code = err?.code;
      const msg = String(err?.message ?? err ?? '');
      if (code === '42P01') {
        return res.status(503).json({ ok: false, error: 'Admin tables missing', fix: 'Run: npm run db:push' });
      }

      const friendly = /ECONNREFUSED|ENOTFOUND|ETIMEDOUT|connection refused/i.test(msg)
        ? 'אין חיבור למסד הנתונים – בדוק DATABASE_URL ב-.env'
        : /password authentication failed|invalid connection/i.test(msg)
          ? 'סיסמה או חיבור שגויים. אם הסיסמה מכילה @ – קודד ב-URL: @ -> %40'
          : msg || 'DB error';
      res.status(503).json({ ok: false, error: friendly });
    }
  });

  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    skip: () => !IS_PRODUCTION,
    message: { error: 'Too many login attempts, try again later' },
  });
  const uploadLimiter = rateLimit({ windowMs: 60 * 1000, max: 10, message: { error: 'Too many uploads, try again later' } });
  const memoriesLimiter = rateLimit({ windowMs: 60 * 1000, max: 30, message: { error: 'Too many requests, try again later' } });

  app.use('/api/admin/auth/login', loginLimiter);
  app.use('/api/auth/login', loginLimiter);
  app.use('/api/medical-documents/upload', uploadLimiter);
  app.use('/api/memory-stories', memoriesLimiter);

  const allowedOrigins = new Set<string>();
  const rawAllowedOrigins = process.env.ALLOWED_ORIGINS;
  if (rawAllowedOrigins) {
    for (const part of rawAllowedOrigins.split(',')) {
      const trimmed = part.trim();
      if (trimmed) allowedOrigins.add(trimmed);
    }
  }

  const appBase = process.env.APP_BASE_URL?.trim();
  if (appBase) {
    allowedOrigins.add(appBase.replace(/\/$/, ''));
  }

  if (!IS_PRODUCTION) {
    ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:4173'].forEach((origin) => allowedOrigins.add(origin));
  }

  app.use((req, res, next) => {
    const origin = req.headers.origin ?? '';
    const allowOrigin =
      !IS_PRODUCTION || !origin || allowedOrigins.has(origin)
        ? (origin || '*')
        : 'null';

    res.header('Access-Control-Allow-Origin', allowOrigin);
    res.header('Vary', 'Origin');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Active-Family, X-Dev-Bypass, X-Dev-Bypass-User');
    res.header('Access-Control-Allow-Credentials', 'true');

    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });

  app.use('/api/admin', adminRoutes);
  app.use('/api/admin', nexusAdminRoutes);
  app.use('/api/integrations', integrationRoutes);
  app.use('/api', userExtRoutes);
  app.use('/api', routes);

  const shouldServeClient = options.serveClient ?? IS_PRODUCTION;
  const clientDist = shouldServeClient ? getClientDistDir() : null;
  if (clientDist) {
    app.use(express.static(clientDist));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) return next();
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  app.use((err: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;

    console.error(err);

    sharedDb.insert(errorLogs)
      .values({
        level: 'error',
        message,
        stackTrace: IS_PRODUCTION ? undefined : stack ?? undefined,
        url: req.originalUrl,
        userAgent: req.headers['user-agent'] ?? undefined,
        ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.socket?.remoteAddress,
      })
      .catch(() => {});

    if (!res.headersSent) {
      if (IS_PRODUCTION) res.status(500).json({ error: 'Internal server error' });
      else res.status(500).json({ error: message, stack });
    }
  });

  return app;
}
