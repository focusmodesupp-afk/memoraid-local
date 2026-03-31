import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load .env: override: true ensures .env wins over empty Windows system env vars
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(process.cwd(), '.env'), override: true });
dotenv.config({ path: path.resolve(__dirname, '../../.env'), override: true });
dotenv.config({ path: path.resolve(__dirname, '../../../../.env'), override: true });

import express from 'express';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { routes } from './routes';
import { adminRoutes } from './adminRoutes';
import { nexusAdminRoutes } from './nexusAdminRoutes';
import { integrationRoutes } from './integrationRoutes';
import { userExtRoutes } from './userExtRoutes';
import { handleBillingWebhook } from './billingWebhook';
import { sql } from 'drizzle-orm';
import { db } from './db';
import { errorLogs } from '../../shared/schemas/schema';

// Safety guard: DEV_SKIP_AUTH must never be enabled in production
if (process.env.NODE_ENV === 'production' && process.env.DEV_SKIP_AUTH === '1') {
  console.error(
    '\n🚨 FATAL: DEV_SKIP_AUTH=1 is set in a production environment.\n' +
    '   This completely bypasses authentication and is a critical security risk.\n' +
    '   Remove DEV_SKIP_AUTH from your environment variables and restart.\n'
  );
  process.exit(1);
}

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const app = express();
const BASE_PORT = Number(process.env.API_PORT ?? process.env.PORT ?? 3001);

/** Vite client build: repo/dist (works from server/src or server/dist/server/src) */
function getClientDistDir(): string | null {
  const candidates = [path.resolve(__dirname, '../../dist'), path.resolve(__dirname, '../../../../dist')];
  for (const p of candidates) {
    if (fs.existsSync(path.join(p, 'index.html'))) return p;
  }
  return null;
}

// Stripe webhook needs raw body for signature verification
app.post('/api/billing/webhook', express.raw({ type: 'application/json' }), handleBillingWebhook);

app.use(express.json());
app.use(cookieParser());

// Security headers
app.use((req, res, next) => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Block reflected XSS (legacy browsers)
  res.setHeader('X-XSS-Protection', '1; mode=block');
  // Don't expose the referrer on cross-origin requests
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  // Remove X-Powered-By to avoid exposing the tech stack
  res.removeHeader('X-Powered-By');
  // HTTPS only (production)
  if (IS_PRODUCTION) {
    res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  }
  // CSP: strict for API; SPA needs scripts/styles from same origin
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

// Admin health - BEFORE adminRoutes (doesn't depend on admin module)
app.get('/api/admin/health', (_req, res) => res.json({ ok: true, admin: true }));

app.get('/api/admin/health/tables', async (_req, res) => {
  try {
    await db.execute(sql`SELECT 1 FROM admin_users LIMIT 1`);
    res.json({ ok: true });
  } catch (err: any) {
    const code = err?.code;
    const msg = String(err?.message ?? err ?? '');
    console.error('health/tables DB error:', code, msg.slice(0, 150));
    if (code === '42P01') {
      return res.status(503).json({ ok: false, error: 'Admin tables missing', fix: 'Run: npm run fix:login' });
    }
    const friendly = /ECONNREFUSED|ENOTFOUND|ETIMEDOUT|connection refused/i.test(msg)
      ? 'אין חיבור למסד הנתונים – בדוק DATABASE_URL ב-.env'
      : /password authentication failed|invalid connection/i.test(msg)
        ? 'סיסמה או חיבור שגויים. אם הסיסמה מכילה @ – קודד ב-URL: @ → %40'
        : msg || 'DB error';
    res.status(503).json({ ok: false, error: friendly });
  }
});

// Rate limiters
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

// CORS – in dev allow all origins; in production restrict to ALLOWED_ORIGINS (+ APP_BASE_URL)
const ALLOWED_ORIGINS: Set<string> = (() => {
  const set = new Set<string>();
  const raw = process.env.ALLOWED_ORIGINS;
  if (raw) {
    raw.split(',').forEach((s) => {
      const t = s.trim();
      if (t) set.add(t);
    });
  }
  const appBase = process.env.APP_BASE_URL?.trim();
  if (appBase) set.add(appBase.replace(/\/$/, ''));
  if (!IS_PRODUCTION) {
    ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:4173'].forEach((u) => set.add(u));
  }
  return set;
})();

app.use((req, res, next) => {
  const origin = req.headers.origin ?? '';
  const allowOrigin =
    !IS_PRODUCTION || !origin || ALLOWED_ORIGINS.has(origin)
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

const clientDist = IS_PRODUCTION ? getClientDistDir() : null;
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const isProd = process.env.NODE_ENV === 'production';
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;

  console.error(err);

  // Optional: log to errorLogs table (table might not exist)
  db.insert(errorLogs)
    .values({
      level: 'error',
      message,
      stackTrace: isProd ? undefined : stack ?? undefined,
      url: req.originalUrl,
      userAgent: req.headers['user-agent'] ?? undefined,
      ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.socket?.remoteAddress,
    })
    .catch(() => {
      // Ignore – table may not exist or DB unavailable
    });

  try {
    if (!res.headersSent) {
      if (isProd) res.status(500).json({ error: 'Internal server error' });
      else res.status(500).json({ error: message, stack });
    }
  } catch (_) {}
});

const startServer = (port: number) => {
  const server = app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    const hasCal = !!(process.env.GOOGLE_CALENDAR_CLIENT_ID?.trim() && process.env.GOOGLE_CALENDAR_CLIENT_SECRET?.trim());
    const appBase = process.env.APP_BASE_URL ?? 'http://localhost:5173';
    console.log(`Google Calendar: ${hasCal ? 'configured' : 'NOT configured (add GOOGLE_CALENDAR_CLIENT_ID/SECRET to .env)'}`);
    if (hasCal) {
      console.log(`  Add these Redirect URIs in Google Cloud Console → Credentials → OAuth client:`);
      console.log(`    - ${appBase}/api/integrations/google/oauth/callback (Calendar from Settings)`);
      console.log(`    - ${appBase}/api/auth/google/callback (Login/Register with Gmail)`);
    }
  });

  server.on('error', (err: any) => {
    if (err?.code === 'EADDRINUSE') {
      console.error(`\n❌ Port ${port} is in use. The API must use the same port as Vite proxy (API_PORT=${port}).`);
      console.error('   → Stop other Node processes, or set API_PORT in .env to a free port (e.g. 3002) and restart.\n');
      process.exit(1);
    }
    throw err;
  });
};

