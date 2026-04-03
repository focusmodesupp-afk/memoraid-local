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
    // Seed ai-dev department if not exists
    await db.execute(sql`
      INSERT INTO nexus_dept_settings (department, label_he, emoji, is_active)
      VALUES ('ai-dev', 'תרגום AI לפיתוח', '🤖', true)
      ON CONFLICT (department) DO NOTHING
    `);
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

    // Patch: fix 'rnd' → 'rd' inconsistency in department knowledge (R&D dept ID must be 'rd')
    await db.execute(sql`UPDATE nexus_dept_knowledge SET department = 'rd' WHERE department = 'rnd'`);

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
        ('rd', 'responsibilities', 'תחומי אחריות', 'מחקר טכני מעמיק, ספריות וכלים, POC, גישות מימוש, Trust Score לכל ספרייה, Code Samples', 0),
        ('rd', 'standards', 'קריטריוני בחירת ספריות', 'GitHub stars > 1000, פעילות אחרונה < 3 חודשים, TypeScript support, MIT/Apache license, אין GPL', 1),
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
        ('finance', 'metrics', 'מודל עסקי', '$15/user/month, 25 users/org avg, $4,500/org/year, Dev cost per feature: $80-200K, Break-even: month 14, Payback: 18 months', 1),
        ('hr', 'responsibilities', 'תחומי אחריות', 'Capacity Analysis — מה AI מבצע vs מה דורש אנשים, תפקידים אנושיים נדרשים (PM, QA, DevOps, CS — לא מפתחים), סיכוני תלות ב-AI, Backup Plans', 0),
        ('hr', 'standards', 'מודל פיתוח AI', 'כל הפיתוח מתבצע ע"י Claude Code AI. אין צוות פיתוח אנושי. יש צורך באנשים ל-Product Management, QA, DevOps, Customer Support בלבד.', 1),
        ('cs', 'responsibilities', 'תחומי אחריות', 'Onboarding Experience, Churn Prevention, NPS Impact, Support Load Analysis, Self-Service Feasibility, Adoption Planning', 0),
        ('cs', 'standards', 'פרופיל לקוחות', 'המשתמשים הם בני משפחה של חולי דמנציה/אלצהיימר — אנשים תחת לחץ רגשי כבד. כל שינוי UX חייב להיות פשוט, ברור ולא מבלבל.', 1),
        ('sales', 'responsibilities', 'תחומי אחריות', 'Sales Impact, Pricing/Upsell, Objection Handling, Channel Strategy, Partnerships (ארגוני דמנציה, בתי חולים, קופות חולים)', 0),
        ('sales', 'standards', 'קהל יעד מכירות', 'B2C ישראל: משפחות גיל 35-65 עם קרוב חולה דמנציה. ערוצים: דיגיטלי, שיתופי פעולה עם ארגוני בריאות, רופאים מפנים.', 1),
        ('ai-dev', 'responsibilities', 'תחומי אחריות', 'תרגום מחקר רב-מחלקתי לתכנית פיתוח Claude Code. הפרדה ל-5 שכבות: User FE, Admin FE, User BE, Admin BE, Server Core.', 0),
        ('ai-dev', 'standards', 'עקרונות פיתוח AI', 'סדר פיתוח: DB Schema → Server API → Admin UI → User UI. כל משימה self-contained. אין לבנות מחדש מה שקיים. TypeScript strict.', 1)
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

    // Patch: Team member CV/profile fields
    await db.execute(sql`ALTER TABLE nexus_dept_team_members ADD COLUMN IF NOT EXISTS bio TEXT`);
    await db.execute(sql`ALTER TABLE nexus_dept_team_members ADD COLUMN IF NOT EXISTS experience_years INTEGER`);
    await db.execute(sql`ALTER TABLE nexus_dept_team_members ADD COLUMN IF NOT EXISTS education TEXT`);
    await db.execute(sql`ALTER TABLE nexus_dept_team_members ADD COLUMN IF NOT EXISTS certifications TEXT[]`);
    await db.execute(sql`ALTER TABLE nexus_dept_team_members ADD COLUMN IF NOT EXISTS domain_expertise TEXT[]`);
    await db.execute(sql`ALTER TABLE nexus_dept_team_members ADD COLUMN IF NOT EXISTS languages TEXT[]`);
    await db.execute(sql`ALTER TABLE nexus_dept_team_members ADD COLUMN IF NOT EXISTS methodology TEXT`);
    await db.execute(sql`ALTER TABLE nexus_dept_team_members ADD COLUMN IF NOT EXISTS personality TEXT`);
    await db.execute(sql`ALTER TABLE nexus_dept_team_members ADD COLUMN IF NOT EXISTS achievements TEXT`);
    await db.execute(sql`ALTER TABLE nexus_dept_team_members ADD COLUMN IF NOT EXISTS background TEXT`);
    await db.execute(sql`ALTER TABLE nexus_dept_team_members ADD COLUMN IF NOT EXISTS work_history JSONB DEFAULT '[]'`);

    // CV seed data: run `node scripts/seed-nexus-cv-data.mjs` to populate full CVs for all team members
    const cvSeeds: { dept: string; level: string; data: Record<string, any> }[] = [
      // ═══ CEO Department ═══
      { dept: 'ceo', level: 'clevel', data: {
        bio: 'מנכ"ל ותיק עם 25+ שנות ניסיון בהובלת חברות טכנולוגיה מ-Seed ועד IPO. מומחה בבניית ארגונים, גיוסי הון וכניסה לשווקים בינלאומיים. מוביל אסטרטגיה עסקית מבוססת נתונים.',
        experience_years: 25, education: 'MBA Harvard Business School, B.Sc Computer Science — Technion',
        background: 'הוביל 3 חברות ל-Exit מוצלח (שתיים IPO, אחת M&A ב-$2.1B). בעל ניסיון ב-board של 5 חברות ציבוריות. מרצה אורח ב-Stanford GSB.',
        achievements: 'הוביל IPO של TechVision ($4.2B valuation)\nגיוס סבב D של $180M ב-DataPrime\nהכפלת ARR מ-$12M ל-$85M תוך 3 שנים\nבניית צוות גלובלי של 400+ עובדים',
        certifications: '{CFA,"Board Governance Certificate (NACD)","YPO Member"}',
        domain_expertise: '{"SaaS B2B","Digital Health","FinTech","Enterprise Software","AI/ML Products"}',
        languages: '{"Hebrew","English","Mandarin (Basic)"}',
        methodology: 'OKR-driven, Data-informed decisions, Stage-Gate for product, Lean Startup for innovation',
        personality: 'ויזיונרי, מונע תוצאות, בונה תרבות, מעדיף speed over perfection, אמפתי אך דרשן',
        work_history: '[{"company":"TechVision","role":"CEO & Co-Founder","years":"2018-2025","highlights":"Led from Seed to IPO at $4.2B valuation, 400+ employees globally"},{"company":"DataPrime","role":"CEO","years":"2013-2018","highlights":"Grew ARR from $12M to $85M, raised $180M Series D"},{"company":"Microsoft","role":"GM, Cloud Division","years":"2008-2013","highlights":"Led Azure adoption in EMEA, grew division 340%"},{"company":"IDF Intelligence","role":"Technology Officer","years":"2000-2003","highlights":"Unit 8200, led signal processing R&D team"}]'
      }},
      // ═══ CTO Department — Chief ═══
      { dept: 'cto', level: 'clevel', data: {
        bio: 'CTO עם 20+ שנות ניסיון בארכיטקטורת מערכות Large-Scale, Cloud Infrastructure, ו-AI/ML. מוביל טרנספורמציות טכנולוגיות בחברות מ-startup ועד enterprise.',
        experience_years: 22, education: 'M.Sc Computer Science (Distributed Systems) — Technion, B.Sc Mathematics & CS — Tel Aviv University',
        background: 'בנה מערכות שמשרתות 50M+ משתמשים. מומחה ב-microservices, event-driven architecture, ו-real-time data pipelines. תורם לפרויקטי open-source.',
        achievements: 'ארכיטקטורת מערכת real-time ל-50M users ב-ScaleUp\nמעבר מ-monolith ל-microservices ב-0 downtime\nהקמת AI/ML pipeline שחסך $2M/שנה\n15 פטנטים רשומים',
        certifications: '{"AWS Solutions Architect Professional","Google Cloud Professional Architect","Kubernetes CKA","HashiCorp Terraform Associate"}',
        domain_expertise: '{"Cloud Architecture","Distributed Systems","AI/ML Infrastructure","DevOps","Real-time Processing","Security Architecture"}',
        languages: '{"Hebrew","English","TypeScript","Python","Go","Rust","SQL"}',
        methodology: 'Architecture Decision Records (ADR), RFC-driven design, Trunk-Based Development, Infrastructure as Code, Chaos Engineering',
        personality: 'אנליטי, שיטתי, מעדיף פשטות על מורכבות, mentor טבעי, obsessed with reliability',
        work_history: '[{"company":"ScaleUp Technologies","role":"CTO","years":"2019-2025","highlights":"Built platform serving 50M users, 99.99% uptime, team of 85 engineers"},{"company":"Amazon Web Services","role":"Principal Engineer","years":"2014-2019","highlights":"Led Lambda cold-start optimization, 15 patents filed"},{"company":"Waze","role":"VP Engineering","years":"2010-2014","highlights":"Scaled from 5M to 50M users pre-acquisition by Google"},{"company":"IDF","role":"Team Lead, Unit 81","years":"2002-2005","highlights":"Built real-time intelligence systems"}]'
      }},
      // ═══ CPO ═══
      { dept: 'cpo', level: 'clevel', data: {
        bio: 'מנהל מוצר ראשי עם 18 שנות ניסיון ב-product strategy, UX research, ו-growth. בנה מוצרים שמשרתים מיליוני משתמשים בתחומי Health Tech, SaaS ו-Consumer.',
        experience_years: 18, education: 'MBA INSEAD, B.Des Industrial Design — Bezalel Academy',
        background: 'שילוב ייחודי של design thinking עם business acumen. הוביל product orgs של 50+ אנשים. מאמין ב-outcome-driven development.',
        achievements: 'הובלת מוצר מ-0 ל-2M users ב-HealthBridge\nשיפור retention ב-40% דרך product-led growth\nבניית design system שאומץ ב-3 חברות\nדובר ב-Mind the Product, ProductCon',
        certifications: '{"Pragmatic Marketing Certified","SAFe Product Owner","Google UX Design Certificate"}',
        domain_expertise: '{"Product Strategy","UX Research","Growth","Product-Led Growth","Healthcare UX","Accessibility"}',
        languages: '{"Hebrew","English","French","Figma","SQL","Python (Data Analysis)"}',
        methodology: 'Jobs-to-be-Done (JTBD), Dual-Track Agile, RICE scoring, North Star Metric, Continuous Discovery',
        personality: 'אמפתי, user-obsessed, דאטה-driven אבל לא מפחד מאינטואיציה, collaborative, מגשר בין tech ל-business',
        work_history: '[{"company":"HealthBridge","role":"CPO","years":"2020-2025","highlights":"0 to 2M users, 40% retention improvement, $50M ARR"},{"company":"Spotify","role":"Director of Product","years":"2016-2020","highlights":"Led Discover Weekly personalization, 15% engagement increase"},{"company":"Wix","role":"Senior PM","years":"2012-2016","highlights":"Built Wix ADI (AI Design Intelligence)"},{"company":"IBM Design","role":"UX Researcher","years":"2008-2012","highlights":"Enterprise UX transformation program"}]'
      }},
      // ═══ R&D Lead ═══
      { dept: 'rd', level: 'clevel', data: {
        bio: 'ראש מחלקת R&D עם 15 שנות ניסיון בפיתוח מוצרים, ניהול צוותי פיתוח, ו-technical leadership. מתמחה בזיהוי טכנולוגיות חדשות והבאתן ל-production.',
        experience_years: 15, education: 'M.Sc AI & Machine Learning — Hebrew University, B.Sc Computer Science — BGU',
        background: 'ניהל צוותי R&D של 30+ מפתחים. מומחה בהערכת ספריות וטכנולוגיות חדשות, POC מהיר, ו-technical due diligence.',
        achievements: 'בניית מערכת NLP בעברית עם 94% accuracy\nהובלת POC ל-15 טכנולוגיות חדשות בשנה\n3 מאמרים אקדמיים שפורסמו\nOpen-source contributor (2K+ GitHub stars)',
        certifications: '{"Deep Learning Specialization (Coursera/Stanford)","MongoDB Certified Developer","React Native Specialist"}',
        domain_expertise: '{"NLP","Computer Vision","Edge Computing","React Ecosystem","Node.js","PostgreSQL"}',
        languages: '{"Hebrew","English","TypeScript","Python","Rust","C++"}',
        methodology: 'Spike-driven research, POC before commitment, Build vs Buy matrix, Technical Radar (ThoughtWorks style)',
        personality: 'סקרן, hands-on, חותר לעומק, evidence-based, מעדיף לבנות prototype לפני שמדבר',
        work_history: '[{"company":"AI Dynamics","role":"VP R&D","years":"2020-2025","highlights":"Built Hebrew NLP engine, 30-person R&D team"},{"company":"Google","role":"Senior SWE, Research","years":"2015-2020","highlights":"TensorFlow contributor, 3 published papers"},{"company":"Check Point","role":"R&D Team Lead","years":"2010-2015","highlights":"Led threat intelligence engine development"}]'
      }},
      // ═══ Security (CISO) ═══
      { dept: 'security', level: 'clevel', data: {
        bio: 'CISO עם 20 שנות ניסיון באבטחת מידע, compliance, ו-incident response. רקע מודיעיני צבאי, מומחה OWASP ו-Zero Trust Architecture.',
        experience_years: 20, education: 'M.Sc Cybersecurity — Georgia Tech (Online), B.Sc Computer Engineering — Technion',
        background: 'הוביל תוכניות אבטחה בארגונים עם 10,000+ עובדים. ניסיון ב-SOC 2, ISO 27001, HIPAA, GDPR compliance. מרצה בכנסי אבטחה בינלאומיים.',
        achievements: 'הטמעת Zero Trust Architecture ב-FinSecure (0 breaches ב-3 שנים)\nהובלת SOC 2 Type II certification ב-4 חודשים\nזיהוי ומניעת APT attack שווי $50M\nבניית Security Champions program ל-200 מפתחים',
        certifications: '{"CISSP","CISM","CEH","AWS Security Specialty","OSCP","ISO 27001 Lead Auditor"}',
        domain_expertise: '{"Application Security","Cloud Security","Threat Modeling","Incident Response","Compliance (SOC2/ISO/HIPAA/GDPR)","Penetration Testing"}',
        languages: '{"Hebrew","English","Russian","Python","Bash","Assembly"}',
        methodology: 'Defense in Depth, Shift-Left Security, Threat Modeling (STRIDE), Security by Design, Bug Bounty programs',
        personality: 'פרנואיד (באופן מקצועי), מדויק, שיטתי, zero-tolerance לפשרות באבטחה, מורה סבלני',
        work_history: '[{"company":"FinSecure","role":"CISO","years":"2019-2025","highlights":"Zero Trust implementation, SOC 2 in 4 months, 0 breaches"},{"company":"CyberArk","role":"Director of Security","years":"2014-2019","highlights":"Led product security for PAM platform"},{"company":"NSO Group","role":"Security Architect","years":"2010-2014","highlights":"Offensive security research"},{"company":"IDF Intelligence","role":"Cyber Operations","years":"2004-2008","highlights":"Unit 8200, offensive cyber operations"}]'
      }},
      // ═══ Finance (CFO) ═══
      { dept: 'finance', level: 'clevel', data: {
        bio: 'CFO עם 18 שנות ניסיון בניהול פיננסי, גיוסי הון, M&A, ו-IPO readiness. מומחה ב-unit economics, financial modeling, ו-investor relations.',
        experience_years: 18, education: 'MBA Finance — Wharton, B.A Economics & Accounting — Tel Aviv University, CPA (Israel)',
        background: 'ניהל פיננסים של חברות מ-Seed ($2M) ועד Post-IPO ($3B). ניסיון ב-5 סבבי גיוס, 2 IPOs, ו-3 M&A transactions.',
        achievements: 'הובלת IPO של CloudNine ($3.2B valuation)\nגיוס מצטבר של $450M\nבניית מודל פיננסי שחזה ARR ב-±3% accuracy\nחיסכון של $8M/שנה דרך אופטימיזציית עלויות cloud',
        certifications: '{"CPA (Israel)","CFA Level III","SOX Compliance Expert"}',
        domain_expertise: '{"Financial Modeling","SaaS Metrics","Unit Economics","IPO Readiness","M&A","Investor Relations","Cost Optimization"}',
        languages: '{"Hebrew","English","Excel/Sheets","SQL","Python (Pandas)"}',
        methodology: 'Zero-Based Budgeting, Stage-Gate investment, Monthly Business Review, 13-week cash flow forecasting',
        personality: 'מדויק עד לשקל, conservative בתחזיות, שקוף עם הדירקטוריון, data-first, אנטי-hype',
        work_history: '[{"company":"CloudNine","role":"CFO","years":"2019-2025","highlights":"Led IPO at $3.2B, raised $450M total, SOX compliance"},{"company":"Fiverr","role":"VP Finance","years":"2015-2019","highlights":"Pre-IPO financial infrastructure, SEC reporting"},{"company":"Deloitte","role":"Senior Manager, Tech M&A","years":"2010-2015","highlights":"Advised on $2B+ in tech transactions"},{"company":"PwC","role":"Auditor","years":"2007-2010","highlights":"Big 4 audit experience, tech sector"}]'
      }},
    ];

    for (const seed of cvSeeds) {
      try {
        const d = seed.data;
        // Update text fields (only if bio is still NULL — won't overwrite manual edits)
        await db.execute(sql`
          UPDATE nexus_dept_team_members SET
            bio = ${d.bio},
            experience_years = ${d.experience_years},
            education = ${d.education},
            background = ${d.background},
            achievements = ${d.achievements},
            methodology = ${d.methodology},
            personality = ${d.personality}
          WHERE department = ${seed.dept} AND level = ${seed.level} AND bio IS NULL
        `);
        // Array and JSONB fields via raw SQL
        await db.execute(sql.raw(`
          UPDATE nexus_dept_team_members SET
            certifications = '${d.certifications}'::text[],
            domain_expertise = '${d.domain_expertise}'::text[],
            languages = '${d.languages}'::text[],
            work_history = '${d.work_history.replace(/'/g, "''")}'::jsonb
          WHERE department = '${seed.dept}' AND level = '${seed.level}'
            AND (certifications IS NULL OR array_length(certifications, 1) IS NULL)
        `));
      } catch { /* seed already applied or no matching row */ }
    }

    // Patch 0042: add department column to nexus_brief_web_sources (per-agent deep research)
    await db.execute(sql`ALTER TABLE nexus_brief_web_sources ADD COLUMN IF NOT EXISTS department VARCHAR(32)`);

    // Patch 0043: NEXUS V2 — Meeting rounds tables + columns
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS nexus_brief_rounds (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        brief_id UUID NOT NULL REFERENCES nexus_briefs(id) ON DELETE CASCADE,
        round_number INTEGER NOT NULL,
        round_type VARCHAR(32) NOT NULL,
        status VARCHAR(16) NOT NULL DEFAULT 'pending',
        synthesis_output TEXT,
        synthesis_model VARCHAR(64),
        synthesis_tokens INTEGER DEFAULT 0,
        synthesis_cost_usd VARCHAR(16) DEFAULT '0',
        participant_count INTEGER DEFAULT 0,
        completed_count INTEGER DEFAULT 0,
        started_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS nexus_brief_round_results (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        brief_id UUID NOT NULL REFERENCES nexus_briefs(id) ON DELETE CASCADE,
        round_id UUID NOT NULL REFERENCES nexus_brief_rounds(id) ON DELETE CASCADE,
        team_member_id UUID,
        department VARCHAR(32) NOT NULL,
        employee_name VARCHAR(128),
        employee_role VARCHAR(128),
        employee_level VARCHAR(16),
        status VARCHAR(16) NOT NULL DEFAULT 'pending',
        output TEXT,
        output_json JSONB,
        prompt_snapshot TEXT,
        model_used VARCHAR(64),
        tokens_used INTEGER DEFAULT 0,
        cost_usd VARCHAR(16) DEFAULT '0',
        error_message TEXT,
        web_sources_used INTEGER DEFAULT 0,
        started_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      )
    `);
    await db.execute(sql`ALTER TABLE nexus_briefs ADD COLUMN IF NOT EXISTS research_mode VARCHAR(16) DEFAULT 'quick'`);
    await db.execute(sql`ALTER TABLE nexus_briefs ADD COLUMN IF NOT EXISTS current_round INTEGER DEFAULT 0`);
    await db.execute(sql`ALTER TABLE nexus_briefs ADD COLUMN IF NOT EXISTS round_1_synthesis TEXT`);
    await db.execute(sql`ALTER TABLE nexus_briefs ADD COLUMN IF NOT EXISTS round_2_synthesis TEXT`);
    await db.execute(sql`ALTER TABLE nexus_briefs ADD COLUMN IF NOT EXISTS round_3_synthesis TEXT`);
    await db.execute(sql`ALTER TABLE nexus_brief_web_sources ADD COLUMN IF NOT EXISTS team_member_id UUID`);
    await db.execute(sql`ALTER TABLE nexus_brief_web_sources ADD COLUMN IF NOT EXISTS round_number INTEGER`);

    // Patch 0044: NEXUS Idea Bank tables
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS nexus_ideas (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(500) NOT NULL,
        description TEXT,
        category VARCHAR(32) DEFAULT 'feature',
        source_type VARCHAR(16) NOT NULL,
        source_brief_id UUID REFERENCES nexus_briefs(id) ON DELETE SET NULL,
        source_department VARCHAR(32),
        source_employee_name VARCHAR(128),
        source_round INTEGER,
        priority VARCHAR(16) DEFAULT 'medium',
        score INTEGER DEFAULT 0,
        upvotes INTEGER DEFAULT 0,
        downvotes INTEGER DEFAULT 0,
        voted_by JSONB DEFAULT '[]',
        ceo_recommendation VARCHAR(32),
        executive_notes TEXT,
        status VARCHAR(16) DEFAULT 'new',
        target_quarter VARCHAR(8),
        estimated_hours INTEGER,
        estimated_cost VARCHAR(16),
        affected_environment VARCHAR(16),
        affected_files TEXT[] DEFAULT '{}',
        tags TEXT[] DEFAULT '{}',
        sprint_id UUID,
        brief_id_created_from UUID,
        related_idea_ids UUID[] DEFAULT '{}',
        created_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS nexus_idea_comments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        idea_id UUID NOT NULL REFERENCES nexus_ideas(id) ON DELETE CASCADE,
        author_type VARCHAR(16) NOT NULL,
        author_name VARCHAR(128),
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      )
    `);

    console.log('DB: schema patches applied');
  } catch (err: any) {
    console.error('DB startup check FAILED:', err?.code || '', err?.message || err);
    console.error('  → Check DATABASE_URL in .env. Run: npm run db:test');
  }
})().catch(() => {});

startServer(BASE_PORT);