// Startup: verify DB connection + apply idempotent schema patches
(async () => {
  try {
    await db.execute(sql`SELECT 1`);
    console.log('DB: connected');

    // Patch 0034: ensure scheduled_start / scheduled_end exist in tasks
    await db.execute(sql`
      ALTER TABLE tasks
        ADD COLUMN IF NOT EXISTS scheduled_start timestamp with time zone,
        ADD COLUMN IF NOT EXISTS scheduled_end timestamp with time zone
    `);

    // Patch 0034: ensure 'requested' exists in task_status enum
    await db.execute(sql`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_enum
          WHERE enumlabel = 'requested'
            AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'task_status')
        ) THEN
          ALTER TYPE task_status ADD VALUE 'requested' BEFORE 'scheduled';
        END IF;
      END $$
    `);

    // Patch: add extracted_vitals, extracted_lab_values, extracted_referrals to medical_documents
    await db.execute(sql`
      ALTER TABLE medical_documents
        ADD COLUMN IF NOT EXISTS extracted_vitals jsonb,
        ADD COLUMN IF NOT EXISTS extracted_lab_values jsonb,
        ADD COLUMN IF NOT EXISTS extracted_referrals jsonb
    `);

    // Patch 0037: task enhancements – user color, co-assignees, linked docs, checklists
    await db.execute(sql`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS user_color varchar(7) DEFAULT '#6366f1'
    `);
    await db.execute(sql`
      ALTER TABLE tasks
        ADD COLUMN IF NOT EXISTS co_assignee_ids jsonb DEFAULT '[]'::jsonb,
        ADD COLUMN IF NOT EXISTS linked_document_ids jsonb DEFAULT '[]'::jsonb
    `);
    // Migrate old single linked_document_id → linked_document_ids array (if column existed)
    await db.execute(sql`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'tasks' AND column_name = 'linked_document_id'
        ) THEN
          UPDATE tasks
            SET linked_document_ids = COALESCE(
              CASE WHEN linked_document_id IS NOT NULL
                THEN jsonb_build_array(linked_document_id::text)
                ELSE '[]'::jsonb
              END,
              '[]'::jsonb
            )
          WHERE linked_document_id IS NOT NULL;
        END IF;
      END $$
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS task_checklists (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        text varchar(500) NOT NULL,
        is_done boolean NOT NULL DEFAULT false,
        position integer NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_task_checklists_task_id ON task_checklists(task_id)
    `);

    // Patch 0038: document archive mode
    await db.execute(sql`
      ALTER TABLE medical_documents
        ADD COLUMN IF NOT EXISTS is_archive_only boolean NOT NULL DEFAULT false
    `);

    // Patch 0039: professionals directory
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS professionals (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        family_id uuid NOT NULL REFERENCES families(id) ON DELETE CASCADE,
        name varchar(255) NOT NULL,
        category varchar(32) NOT NULL DEFAULT 'medical',
        specialty varchar(128),
        clinic_or_company varchar(255),
        phone varchar(64),
        fax varchar(64),
        email varchar(255),
        address text,
        website varchar(255),
        notes text,
        linked_document_ids jsonb DEFAULT '[]'::jsonb,
        last_interaction_date date,
        source varchar(32) DEFAULT 'manual',
        name_normalized varchar(255),
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_professionals_family ON professionals(family_id)
    `);
    await db.execute(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_professionals_dedup
        ON professionals(family_id, name_normalized, specialty)
        WHERE name_normalized IS NOT NULL AND specialty IS NOT NULL
    `);

    // Migration 0040: performance indexes (each wrapped so a missing table doesn't abort the rest)
    for (const idx of [
      sql`CREATE INDEX IF NOT EXISTS idx_sessions_user_id    ON sessions(user_id)`,
      sql`CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at)`,
      sql`CREATE INDEX IF NOT EXISTS idx_tasks_family_id     ON tasks(family_id)`,
      sql`CREATE INDEX IF NOT EXISTS idx_tasks_status        ON tasks(family_id, status)`,
      sql`CREATE INDEX IF NOT EXISTS idx_tasks_created_at    ON tasks(family_id, created_at DESC)`,
      sql`CREATE INDEX IF NOT EXISTS idx_patients_family_id  ON patients(family_id)`,
      sql`CREATE INDEX IF NOT EXISTS idx_medical_docs_family ON medical_documents(family_id)`,
      sql`CREATE INDEX IF NOT EXISTS idx_medications_patient ON medications(patient_id)`,
      sql`CREATE INDEX IF NOT EXISTS idx_vitals_patient      ON vitals(patient_id)`,
      sql`CREATE INDEX IF NOT EXISTS idx_lab_results_patient ON lab_results(patient_id)`,
      sql`CREATE INDEX IF NOT EXISTS idx_referrals_patient   ON referrals(patient_id)`,
      sql`CREATE INDEX IF NOT EXISTS idx_appointments_family ON appointments(family_id)`,
      sql`CREATE INDEX IF NOT EXISTS idx_family_members_user ON family_members(user_id)`,
      sql`CREATE INDEX IF NOT EXISTS idx_notif_user_unread   ON notifications(user_id, created_at DESC) WHERE read_at IS NULL`,
      sql`CREATE INDEX IF NOT EXISTS idx_memory_family       ON memory_stories(family_id)`,
      sql`CREATE INDEX IF NOT EXISTS idx_audit_created_at    ON audit_log(created_at DESC)`,
    ]) {
      await db.execute(idx).catch((e: any) => {
        if (e?.code !== '42P01') throw e;
        console.warn('DB index skipped (table missing):', String(e.message ?? '').split('\n')[0]);
      });
    }

    // Nexus Layer 2+3+4 tables
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS nexus_skills (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name varchar(64) NOT NULL UNIQUE,
        label_he varchar(64) NOT NULL,
        color varchar(7) NOT NULL DEFAULT '#6366f1',
        category varchar(32) NOT NULL DEFAULT 'tech',
        description text,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS nexus_rules (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name varchar(255) NOT NULL,
        description text,
        trigger_type varchar(64) NOT NULL,
        condition_json jsonb NOT NULL DEFAULT '{}'::jsonb,
        action_type varchar(64) NOT NULL,
        action_payload jsonb DEFAULT '{}'::jsonb,
        priority integer NOT NULL DEFAULT 0,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS nexus_templates (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name varchar(255) NOT NULL,
        name_he varchar(255) NOT NULL,
        description text,
        departments text[] NOT NULL DEFAULT '{}',
        models varchar(32)[] NOT NULL DEFAULT '{}',
        codebase_depth varchar(16) NOT NULL DEFAULT 'deep',
        codebase_scope varchar(16) NOT NULL DEFAULT 'all',
        is_default boolean NOT NULL DEFAULT false,
        is_active boolean NOT NULL DEFAULT true,
        usage_count integer NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS nexus_dept_settings (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        department varchar(32) NOT NULL UNIQUE,
        label_he varchar(64) NOT NULL,
        emoji varchar(8) NOT NULL DEFAULT '🏢',
        system_prompt_override text,
        default_model varchar(64),
        is_active boolean NOT NULL DEFAULT true,
        output_sections jsonb,
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS nexus_extracted_tasks (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        brief_id uuid NOT NULL REFERENCES nexus_briefs(id) ON DELETE CASCADE,
        title varchar(500) NOT NULL,
        description text,
        priority varchar(16) NOT NULL DEFAULT 'medium',
        estimate_hours integer DEFAULT 4,
        category varchar(32) DEFAULT 'feature',
        skill_tags text[] NOT NULL DEFAULT '{}',
        source_department varchar(32),
        accepted boolean NOT NULL DEFAULT true,
        dev_task_id uuid,
        sprint_id uuid,
        phase_id uuid,
        position integer NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_nexus_extracted_brief ON nexus_extracted_tasks(brief_id)`);
    // Add new columns to nexus_briefs if missing
    await db.execute(sql`ALTER TABLE nexus_briefs ADD COLUMN IF NOT EXISTS generated_sprint_id uuid`);
    await db.execute(sql`ALTER TABLE nexus_briefs ADD COLUMN IF NOT EXISTS phase_id uuid`);
    await db.execute(sql`ALTER TABLE nexus_briefs ADD COLUMN IF NOT EXISTS template_id uuid`);
    // Seed default templates if none exist
    await db.execute(sql`
      INSERT INTO nexus_templates (name, name_he, description, departments, models, codebase_depth, codebase_scope, is_default)
      SELECT 'Feature Full', 'פיצ''ר מלא', 'ניתוח מלא של כל 9 מחלקות', ARRAY['ceo','cto','cpo','rd','design','product','security','legal','marketing'], ARRAY['claude'], 'deep', 'all', true
      WHERE NOT EXISTS (SELECT 1 FROM nexus_templates WHERE name = 'Feature Full')
    `);
    await db.execute(sql`
      INSERT INTO nexus_templates (name, name_he, description, departments, models, codebase_depth, codebase_scope, is_default)
      SELECT 'Quick Tech', 'טכני מהיר', 'CTO + R&D + Security בלבד', ARRAY['cto','rd','security'], ARRAY['claude'], 'quick', 'server', false
      WHERE NOT EXISTS (SELECT 1 FROM nexus_templates WHERE name = 'Quick Tech')
    `);
    await db.execute(sql`
      INSERT INTO nexus_templates (name, name_he, description, departments, models, codebase_depth, codebase_scope, is_default)
      SELECT 'Design Sprint', 'ספרינט עיצוב', 'CPO + Design + Product', ARRAY['cpo','design','product'], ARRAY['claude'], 'quick', 'client', false
      WHERE NOT EXISTS (SELECT 1 FROM nexus_templates WHERE name = 'Design Sprint')
    `);
    await db.execute(sql`
      INSERT INTO nexus_templates (name, name_he, description, departments, models, codebase_depth, codebase_scope, is_default)
      SELECT 'Legal & Security', 'משפטי ואבטחה', 'Legal + Security + CEO', ARRAY['legal','security','ceo'], ARRAY['claude'], 'deep', 'all', false
      WHERE NOT EXISTS (SELECT 1 FROM nexus_templates WHERE name = 'Legal & Security')
    `);
    // Seed default skills if none exist
    await db.execute(sql`
      INSERT INTO nexus_skills (name, label_he, color, category)
      SELECT * FROM (VALUES
        ('react','React Frontend','#61dafb','frontend'),
        ('nodejs','Node.js Backend','#68a063','backend'),
        ('postgresql','PostgreSQL DB','#336791','database'),
        ('ai-integration','אינטגרציית AI','#a855f7','ai'),
        ('security-review','סקירת אבטחה','#ef4444','security'),
        ('legal-review','סקירה משפטית','#f59e0b','legal'),
        ('design-system','Design System','#ec4899','design'),
        ('devops','DevOps / CI-CD','#0ea5e9','infrastructure'),
        ('api-design','עיצוב API','#10b981','backend'),
        ('mobile','Mobile / PWA','#8b5cf6','frontend'),
        ('testing','בדיקות / QA','#06b6d4','qa')
      ) AS v(name,label_he,color,category)
      WHERE NOT EXISTS (SELECT 1 FROM nexus_skills LIMIT 1)
    `);

    // Patch 0041: NEXUS deep-context columns for task extraction
    await db.execute(sql`ALTER TABLE nexus_extracted_tasks ADD COLUMN IF NOT EXISTS context_json JSONB`);
    await db.execute(sql`ALTER TABLE dev_tasks ADD COLUMN IF NOT EXISTS nexus_context JSONB`);

    // Patch: question discovery tables
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS nexus_brief_questions (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        brief_id uuid NOT NULL REFERENCES nexus_briefs(id) ON DELETE CASCADE,
        department varchar(32) NOT NULL,
        gate varchar(16) NOT NULL,
        role varchar(64),
        question text NOT NULL,
        answer text,
        answer_source varchar(32),
        source_url text,
        confidence integer NOT NULL DEFAULT 0,
        verified boolean NOT NULL DEFAULT false,
        position integer NOT NULL DEFAULT 0,
        created_at timestamptz DEFAULT now() NOT NULL,
        updated_at timestamptz DEFAULT now() NOT NULL
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS nexus_question_templates (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        department varchar(32) NOT NULL,
        gate varchar(16) NOT NULL,
        role varchar(64),
        question text NOT NULL,
        answer_strategy varchar(32) NOT NULL,
        priority integer NOT NULL DEFAULT 1,
        is_active boolean NOT NULL DEFAULT true,
        position integer NOT NULL DEFAULT 0
      )
    `);

    // Seed question templates if empty
    const qtCount = await db.execute(sql`SELECT COUNT(*)::int AS c FROM nexus_question_templates`);
    if (((qtCount as any).rows?.[0]?.c ?? 0) === 0) {
      console.log('DB: seeding nexus_question_templates...');
      await db.execute(sql`
        INSERT INTO nexus_question_templates (department, gate, role, question, answer_strategy, priority, position) VALUES
        -- Gate 0: CEO
        ('ceo','gate0','ceo','האם הפיתוח מקדם את האסטרטגיה הארגונית ל-3-5 שנים הקרובות?','ai_research',0,1),
        ('ceo','gate0','ceo','האם זה יהיה יתרון תחרותי בר-קיימא, או שמתחרים יעתיקו תוך 6 חודשים?','perplexity',0,2),
        ('ceo','gate0','ceo','מה העלות של לא לפתח? מה קורה אם נמנע מהרעיון?','ai_research',0,3),
        ('ceo','gate0','ceo','מי הלקוח האידיאלי? האם הוא קיים כבר בבסיס הלקוחות?','ai_research',1,4),
        ('ceo','gate0','ceo','האם הזמן הנוכחי בשוק נכון? למה עכשיו?','perplexity',1,5),
        ('ceo','gate0','ceo','מה ה-Exit Criteria — מתי נחליט שהמוצר לא עובד?','manual_only',0,6),
        ('ceo','gate0','ceo','מי הבעלים של ההצלחה — מי ישא באחריות?','manual_only',1,7),
        -- Gate 0: CFO
        ('finance','gate0','cfo','מה ה-Total Cost of Ownership — פיתוח + תחזוקה + תשתית ל-3 שנים?','ai_research',0,1),
        ('finance','gate0','cfo','מה ה-Break-Even Point — בכמה לקוחות הפרויקט מחזיר את עצמו?','ai_research',0,2),
        ('finance','gate0','cfo','מה ה-Opportunity Cost — במה מוותרים בשביל הפרויקט הזה?','ai_research',1,3),
        ('finance','gate0','cfo','מה ה-ROI המינימלי שמצדיק השקעה?','ai_research',0,4),
        ('finance','gate0','cfo','האם תקציב כולל Buffer 20-30% לחריגות?','manual_only',0,5),
        ('finance','gate0','cfo','מה קורה לתזרים אם הפרויקט מתעכב 3-6 חודשים?','ai_research',1,6),
        ('finance','gate0','cfo','מה מודל ההכנסה — SaaS חודשי? Freemium? רישיון?','ai_research',0,7),
        -- Gate 0: CTO
        ('cto','gate0','cto','האם המוצר בנוי על Stack הנוכחי שלנו?','codebase_scan',0,1),
        ('cto','gate0','cto','מה ה-Technical Debt הקיים שיאט את הפיתוח?','codebase_scan',0,2),
        ('cto','gate0','cto','האם יש Single Point of Failure בארכיטקטורה המוצעת?','ai_research',0,3),
        ('cto','gate0','cto','עד כמה ניתן ל-Scale? מה קורה עם פי 10 משתמשים?','ai_research',1,4),
        ('cto','gate0','cto','האם יש Dependencies על צדדים שלישיים שמייצרים סיכון?','codebase_scan',0,5),
        ('cto','gate0','cto','כמה זמן יקח MVP שניתן לבדוק עם לקוחות?','ai_research',0,6),
        ('cto','gate0','cto','האם הצוות הנוכחי מסוגל לפתח את זה?','manual_only',1,7),
        ('cto','gate0','cto','מה ה-Security Posture? דרישות ציות שלא מומשו?','codebase_scan',0,8),
        -- Gate 0: Marketing
        ('marketing','gate0','cmo','מה גודל ה-TAM ומה ה-SAM הריאלי?','perplexity',0,1),
        ('marketing','gate0','cmo','מי ה-ICP? האם יש 5 כאלה שניתן לראיין?','ai_research',0,2),
        ('marketing','gate0','cmo','מה המסר השיווקי הראשי ב-10 מילים?','ai_research',1,3),
        ('marketing','gate0','cmo','מה ה-CAC המוערך ומה ה-LTV?','ai_research',0,4),
        ('marketing','gate0','cmo','מי המתחרים הישירים? מה נקודת ההבדלה?','perplexity',0,5),
        ('marketing','gate0','cmo','האם יש חלון זמן שמתחרה עלול לסגור?','perplexity',1,6),
        -- Gate 0: Legal
        ('legal','gate0','legal','האם המוצר נכנס לרגולציה ספציפית (GDPR, HIPAA, SOC2)?','ai_research',0,1),
        ('legal','gate0','legal','אילו נתוני משתמשים נאסף ואיפה הם שמורים?','codebase_scan',0,2),
        ('legal','gate0','legal','האם שם המוצר רשום כסימן מסחרי?','manual_only',1,3),
        ('legal','gate0','legal','אם יש Data Breach — מה חשיפת האחריות?','ai_research',0,4),
        ('legal','gate0','legal','האם יש IP Issues — קוד Open Source עם רישיון בעייתי?','codebase_scan',0,5),
        -- Gate 0: HR (new!)
        ('hr','gate0','hr','האם יש Capacity לקחת פרויקט נוסף?','manual_only',0,1),
        ('hr','gate0','hr','אילו תפקידים חסרים שצריך לגייס לפני שמתחילים?','ai_research',1,2),
        ('hr','gate0','hr','מה זמן הגיוס הצפוי לכל תפקיד?','ai_research',1,3),
        ('hr','gate0','hr','האם מישהו מהצוות הנוכחי יכול להתאים (Internal Mobility)?','manual_only',1,4),
        ('hr','gate0','hr','האם יש סיכון Retention — מפתחי מפתח עלולים לעזוב?','manual_only',0,5),
        -- Discovery: Product Manager
        ('product','discovery','pm','מהי הבעיה שאנחנו פותרים — בשפה של הלקוח?','ai_research',0,1),
        ('product','discovery','pm','מה ה-JTBD — מה הלקוח באמת מנסה להשיג?','ai_research',0,2),
        ('product','discovery','pm','מה ה-Status Quo — איך הלקוח פותר את הבעיה היום?','perplexity',0,3),
        ('product','discovery','pm','מה ה-Pain Level — האם הלקוח יעבור לפתרון חדש?','ai_research',1,4),
        ('product','discovery','pm','מה ה-Willingness to Pay ואיזה מודל תשלום?','ai_research',1,5),
        ('product','discovery','pm','אם נבנה רק פיצ׳ר אחד ב-MVP — מהו?','ai_research',0,6),
        ('product','discovery','pm','מה ה-Risk הגדול ביותר שיגרום לנו לעצור?','ai_research',0,7),
        -- Discovery: UX Researcher
        ('design','discovery','ux-researcher','מה הנקודות הכי כואבות ב-Flow הנוכחי?','codebase_scan',0,1),
        ('design','discovery','ux-researcher','מה ה-Mental Model של המשתמש?','ai_research',1,2),
        ('design','discovery','ux-researcher','מה ה-Accessibility Requirements?','ai_research',0,3),
        ('design','discovery','ux-researcher','מה יגרום למשתמש לחזור מחר? ומה יגרום לו לעזוב?','ai_research',0,4),
        -- Discovery: Engineering Lead
        ('cto','discovery','architect','מה ה-Architecture הנבחרת ולמה?','codebase_scan',0,1),
        ('cto','discovery','architect','מה ה-Non-Functional Requirements — Performance, Reliability, Scale?','ai_research',0,2),
        ('cto','discovery','architect','מה ה-Data Model הראשוני?','codebase_scan',0,3),
        ('cto','discovery','architect','מה ה-Tech Debt הצפוי ומתי נחזיר אותו?','codebase_scan',1,4),
        ('cto','discovery','architect','מה ה-Rollback Plan אם Deploy נכשל?','ai_research',0,5),
        -- Discovery: Security
        ('security','discovery','ciso','מה סיווג רגישות הנתונים?','ai_research',0,1),
        ('security','discovery','ciso','האם יש PII? מה מנגנון ההסכמה?','codebase_scan',0,2),
        ('security','discovery','ciso','מה מנגנון האותנטיקציה? האם MFA נדרש?','codebase_scan',0,3),
        ('security','discovery','ciso','האם יתבצע Penetration Test לפני Launch?','manual_only',1,4),
        ('security','discovery','ciso','האם הקוד עובר Static Analysis ו-Dependency Scanning?','codebase_scan',0,5),
        -- Discovery: CS
        ('cs','discovery','cs-lead','האם Onboarding של הפיצ׳ר ברור למשתמש חדש?','ai_research',0,1),
        ('cs','discovery','cs-lead','מה עומס ה-Support הצפוי מהפיצ׳ר?','ai_research',1,2),
        ('cs','discovery','cs-lead','האם אפשר לבנות Self-Service בלי צורך בתמיכה?','ai_research',0,3),
        -- Discovery: Sales
        ('sales','discovery','sales-lead','האם הפיצ׳ר יעזור למכור? איך?','ai_research',0,1),
        ('sales','discovery','sales-lead','מה ההתנגדויות הצפויות מלקוחות?','perplexity',0,2),
        ('sales','discovery','sales-lead','האם אפשר לגבות יותר (Upsell)?','ai_research',1,3),
        -- Gate 2: Investment Committee
        ('ceo','gate2','investment','האם ה-ROI מוצג עם 3 תרחישים — Pessimistic, Base, Optimistic?','ai_research',0,1),
        ('ceo','gate2','investment','האם דיברנו עם לפחות 10 לקוחות שאמרו כן אני אשלם?','manual_only',0,2),
        ('ceo','gate2','investment','מה Competitive Moat — מה ימנע מתחרה לבנות את זה?','perplexity',0,3),
        ('ceo','gate2','investment','האם הצוות שיבנה הוא הצוות הנכון?','manual_only',1,4),
        ('ceo','gate2','investment','האם כל סיכון מעל 20% קיבל מיטיגציה?','ai_research',0,5),
        -- Pre-PRD
        ('product','prePRD','pm','האם ניתן לסכם את המוצר במשפט אחד?','ai_research',0,1),
        ('product','prePRD','pm','האם כל Feature מקשר לכאב משתמש שזוהה?','ai_research',0,2),
        ('product','prePRD','pm','מה ה-Acceptance Criteria לכל פיצ׳ר?','ai_research',0,3),
        ('product','prePRD','pm','מה ה-OKRs ו-KPIs של כל פיצ׳ר?','ai_research',1,4)
        ON CONFLICT DO NOTHING
      `);
      console.log('DB: question templates seeded');
    }

    // Patch: sprint ordering + task ordering + brief linking
    await db.execute(sql`ALTER TABLE sprints ADD COLUMN IF NOT EXISTS sprint_order INTEGER DEFAULT 0`);
    await db.execute(sql`ALTER TABLE sprints ADD COLUMN IF NOT EXISTS brief_id UUID`);
    await db.execute(sql`ALTER TABLE sprint_tasks ADD COLUMN IF NOT EXISTS task_order INTEGER DEFAULT 0`);

    // Patch: nexus_dept_knowledge table for department internal knowledge
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS nexus_dept_knowledge (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        department varchar(32) NOT NULL,
        category varchar(32) NOT NULL,
        title varchar(255) NOT NULL,
        content text NOT NULL,
        is_active boolean NOT NULL DEFAULT true,
        position integer NOT NULL DEFAULT 0,
        created_at timestamp with time zone DEFAULT now() NOT NULL,
        updated_at timestamp with time zone DEFAULT now() NOT NULL
      )
    `);

    // Seed department knowledge if empty
    const knowledgeCount = await db.execute(sql`SELECT COUNT(*)::int AS c FROM nexus_dept_knowledge`);
    if (((knowledgeCount as any).rows?.[0]?.c ?? 0) === 0) {
      console.log('DB: seeding nexus_dept_knowledge...');
      await db.execute(sql`
        INSERT INTO nexus_dept_knowledge (department, category, title, content, position) VALUES
        ('ceo', 'responsibilities', 'תחומי אחריות', 'כדאיות עסקית, התאמה לשוק (Product-Market Fit), ניתוח מתחרים, אסטרטגיית צמיחה, קבלת החלטות GO/NO-GO', 0),
        ('ceo', 'metrics', 'מדדים עסקיים', 'ARR, MRR, Churn Rate (3%), LTV ($12,500), CAC ($833), LTV:CAC (15:1), NPS, Trial→Paid (15%)', 1),
        ('ceo', 'standards', 'קריטריוני החלטה', 'כל רעיון חייב לעבור: ROI חיובי תוך 18 חודש, לא פוגע ב-NPS, תואם חזון מוצר', 2),
        ('cto', 'responsibilities', 'תחומי אחריות', 'ארכיטקטורת מערכת, Tech Stack (TypeScript/React/Node/PostgreSQL), DevOps, Performance, Security Infrastructure, Code Review Standards', 0),
        ('cto', 'standards', 'סטנדרטים טכניים', 'TypeScript strict, ESLint, כל API עם Zod validation, כל DB change עם migration, Drizzle ORM, Tailwind CSS, RTL-first', 1),
        ('cto', 'metrics', 'מדדי ביצועים', 'Uptime 99.9%, API latency < 200ms, Build time < 3min, Zero critical CVEs, Test coverage > 70%', 2),
        ('cpo', 'responsibilities', 'תחומי אחריות', 'אסטרטגיית מוצר, UX, Product-Market Fit, תעדוף פיצ׳רים (MoSCoW), KPIs, User Research, Persona Management', 0),
        ('cpo', 'standards', 'עקרונות מוצר', 'Hebrew-first UI, RTL, נגישות WCAG 2.1 AA, Mobile-responsive, משפחה במרכז (לא רק המטופל)', 1),
        ('rnd', 'responsibilities', 'תחומי אחריות', 'מחקר טכני מעמיק, ספריות וכלים, POC, גישות מימוש, Trust Score לכל ספרייה, Code Samples', 0),
        ('rnd', 'standards', 'קריטריוני בחירת ספריות', 'GitHub stars > 1000, פעילות אחרונה < 3 חודשים, TypeScript support, MIT/Apache license, אין GPL', 1),
        ('design', 'responsibilities', 'תחומי אחריות', 'UX/UI Design, Design System, WCAG 2.1 AA, RTL Support, מגמות 2025, Wireframes, Micro-interactions', 0),
        ('design', 'standards', 'Design System', 'צבעים: Slate/Violet/Emerald, Font: Heebo, Spacing: Tailwind scale, Components: shadcn/ui, Dark mode support', 1),
        ('product', 'responsibilities', 'תחומי אחריות', 'User Stories (Given/When/Then), Acceptance Criteria, Sprint Planning, Backlog Management, DoD', 0),
        ('product', 'standards', 'תבנית Sprint', 'Sprint = 2 שבועות, Velocity ממוצע: 40 story points, Planning → Daily → Review → Retro', 1),
        ('security', 'responsibilities', 'תחומי אחריות', 'OWASP Top 10, Threat Modeling (STRIDE), GDPR, HIPAA-adjacent, AppSec, Pen Testing, Data Classification', 0),
        ('security', 'standards', 'דרישות אבטחה', 'נתוני בריאות = רגישים, הצפנה at rest + in transit, JWT + HttpOnly cookies, Rate limiting, Input validation עם Zod', 1),
        ('legal', 'responsibilities', 'תחומי אחריות', 'רישיונות קוד פתוח, GDPR, HIPAA-adjacent, Terms of Service, Privacy Policy, IP Protection, Data Retention', 0),
        ('legal', 'standards', 'כללי רישוי', 'MIT/Apache = OK, GPL = סיכון גבוה (צריך אישור), AGPL = אסור, כל dependency חייב בדיקת רישיון', 1),
        ('marketing', 'responsibilities', 'תחומי אחריות', 'GTM Strategy, SEO, Positioning, Content Marketing, Competitive Analysis, Messaging Framework, Channel Strategy', 0),
        ('marketing', 'standards', 'קהל יעד', 'B2C: משפחות עם קרוב עם דמנציה בישראל, גיל 35-65, דוברי עברית, Tech-savvy enough לאפליקציית ווב', 1),
        ('finance', 'responsibilities', 'תחומי אחריות', 'ROI Analysis, Cost-Benefit, Unit Economics, Budget, Stage-Gate Checkpoints, BI, Break-even Analysis', 0),
        ('finance', 'metrics', 'מודל עסקי', '$15/user/month, 25 users/org avg, $4,500/org/year, Dev cost per feature: $80-200K, Break-even: month 14, Payback: 18 months', 1)
        ON CONFLICT DO NOTHING
      `);
      console.log('DB: department knowledge seeded');
    }

    // Patch: create nexus_generated_docs table if missing
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS nexus_generated_docs (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        brief_id uuid NOT NULL REFERENCES nexus_briefs(id) ON DELETE CASCADE,
        doc_type varchar(32) NOT NULL,
        title varchar(255),
        content text,
        created_at timestamp with time zone DEFAULT now() NOT NULL
      )
    `);

    console.log('DB: schema patches applied');
  } catch (err: any) {
    console.error('DB startup check FAILED:', err?.code || '', err?.message || err);
    console.error('  → Check DATABASE_URL in .env. Run: npm run db:test');
  }
})().catch(() => {});

startServer(BASE_PORT);
