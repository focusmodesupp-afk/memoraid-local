import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import { and, desc, eq, gte, lte, lt, gt, inArray, isNull, sql } from 'drizzle-orm';
import { db } from './db';
import { sendInviteEmail, sendPasswordResetEmail } from './email';
import { families, familyInvites, familyMembers, users, patients, tasks, sessions, notifications, notificationPreferences, userSettings, passwordResetTokens, adminPlans, questionnaires, questionnaireResponses, medicalDocuments, memoryStories, medications, rightsCategories, rightsRequests, appointments } from '../../shared/schemas/schema';
import { syncTaskToCalendar, getAuthUrlForLogin, exchangeAuthCodeForUserInfo, saveTokens } from './services/googleCalendar';
import { encrypt, decrypt } from './services/encryption';
import { saveMedicalDocument, getMedicalDocumentBuffer, generateSignedToken, validateSignedToken } from './services/medicalDocumentStorage';
import { analyzeMedicalDocument, extractDocumentMetadata } from './services/medicalDocumentAnalyzer';
import { runDocumentSyncEngine } from './services/documentSyncEngine';
import { vitals, labResults, referrals, patientDiagnoses, patientAllergies, patientAssessments, patientHealthInsights, syncEvents, medicalBrainRules, taskChecklists, professionals } from '../../shared/schemas/schema';
import { assignUniqueColor } from '../../shared/constants/userColors';
import { stripe } from './stripe';

export const routes = Router();

// ──────────────────────────────────────────────────────────────────────────────
// Safe patient columns: only columns guaranteed to exist BEFORE the Phase-2
// migration (0035_medical_brain.sql) is applied.  Use this anywhere we SELECT
// or RETURNING from `patients` so that queries succeed even on un-migrated DBs.
// Phase-2 columns (adlScore, iadlScore, fallRiskLevel, painLevel, etc.) are
// handled separately in guarded try/catch blocks.
// ──────────────────────────────────────────────────────────────────────────────
const SAFE_PATIENT_COLS = {
  id: patients.id,
  familyId: patients.familyId,
  fullName: patients.fullName,
  dateOfBirth: patients.dateOfBirth,
  gender: patients.gender,
  photoUrl: patients.photoUrl,
  idNumber: patients.idNumber,
  primaryDiagnosis: patients.primaryDiagnosis,
  chronicConditions: patients.chronicConditions,
  allergies: patients.allergies,
  emergencyContact: patients.emergencyContact,
  emergencyContactPhone: patients.emergencyContactPhone,
  primaryDoctorName: patients.primaryDoctorName,
  primaryDoctorPhone: patients.primaryDoctorPhone,
  healthFundName: patients.healthFundName,
  notes: patients.notes,
  isPrimary: patients.isPrimary,
  profileCompletionScore: patients.profileCompletionScore,
  onboardingStep: patients.onboardingStep,
  insuranceNumber: patients.insuranceNumber,
  bloodType: patients.bloodType,
  mobilityStatus: patients.mobilityStatus,
  cognitiveStatus: patients.cognitiveStatus,
  careLevel: patients.careLevel,
  lastAssessmentDate: patients.lastAssessmentDate,
  careStage: patients.careStage,
  stageUpdatedAt: patients.stageUpdatedAt,
  createdAt: patients.createdAt,
} as const;

// Phase-2 columns that only exist after running migration 0035.
// Each write is wrapped in a guarded helper so failures are silent.
const PHASE2_PATIENT_FIELDS = new Set([
  'adlScore','iadlScore','fallRiskLevel','painLevel','nutritionStatus',
  'height','weight','specialists','sdohFactors','vaccinationHistory',
  'lastHospitalizationDate','advanceDirectives','advanceDirectivesNotes',
  'dnrStatus','familyHistory',
]);

/** Split an update object into safe (Phase-1) and phase-2 parts. */
function splitPatientUpdate(update: Record<string, unknown>) {
  const safe: Record<string, unknown> = {};
  const phase2: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(update)) {
    if (PHASE2_PATIENT_FIELDS.has(k)) phase2[k] = v;
    else safe[k] = v;
  }
  return { safe, phase2 };
}

/** Apply phase-2 fields silently (no-op if migration not yet run). */
async function applyPhase2PatientUpdate(patientId: string, phase2: Record<string, unknown>) {
  if (Object.keys(phase2).length === 0) return;
  try {
    await db.update(patients).set(phase2 as any).where(eq(patients.id, patientId));
  } catch (_) {
    // Phase-2 migration not applied yet — ignore
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Health – תמיד 200 (לוודא שהשרת עולה). /health/db בודק חיבור ל-DB
// ──────────────────────────────────────────────────────────────────────────────

routes.get('/health', (_req, res) => res.json({ ok: true }));

routes.get('/health/db', async (_req, res) => {
  try {
    await db.execute(sql`SELECT 1`);
    res.json({ ok: true, db: true });
  } catch (err: any) {
    console.error('Health DB failed:', err?.code, err?.message);
    const code = err?.code || '';
    const hint = code === 'SELF_SIGNED_CERT_IN_CHAIN'
      ? 'הוסף NODE_TLS_REJECT_UNAUTHORIZED=0 ל-.env או הרץ את השרת שוב'
      : code === 'ECONNREFUSED'
        ? 'PostgreSQL לא רץ או host/port שגויים'
        : code === '28P01'
          ? 'סיסמה/משתמש שגויים ב-DATABASE_URL'
          : '';
    res.status(500).json({
      ok: false,
      db: false,
      error: err?.message ?? 'DB connection failed',
      code,
      hint,
    });
  }
});

// Dev-only middleware: blocks in production, requires DEV_SECRET otherwise
const DEV_SECRET = process.env.DEV_SECRET?.trim();
function requireDevSecret(req: Request, res: Response, next: NextFunction) {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }
  const secret = (req.headers['x-dev-secret'] as string) || (req.query.devSecret as string);
  if (!DEV_SECRET || secret !== DEV_SECRET) {
    return res.status(403).json({ error: 'Forbidden', hint: 'Set DEV_SECRET in .env and pass X-Dev-Secret header or ?devSecret= query' });
  }
  next();
}

// Temporary endpoint to create password_reset_tokens table
routes.post('/health/create-password-reset-table', requireDevSecret, async (_req, res) => {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "token" varchar(128) NOT NULL UNIQUE,
        "expires_at" timestamp with time zone NOT NULL,
        "used" boolean DEFAULT false NOT NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL
      )
    `);
    
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "password_reset_tokens_token_idx" ON "password_reset_tokens"("token")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "password_reset_tokens_user_id_idx" ON "password_reset_tokens"("user_id")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "password_reset_tokens_expires_at_idx" ON "password_reset_tokens"("expires_at")`);
    
    res.json({ ok: true, message: 'Table created successfully!' });
  } catch (err: any) {
    console.error('Create table failed:', err);
    res.status(500).json({ ok: false, error: err?.message ?? 'Failed to create table' });
  }
});

// Temporary endpoint to update admin password (single admin by email)
const updateAdminPasswordHandler = async (_req: any, res: any) => {
  try {
    const newPassword = process.env.DEV_RESET_PASSWORD;
    if (!newPassword) {
      return res.status(503).json({ ok: false, error: 'DEV_RESET_PASSWORD not set in .env' });
    }
    const email = process.env.DEV_ADMIN_EMAIL || 'yoav@memoraid.co';
    
    const bcrypt = await import('bcryptjs');
    const hashedPassword = await bcrypt.default.hash(newPassword, 10);
    
    const result = await db.execute(sql`
      UPDATE admin_users 
      SET password_hash = ${hashedPassword}
      WHERE email = ${email}
      RETURNING id, full_name, email
    `);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        ok: false, 
        error: 'Admin user not found',
        hint: 'Run: node scripts/create-admin.mjs'
      });
    }
    
    const user = result.rows[0] as { id: string; full_name: string; email: string };
    res.json({ 
      ok: true, 
      message: 'Password updated successfully!',
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
      },
      credentials: {
        email,
        password: newPassword,
      }
    });
  } catch (err: any) {
    console.error('Update password failed:', err);
    if (err?.code === '42P01') {
      return res.status(503).json({ 
        ok: false, 
        error: 'admin_users table not found',
        hint: 'Run: node scripts/create-admin.mjs'
      });
    }
    res.status(500).json({ ok: false, error: err?.message ?? 'Failed to update password' });
  }
};

routes.get('/health/update-admin-password', requireDevSecret, updateAdminPasswordHandler);
routes.post('/health/update-admin-password', requireDevSecret, updateAdminPasswordHandler);

// Reset ALL passwords (admin_users + users) – dev only, uses DEV_RESET_PASSWORD
const resetAllPasswordsHandler = async (_req: any, res: any) => {
  try {
    const resetPassword = process.env.DEV_RESET_PASSWORD;
    if (!resetPassword) {
      return res.status(503).json({ ok: false, error: 'DEV_RESET_PASSWORD not set in .env' });
    }
    const hash = await bcrypt.hash(resetPassword, 10);
    let adminCount = 0;
    let userCount = 0;

    try {
      const adminRes = await db.execute(sql`
        UPDATE admin_users SET password_hash = ${hash}
        RETURNING id, email, full_name
      `);
      adminCount = adminRes.rows.length;
    } catch (e: any) {
      if (e?.code === '42P01') {
        /* admin_users table missing */
      } else throw e;
    }

    try {
      const userRes = await db.execute(sql`
        UPDATE users SET password_hash = ${hash}
        RETURNING id, email, full_name
      `);
      userCount = userRes.rows.length;
    } catch (e: any) {
      if (e?.code === '42P01') {
        /* users table missing */
      } else throw e;
    }

    res.json({
      ok: true,
      message: 'סיסמאות אופסו בהצלחה',
      admins: adminCount,
      users: userCount,
      password: resetPassword,
      adminLogin: '/admin/login',
      userLogin: '/login',
    });
  } catch (err: any) {
    console.error('reset-all-passwords:', err);
    res.status(500).json({ ok: false, error: err?.message ?? 'Failed' });
  }
};
routes.get('/health/reset-all-passwords', requireDevSecret, resetAllPasswordsHandler);
routes.post('/health/reset-all-passwords', requireDevSecret, resetAllPasswordsHandler);

// Temporary endpoint to create pipeline tables
const createPipelineTables = async (_req: any, res: any) => {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "pipelines" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "name" varchar(255) NOT NULL,
        "description" text,
        "type" varchar(64) NOT NULL,
        "status" varchar(32) DEFAULT 'active' NOT NULL,
        "config" jsonb,
        "schedule" varchar(128),
        "last_run" timestamp with time zone,
        "next_run" timestamp with time zone,
        "created_by" uuid REFERENCES "admin_users"("id") ON DELETE SET NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        "updated_at" timestamp with time zone DEFAULT now() NOT NULL
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "pipeline_runs" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "pipeline_id" uuid NOT NULL REFERENCES "pipelines"("id") ON DELETE CASCADE,
        "status" varchar(32) DEFAULT 'running' NOT NULL,
        "started_at" timestamp with time zone DEFAULT now() NOT NULL,
        "completed_at" timestamp with time zone,
        "duration_ms" integer,
        "records_processed" integer,
        "records_success" integer,
        "records_failed" integer,
        "error_message" text,
        "logs" jsonb,
        "triggered_by" uuid REFERENCES "admin_users"("id") ON DELETE SET NULL
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "pipeline_stages" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "pipeline_id" uuid NOT NULL REFERENCES "pipelines"("id") ON DELETE CASCADE,
        "name" varchar(255) NOT NULL,
        "stage_order" integer NOT NULL,
        "stage_type" varchar(64) NOT NULL,
        "config" jsonb,
        "timeout_seconds" integer DEFAULT 300,
        "retry_count" integer DEFAULT 0,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "pipeline_alerts" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "pipeline_id" uuid NOT NULL REFERENCES "pipelines"("id") ON DELETE CASCADE,
        "run_id" uuid REFERENCES "pipeline_runs"("id") ON DELETE CASCADE,
        "alert_type" varchar(64) NOT NULL,
        "severity" varchar(32) NOT NULL,
        "message" text NOT NULL,
        "resolved" boolean DEFAULT false NOT NULL,
        "resolved_at" timestamp with time zone,
        "resolved_by" uuid REFERENCES "admin_users"("id") ON DELETE SET NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL
      )
    `);

    await db.execute(sql`CREATE INDEX IF NOT EXISTS "pipelines_type_idx" ON "pipelines"("type")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "pipelines_status_idx" ON "pipelines"("status")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "pipeline_runs_pipeline_id_idx" ON "pipeline_runs"("pipeline_id")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "pipeline_runs_status_idx" ON "pipeline_runs"("status")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "pipeline_stages_pipeline_id_idx" ON "pipeline_stages"("pipeline_id")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "pipeline_alerts_pipeline_id_idx" ON "pipeline_alerts"("pipeline_id")`);

    const pipelinesCount = await db.execute(sql`SELECT COUNT(*) as count FROM pipelines`);
    const count = (pipelinesCount.rows[0] as any).count;
    
    if (count === '0' || count === 0) {
      await db.execute(sql`
        INSERT INTO "pipelines" ("name", "description", "type", "status", "schedule") VALUES
          ('Data Backup', 'גיבוי יומי של כל הנתונים', 'backup', 'active', '0 2 * * *'),
          ('User Analytics', 'עיבוד נתוני משתמשים ואנליטיקה', 'analytics', 'active', '0 */6 * * *'),
          ('Email Queue', 'עיבוד תור מיילים יוצאים', 'email', 'active', '*/5 * * * *'),
          ('Notification Sender', 'שליחת התראות ותזכורות', 'notification', 'active', '*/10 * * * *'),
          ('Task Reminders', 'תזכורות למשימות קרובות', 'reminder', 'active', '0 8,14,20 * * *'),
          ('Data Cleanup', 'ניקוי נתונים ישנים', 'cleanup', 'active', '0 3 * * 0'),
          ('Health Check', 'בדיקת תקינות המערכת', 'monitoring', 'active', '*/15 * * * *'),
          ('Stripe Sync', 'סנכרון מנויים עם Stripe', 'integration', 'active', '0 */4 * * *'),
          ('Error Aggregation', 'איסוף וניתוח שגיאות', 'monitoring', 'active', '*/30 * * * *'),
          ('Report Generation', 'יצירת דוחות אוטומטיים', 'reporting', 'active', '0 0 * * 1')
      `);
    }

    res.json({ ok: true, message: 'Pipeline tables created with 10 default pipelines!' });
  } catch (err: any) {
    console.error('Create pipeline tables failed:', err);
    res.status(500).json({ ok: false, error: err?.message ?? 'Failed to create tables' });
  }
};

routes.get('/health/create-pipeline-tables', requireDevSecret, createPipelineTables);
routes.post('/health/create-pipeline-tables', requireDevSecret, createPipelineTables);

// Create sprint tables (GET and POST for convenience)
const createSprintTables = async (_req: any, res: any) => {
  try {
    console.log('Creating sprint tables...');
    
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "sprints" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "name" varchar(255) NOT NULL,
        "goal" text,
        "start_date" timestamp with time zone NOT NULL,
        "end_date" timestamp with time zone NOT NULL,
        "status" varchar(32) DEFAULT 'planning' NOT NULL,
        "velocity" decimal(10, 2),
        "created_by" uuid REFERENCES "admin_users"("id") ON DELETE SET NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        "updated_at" timestamp with time zone DEFAULT now() NOT NULL
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "sprint_tasks" (
        "sprint_id" uuid NOT NULL REFERENCES "sprints"("id") ON DELETE CASCADE,
        "task_id" uuid NOT NULL REFERENCES "dev_tasks"("id") ON DELETE CASCADE,
        "story_points" integer,
        "added_at" timestamp with time zone DEFAULT now() NOT NULL,
        PRIMARY KEY ("sprint_id", "task_id")
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "sprint_activities" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "sprint_id" uuid NOT NULL REFERENCES "sprints"("id") ON DELETE CASCADE,
        "activity_type" varchar(64) NOT NULL,
        "description" text NOT NULL,
        "admin_user_id" uuid REFERENCES "admin_users"("id") ON DELETE SET NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL
      )
    `);

    console.log('Creating indexes...');
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "sprints_status_idx" ON "sprints"("status")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "sprints_start_date_idx" ON "sprints"("start_date")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "sprints_end_date_idx" ON "sprints"("end_date")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "sprint_tasks_sprint_id_idx" ON "sprint_tasks"("sprint_id")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "sprint_tasks_task_id_idx" ON "sprint_tasks"("task_id")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "sprint_activities_sprint_id_idx" ON "sprint_activities"("sprint_id")`);

    // Create default active sprint for Phase 5 - Integrations
    console.log('Creating default active sprint...');
    const now = new Date();
    const twoWeeksLater = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    
    await db.execute(sql`
      INSERT INTO "sprints" (name, goal, start_date, end_date, status)
      SELECT 
        'Sprint 12: Calendar Integration',
        'להשלים אינטגרציה עם Google Calendar, Outlook Calendar ו-Apple Calendar. כולל OAuth setup, sync משימות, ו-free/busy status.',
        ${now.toISOString()},
        ${twoWeeksLater.toISOString()},
        'active'
      WHERE NOT EXISTS (SELECT 1 FROM "sprints" WHERE status = 'active')
    `);

    console.log('Sprint tables created successfully!');
    res.json({ ok: true, message: 'Sprint tables created successfully! Active sprint created for Phase 5.' });
  } catch (err: any) {
    console.error('Create sprint tables failed:', err);
    res.status(500).json({ ok: false, error: err?.message ?? 'Failed to create tables' });
  }
};

routes.get('/health/create-sprint-tables', requireDevSecret, createSprintTables);
routes.post('/health/create-sprint-tables', requireDevSecret, createSprintTables);

// Temporary endpoint to create dev kanban tables with initial tasks
// Create dev kanban tables (GET and POST)
const createDevKanbanTables = async (_req: any, res: any) => {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "dev_columns" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "name" varchar(64) NOT NULL,
        "position" integer NOT NULL,
        "color" varchar(32),
        "created_at" timestamp with time zone DEFAULT now() NOT NULL
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "dev_tasks" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "title" varchar(255) NOT NULL,
        "description" text,
        "column_id" uuid REFERENCES "dev_columns"("id") ON DELETE SET NULL,
        "priority" varchar(16) DEFAULT 'medium' NOT NULL,
        "category" varchar(64),
        "assignee" varchar(255),
        "labels" text[],
        "estimate_hours" integer,
        "actual_hours" integer,
        "due_date" timestamp with time zone,
        "position" integer NOT NULL DEFAULT 0,
        "created_by" uuid REFERENCES "admin_users"("id") ON DELETE SET NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        "updated_at" timestamp with time zone DEFAULT now() NOT NULL
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "dev_comments" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "task_id" uuid NOT NULL REFERENCES "dev_tasks"("id") ON DELETE CASCADE,
        "admin_user_id" uuid REFERENCES "admin_users"("id") ON DELETE SET NULL,
        "comment" text NOT NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL
      )
    `);

    await db.execute(sql`CREATE INDEX IF NOT EXISTS "dev_tasks_column_id_idx" ON "dev_tasks"("column_id")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "dev_tasks_priority_idx" ON "dev_tasks"("priority")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "dev_tasks_category_idx" ON "dev_tasks"("category")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "dev_tasks_assignee_idx" ON "dev_tasks"("assignee")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "dev_tasks_due_date_idx" ON "dev_tasks"("due_date")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "dev_comments_task_id_idx" ON "dev_comments"("task_id")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "dev_columns_position_idx" ON "dev_columns"("position")`);

    const columnsResult = await db.execute(sql`SELECT COUNT(*) as count FROM dev_columns`);
    const count = (columnsResult.rows[0] as any).count;
    
    if (count === '0' || count === 0) {
      // Create columns
      const colResult = await db.execute(sql`
        INSERT INTO "dev_columns" ("name", "position", "color") VALUES
          ('Backlog', 0, 'slate'),
          ('To Do', 1, 'blue'),
          ('In Progress', 2, 'amber'),
          ('Done', 3, 'green')
        RETURNING id, name
      `);
      
      const columns = colResult.rows as any[];
      const backlogId = columns.find(c => c.name === 'Backlog')?.id;
      const todoId = columns.find(c => c.name === 'To Do')?.id;
      const inProgressId = columns.find(c => c.name === 'In Progress')?.id;
      const doneId = columns.find(c => c.name === 'Done')?.id;

      // Add initial tasks from Work Plan
      if (backlogId && todoId && inProgressId && doneId) {
        await db.execute(sql`
          INSERT INTO "dev_tasks" ("title", "description", "column_id", "priority", "category", "position") VALUES
          -- Backlog
          ('E2E tests - Playwright', 'בדיקות אוטומטיות מקצה לקצה', ${backlogId}, 'high', 'testing', 0),
          ('Unit tests - Vitest', 'בדיקות יחידה לקומפוננטות', ${backlogId}, 'medium', 'testing', 1),
          ('React Native app', 'אפליקציית מובייל', ${backlogId}, 'low', 'mobile', 2),
          ('AI task suggestions', 'הצעות משימות חכמות', ${backlogId}, 'medium', 'ai', 3),
          ('Voice interface', 'פקודות קוליות', ${backlogId}, 'low', 'ai', 4),
          ('React Query caching', 'אופטימיזציית queries', ${backlogId}, 'medium', 'optimization', 5),
          ('Virtual scrolling', 'טבלאות גדולות', ${backlogId}, 'low', 'optimization', 6),
          ('Code splitting', 'הקטנת bundle size', ${backlogId}, 'low', 'optimization', 7),
          
          -- To Do
          ('Google Calendar API', 'סנכרון משימות ליומן Google', ${todoId}, 'high', 'calendar', 0),
          ('Outlook Calendar API', 'סנכרון ליומן Outlook', ${todoId}, 'high', 'calendar', 1),
          ('Apple Calendar (CalDAV)', 'סנכרון ליומן Apple', ${todoId}, 'medium', 'calendar', 2),
          ('Twilio SMS', 'תזכורות ב-SMS', ${todoId}, 'medium', 'email', 3),
          ('WhatsApp notifications', 'התראות ב-WhatsApp', ${todoId}, 'low', 'email', 4),
          
          -- In Progress
          ('Resend Email setup', 'הגדרת API Key ושליחת מיילים', ${inProgressId}, 'high', 'email', 0),
          ('Stripe webhooks', 'אינטגרציה מלאה עם Stripe', ${inProgressId}, 'medium', 'admin', 1),
          
          -- Done
          ('Admin System (33 pages)', 'מערכת ניהול מלאה', ${doneId}, 'high', 'admin', 0),
          ('Kanban board', 'לוח משימות עם drag & drop', ${doneId}, 'high', 'admin', 1),
          ('Forgot Password', 'מסך איפוס סיסמה', ${doneId}, 'high', 'email', 2),
          ('Multi-family support', 'תמיכה במשפחות מרובות', ${doneId}, 'high', 'admin', 3)
        `);
      }
    }

    res.json({ ok: true, message: 'Dev Kanban tables created with 4 columns and 20 initial tasks!' });
  } catch (err: any) {
    console.error('Create dev kanban tables failed:', err);
    res.status(500).json({ ok: false, error: err?.message ?? 'Failed to create tables' });
  }
};

routes.get('/health/create-dev-kanban-tables', requireDevSecret, createDevKanbanTables);
routes.post('/health/create-dev-kanban-tables', requireDevSecret, createDevKanbanTables);

// Create admin_ai_analyses table (for AI analysis archive)
const createAdminAiAnalysesTable = async (_req: any, res: any) => {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "admin_ai_analyses" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "type" varchar(32) NOT NULL,
        "query" text,
        "report" text NOT NULL,
        "depth" varchar(16),
        "scope" varchar(16),
        "model" varchar(64),
        "tokens_used" integer DEFAULT 0,
        "cost_usd" varchar(24) DEFAULT '0',
        "admin_user_id" uuid,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "admin_ai_analyses_type_idx" ON "admin_ai_analyses"("type")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "admin_ai_analyses_admin_user_idx" ON "admin_ai_analyses"("admin_user_id")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "admin_ai_analyses_created_at_idx" ON "admin_ai_analyses"("created_at")`);
    res.json({ ok: true, message: 'admin_ai_analyses table created' });
  } catch (err: any) {
    console.error('Create admin_ai_analyses failed:', err);
    res.status(500).json({ ok: false, error: err?.message ?? 'Failed to create table' });
  }
};

routes.get('/health/create-admin-ai-analyses-table', requireDevSecret, createAdminAiAnalysesTable);
routes.post('/health/create-admin-ai-analyses-table', requireDevSecret, createAdminAiAnalysesTable);

// Seed Sprint 1: Plans & Checkout – תוכנית עבודה + ספרינט + משימות בקאן באן
const seedSprint1Plans = async (_req: any, res: any) => {
  try {
    // 1. Mark Sprint 12 as completed
    await db.execute(sql`
      UPDATE "sprints" SET status = 'completed'
      WHERE name LIKE 'Sprint 12%' AND status = 'active'
    `);

    // 2. Look up Phase 5b for linking
    const phase5bResult = await db.execute(sql`
      SELECT id FROM "dev_phases" WHERE name = 'Phase 5b - Plans & Checkout' LIMIT 1
    `);
    const phase5bId = (phase5bResult.rows[0] as any)?.id ?? null;

    // 3. Check if Sprint 13 already exists
    const existing = await db.execute(sql`
      SELECT id FROM "sprints" WHERE name = 'Sprint 13: Plans & Checkout'
    `);
    if ((existing.rows as any[]).length > 0) {
      const existingSprintId = (existing.rows[0] as any).id;
      if (phase5bId) {
        await db.execute(sql`
          UPDATE "sprints" SET phase_id = ${phase5bId}
          WHERE id = ${existingSprintId} AND (phase_id IS NULL OR phase_id != ${phase5bId})
        `);
      }
      return res.json({ ok: true, message: 'Sprint 13 already exists.' + (phase5bId ? ' Linked to Phase 5b.' : '') });
    }

    // 4. Create Sprint 13
    const now = new Date();
    const twoWeeksLater = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    const sprintResult = await db.execute(sql`
      INSERT INTO "sprints" (name, goal, start_date, end_date, status, phase_id)
      VALUES (
        'Sprint 13: Plans & Checkout',
        'ניהול מסלולים, תמחור דינמי, מבצעים וקודי קופון. אינטגרציה מלאה עם Stripe Products, Prices, Coupons ו-Promotion Codes.',
        ${now.toISOString()},
        ${twoWeeksLater.toISOString()},
        'active',
        ${phase5bId}
      )
      RETURNING id
    `);
    const sprintId = (sprintResult.rows[0] as any).id;

    // 4. Get column IDs
    const colResult = await db.execute(sql`
      SELECT id, name FROM "dev_columns" ORDER BY position
    `);
    const cols = (colResult.rows as any[]).reduce((acc: Record<string, string>, r: any) => {
      acc[r.name] = r.id;
      return acc;
    }, {});
    const todoId = cols['To Do'] ?? cols['Backlog'];
    const backlogId = cols['Backlog'] ?? todoId;

    if (!todoId || !backlogId) {
      return res.status(500).json({ ok: false, error: 'Dev columns not found. Run /health/create-dev-kanban-tables first.' });
    }

    // 5. Create Plans tasks
    const planTasks = [
      { title: 'מיגרציה admin_plans + admin_coupon_meta', desc: 'טבלאות DB למסלולים ומטא-דאטה לקודי קופון', col: todoId, pos: 0, priority: 'high' },
      { title: 'Admin API: plans, coupons, promotions', desc: 'GET/POST/PATCH endpoints + סנכרון Stripe', col: todoId, pos: 1, priority: 'high' },
      { title: 'דף ניהול מסלולים ותמחור', desc: 'AdminPlans – רשימת מסלולים, עריכת מחירים', col: todoId, pos: 2, priority: 'high' },
      { title: 'דף קודי קופון', desc: 'AdminCoupons – יצירה, רשימה, סינון לפי מקור', col: todoId, pos: 3, priority: 'medium' },
      { title: 'דף מבצעים', desc: 'AdminPromotions – 20% הנחה, 1+1, לפי מסלול', col: backlogId, pos: 0, priority: 'medium' },
      { title: 'עדכון Checkout (coupon, familyId)', desc: 'תמיכה בקוד קופון ו-metadata ב-create-checkout-session', col: backlogId, pos: 1, priority: 'high' },
      { title: 'Stripe Webhooks לסנכרון מנויים', desc: 'checkout.session.completed, subscription.updated/deleted', col: backlogId, pos: 2, priority: 'high' },
      { title: 'עדכון עמוד Pricing', desc: 'טעינת מסלולים ומבצעים מ-API, תצוגה דינמית', col: backlogId, pos: 3, priority: 'medium' },
    ];

    const taskIds: string[] = [];
    for (const t of planTasks) {
      const ins = await db.execute(sql`
        INSERT INTO "dev_tasks" (title, description, column_id, priority, category, position)
        VALUES (${t.title}, ${t.desc}, ${t.col}, ${t.priority}, 'plans', ${t.pos})
        RETURNING id
      `);
      taskIds.push((ins.rows[0] as any).id);
    }

    // 6. Add tasks to sprint
    for (const taskId of taskIds) {
      await db.execute(sql`
        INSERT INTO "sprint_tasks" (sprint_id, task_id)
        VALUES (${sprintId}, ${taskId})
        ON CONFLICT (sprint_id, task_id) DO NOTHING
      `);
    }

    // 7. Log activity
    await db.execute(sql`
      INSERT INTO "sprint_activities" (sprint_id, activity_type, description)
      VALUES (${sprintId}, 'sprint_created', 'Sprint "Sprint 13: Plans & Checkout" created with 8 tasks')
    `);

    res.json({
      ok: true,
      message: 'Sprint 13: Plans & Checkout created with 8 tasks' + (phase5bId ? ' (linked to Phase 5b)' : '') + '. Go to Work Plan, Sprints, or Kanban to see it.',
      sprintId,
      taskCount: taskIds.length,
    });
  } catch (err: any) {
    console.error('Seed Sprint 1 Plans failed:', err);
    res.status(500).json({ ok: false, error: err?.message ?? 'Seed failed' });
  }
};

routes.get('/health/seed-sprint1-plans', requireDevSecret, seedSprint1Plans);
routes.post('/health/seed-sprint1-plans', requireDevSecret, seedSprint1Plans);

// ──────────────────────────────────────────────────────────────────────────────
// Helpers – sessions & cookies
// ──────────────────────────────────────────────────────────────────────────────

const SESSION_COOKIE = 'mr_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24; // 24h
const SESSION_TTL_REMEMBER_SECONDS = 60 * 60 * 24 * 30; // 30 days

const MOCK_DEV_USER = {
  id: 'dev-bypass-user',
  fullName: 'Dev User',
  email: 'dev@local',
  role: 'manager',
  familyId: 'dev-family-1',
  primaryFamilyId: null as string | null,
  effectiveFamilyId: 'dev-family-1',
};

export async function getUserFromRequest(req: Request) {
  if (
    process.env.DEV_SKIP_AUTH === '1' &&
    process.env.NODE_ENV !== 'production' &&
    req.headers['x-dev-bypass-user'] === '1'
  ) {
    return MOCK_DEV_USER;
  }
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token || typeof token !== 'string' || !token.trim()) return null;

  const now = new Date();
  let rows: { id: string; fullName: string; email: string; role: string; familyId: string; primaryFamilyId?: string | null }[];
  try {
    rows = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        role: users.role,
        familyId: users.familyId,
        primaryFamilyId: users.primaryFamilyId,
      })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(and(eq(sessions.id, token), gt(sessions.expiresAt, now)))
      .limit(1);
  } catch (e: any) {
    if (e?.code === '42703' || (typeof e?.message === 'string' && e.message.includes('primary_family_id'))) {
      const fallback = await db
        .select({
          id: users.id,
          fullName: users.fullName,
          email: users.email,
          role: users.role,
          familyId: users.familyId,
        })
        .from(sessions)
        .innerJoin(users, eq(sessions.userId, users.id))
        .where(and(eq(sessions.id, token), gt(sessions.expiresAt, now)))
        .limit(1);
      rows = fallback.map((r) => ({ ...r, primaryFamilyId: null }));
    } else throw e;
  }

  if (!rows[0]) return null;
  const u = rows[0];
  const headerFamily = (req.headers['x-active-family'] as string)?.trim();
  let effectiveFamilyId = u.primaryFamilyId ?? u.familyId;
  if (headerFamily && (headerFamily === u.familyId || headerFamily === u.primaryFamilyId)) {
    effectiveFamilyId = headerFamily;
  } else if (headerFamily) {
    try {
      const [fm] = await db
        .select({ familyId: familyMembers.familyId })
        .from(familyMembers)
        .where(and(eq(familyMembers.userId, u.id), eq(familyMembers.familyId, headerFamily)))
        .limit(1);
      if (fm) effectiveFamilyId = headerFamily;
    } catch (_) {
      // family_members table might not exist yet
    }
  }
  return { ...u, effectiveFamilyId };
}

async function createSession(userId: string, rememberMe: boolean, res: Response) {
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(
    Date.now() + (rememberMe ? SESSION_TTL_REMEMBER_SECONDS : SESSION_TTL_SECONDS) * 1000,
  );

  await db.insert(sessions).values({
    id: token,
    userId,
    expiresAt: expires,
  });

  const cookieParts = [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    `HttpOnly`,
    `Path=/`,
    `SameSite=Lax`,
    `Max-Age=${rememberMe ? SESSION_TTL_REMEMBER_SECONDS : SESSION_TTL_SECONDS}`,
  ];
  if (process.env.NODE_ENV === 'production') {
    cookieParts.push('Secure');
  }
  res.setHeader('Set-Cookie', cookieParts.join('; '));
}

async function clearSession(req: Request, res: Response) {
  const token = req.cookies?.[SESSION_COOKIE];
  if (token) {
    await db.delete(sessions).where(eq(sessions.id, token));
  }
  const clearParts = [`${SESSION_COOKIE}=`, 'Path=/', 'Max-Age=0', 'HttpOnly', 'SameSite=Lax'];
  if (process.env.NODE_ENV === 'production') {
    clearParts.push('Secure');
  }
  res.setHeader('Set-Cookie', clearParts.join('; '));
}

async function generateUniqueFamilyInviteCode(): Promise<string> {
  // פורמט בסיסי: MEM-XXXXXX
  while (true) {
    const random = crypto.randomBytes(3).toString('hex').toUpperCase(); // 6 תווים
    const code = `MEM-${random}`;
    const existing = await db
      .select({ id: families.id })
      .from(families)
      .where(eq(families.inviteCode, code))
      .limit(1);
    if (!existing[0]) return code;
  }
}

async function generateUniqueInviteCode(): Promise<string> {
  // פורמט: INV-XXXXXXXX (שונה מ-MEM- כדי למנוע התנגשות)
  while (true) {
    const random = crypto.randomBytes(4).toString('hex').toUpperCase();
    const code = `INV-${random}`;
    const inFamilies = await db
      .select({ id: families.id })
      .from(families)
      .where(eq(families.inviteCode, code))
      .limit(1);
    if (inFamilies[0]) continue;
    try {
      const inInvites = await db
        .select({ id: familyInvites.id })
        .from(familyInvites)
        .where(eq(familyInvites.code, code))
        .limit(1);
      if (!inInvites[0]) return code;
    } catch (_) {
      return code; // family_invites לא קיים עדיין
    }
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// AUTH – Register / Login / Logout / Me
// ──────────────────────────────────────────────────────────────────────────────

// Register:
// mode=create  -> יצירת משפחה חדשה + משתמש ראשון (manager)
// mode=join    -> הצטרפות למשפחה קיימת באמצעות inviteCode
routes.post('/auth/register', async (req, res) => {
  try {
    const { mode = 'create', familyName, inviteCode, fullName, email, password } = req.body ?? {};

    if (!fullName || !email || !password) {
      return res.status(400).json({ error: 'fullName, email, password נדרשים' });
    }

    if (mode === 'create' && !familyName) {
      return res.status(400).json({ error: 'familyName נדרש ליצירת משפחה חדשה' });
    }

    if (mode === 'join' && !inviteCode) {
      return res.status(400).json({ error: 'inviteCode נדרש להצטרפות למשפחה קיימת' });
    }

    const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing[0]) {
      return res.status(409).json({ error: 'משתמש עם האימייל הזה כבר קיים' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const isJoin = mode === 'join';
    let familyId: string;
    let joinRole = isJoin ? 'viewer' : 'manager';
    let joinPermissions: string[] = isJoin
      ? ['view_patient', 'view_tasks', 'view_documents']
      : [
          'view_patient',
          'edit_patient',
          'view_tasks',
          'edit_tasks',
          'view_financial',
          'edit_financial',
          'view_insurance',
          'edit_insurance',
          'view_documents',
          'manage_members',
        ];
    let joinMemberTier = isJoin ? 'supporter_friend' : 'family';

    if (mode === 'create') {
      const code = await generateUniqueFamilyInviteCode();
      const [family] = await db
        .insert(families)
        .values({
          familyName,
          inviteCode: code,
        })
        .returning();
      familyId = family.id;
    } else {
      const normalizedCode = String(inviteCode || '').trim().toUpperCase();
      let inviteMatch: { role: string; memberTier: string; permissions: string[]; familyId: string } | null = null;

      try {
        const [inv] = await db
          .select()
          .from(familyInvites)
          .where(eq(familyInvites.code, normalizedCode))
          .limit(1);
        if (inv && (!inv.expiresAt || inv.expiresAt > new Date())) {
          inviteMatch = {
            role: inv.role,
            memberTier: inv.memberTier ?? 'supporter_friend',
            permissions: (inv.permissions ?? []) as string[],
            familyId: inv.familyId,
          };
        }
      } catch (_) {
        // family_invites table might not exist
      }

      if (inviteMatch) {
        familyId = inviteMatch.familyId;
        joinRole = inviteMatch.role;
        joinMemberTier = inviteMatch.memberTier;
        joinPermissions = inviteMatch.permissions.length > 0 ? inviteMatch.permissions : joinPermissions;
      } else {
        const [family] = await db
          .select()
          .from(families)
          .where(eq(families.inviteCode, normalizedCode))
          .limit(1);

        if (!family) {
          return res.status(404).json({ error: 'קוד משפחה לא נמצא. בדקו שוב את הקוד.' });
        }

        familyId = family.id;
      }
    }

    // Pick a unique color for the new user within this family
    let autoColor = '#6366f1';
    try {
      const existingColors = await db
        .select({ userColor: (users as any).userColor })
        .from(users)
        .where(eq(users.familyId, familyId));
      autoColor = assignUniqueColor(existingColors.map((r) => (r.userColor as string | null) ?? '').filter(Boolean));
    } catch (_) {}

    const [user] = await db
      .insert(users)
      .values({
        familyId,
        fullName,
        email,
        passwordHash,
        role: joinRole,
        userColor: autoColor,
      } as any)
      .returning();

    try {
      await db.insert(familyMembers).values({
        userId: user.id,
        familyId,
        role: joinRole,
        memberTier: joinMemberTier,
        permissions: joinPermissions,
      });
    } catch (_) {
      // family_members table might not exist yet – ignore
    }

    await createSession(user.id, true, res);

    res.status(201).json({
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      familyId: user.familyId,
    });
  } catch (err: any) {
    console.error(err);
    const msg = process.env.NODE_ENV !== 'production' && err?.message ? err.message : 'Registration failed';
    res.status(500).json({ error: msg });
  }
});

// Login – יוצר session ומחזיר מידע בסיסי על המשתמש
routes.post('/auth/login', async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body ?? {};
    if (!email || !password) {
      return res.status(400).json({ error: 'email ו‑password נדרשים' });
    }

    const emailNorm = String(email).trim();
    const rows = await db.select().from(users).where(eq(users.email, emailNorm)).limit(1);
    const user = rows[0];
    if (!user) {
      return res.status(401).json({ error: 'אימייל או סיסמא שגויים' });
    }

    const hash = user.passwordHash;
    if (!hash || typeof hash !== 'string') {
      console.error('Login: user has no valid password hash', { email: user.email });
      return res.status(500).json({
        error: process.env.NODE_ENV !== 'production'
          ? 'חשבון ללא סיסמא – צור קשר עם התמיכה'
          : 'Login failed',
      });
    }

    const ok = await bcrypt.compare(password, hash);
    if (!ok) {
      return res.status(401).json({ error: 'אימייל או סיסמא שגויים' });
    }

    await createSession(user.id, Boolean(rememberMe), res);

    res.json({
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      familyId: user.familyId,
    });
  } catch (err: any) {
    const raw = String(err?.message ?? err ?? '');
    const code = err?.code;
    // Log full error for debugging (server terminal)
    console.error('Login error [code=%s]:', code, raw);
    if (process.env.NODE_ENV !== 'production') console.error('Login stack:', err?.stack);
    let msg: string;
    if (process.env.NODE_ENV === 'production') {
      msg = 'Login failed';
    } else if (code === '42P01' || /relation "users" does not exist|relation "sessions" does not exist/i.test(raw)) {
      msg = 'טבלאות חסרות – הרץ: npm run db:push ואז npm run seed:dev';
    } else if (/ECONNREFUSED|ENOTFOUND|ETIMEDOUT|connection refused/i.test(raw)) {
      msg = 'אין חיבור למסד הנתונים – בדוק DATABASE_URL ב-.env';
    } else if (/prepared statement|pgbouncer|transaction mode/i.test(raw)) {
      msg = 'שגיאת Supabase Pooler – נסה DATABASE_URL עם פורט 5432 (חיבור ישיר) במקום 6543';
    } else {
      msg = raw || 'Login failed';
    }
    try {
      if (!res.headersSent) res.status(500).json({ error: msg });
    } catch (e) {
      console.error('Login: failed to send error response', e);
    }
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// Google OAuth – כניסה/הרשמה מהירה + חיבור אוטומטי ליומן
// הוסף ב-Google Cloud: redirect URI = {APP_BASE_URL}/api/auth/google/callback
// ──────────────────────────────────────────────────────────────────────────────

const hasGoogleAuthConfig = () =>
  !!(process.env.GOOGLE_CALENDAR_CLIENT_ID?.trim() && process.env.GOOGLE_CALENDAR_CLIENT_SECRET?.trim());

// בדיקה: איזה redirect_uri נשלח ל-Google (העתק את זה בדיוק ל-Google Cloud)
routes.get('/auth/google/check', (_req, res) => {
  const appBase = (process.env.APP_BASE_URL ?? 'http://localhost:5173').replace(/\/$/, '');
  const redirectUri = `${appBase}/api/auth/google/callback`;
  res.json({
    redirectUri,
    appBaseUrl: process.env.APP_BASE_URL,
    hint: 'הוסף את redirectUri למעלה בדיוק ב-Google Cloud → Authorised redirect URIs',
  });
});

routes.get('/auth/google', (req, res) => {
  if (!hasGoogleAuthConfig()) {
    return res.status(503).json({ error: 'Google login is not configured' });
  }
  const mode = (req.query.mode as string) || 'login';
  const inviteCode = (req.query.inviteCode as string) || '';
  const state = [mode, inviteCode].filter(Boolean).join('|');
  const authUrl = getAuthUrlForLogin(state);
  res.redirect(authUrl);
});

routes.get('/auth/google/callback', async (req, res) => {
  if (!hasGoogleAuthConfig()) {
    return res.redirect('/login?error=google_not_configured');
  }
  const { code, state } = req.query;
  if (!code || typeof code !== 'string') {
    return res.redirect('/login?error=no_code');
  }
  const [mode, inviteCode] = (typeof state === 'string' ? state : '').split('|');

  try {
    const { email, fullName, accessToken, refreshToken, expiryDate } =
      await exchangeAuthCodeForUserInfo(code);

    if (!email) {
      return res.redirect('/login?error=no_email');
    }

    let user = (await db.select().from(users).where(eq(users.email, email)).limit(1))[0];

    if (!user) {
      if (mode === 'login') {
        return res.redirect('/login?error=user_not_found');
      }
      let familyId: string;
      let newUserRole = 'manager' as const;
      if (mode === 'register' && inviteCode && inviteCode.trim()) {
        const codeNorm = inviteCode.trim().toUpperCase();
        const [inv] = await db.select().from(familyInvites).where(eq(familyInvites.code, codeNorm)).limit(1);
        if (inv && (!inv.expiresAt || inv.expiresAt > new Date())) {
          familyId = inv.familyId;
          newUserRole = inv.role as 'manager' | 'caregiver' | 'viewer' | 'guest';
        } else {
          const [fam] = await db
            .select({ id: families.id })
            .from(families)
            .where(eq(families.inviteCode, codeNorm))
            .limit(1);
          if (!fam) return res.redirect('/login?error=invalid_invite&mode=register');
          familyId = fam.id;
        }
      } else {
        const [newFam] = await db
          .insert(families)
          .values({ familyName: `משפחת ${fullName}` })
          .returning({ id: families.id });
        familyId = newFam.id;
      }

      const oauthPasswordHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
      const [newUser] = await db
        .insert(users)
        .values({
          familyId,
          fullName,
          email,
          passwordHash: oauthPasswordHash,
          role: newUserRole,
        })
        .returning();
      user = newUser;

      try {
        await db.insert(familyMembers).values({
          userId: user.id,
          familyId,
          role: 'manager',
        });
      } catch (_) {}
    }

    if (refreshToken) {
      await saveTokens(user.id, accessToken, refreshToken, expiryDate);
    }

    await createSession(user.id, true, res);
    const redirect = req.query.redirect && typeof req.query.redirect === 'string'
      ? req.query.redirect
      : '/dashboard';
    res.redirect(redirect.startsWith('/') ? redirect : '/dashboard');
  } catch (err: any) {
    console.error('Google auth callback error:', err);
    res.redirect('/login?error=oauth_failed');
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// BILLING – Stripe checkout + public plans
// ──────────────────────────────────────────────────────────────────────────────

routes.get('/billing/plans', async (_req, res) => {
  try {
    const plans = await db
      .select({
        slug: adminPlans.slug,
        nameHe: adminPlans.nameHe,
        descriptionHe: adminPlans.descriptionHe,
        features: adminPlans.features,
        stripePriceIdMonthly: adminPlans.stripePriceIdMonthly,
      })
      .from(adminPlans)
      .where(eq(adminPlans.isActive, true))
      .orderBy(adminPlans.displayOrder, adminPlans.createdAt);

    const result: Array<Record<string, unknown>> = [];
    for (const p of plans) {
      let priceMonthly: number | null = null;
      let currency = 'ils';
      if (stripe && p.stripePriceIdMonthly) {
        try {
          const price = await stripe.prices.retrieve(p.stripePriceIdMonthly);
          priceMonthly = price.unit_amount;
          currency = price.currency ?? 'ils';
        } catch (_) {}
      }
      result.push({
        slug: p.slug,
        nameHe: p.nameHe,
        descriptionHe: p.descriptionHe,
        features: p.features ?? [],
        priceMonthly,
        currency,
      });
    }
    res.json(result);
  } catch (err: any) {
    if (err?.code === '42P01') return res.json([]);
    console.error(err);
    res.json([]);
  }
});

routes.post('/billing/create-checkout-session', async (req, res) => {
  try {
    if (!stripe) {
      return res.status(500).json({ error: 'Billing is not configured on the server' });
    }

    const { plan, couponCode, familyId } = req.body ?? {};
    let priceId = process.env.STRIPE_PRICE_PREMIUM;

    if (plan) {
      try {
        const [p] = await db.select().from(adminPlans).where(eq(adminPlans.slug, String(plan).toLowerCase())).limit(1);
        if (p?.stripePriceIdMonthly) priceId = p.stripePriceIdMonthly;
      } catch (_) {
        // admin_plans table might not exist
      }
    }

    if (!priceId) {
      return res.status(500).json({ error: 'Missing price configuration. Set STRIPE_PRICE_PREMIUM or add plan in Admin.' });
    }

    const appBaseUrl = process.env.APP_BASE_URL ?? 'http://localhost:5173';
    const successUrl = familyId
      ? `${appBaseUrl}/pricing?status=success&familyId=${encodeURIComponent(familyId)}`
      : `${appBaseUrl}/pricing?status=success`;
    const cancelUrl = familyId
      ? `${appBaseUrl}/pricing?status=cancel&familyId=${encodeURIComponent(familyId)}`
      : `${appBaseUrl}/pricing?status=cancel`;

    const sessionParams: Record<string, unknown> = {
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: familyId ? { familyId } : {},
      allow_promotion_codes: true,
    };

    if (couponCode && typeof couponCode === 'string') {
      const codes = await stripe.promotionCodes.list({ code: couponCode.trim().toUpperCase(), active: true });
      const pc = codes.data[0];
      if (pc) {
        sessionParams.discounts = [{ promotion_code: pc.id }];
      }
    }

    const session = await stripe.checkout.sessions.create(sessionParams as any);

    return res.json({ url: session.url });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

routes.post('/auth/logout', async (req, res) => {
  try {
    await clearSession(req, res);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// POST /auth/forgot-password – שליחת קישור לאיפוס סיסמה
routes.post('/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body ?? {};
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'אימייל נדרש' });
    }

    const [user] = await db.select().from(users).where(eq(users.email, email.trim().toLowerCase())).limit(1);
    
    // תמיד נחזיר הצלחה (אבטחה - לא לחשוף אם המייל קיים)
    if (!user) {
      return res.json({ ok: true });
    }

    // יצירת token ייחודי
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    try {
      await db.insert(passwordResetTokens).values({
        userId: user.id,
        token,
        expiresAt,
      });
    } catch (dbErr: any) {
      // אם הטבלה לא קיימת, נחזיר הצלחה אבל נדפיס את הקישור
      if (dbErr?.code === '42P01') {
        const resetLink = `${process.env.APP_URL || 'http://localhost:5173'}/reset-password?token=${token}`;
        console.log(`⚠️ password_reset_tokens table not found. Run: npm run db:push`);
        console.log(`Password reset link for ${email}: ${resetLink}`);
        return res.json({ ok: true, warning: 'טבלה חסרה - הרץ npm run db:push' });
      }
      throw dbErr;
    }

    // שליחת מייל
    const resetLink = `${process.env.APP_URL || 'http://localhost:5173'}/reset-password?token=${token}`;
    
    const emailResult = await sendPasswordResetEmail(email, resetLink);
    if (emailResult.ok) {
      console.log(`✅ Password reset email sent to ${email}`);
    } else {
      console.log(`⚠️ Email not sent (${emailResult.reason}). Reset link: ${resetLink}`);
    }

    res.json({ ok: true });
  } catch (err: any) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'שגיאה בשליחת המייל. נסה שוב מאוחר יותר.' });
  }
});

// GET /auth/validate-reset-token – בדיקת תקינות token
routes.get('/auth/validate-reset-token', async (req, res) => {
  try {
    const { token } = req.query;
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Token נדרש' });
    }

    const [resetToken] = await db
      .select()
      .from(passwordResetTokens)
      .where(and(eq(passwordResetTokens.token, token), eq(passwordResetTokens.used, false)))
      .limit(1);

    if (!resetToken) {
      return res.status(400).json({ error: 'הקישור לא תקין או כבר נוצל' });
    }

    if (new Date() > resetToken.expiresAt) {
      return res.status(400).json({ error: 'הקישור פג תוקף' });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאה בבדיקת הקישור' });
  }
});

// POST /auth/reset-password – איפוס סיסמה בפועל
routes.post('/auth/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body ?? {};
    if (!token || typeof token !== 'string' || !password || typeof password !== 'string') {
      return res.status(400).json({ error: 'Token וסיסמה נדרשים' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'הסיסמה חייבת להכיל לפחות 6 תווים' });
    }

    const [resetToken] = await db
      .select()
      .from(passwordResetTokens)
      .where(and(eq(passwordResetTokens.token, token), eq(passwordResetTokens.used, false)))
      .limit(1);

    if (!resetToken) {
      return res.status(400).json({ error: 'הקישור לא תקין או כבר נוצל' });
    }

    if (new Date() > resetToken.expiresAt) {
      return res.status(400).json({ error: 'הקישור פג תוקף' });
    }

    // עדכון סיסמה
    const hashedPassword = await bcrypt.hash(password, 10);
    await db.update(users).set({ passwordHash: hashedPassword }).where(eq(users.id, resetToken.userId));

    // סימון ה-token כמנוצל
    await db.update(passwordResetTokens).set({ used: true }).where(eq(passwordResetTokens.id, resetToken.id));

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאה באיפוס הסיסמה' });
  }
});

routes.get('/auth/me', async (req, res) => {
  try {
    const u = await getUserFromRequest(req);
    if (!u) return res.status(401).json({ error: 'לא מחובר' });

    const effectiveFamilyId = (u as { effectiveFamilyId?: string }).effectiveFamilyId ?? u.familyId;
    if (!effectiveFamilyId) return res.status(401).json({ error: 'לא מחובר' });

    // families: user.familyId + all family_members entries
    const familyIds = new Set<string>(u.familyId ? [u.familyId] : []);
    try {
      const fms = await db
        .select({ familyId: familyMembers.familyId })
        .from(familyMembers)
        .where(eq(familyMembers.userId, u.id));
      for (const fm of fms) if (fm.familyId) familyIds.add(fm.familyId);
    } catch (_) {}

    let familiesList: { id: string; familyName: string }[] = [];
    if (familyIds.size > 0) {
      try {
        familiesList = await db
          .select({ id: families.id, familyName: families.familyName })
          .from(families)
          .where(inArray(families.id, Array.from(familyIds)));
      } catch (_) {}
    }
    const families = familiesList.map((f) => ({ id: f.id, familyName: f.familyName }));

    let row: {
      id: string;
      fullName: string;
      email: string;
      role: string;
      familyId: string;
      primaryFamilyId?: string | null;
      avatarUrl: string | null;
      timezone: string | null;
      locale: string | null;
    } | null = null;
    try {
      const rows = await db
        .select({
          id: users.id,
          fullName: users.fullName,
          email: users.email,
          role: users.role,
          familyId: users.familyId,
          primaryFamilyId: users.primaryFamilyId,
          avatarUrl: users.avatarUrl,
          timezone: users.timezone,
          locale: users.locale,
          userColor: (users as any).userColor,
        })
        .from(users)
        .where(eq(users.id, u.id))
        .limit(1);
      row = rows[0] ?? null;
    } catch (e: any) {
      const colErr = e?.code === '42703' || (typeof e?.message === 'string' && /primary_family_id|locale|column .* does not exist/i.test(e.message));
      if (colErr) {
        try {
          const fallback = await db
            .select({
              id: users.id,
              fullName: users.fullName,
              email: users.email,
              role: users.role,
              familyId: users.familyId,
            })
            .from(users)
            .where(eq(users.id, u.id))
            .limit(1);
          row = fallback[0] ? { ...fallback[0], primaryFamilyId: null, avatarUrl: null, timezone: null, locale: null } : null;
        } catch (e2: any) {
          console.error('auth/me fallback fetch error:', e2?.message ?? e2);
          throw e;
        }
      } else {
        console.error('auth/me user fetch error:', e?.message ?? e);
        throw e;
      }
    }
    if (!row) return res.status(401).json({ error: 'לא מחובר' });

    const activeFamily = familiesList.find((f) => f.id === effectiveFamilyId);
    let role = row.role;
    try {
      const [fm] = await db
        .select({ role: familyMembers.role })
        .from(familyMembers)
        .where(and(eq(familyMembers.userId, u.id), eq(familyMembers.familyId, effectiveFamilyId)))
        .limit(1);
      if (fm) role = fm.role;
    } catch (_) {}

    return res.json({
      id: row.id,
      fullName: row.fullName,
      email: row.email,
      role,
      familyId: row.familyId,
      primaryFamilyId: row.primaryFamilyId ?? undefined,
      effectiveFamilyId,
      familyName: activeFamily?.familyName ?? null,
      families,
      avatarUrl: row.avatarUrl ?? undefined,
      timezone: row.timezone ?? undefined,
      locale: row.locale ?? undefined,
    });
  } catch (err: any) {
    const raw = String(err?.message ?? err ?? '');
    const code = err?.code;
    console.error('auth/me error [code=%s]:', code, raw);
    if (process.env.NODE_ENV !== 'production') console.error('auth/me stack:', err?.stack);
    let msg: string;
    if (process.env.NODE_ENV === 'production') {
      msg = 'Failed to load current user';
    } else if (code === '42P01' || /relation "users" does not exist|relation "sessions" does not exist/i.test(raw)) {
      msg = 'טבלאות חסרות – הרץ: npm run db:push ואז npm run seed:dev';
    } else if (/ECONNREFUSED|ENOTFOUND|ETIMEDOUT|connection refused/i.test(raw)) {
      msg = 'אין חיבור למסד הנתונים – בדוק DATABASE_URL ב-.env';
    } else if (/prepared statement|pgbouncer|transaction mode/i.test(raw)) {
      msg = 'שגיאת Supabase Pooler – נסה DATABASE_URL עם פורט 5432 (חיבור ישיר) במקום 6543';
    } else {
      msg = raw || 'Failed to load current user';
    }
    try {
      if (!res.headersSent) res.status(500).json({ error: msg });
    } catch (_) {}
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// USER PROFILE & PASSWORD & NOTIFICATIONS
// ──────────────────────────────────────────────────────────────────────────────

routes.patch('/users/me', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'לא מחובר' });

    const body = req.body ?? {};
    const update: Record<string, unknown> = {};
    if (body.fullName !== undefined) update.fullName = String(body.fullName);
    if (body.avatarUrl !== undefined) update.avatarUrl = body.avatarUrl ? String(body.avatarUrl) : null;
    if (body.timezone !== undefined) update.timezone = body.timezone ? String(body.timezone) : null;
    if (body.locale !== undefined) update.locale = String(body.locale);
    if (body.primaryFamilyId !== undefined) {
      const pid = body.primaryFamilyId ? String(body.primaryFamilyId) : null;
      if (pid) {
        const hasAccess =
          pid === user.familyId ||
          (await db.select({ familyId: familyMembers.familyId }).from(familyMembers).where(and(eq(familyMembers.userId, user.id), eq(familyMembers.familyId, pid))).limit(1)).length > 0;
        if (hasAccess) update.primaryFamilyId = pid;
      } else {
        update.primaryFamilyId = null;
      }
    }

    if (Object.keys(update).length === 0) {
      const [current] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
      return res.json(current);
    }

    const [updated] = await db
      .update(users)
      .set(update as any)
      .where(eq(users.id, user.id))
      .returning();
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

function defaultUserSettings(userId: string) {
  return {
    userId,
    darkMode: false,
    weightUnit: 'kg',
    volumeUnit: 'ml',
    prescriptionReminder: true,
    missedDoseAlert: true,
    abnormalMeasurementsAlert: true,
    reminderChannel: 'push',
    pushChannel: 'browser',
    dndStart: null,
    dndEnd: null,
    whatsappPhone: null,
    whatsappEnabled: false,
    whatsappMedication: false,
    whatsappVitals: false,
    whatsappDrink: false,
    whatsappAppointments: false,
    updatedAt: new Date(),
  };
}

routes.get('/users/me/settings', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'לא מחובר' });

    const [row] = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, user.id))
      .limit(1);

    if (!row) {
      const [created] = await db
        .insert(userSettings)
        .values({ userId: user.id })
        .returning();
      return res.json(created ?? defaultUserSettings(user.id));
    }
    res.json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

routes.patch('/users/me/settings', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'לא מחובר' });

    const body = req.body ?? {};
    const update: Record<string, unknown> = { updatedAt: new Date() };
    if (typeof body.darkMode === 'boolean') update.darkMode = body.darkMode;
    if (body.weightUnit != null) update.weightUnit = String(body.weightUnit);
    if (body.volumeUnit != null) update.volumeUnit = String(body.volumeUnit);
    if (typeof body.prescriptionReminder === 'boolean') update.prescriptionReminder = body.prescriptionReminder;
    if (typeof body.missedDoseAlert === 'boolean') update.missedDoseAlert = body.missedDoseAlert;
    if (typeof body.abnormalMeasurementsAlert === 'boolean') update.abnormalMeasurementsAlert = body.abnormalMeasurementsAlert;
    if (body.reminderChannel != null) update.reminderChannel = String(body.reminderChannel);
    if (body.pushChannel != null) update.pushChannel = String(body.pushChannel);
    if (body.dndStart !== undefined) update.dndStart = body.dndStart ? String(body.dndStart) : null;
    if (body.dndEnd !== undefined) update.dndEnd = body.dndEnd ? String(body.dndEnd) : null;
    if (body.whatsappPhone !== undefined) update.whatsappPhone = body.whatsappPhone ? String(body.whatsappPhone) : null;
    if (typeof body.whatsappEnabled === 'boolean') update.whatsappEnabled = body.whatsappEnabled;
    if (typeof body.whatsappMedication === 'boolean') update.whatsappMedication = body.whatsappMedication;
    if (typeof body.whatsappVitals === 'boolean') update.whatsappVitals = body.whatsappVitals;
    if (typeof body.whatsappDrink === 'boolean') update.whatsappDrink = body.whatsappDrink;
    if (typeof body.whatsappAppointments === 'boolean') update.whatsappAppointments = body.whatsappAppointments;

    const [existing] = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, user.id))
      .limit(1);

    let result;
    if (existing) {
      [result] = await db
        .update(userSettings)
        .set(update as any)
        .where(eq(userSettings.userId, user.id))
        .returning();
    } else {
      [result] = await db
        .insert(userSettings)
        .values({ ...defaultUserSettings(user.id), ...update })
        .returning();
    }
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

routes.post('/users/me/change-password', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'לא מחובר' });

    const { currentPassword, newPassword } = req.body ?? {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'currentPassword and newPassword are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'סיסמה חדשה חייבת 6 תווים לפחות' });
    }

    const [row] = await db
      .select({ passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);
    if (!row) return res.status(401).json({ error: 'לא מחובר' });

    const ok = await bcrypt.compare(currentPassword, row.passwordHash);
    if (!ok) return res.status(400).json({ error: 'סיסמה נוכחית שגויה' });

    const hash = await bcrypt.hash(newPassword, 10);
    await db.update(users).set({ passwordHash: hash }).where(eq(users.id, user.id));
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

routes.get('/notifications', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'לא מחובר' });

    const list = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, user.id))
      .orderBy(desc(notifications.createdAt))
      .limit(100);
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

routes.get('/notifications/summary', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'לא מחובר' });

    try {
      const list = await db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, user.id))
        .orderBy(desc(notifications.createdAt))
        .limit(10);
      const fullCountResult = await db
        .select({ id: notifications.id })
        .from(notifications)
        .where(and(eq(notifications.userId, user.id), isNull(notifications.readAt)));
      return res.json({ unreadCount: fullCountResult.length, recent: list });
    } catch (_tblErr) {
      // fallback אם טבלת notifications לא קיימת (מיגרציה לא רצה)
      return res.json({ unreadCount: 0, recent: [] });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch notification summary' });
  }
});

routes.post('/notifications', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'לא מחובר' });

    const { title, body, type } = req.body ?? {};
    if (!title || typeof title !== 'string') {
      return res.status(400).json({ error: 'title is required' });
    }
    const [created] = await db
      .insert(notifications)
      .values({
        userId: user.id,
        title: title.trim(),
        body: body ? String(body).trim() : null,
        type: type ? String(type) : 'info',
      })
      .returning();
    res.status(201).json(created);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create notification' });
  }
});

routes.patch('/notifications/:id/read', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'לא מחובר' });

    const { id } = req.params;
    const [updated] = await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(eq(notifications.id, id), eq(notifications.userId, user.id)))
      .returning();
    if (!updated) return res.status(404).json({ error: 'Notification not found' });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to mark notification read' });
  }
});

routes.get('/notifications/preferences', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'לא מחובר' });

    const [prefs] = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, user.id))
      .limit(1);

    if (!prefs) {
      const [created] = await db
        .insert(notificationPreferences)
        .values({ userId: user.id })
        .returning();
      return res.json(created ?? defaultNotificationPrefs(user.id));
    }
    res.json(prefs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch notification preferences' });
  }
});

function defaultNotificationPrefs(userId: string) {
  return {
    userId,
    pushEnabled: true,
    emailEnabled: true,
    whatsappEnabled: false,
    smsEnabled: false,
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '07:00',
    minSeverity: 'info',
    updatedAt: new Date(),
  };
}

routes.patch('/notifications/preferences', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'לא מחובר' });

    const body = req.body ?? {};
    const update: Record<string, unknown> = {};
    if (typeof body.pushEnabled === 'boolean') update.pushEnabled = body.pushEnabled;
    if (typeof body.emailEnabled === 'boolean') update.emailEnabled = body.emailEnabled;
    if (typeof body.whatsappEnabled === 'boolean') update.whatsappEnabled = body.whatsappEnabled;
    if (typeof body.smsEnabled === 'boolean') update.smsEnabled = body.smsEnabled;
    if (typeof body.quietHoursEnabled === 'boolean') update.quietHoursEnabled = body.quietHoursEnabled;
    if (body.quietHoursStart != null) update.quietHoursStart = String(body.quietHoursStart);
    if (body.quietHoursEnd != null) update.quietHoursEnd = String(body.quietHoursEnd);
    if (body.minSeverity != null) update.minSeverity = String(body.minSeverity);
    update.updatedAt = new Date();

    const [existing] = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, user.id))
      .limit(1);

    let result;
    if (existing) {
      [result] = await db
        .update(notificationPreferences)
        .set(update as any)
        .where(eq(notificationPreferences.userId, user.id))
        .returning();
    } else {
      [result] = await db
        .insert(notificationPreferences)
        .values({ ...defaultNotificationPrefs(user.id), ...update })
        .returning();
    }
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update notification preferences' });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// DASHBOARD (stub) – דורש התחברות, נתונים לפי משפחת המשתמש
// ──────────────────────────────────────────────────────────────────────────────

routes.get('/dashboard', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'לא מחובר' });
    const familyId = (user as { effectiveFamilyId?: string }).effectiveFamilyId ?? user.familyId;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [tasksCountRow, newDocsCountRow, activeMembersCountRow, urgentTaskRows] = await Promise.all([
      db
        .select({ count: sql<number>`cast(count(*) as integer)` })
        .from(tasks)
        .where(and(
          eq(tasks.familyId, familyId),
          gte(tasks.dueDate, today),
          lt(tasks.dueDate, tomorrow),
          sql`${tasks.status} NOT IN ('done','cancelled')`,
        )),
      db
        .select({ count: sql<number>`cast(count(*) as integer)` })
        .from(medicalDocuments)
        .where(and(
          eq(medicalDocuments.familyId, familyId),
          gte(medicalDocuments.createdAt, sevenDaysAgo),
        )),
      db
        .select({ count: sql<number>`cast(count(*) as integer)` })
        .from(familyMembers)
        .where(eq(familyMembers.familyId, familyId)),
      db
        .select({
          id: tasks.id,
          title: tasks.title,
          priority: tasks.priority,
          dueDate: tasks.dueDate,
          status: tasks.status,
        })
        .from(tasks)
        .where(and(
          eq(tasks.familyId, familyId),
          sql`${tasks.priority} IN ('urgent','high')`,
          sql`${tasks.status} NOT IN ('done','cancelled')`,
        ))
        .limit(5),
    ]);

    // Try to get next doctor visit (table may not exist yet)
    let nextVisit: { doctorName: string; date: string } | null = null;
    try {
      const visitRows = await db.execute(sql`
        SELECT doctor_name, date FROM doctor_visits
        WHERE family_id = ${familyId} AND status = 'scheduled' AND date > ${new Date().toISOString()}
        ORDER BY date ASC LIMIT 1
      `);
      const vr = visitRows.rows[0] as any;
      if (vr) nextVisit = { doctorName: vr.doctor_name, date: vr.date };
    } catch (_) {}

    res.json({
      date: today.toISOString(),
      kpis: {
        tasksToday: Number(tasksCountRow[0]?.count ?? 0),
        newDocuments: Number(newDocsCountRow[0]?.count ?? 0),
        activeMembers: Number(activeMembersCountRow[0]?.count ?? 0),
        nextVisit,
      },
      urgentTasks: urgentTaskRows,
      nextAppointment: nextVisit,
      recentDocuments: [],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

// stats for Data page – tasks by status, patient count, etc.
routes.get('/stats/family', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'לא מחובר' });
    const familyId = (user as { effectiveFamilyId?: string }).effectiveFamilyId ?? user.familyId;

    const [tasksCount, patientsCount, tasksByStatusRows] = await Promise.all([
      db.select({ count: sql<number>`cast(count(*) as integer)` }).from(tasks).where(eq(tasks.familyId, familyId)),
      db.select({ count: sql<number>`cast(count(*) as integer)` }).from(patients).where(eq(patients.familyId, familyId)),
      db
        .select({ status: tasks.status, count: sql<number>`cast(count(*) as integer)` })
        .from(tasks)
        .where(eq(tasks.familyId, familyId))
        .groupBy(tasks.status),
    ]);

    const tasksByStatus = (tasksByStatusRows as { status: string; count: number }[]).map((r) => ({
      status: r.status,
      count: Number(r.count),
    }));

    res.json({
      tasksTotal: Number(tasksCount[0]?.count ?? 0),
      patientsCount: Number(patientsCount[0]?.count ?? 0),
      tasksByStatus,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load stats' });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// QUESTIONNAIRES
// ──────────────────────────────────────────────────────────────────────────────

const DEFAULT_QUESTIONNAIRES = [
  {
    id: 'default-doctor',
    title: 'שאלון הכנה לרופא',
    description: 'מלאו לפני הביקור – יעזור לכם לזכור את כל הנקודות החשובות',
    questions: [
      { id: 'q1', text: 'מה השתנה מאז הביקור האחרון?', type: 'text' },
      { id: 'q2', text: 'תרופות חדשות או שינוי במינון?', type: 'text' },
      { id: 'q3', text: 'תופעות לוואי או חששות?', type: 'text' },
      { id: 'q4', text: 'דירוג מצב כללי (1-10)', type: 'number' },
    ],
  },
  {
    id: 'default-cognitive',
    title: 'שאלון מצב קוגניטיבי',
    description: 'מדד יומי קצר למעקב',
    questions: [
      { id: 'q1', text: 'איך היה היום בהשוואה לאתמול? (1=גרוע, 5=טוב מאוד)', type: 'scale' },
      { id: 'q2', text: 'הערות', type: 'text' },
    ],
  },
];

routes.get('/questionnaires', async (req, res) => {
  try {
    const list = await db.select().from(questionnaires).orderBy(desc(questionnaires.createdAt));
    if (list.length > 0) {
      return res.json(list);
    }
    res.json(DEFAULT_QUESTIONNAIRES);
  } catch (err) {
    console.error(err);
    res.json(DEFAULT_QUESTIONNAIRES);
  }
});

routes.get('/questionnaires/responses', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'לא מחובר' });
    const familyId = (user as { effectiveFamilyId?: string }).effectiveFamilyId ?? user.familyId;
    const patientId = req.query.patientId as string | undefined;
    const questionnaireId = req.query.questionnaireId as string | undefined;
    const conditions = [eq(questionnaireResponses.familyId, familyId)];
    if (patientId) conditions.push(eq(questionnaireResponses.patientId, patientId));
    if (questionnaireId) conditions.push(eq(questionnaireResponses.questionnaireId, questionnaireId));
    const list = await db
      .select()
      .from(questionnaireResponses)
      .where(and(...conditions))
      .orderBy(desc(questionnaireResponses.submittedAt));
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch responses' });
  }
});

routes.post('/questionnaires/responses', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'לא מחובר' });
    const familyId = (user as { effectiveFamilyId?: string }).effectiveFamilyId ?? user.familyId;
    const { questionnaireId, patientId, answers } = req.body ?? {};
    if (!questionnaireId || !answers || typeof answers !== 'object') {
      return res.status(400).json({ error: 'questionnaireId and answers required' });
    }
    const isDefault = DEFAULT_QUESTIONNAIRES.some((d) => d.id === questionnaireId);
    if (isDefault) {
      return res.status(201).json({ ok: true, saved: 'local', message: 'Response recorded (default questionnaire)' });
    }
    const [created] = await db
      .insert(questionnaireResponses)
      .values({
        questionnaireId,
        familyId,
        patientId: patientId || null,
        userId: user.id,
        answers: answers as Record<string, unknown>,
      })
      .returning();
    res.status(201).json(created);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save response' });
  }
});

routes.get('/questionnaires/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const def = DEFAULT_QUESTIONNAIRES.find((d) => d.id === id);
    if (def) return res.json(def);
    const [q] = await db.select().from(questionnaires).where(eq(questionnaires.id, id)).limit(1);
    if (!q) return res.status(404).json({ error: 'Questionnaire not found' });
    res.json(q);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch questionnaire' });
  }
});

routes.get('/questionnaires/:id/score', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'לא מחובר' });
    const familyId = (user as { effectiveFamilyId?: string }).effectiveFamilyId ?? user.familyId;
    const { id } = req.params;
    const responseId = req.query.responseId as string | undefined;
    const [response] = responseId
      ? await db
          .select()
          .from(questionnaireResponses)
          .where(
            and(
              eq(questionnaireResponses.id, responseId),
              eq(questionnaireResponses.questionnaireId, id),
              eq(questionnaireResponses.familyId, familyId)
            )
          )
          .limit(1)
      : await db
          .select()
          .from(questionnaireResponses)
          .where(
            and(
              eq(questionnaireResponses.questionnaireId, id),
              eq(questionnaireResponses.familyId, familyId)
            )
          )
          .orderBy(desc(questionnaireResponses.submittedAt))
          .limit(1);
    if (!response) return res.status(404).json({ error: 'No response found' });
    const answers = (response.answers ?? {}) as Record<string, number | string>;
    const vals = Object.values(answers).filter((v) => typeof v === 'number');
    const score = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 10) / 10 : null;
    const maxScore = vals.length ? Math.max(...vals) : null;
    res.json({ score, maxScore, answerCount: vals.length, responseId: response.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to compute score' });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// MEDICAL DOCUMENTS
// ──────────────────────────────────────────────────────────────────────────────

const medicalUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
});

routes.post(
  '/medical-documents/upload',
  medicalUpload.single('file'),
  async (req, res) => {
    try {
      const user = await getUserFromRequest(req);
      if (!user) return res.status(401).json({ error: 'לא מחובר' });
      if (user.role === 'viewer' || user.role === 'guest') {
        return res.status(403).json({ error: 'אין הרשאה להעלות מסמכים' });
      }
      const file = req.file;
      if (!file || !file.buffer) {
        return res.status(400).json({ error: 'נדרש קובץ בהעלאה (field: file)' });
      }
      const { filename, url } = await saveMedicalDocument(
        file.buffer,
        file.originalname,
        file.mimetype
      );
      res.status(201).json({ fileUrl: url, filename });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('נתמך') || msg.includes('מדי')) {
        return res.status(400).json({ error: msg });
      }
      console.error(err);
      res.status(500).json({ error: 'Failed to upload document' });
    }
  }
);

// analyze-preview: upload file → full AI analysis → return everything (no DB save yet)
// Frontend shows comprehensive review; user confirms → calls POST /medical-documents + /analyze
routes.post(
  '/medical-documents/analyze-preview',
  medicalUpload.single('file'),
  async (req, res) => {
    try {
      const user = await getUserFromRequest(req);
      if (!user) return res.status(401).json({ error: 'לא מחובר' });
      if (user.role === 'viewer' || user.role === 'guest') {
        return res.status(403).json({ error: 'אין הרשאה' });
      }
      const file = req.file;
      if (!file || !file.buffer) {
        return res.status(400).json({ error: 'נדרש קובץ' });
      }

      // Step 1: Save file
      const { url: fileUrl } = await saveMedicalDocument(
        file.buffer,
        file.originalname,
        file.mimetype
      );

      // Step 2: Full AI analysis (includes metadata + all clinical data)
      // Accept optional documentType hint from the frontend (pre-selected by user)
      const docTypeHint = typeof req.body?.documentType === 'string' ? req.body.documentType : undefined;
      const analysis = await analyzeMedicalDocument(fileUrl, docTypeHint);

      res.status(200).json({ fileUrl, analysis });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('נתמך') || msg.includes('מדי')) {
        return res.status(400).json({ error: msg });
      }
      console.error(err);
      res.status(500).json({ error: 'Failed to analyze document' });
    }
  }
);

// upload-file: save file only, no AI — used by batch queue for fast upload then background analyze
routes.post(
  '/medical-documents/upload-file',
  medicalUpload.single('file'),
  async (req, res) => {
    try {
      const user = await getUserFromRequest(req);
      if (!user) return res.status(401).json({ error: 'לא מחובר' });
      if (user.role === 'viewer' || user.role === 'guest') {
        return res.status(403).json({ error: 'אין הרשאה' });
      }
      const file = req.file;
      if (!file || !file.buffer) return res.status(400).json({ error: 'נדרש קובץ' });
      const { url: fileUrl } = await saveMedicalDocument(file.buffer, file.originalname, file.mimetype);
      res.status(200).json({ fileUrl });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(err);
      res.status(500).json({ error: msg });
    }
  }
);

// Quick-scan: upload file + AI extracts metadata only (kept for backwards compat)
routes.post(
  '/medical-documents/quick-scan',
  medicalUpload.single('file'),
  async (req, res) => {
    try {
      const user = await getUserFromRequest(req);
      if (!user) return res.status(401).json({ error: 'לא מחובר' });
      const file = req.file;
      if (!file || !file.buffer) return res.status(400).json({ error: 'נדרש קובץ' });
      const { url: fileUrl } = await saveMedicalDocument(file.buffer, file.originalname, file.mimetype);
      const metadata = await extractDocumentMetadata(fileUrl, file.originalname);
      res.status(200).json({ ...metadata, fileUrl });
    } catch (err: unknown) {
      console.error(err);
      res.status(500).json({ error: 'Failed to scan document' });
    }
  }
);

// GET /medical-documents/:id/request-access → returns a short-lived signed URL (15 min)
routes.get('/medical-documents/:id/request-access', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'לא מחובר' });
    const familyId = (user as { effectiveFamilyId?: string }).effectiveFamilyId ?? user.familyId;
    const { id } = req.params;
    const [doc] = await db
      .select({ id: medicalDocuments.id, familyId: medicalDocuments.familyId, fileUrl: medicalDocuments.fileUrl })
      .from(medicalDocuments)
      .where(and(eq(medicalDocuments.id, id), eq(medicalDocuments.familyId, familyId)))
      .limit(1);
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    const token = generateSignedToken(id);
    const url = `/api/medical-documents/${id}/serve?token=${token}`;
    res.json({ url, expiresInMs: 15 * 60 * 1000 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate access URL' });
  }
});

routes.get('/medical-documents/:id/serve', async (req, res) => {
  try {
    const { id } = req.params;
    const token = req.query.token as string | undefined;

    // Token-based access (preferred, for direct file links)
    if (token) {
      if (!validateSignedToken(id, token)) {
        return res.status(403).json({ error: 'הקישור פג תוקף או אינו תקין. בקש קישור חדש.' });
      }
    } else {
      // Fallback: session-based auth (for backwards compatibility)
      const user = await getUserFromRequest(req);
      if (!user) return res.status(401).json({ error: 'לא מחובר' });
      const familyId = (user as { effectiveFamilyId?: string }).effectiveFamilyId ?? user.familyId;
      const [docCheck] = await db
        .select({ id: medicalDocuments.id })
        .from(medicalDocuments)
        .where(and(eq(medicalDocuments.id, id), eq(medicalDocuments.familyId, familyId)))
        .limit(1);
      if (!docCheck) return res.status(403).json({ error: 'אין גישה למסמך זה' });
    }

    const [doc] = await db
      .select()
      .from(medicalDocuments)
      .where(eq(medicalDocuments.id, id))
      .limit(1);
    if (!doc || !doc.fileUrl) return res.status(404).json({ error: 'Document or file not found' });
    const buffer = await getMedicalDocumentBuffer(doc.fileUrl);
    const ext = (doc.fileUrl.match(/\.(pdf|jpg|jpeg|png)$/i) || [])[1] || 'bin';
    const contentType =
      { pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png' }[ext.toLowerCase()] ||
      'application/octet-stream';
    const safeTitle = (doc.title || 'document').replace(/[^\w\s.-]/g, '_').trim() || 'document';
    const encodedTitle = encodeURIComponent(doc.title || 'document');
    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin ?? '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${safeTitle}.${ext}"; filename*=UTF-8''${encodedTitle}.${ext}`
    );
    res.send(buffer);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('Invalid') || msg.includes('ENOENT')) return res.status(404).json({ error: 'File not found' });
    console.error(err);
    res.status(500).json({ error: 'Failed to serve document' });
  }
});

routes.get('/medical-documents', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'לא מחובר' });
    const familyId = (user as { effectiveFamilyId?: string }).effectiveFamilyId ?? user.familyId;

    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const archiveFilter = req.query.archive as string | undefined; // 'all' | 'analyzed' | 'archive'

    const docWhere = [eq(medicalDocuments.familyId, familyId)];
    if (archiveFilter === 'analyzed') docWhere.push(eq((medicalDocuments as any).isArchiveOnly, false));
    if (archiveFilter === 'archive') docWhere.push(eq((medicalDocuments as any).isArchiveOnly, true));

    const list = await db
      .select({
        id: medicalDocuments.id,
        familyId: medicalDocuments.familyId,
        userId: medicalDocuments.userId,
        title: medicalDocuments.title,
        description: medicalDocuments.description,
        documentType: medicalDocuments.documentType,
        patientId: medicalDocuments.patientId,
        fileUrl: medicalDocuments.fileUrl,
        issuingDoctor: medicalDocuments.issuingDoctor,
        hospitalName: medicalDocuments.hospitalName,
        aiAnalysisStatus: medicalDocuments.aiAnalysisStatus,
        aiAnalysisResult: medicalDocuments.aiAnalysisResult,
        extractedMedications: medicalDocuments.extractedMedications,
        extractedTasks: medicalDocuments.extractedTasks,
        simplifiedDiagnosis: medicalDocuments.simplifiedDiagnosis,
        documentDate: medicalDocuments.documentDate,
        syncStatus: medicalDocuments.syncStatus,
        isArchiveOnly: (medicalDocuments as any).isArchiveOnly,
        createdAt: medicalDocuments.createdAt,
      })
      .from(medicalDocuments)
      .where(and(...docWhere))
      .orderBy(desc(medicalDocuments.createdAt))
      .limit(limit)
      .offset(offset);
    res.json({ data: list, limit, offset, hasMore: list.length === limit });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

routes.post('/medical-documents', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'לא מחובר' });
    const familyId = (user as { effectiveFamilyId?: string }).effectiveFamilyId ?? user.familyId;
    if (user.role === 'viewer' || user.role === 'guest') {
      return res.status(403).json({ error: 'אין הרשאה להוסיף מסמכים' });
    }
    const { title, description, documentType, patientId, fileUrl, issuingDoctor, hospitalName, isArchiveOnly, aiAnalysisResult } = req.body ?? {};
    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'title is required' });
    }

    // If a preview analysis result is provided, embed it immediately
    const hasAnalysis = !!aiAnalysisResult && !isArchiveOnly;
    const analysisResult = hasAnalysis ? aiAnalysisResult : null;

    const [created] = await db
      .insert(medicalDocuments)
      .values({
        familyId,
        userId: user.id,
        title: title.trim(),
        description: description || null,
        documentType: documentType || null,
        patientId: patientId || null,
        fileUrl: fileUrl || null,
        issuingDoctor: (hasAnalysis && analysisResult?.issuingDoctor) ? analysisResult.issuingDoctor : (issuingDoctor || null),
        hospitalName: (hasAnalysis && analysisResult?.hospitalName) ? analysisResult.hospitalName : (hospitalName || null),
        isArchiveOnly: Boolean(isArchiveOnly),
        aiAnalysisStatus: isArchiveOnly ? 'skipped' : (hasAnalysis ? 'done' : null),
        aiAnalysisResult: analysisResult,
        extractedMedications: hasAnalysis ? (analysisResult?.extractedMedications ?? null) : null,
        extractedTasks: hasAnalysis ? (analysisResult?.extractedTasks ?? null) : null,
        simplifiedDiagnosis: hasAnalysis ? (analysisResult?.simplifiedDiagnosis ?? null) : null,
        documentDate: hasAnalysis ? (analysisResult?.documentDate ?? null) : null,
      } as any)
      .returning({
        id: medicalDocuments.id,
        familyId: medicalDocuments.familyId,
        userId: medicalDocuments.userId,
        title: medicalDocuments.title,
        description: medicalDocuments.description,
        documentType: medicalDocuments.documentType,
        patientId: medicalDocuments.patientId,
        fileUrl: medicalDocuments.fileUrl,
        issuingDoctor: medicalDocuments.issuingDoctor,
        hospitalName: medicalDocuments.hospitalName,
        aiAnalysisStatus: medicalDocuments.aiAnalysisStatus,
        aiAnalysisResult: medicalDocuments.aiAnalysisResult,
        extractedMedications: medicalDocuments.extractedMedications,
        extractedTasks: medicalDocuments.extractedTasks,
        simplifiedDiagnosis: medicalDocuments.simplifiedDiagnosis,
        documentDate: medicalDocuments.documentDate,
        createdAt: medicalDocuments.createdAt,
      });

    // If preview analysis was embedded, run the sync engine to route data to all tables
    if (hasAnalysis && created) {
      runDocumentSyncEngine({
        result: analysisResult,
        doc: {
          id: created.id,
          patientId: created.patientId ?? null,
          familyId,
          issuingDoctor: created.issuingDoctor ?? null,
          title: created.title ?? null,
        },
        userId: user.id,
      }).catch((err) => console.error('[POST /medical-documents] sync engine error:', err));
    }

    res.status(201).json(created);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create document' });
  }
});

routes.patch('/medical-documents/:id', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'לא מחובר' });
    const familyId = (user as { effectiveFamilyId?: string }).effectiveFamilyId ?? user.familyId;
    if (user.role === 'viewer' || user.role === 'guest') {
      return res.status(403).json({ error: 'אין הרשאה לערוך מסמכים' });
    }
    const { id } = req.params;
    const [existing] = await db
      .select()
      .from(medicalDocuments)
      .where(and(eq(medicalDocuments.id, id), eq(medicalDocuments.familyId, familyId)))
      .limit(1);
    if (!existing) return res.status(404).json({ error: 'Document not found' });

    const body = req.body ?? {};
    const update: Record<string, unknown> = {};
    if (body.title !== undefined) update.title = String(body.title).trim();
    if (body.description !== undefined) update.description = body.description || null;
    if (body.documentType !== undefined) update.documentType = body.documentType || null;
    if (body.patientId !== undefined) update.patientId = body.patientId || null;
    if (body.fileUrl !== undefined) update.fileUrl = body.fileUrl || null;
    if (body.issuingDoctor !== undefined) update.issuingDoctor = body.issuingDoctor || null;
    if (body.hospitalName !== undefined) update.hospitalName = body.hospitalName || null;

    const [updated] = await db
      .update(medicalDocuments)
      .set(update)
      .where(eq(medicalDocuments.id, id))
      .returning({
        id: medicalDocuments.id,
        familyId: medicalDocuments.familyId,
        userId: medicalDocuments.userId,
        title: medicalDocuments.title,
        description: medicalDocuments.description,
        documentType: medicalDocuments.documentType,
        patientId: medicalDocuments.patientId,
        fileUrl: medicalDocuments.fileUrl,
        issuingDoctor: medicalDocuments.issuingDoctor,
        hospitalName: medicalDocuments.hospitalName,
        aiAnalysisStatus: medicalDocuments.aiAnalysisStatus,
        aiAnalysisResult: medicalDocuments.aiAnalysisResult,
        extractedMedications: medicalDocuments.extractedMedications,
        extractedTasks: medicalDocuments.extractedTasks,
        simplifiedDiagnosis: medicalDocuments.simplifiedDiagnosis,
        documentDate: medicalDocuments.documentDate,
        createdAt: medicalDocuments.createdAt,
      });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update document' });
  }
});

routes.delete('/medical-documents/:id', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'לא מחובר' });
    const familyId = (user as { effectiveFamilyId?: string }).effectiveFamilyId ?? user.familyId;
    if (user.role === 'viewer' || user.role === 'guest') {
      return res.status(403).json({ error: 'אין הרשאה למחוק מסמכים' });
    }
    const { id } = req.params;
    const [existing] = await db
      .select({ id: medicalDocuments.id })
      .from(medicalDocuments)
      .where(and(eq(medicalDocuments.id, id), eq(medicalDocuments.familyId, familyId)))
      .limit(1);
    if (!existing) return res.status(404).json({ error: 'Document not found' });
    await db.delete(medicalDocuments).where(eq(medicalDocuments.id, id));
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

routes.post('/medical-documents/:id/analyze', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'לא מחובר' });
    const familyId = (user as { effectiveFamilyId?: string }).effectiveFamilyId ?? user.familyId;
    if (user.role === 'viewer' || user.role === 'guest') {
      return res.status(403).json({ error: 'אין הרשאה' });
    }
    const { id } = req.params;
    const [doc] = await db
      .select()
      .from(medicalDocuments)
      .where(and(eq(medicalDocuments.id, id), eq(medicalDocuments.familyId, familyId)))
      .limit(1);
    if (!doc || !doc.fileUrl) return res.status(404).json({ error: 'Document or file not found' });

    await db
      .update(medicalDocuments)
      .set({ aiAnalysisStatus: 'processing' })
      .where(eq(medicalDocuments.id, id));

    const result = await analyzeMedicalDocument(doc.fileUrl, doc.documentType ?? undefined);

    await db
      .update(medicalDocuments)
      .set({
        aiAnalysisStatus: 'done',
        aiAnalysisResult: result as unknown as Record<string, unknown>,
        simplifiedDiagnosis: result.simplifiedDiagnosis || null,
        extractedMedications: result.extractedMedications,
        extractedTasks: result.extractedTasks,
      })
      .where(eq(medicalDocuments.id, id));

    // ── Sync Engine: routes all extracted data to the correct tables ────────────
    const autoCreated = await runDocumentSyncEngine({
      result,
      doc: {
        id: doc.id,
        patientId: doc.patientId ?? null,
        familyId,
        issuingDoctor: doc.issuingDoctor ?? null,
        title: doc.title ?? null,
      },
      userId: user.id,
    });

    res.json({ ...result, autoCreated });
  } catch (err: unknown) {
    const docId = (req as { params?: { id?: string } }).params?.id;
    if (docId) {
      await db
        .update(medicalDocuments)
        .set({ aiAnalysisStatus: 'failed' })
        .where(eq(medicalDocuments.id, docId))
        .catch(() => {});
    }
    console.error('Medical document analyze error:', err);
    const msg = err instanceof Error ? err.message : 'Analysis failed';
    res.status(500).json({ error: msg });
  }
});

routes.get('/medical-documents/:id/analysis', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'לא מחובר' });
    const familyId = (user as { effectiveFamilyId?: string }).effectiveFamilyId ?? user.familyId;
    const { id } = req.params;
    const [doc] = await db
      .select()
      .from(medicalDocuments)
      .where(and(eq(medicalDocuments.id, id), eq(medicalDocuments.familyId, familyId)))
      .limit(1);
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    res.json({
      status: doc.aiAnalysisStatus,
      result: doc.aiAnalysisResult,
      simplifiedDiagnosis: doc.simplifiedDiagnosis,
      extractedMedications: doc.extractedMedications,
      extractedTasks: doc.extractedTasks,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch analysis' });
  }
});

// POST /medical-documents/:id/reanalyze — re-run AI analysis + sync on an existing document
routes.post('/medical-documents/:id/reanalyze', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'לא מחובר' });
    const familyId = (user as { effectiveFamilyId?: string }).effectiveFamilyId ?? user.familyId;
    if (user.role === 'viewer' || user.role === 'guest') {
      return res.status(403).json({ error: 'אין הרשאה' });
    }
    const { id } = req.params;
    const [doc] = await db
      .select()
      .from(medicalDocuments)
      .where(and(eq(medicalDocuments.id, id), eq(medicalDocuments.familyId, familyId)))
      .limit(1);
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    if (!doc.fileUrl) return res.status(400).json({ error: 'No file attached to this document' });

    // Mark as pending
    await db.update(medicalDocuments)
      .set({ aiAnalysisStatus: 'pending', syncStatus: 'pending' })
      .where(eq(medicalDocuments.id, id));

    // ── Clean up all AI-generated data from the previous run before re-sync ──────

    // 1. Find all referrals linked to this document
    const linkedReferrals = await db
      .select({ id: referrals.id })
      .from(referrals)
      .where(eq(referrals.sourceDocumentId, id))
      .catch(() => [] as { id: string }[]);

    // 2. Delete tasks created from those referrals (sourceEntityId = referralId)
    for (const ref of linkedReferrals) {
      await db.delete(tasks)
        .where(and(eq(tasks.sourceEntityId, ref.id), eq(tasks.source, 'ai')))
        .catch(() => {});
    }

    // 3. Delete tasks directly linked to this document (sourceEntityId = docId)
    await db.delete(tasks)
      .where(and(eq(tasks.sourceEntityId, id), eq(tasks.source, 'ai')))
      .catch(() => {});

    // 4. Delete the referrals themselves (they will be recreated by sync engine)
    await db.delete(referrals)
      .where(eq(referrals.sourceDocumentId, id))
      .catch(() => {});

    // Re-run analysis
    const analysis = await analyzeMedicalDocument(doc.fileUrl, doc.documentType ?? undefined);

    // Persist updated analysis
    await db.update(medicalDocuments)
      .set({
        aiAnalysisStatus: 'done',
        aiAnalysisResult: analysis as any,
        simplifiedDiagnosis: analysis.simplifiedDiagnosis || null,
        extractedMedications: (analysis.extractedMedications ?? []) as any,
        extractedTasks: (analysis.extractedTasks ?? []) as any,
        issuingDoctor: analysis.issuingDoctor || doc.issuingDoctor,
        hospitalName: analysis.hospitalName || doc.hospitalName,
        documentDate: analysis.documentDate || doc.documentDate,
        urgencyLevel: analysis.urgencyLevel || null,
      })
      .where(eq(medicalDocuments.id, id));

    // Re-run sync engine
    const syncSummary = await runDocumentSyncEngine({
      result: analysis,
      doc: {
        id,
        patientId: doc.patientId ?? null,
        familyId,
        issuingDoctor: analysis.issuingDoctor ?? doc.issuingDoctor ?? null,
        title: doc.title,
      },
      userId: user.id,
    });

    res.json({ success: true, analysis, syncSummary });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Reanalyze error:', err);
    res.status(500).json({ error: msg });
  }
});

routes.post('/medical-documents/:id/extract-tasks', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'לא מחובר' });
    const familyId = (user as { effectiveFamilyId?: string }).effectiveFamilyId ?? user.familyId;
    if (user.role === 'viewer' || user.role === 'guest') {
      return res.status(403).json({ error: 'אין הרשאה' });
    }
    const { id } = req.params;
    const [doc] = await db
      .select()
      .from(medicalDocuments)
      .where(and(eq(medicalDocuments.id, id), eq(medicalDocuments.familyId, familyId)))
      .limit(1);
    if (!doc || !doc.extractedTasks?.length) {
      return res.status(400).json({ error: 'No extracted tasks. Run analyze first.' });
    }

    const created: { id: string }[] = [];
    for (const t of doc.extractedTasks) {
      const [task] = await db
        .insert(tasks)
        .values({
          familyId,
          patientId: doc.patientId,
          createdByUserId: user.id,
          title: t.title,
          description: t.description || null,
          source: 'ai',
        })
        .returning();
      if (task) created.push({ id: task.id });
    }
    res.status(201).json({ created: created.length, taskIds: created.map((x) => x.id) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to extract tasks' });
  }
});

// ── PATCH /medical-documents/:id/analysis  (edit AI analysis result manually) ─
routes.patch('/medical-documents/:id/analysis', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'לא מחובר' });
    const familyId = (user as { effectiveFamilyId?: string }).effectiveFamilyId ?? user.familyId;
    if (user.role === 'viewer' || user.role === 'guest') {
      return res.status(403).json({ error: 'אין הרשאה' });
    }
    const { id } = req.params;
    const [doc] = await db
      .select()
      .from(medicalDocuments)
      .where(and(eq(medicalDocuments.id, id), eq(medicalDocuments.familyId, familyId)))
      .limit(1);
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    const body = req.body ?? {};
    // Merge incoming fields into the existing aiAnalysisResult
    const existing = (doc.aiAnalysisResult as Record<string, unknown>) ?? {};
    const merged = { ...existing, ...body };

    const [updated] = await db
      .update(medicalDocuments)
      .set({
        aiAnalysisResult: merged,
        extractedMedications: merged.extractedMedications ?? doc.extractedMedications,
        extractedTasks: merged.extractedTasks ?? doc.extractedTasks,
        simplifiedDiagnosis: typeof merged.simplifiedDiagnosis === 'string'
          ? merged.simplifiedDiagnosis
          : doc.simplifiedDiagnosis,
      })
      .where(eq(medicalDocuments.id, id))
      .returning();

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update analysis' });
  }
});

// ── POST /medical-documents/:id/sync-to-patient  (sync analysis → patient profile) ─
routes.post('/medical-documents/:id/sync-to-patient', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'לא מחובר' });
    const familyId = (user as { effectiveFamilyId?: string }).effectiveFamilyId ?? user.familyId;
    if (user.role === 'viewer' || user.role === 'guest') {
      return res.status(403).json({ error: 'אין הרשאה' });
    }
    const { id } = req.params;
    const [doc] = await db
      .select()
      .from(medicalDocuments)
      .where(and(eq(medicalDocuments.id, id), eq(medicalDocuments.familyId, familyId)))
      .limit(1);
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    if (!doc.patientId) return res.status(400).json({ error: 'Document is not linked to a patient' });

    const result = doc.aiAnalysisResult as Record<string, unknown> | null;
    if (!result) return res.status(400).json({ error: 'No AI analysis result. Run analyze first.' });

    const {
      syncMedications = true,
      syncDiagnosis = false,
      syncConditions = false,
      syncVitals = false,
      syncReferrals = false,
    } = req.body ?? {};
    const summary: Record<string, unknown> = { medicationsSynced: 0, medicationsSkipped: 0 };

    // ── Sync medications ──────────────────────────────────────────────────────
    if (syncMedications) {
      const meds = Array.isArray(result.extractedMedications) ? result.extractedMedications : [];
      for (const med of meds) {
        if (!med?.name?.trim()) continue;
        const [existing] = await db
          .select({ id: medications.id })
          .from(medications)
          .where(and(
            eq(medications.patientId, doc.patientId),
            eq(medications.name, med.name.trim()),
            eq(medications.isActive, true),
          ))
          .limit(1);
        if (existing) {
          (summary.medicationsSkipped as number)++;
          continue;
        }
        await db.insert(medications).values({
          patientId: doc.patientId,
          familyId,
          name: med.name.trim(),
          dosage: med.dosage?.trim() || null,
          prescribedBy: doc.issuingDoctor || null,
          source: 'ai',
          isActive: true,
          sourceDocumentId: doc.id,
        });
        (summary.medicationsSynced as number)++;
      }
    }

    // ── Sync primary diagnosis ────────────────────────────────────────────────
    if (syncDiagnosis && result.simplifiedDiagnosis) {
      await db
        .update(patients)
        .set({ primaryDiagnosis: String(result.simplifiedDiagnosis) })
        .where(eq(patients.id, doc.patientId!));
      summary.diagnosisSynced = true;
    }

    // ── Sync key findings into chronic conditions ─────────────────────────────
    if (syncConditions && Array.isArray(result.keyFindings) && result.keyFindings.length > 0) {
      const [pat] = await db
        .select({ chronicConditions: patients.chronicConditions })
        .from(patients)
        .where(eq(patients.id, doc.patientId!))
        .limit(1);
      const existing = Array.isArray(pat?.chronicConditions) ? pat.chronicConditions : [];
      const toAdd = (result.keyFindings as string[]).filter((f) => f && !existing.includes(f));
      if (toAdd.length > 0) {
        await db
          .update(patients)
          .set({ chronicConditions: [...existing, ...toAdd] })
          .where(eq(patients.id, doc.patientId!));
        summary.conditionsSynced = toAdd.length;
      }
    }

    // ── Sync vitals ────────────────────────────────────────────────────────────
    if (syncVitals) {
      const vitals = Array.isArray(result.extractedVitals) ? result.extractedVitals : [];
      let vitalsSynced = 0;
      for (const v of vitals) {
        if (!v?.type || v.value == null) continue;
        try {
          await db.execute(sql`
            INSERT INTO vital_readings (family_id, type, value, value2, unit, notes, is_abnormal, recorded_at)
            VALUES (${familyId}, ${v.type}, ${Number(v.value)}, ${v.value2 != null ? Number(v.value2) : null},
                    ${v.unit || ''}, ${v.notes || null}, false, now())
          `);
          vitalsSynced++;
        } catch (err) {
          console.error('[Sync] Failed to insert vital:', v.type, err);
        }
      }
      summary.vitalsSynced = vitalsSynced;
    }

    // ── Sync referrals → doctor_visits ─────────────────────────────────────────
    if (syncReferrals) {
      const referrals = Array.isArray(result.extractedReferrals) ? result.extractedReferrals : [];
      let referralsSynced = 0;
      for (const r of referrals) {
        if (!r?.specialty?.trim()) continue;
        try {
          const daysAhead = r.urgency === 'urgent' ? 7 : r.urgency === 'soon' ? 30 : 90;
          const visitDate = new Date();
          visitDate.setDate(visitDate.getDate() + daysAhead);
          await db.execute(sql`
            INSERT INTO doctor_visits (family_id, patient_id, user_id, doctor_name, specialty, date, summary, status)
            VALUES (${familyId}, ${doc.patientId || null}, ${(user as { id: string }).id},
                    ${'לא נקבע עדיין'}, ${r.specialty.trim()}, ${visitDate.toISOString()},
                    ${r.reason?.trim() || null}, ${'scheduled'})
          `);
          referralsSynced++;
        } catch (err) {
          console.error('[Sync] Failed to insert referral:', r.specialty, err);
        }
      }
      summary.referralsSynced = referralsSynced;
    }

    res.json(summary);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to sync to patient' });
  }
});

// GET /medical-documents/:id/linked-data — return tasks, professionals, referrals linked to a doc
routes.get('/medical-documents/:id/linked-data', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'לא מחובר' });
    const familyId = (user as { effectiveFamilyId?: string }).effectiveFamilyId ?? user.familyId;
    const { id } = req.params;

    const [doc] = await db
      .select({ id: medicalDocuments.id, title: medicalDocuments.title })
      .from(medicalDocuments)
      .where(and(eq(medicalDocuments.id, id), eq(medicalDocuments.familyId, familyId)))
      .limit(1);
    if (!doc) return res.status(404).json({ error: 'לא נמצא' });

    // Tasks linked to this document (by sourceEntityId)
    const linkedTasks = await db
      .select({ id: tasks.id, title: tasks.title, status: tasks.status, source: tasks.source })
      .from(tasks)
      .where(and(eq(tasks.familyId, familyId), eq(tasks.sourceEntityId, id)));

    // Professionals that list this doc in linked_document_ids
    const allProfs = await db
      .select({ id: professionals.id, name: professionals.name, specialty: professionals.specialty, linkedDocumentIds: professionals.linkedDocumentIds })
      .from(professionals)
      .where(eq(professionals.familyId, familyId));
    const linkedProfessionals = allProfs
      .filter(p => {
        const ids = Array.isArray(p.linkedDocumentIds) ? p.linkedDocumentIds : [];
        return ids.includes(id);
      })
      .map(p => ({ id: p.id, name: p.name, specialty: p.specialty }));

    // Referrals created from this document
    const linkedReferrals = await db
      .select({ id: referrals.id, specialty: referrals.specialty, reason: referrals.reason, status: referrals.status })
      .from(referrals)
      .where(and(eq(referrals.familyId, familyId), eq(referrals.sourceDocumentId, id)));

    res.json({ tasks: linkedTasks, professionals: linkedProfessionals, referrals: linkedReferrals });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch linked data' });
  }
});

routes.delete('/medical-documents/:id', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'לא מחובר' });
    const familyId = (user as { effectiveFamilyId?: string }).effectiveFamilyId ?? user.familyId;
    if (user.role === 'viewer' || user.role === 'guest') {
      return res.status(403).json({ error: 'אין הרשאה למחוק מסמכים' });
    }
    const { id } = req.params;
    const [existing] = await db
      .select()
      .from(medicalDocuments)
      .where(and(eq(medicalDocuments.id, id), eq(medicalDocuments.familyId, familyId)))
      .limit(1);
    if (!existing) return res.status(404).json({ error: 'Document not found' });

    // Optional: delete linked tasks, professionals, referrals
    const { deleteTaskIds, deleteProfessionalIds, deleteReferralIds } = (req.body ?? {}) as {
      deleteTaskIds?: string[];
      deleteProfessionalIds?: string[];
      deleteReferralIds?: string[];
    };

    if (Array.isArray(deleteTaskIds) && deleteTaskIds.length > 0) {
      for (const taskId of deleteTaskIds) {
        await db.delete(tasks).where(and(eq(tasks.id, taskId), eq(tasks.familyId, familyId))).catch(() => {});
      }
    }
    if (Array.isArray(deleteProfessionalIds) && deleteProfessionalIds.length > 0) {
      for (const profId of deleteProfessionalIds) {
        await db.delete(professionals).where(and(eq(professionals.id, profId), eq(professionals.familyId, familyId))).catch(() => {});
      }
    }
    if (Array.isArray(deleteReferralIds) && deleteReferralIds.length > 0) {
      for (const refId of deleteReferralIds) {
        await db.delete(referrals).where(and(eq(referrals.id, refId), eq(referrals.familyId, familyId))).catch(() => {});
      }
    }

    const { deleteMedicalDocumentByUrl } = await import('./services/medicalDocumentStorage');
    if (existing.fileUrl) await deleteMedicalDocumentByUrl(existing.fileUrl);
    await db.delete(medicalDocuments).where(eq(medicalDocuments.id, id));
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// MEMORY STORIES (רגעים וזכרונות)
// ──────────────────────────────────────────────────────────────────────────────

routes.get('/memory-stories', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'לא מחובר' });
    const familyId = (user as { effectiveFamilyId?: string }).effectiveFamilyId ?? user.familyId;
    const patientId = req.query.patientId as string | undefined;
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;
    const conditions = [eq(memoryStories.familyId, familyId)];
    if (patientId) conditions.push(eq(memoryStories.patientId, patientId));
    if (from) {
      const fromDate = new Date(from);
      if (!Number.isNaN(fromDate.getTime())) conditions.push(gte(memoryStories.occurredAt, fromDate));
    }
    if (to) {
      const toDate = new Date(to);
      if (!Number.isNaN(toDate.getTime())) conditions.push(lte(memoryStories.occurredAt, toDate));
    }
    const list = await db
      .select()
      .from(memoryStories)
      .where(and(...conditions))
      .orderBy(desc(memoryStories.occurredAt), desc(memoryStories.createdAt));
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch memories' });
  }
});

routes.post('/memory-stories', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'לא מחובר' });
    const familyId = (user as { effectiveFamilyId?: string }).effectiveFamilyId ?? user.familyId;
    const { title, content, patientId, imageUrl, occurredAt, careStage, tags, severity, isReportedToDoctor } = req.body ?? {};
    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'title is required' });
    }
    const [created] = await db
      .insert(memoryStories)
      .values({
        familyId,
        userId: user.id,
        title: title.trim(),
        content: content || null,
        patientId: patientId || null,
        imageUrl: imageUrl || null,
        occurredAt: occurredAt ? new Date(occurredAt) : null,
        careStage: careStage?.trim() || null,
        tags: Array.isArray(tags) ? tags : null,
        severity: Number.isFinite(Number(severity)) ? Number(severity) : null,
        isReportedToDoctor: !!isReportedToDoctor,
      })
      .returning();
    res.status(201).json(created);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create memory' });
  }
});

routes.patch('/memory-stories/:id', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'לא מחובר' });
    const familyId = (user as { effectiveFamilyId?: string }).effectiveFamilyId ?? user.familyId;
    const { id } = req.params;
    const [existing] = await db
      .select()
      .from(memoryStories)
      .where(and(eq(memoryStories.id, id), eq(memoryStories.familyId, familyId)))
      .limit(1);
    if (!existing) return res.status(404).json({ error: 'Memory not found' });

    const body = req.body ?? {};
    const update: Record<string, unknown> = {};
    if (body.title !== undefined) update.title = String(body.title).trim();
    if (body.content !== undefined) update.content = body.content || null;
    if (body.patientId !== undefined) update.patientId = body.patientId || null;
    if (body.imageUrl !== undefined) update.imageUrl = body.imageUrl || null;
    if (body.occurredAt !== undefined) update.occurredAt = body.occurredAt ? new Date(body.occurredAt) : null;
    if (body.location !== undefined) update.location = body.location?.trim() || null;
    if (body.emotionalTone !== undefined) update.emotionalTone = body.emotionalTone?.trim() || null;
    if (body.tags !== undefined) update.tags = Array.isArray(body.tags) ? body.tags : null;
    if (body.aiInsight !== undefined) update.aiInsight = body.aiInsight?.trim() || null;
    if (body.isReportedToDoctor !== undefined) update.isReportedToDoctor = !!body.isReportedToDoctor;
    if (body.severity !== undefined) update.severity = Number.isFinite(Number(body.severity)) ? Number(body.severity) : null;
    if (body.careStage !== undefined) update.careStage = body.careStage?.trim() || null;

    const [updated] = await db
      .update(memoryStories)
      .set(update)
      .where(eq(memoryStories.id, id))
      .returning();
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update memory' });
  }
});

routes.delete('/memory-stories/:id', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'לא מחובר' });
    const familyId = (user as { effectiveFamilyId?: string }).effectiveFamilyId ?? user.familyId;
    const { id } = req.params;
    const [existing] = await db
      .select()
      .from(memoryStories)
      .where(and(eq(memoryStories.id, id), eq(memoryStories.familyId, familyId)))
      .limit(1);
    if (!existing) return res.status(404).json({ error: 'Memory not found' });
    await db.delete(memoryStories).where(eq(memoryStories.id, id));
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete memory' });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// RIGHTS (מרכז זכויות)
// ──────────────────────────────────────────────────────────────────────────────

const DEFAULT_RIGHTS = [
  { id: 'rights-map', slug: 'rights-map', titleHe: 'מפת זכויות', titleEn: 'Rights map', descriptionHe: 'סקירה מרוכזת של סוגי הקצבאות וההטבות', icon: 'scale' },
  { id: 'questions-doctor', slug: 'questions-doctor', titleHe: 'מה לשאול את הרופא', titleEn: 'Questions for the doctor', descriptionHe: 'רשימת שאלות מומלצת לפגישה', icon: 'stethoscope' },
  { id: 'important-forms', slug: 'important-forms', titleHe: 'טפסים שחשוב לשמור', titleEn: 'Important forms', descriptionHe: 'מסמכים רפואיים ושחרורים', icon: 'file-text' },
  { id: 'committee-prep', slug: 'committee-prep', titleHe: 'איך מתכוננים לוועדה', titleEn: 'Preparing for the committee', descriptionHe: 'טיפים ליום הוועדה', icon: 'help-circle' },
];

routes.get('/rights', async (req, res) => {
  try {
    await getUserFromRequest(req);
    const list = await db.select().from(rightsCategories).orderBy(rightsCategories.sortOrder);
    if (list.length > 0) return res.json(list);
    res.json(DEFAULT_RIGHTS);
  } catch (err) {
    console.error(err);
    res.json(DEFAULT_RIGHTS);
  }
});

routes.get('/rights/search', async (req, res) => {
  try {
    await getUserFromRequest(req);
    const q = (req.query.q as string)?.trim()?.toLowerCase();
    const list = await db.select().from(rightsCategories).orderBy(rightsCategories.sortOrder);
    const all = list.length > 0 ? list : DEFAULT_RIGHTS;
    const filtered = q
      ? all.filter(
          (r) =>
            (r.titleHe ?? '').toLowerCase().includes(q) || (r.titleEn ?? '').toLowerCase().includes(q)
        )
      : all;
    res.json(filtered);
  } catch (err) {
    console.error(err);
    res.json([]);
  }
});

routes.get('/rights/:id', async (req, res) => {
  try {
    await getUserFromRequest(req);
    const { id } = req.params;
    const def = DEFAULT_RIGHTS.find((d) => d.id === id || d.slug === id);
    if (def) return res.json(def);
    const [r] = await db.select().from(rightsCategories).where(eq(rightsCategories.slug, id)).limit(1);
    if (!r) return res.status(404).json({ error: 'Not found' });
    res.json(r);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch' });
  }
});

routes.post('/rights/request', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'לא מחובר' });
    const familyId = (user as { effectiveFamilyId?: string }).effectiveFamilyId ?? user.familyId;
    const { categorySlug, notes } = req.body ?? {};
    const [created] = await db
      .insert(rightsRequests)
      .values({
        userId: user.id,
        familyId,
        categorySlug: categorySlug?.trim() || null,
        notes: notes?.trim() || null,
      })
      .returning();
    res.status(201).json(created);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to submit request' });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// MEDICATIONS
// ──────────────────────────────────────────────────────────────────────────────

routes.get('/patients/:id/medications', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'לא מחובר' });
    const familyId = (user as { effectiveFamilyId?: string }).effectiveFamilyId ?? user.familyId;
    const { id } = req.params;
    const [patient] = await db
      .select(SAFE_PATIENT_COLS)
      .from(patients)
      .where(and(eq(patients.id, id), eq(patients.familyId, familyId)))
      .limit(1);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    const list = await db
      .select()
      .from(medications)
      .where(eq(medications.patientId, id))
      .orderBy(desc(medications.isActive), desc(medications.createdAt));
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch medications' });
  }
});

routes.post('/patients/:id/medications', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'לא מחובר' });
    const familyId = (user as { effectiveFamilyId?: string }).effectiveFamilyId ?? user.familyId;
    if (user.role === 'viewer' || user.role === 'guest') {
      return res.status(403).json({ error: 'אין הרשאה להוסיף תרופות' });
    }
    const { id } = req.params;
    const [patient] = await db
      .select(SAFE_PATIENT_COLS)
      .from(patients)
      .where(and(eq(patients.id, id), eq(patients.familyId, familyId)))
      .limit(1);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    const { name, genericName, dosage, frequency, timing, startDate, endDate, prescribingDoctor, isActive, notes } =
      req.body ?? {};
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'name is required' });
    }

    const [created] = await db
      .insert(medications)
      .values({
        patientId: id,
        familyId,
        name: name.trim(),
        genericName: genericName?.trim() || null,
        dosage: dosage?.trim() || null,
        frequency: frequency?.trim() || null,
        timing: Array.isArray(timing) ? timing : null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        prescribingDoctor: prescribingDoctor?.trim() || null,
        isActive: isActive !== false,
        notes: notes?.trim() || null,
      })
      .returning();
    res.status(201).json(created);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add medication' });
  }
});

routes.patch('/medications/:id', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'לא מחובר' });
    const familyId = (user as { effectiveFamilyId?: string }).effectiveFamilyId ?? user.familyId;
    if (user.role === 'viewer' || user.role === 'guest') {
      return res.status(403).json({ error: 'אין הרשאה לערוך תרופות' });
    }
    const { id } = req.params;
    const [existing] = await db
      .select()
      .from(medications)
      .where(and(eq(medications.id, id), eq(medications.familyId, familyId)))
      .limit(1);
    if (!existing) return res.status(404).json({ error: 'Medication not found' });

    const body = req.body ?? {};
    const update: Record<string, unknown> = {};
    if (body.name !== undefined) update.name = String(body.name).trim();
    if (body.genericName !== undefined) update.genericName = body.genericName?.trim() || null;
    if (body.dosage !== undefined) update.dosage = body.dosage?.trim() || null;
    if (body.frequency !== undefined) update.frequency = body.frequency?.trim() || null;
    if (body.timing !== undefined) update.timing = Array.isArray(body.timing) ? body.timing : null;
    if (body.startDate !== undefined) update.startDate = body.startDate ? new Date(body.startDate) : null;
    if (body.endDate !== undefined) update.endDate = body.endDate ? new Date(body.endDate) : null;
    if (body.prescribingDoctor !== undefined) update.prescribingDoctor = body.prescribingDoctor?.trim() || null;
    if (body.isActive !== undefined) update.isActive = !!body.isActive;
    if (body.notes !== undefined) update.notes = body.notes?.trim() || null;

    const [updated] = await db
      .update(medications)
      .set(update)
      .where(eq(medications.id, id))
      .returning();
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update medication' });
  }
});

routes.delete('/medications/:id', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'לא מחובר' });
    const familyId = (user as { effectiveFamilyId?: string }).effectiveFamilyId ?? user.familyId;
    if (user.role === 'viewer' || user.role === 'guest') {
      return res.status(403).json({ error: 'אין הרשאה למחוק תרופות' });
    }
    const { id } = req.params;
    const [existing] = await db
      .select()
      .from(medications)
      .where(and(eq(medications.id, id), eq(medications.familyId, familyId)))
      .limit(1);
    if (!existing) return res.status(404).json({ error: 'Medication not found' });
    await db.delete(medications).where(eq(medications.id, id));
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete medication' });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// PATIENTS
// ──────────────────────────────────────────────────────────────────────────────

function computePatientCompletionScore(p: {
  fullName?: string | null;
  dateOfBirth?: Date | string | null;
  gender?: string | null;
  idNumber?: string | null;
  primaryDiagnosis?: string | null;
  chronicConditions?: unknown;
  allergies?: unknown;
  emergencyContact?: string | null;
  emergencyContactPhone?: string | null;
  primaryDoctorName?: string | null;
  primaryDoctorPhone?: string | null;
  healthFundName?: string | null;
  insuranceNumber?: string | null;
}): number {
  let points = 0;
  if (p.fullName?.trim()) points += 2;
  if (p.dateOfBirth) points += 2;
  if (p.gender?.trim()) points += 1;
  if (p.idNumber?.trim()) points += 2;
  if (p.primaryDiagnosis?.trim()) points += 2;
  if (Array.isArray(p.chronicConditions) && p.chronicConditions.length > 0) points += 1;
  if (Array.isArray(p.allergies) && p.allergies.length > 0) points += 1;
  if (p.emergencyContact?.trim()) points += 1;
  if (p.emergencyContactPhone?.trim()) points += 2;
  if (p.primaryDoctorName?.trim()) points += 2;
  if (p.primaryDoctorPhone?.trim()) points += 1;
  if (p.healthFundName?.trim()) points += 1;
  if (p.insuranceNumber?.trim()) points += 2;
  return Math.min(100, Math.round((points / 20) * 100));
}

// ─── Cognitive AI Summary (rule-based pattern detection) ─────────────────────
function generateCognitiveAiSummary(
  memories: Array<{ severity: number | null; careStage: string | null; tags: string[] | null; occurredAt: Date | null; createdAt: Date; isReportedToDoctor: boolean }>,
  patient: { fullName?: string | null; careStage?: string | null }
): { insights: string[]; patterns: string[]; alerts: string[] } | null {
  if (memories.length === 0) return null;

  const insights: string[] = [];
  const patterns: string[] = [];
  const alerts: string[] = [];

  // Severity trend
  const last5 = memories.slice(-5);
  const first5 = memories.slice(0, 5);
  const avgLast = last5.reduce((a, m) => a + (m.severity ?? 0), 0) / last5.length;
  const avgFirst = first5.reduce((a, m) => a + (m.severity ?? 0), 0) / first5.length;
  if (memories.length >= 6 && avgLast > avgFirst + 0.8) {
    alerts.push(`מגמת החמרה: עוצמת התצפיות עלתה מממוצע ${avgFirst.toFixed(1)} ל-${avgLast.toFixed(1)} (מ-5)`);
  }

  // Tag frequency
  const tagCounts: Record<string, number> = {};
  for (const m of memories) {
    for (const tag of m.tags ?? []) {
      tagCounts[tag] = (tagCounts[tag] ?? 0) + 1;
    }
  }
  const topTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);
  if (topTags.length > 0) {
    const tagLabels: Record<string, string> = {
      repetitiveness: 'חזרתיות', confusion: 'בלבול', name_forgetting: 'שכחת שמות',
      disorientation: 'איבוד דרך', personality_change: 'שינוי אישיות', decision_difficulty: 'קושי בהחלטות',
      language_issues: 'בעיות שפה', hallucinations: 'הזיות', mood_changes: 'שינוי מצב רוח', daily_tasks: 'קושי בשגרה',
    };
    patterns.push(`תסמינים שכיחים ביותר: ${topTags.map(([t, c]) => `${tagLabels[t] ?? t} (${c}×)`).join(', ')}`);
  }

  // Stage spread
  const stages = new Set(memories.map((m) => m.careStage).filter(Boolean));
  if (stages.size > 1) {
    insights.push(`תצפיות תועדו על פני ${stages.size} שלבים שונים — ציר זמן מקיף לרופא.`);
  }

  // High severity count
  const highSeverity = memories.filter((m) => (m.severity ?? 0) >= 4).length;
  if (highSeverity > 0) {
    alerts.push(`${highSeverity} תצפיות עוצמה גבוהה (4–5) — מומלץ להציג לרופא`);
  }

  // Unreported
  const unreported = memories.filter((m) => !m.isReportedToDoctor).length;
  if (unreported > 3) {
    insights.push(`${unreported} תצפיות עדיין לא דווחו לרופא — שקלו לשתף לפני הביקור הבא.`);
  }

  return { insights, patterns, alerts };
}

function computeOnboardingStep(p: {
  fullName?: string | null;
  dateOfBirth?: Date | string | null;
  gender?: string | null;
  primaryDiagnosis?: string | null;
  chronicConditions?: unknown;
  emergencyContact?: string | null;
  primaryDoctorName?: string | null;
  healthFundName?: string | null;
}): number {
  if (!p.fullName?.trim()) return 1;
  if (!p.dateOfBirth || !p.gender) return 2;
  if (!p.primaryDiagnosis?.trim() && !(Array.isArray(p.chronicConditions) && p.chronicConditions?.length)) return 3;
  if (!p.emergencyContact?.trim() || !p.primaryDoctorName?.trim()) return 4;
  if (!p.healthFundName?.trim()) return 5;
  return 6;
}

routes.get('/patients/:id/doctor-summary', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'לא מחובר' });
    const familyId = (user as { effectiveFamilyId?: string }).effectiveFamilyId ?? user.familyId;
    const { id } = req.params;
    const [patient] = await db
      .select(SAFE_PATIENT_COLS)
      .from(patients)
      .where(and(eq(patients.id, id), eq(patients.familyId, familyId)))
      .limit(1);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    const [allMemories, docs, meds, taskList, responses] = await Promise.all([
      db
        .select()
        .from(memoryStories)
        .where(and(eq(memoryStories.patientId, id), eq(memoryStories.familyId, familyId)))
        .orderBy(memoryStories.occurredAt, memoryStories.createdAt),
      db
        .select({
          id: medicalDocuments.id,
          title: medicalDocuments.title,
          documentType: medicalDocuments.documentType,
          issuingDoctor: medicalDocuments.issuingDoctor,
          hospitalName: medicalDocuments.hospitalName,
          simplifiedDiagnosis: medicalDocuments.simplifiedDiagnosis,
          extractedMedications: medicalDocuments.extractedMedications,
          extractedTasks: medicalDocuments.extractedTasks,
          aiAnalysisStatus: medicalDocuments.aiAnalysisStatus,
          documentDate: medicalDocuments.documentDate,
          createdAt: medicalDocuments.createdAt,
        })
        .from(medicalDocuments)
        .where(and(eq(medicalDocuments.patientId, id), eq(medicalDocuments.familyId, familyId)))
        .orderBy(desc(medicalDocuments.createdAt))
        .limit(20),
      db
        .select()
        .from(medications)
        .where(and(eq(medications.patientId, id), eq(medications.isActive, true)))
        .orderBy(medications.name),
      db
        .select({
          id: tasks.id, title: tasks.title, description: tasks.description,
          status: tasks.status, priority: tasks.priority, category: tasks.category,
          dueDate: tasks.dueDate, patientId: tasks.patientId,
          assignedToUserId: tasks.assignedToUserId, createdAt: tasks.createdAt,
        })
        .from(tasks)
        .where(and(eq(tasks.patientId, id), eq(tasks.familyId, familyId)))
        .orderBy(desc(tasks.dueDate), desc(tasks.createdAt))
        .limit(15),
      db
        .select()
        .from(questionnaireResponses)
        .where(and(eq(questionnaireResponses.patientId, id), eq(questionnaireResponses.familyId, familyId)))
        .orderBy(desc(questionnaireResponses.submittedAt))
        .limit(5),
    ]);

    const patientOut = {
      ...patient,
      idNumber: decrypt(patient.idNumber),
      insuranceNumber: decrypt(patient.insuranceNumber),
    };

    // Extended doctor summary — labs, vitals, referrals, insights (Phase-2 tables — guarded)
    let recentVitals: any[] = [], recentLabs: any[] = [], pendingReferrals: any[] = [];
    let criticalInsights: any[] = [], recentAssessments: any[] = [];
    try {
      [recentVitals, recentLabs, pendingReferrals, criticalInsights, recentAssessments] = await Promise.all([
        db.select().from(vitals).where(and(eq(vitals.patientId, id), eq(vitals.familyId, familyId))).orderBy(desc(vitals.recordedAt)).limit(20),
        db.select().from(labResults).where(and(eq(labResults.patientId, id), eq(labResults.familyId, familyId))).orderBy(desc(labResults.createdAt)).limit(30),
        db.select().from(referrals).where(and(eq(referrals.patientId, id), eq(referrals.familyId, familyId), eq(referrals.status, 'pending'))).orderBy(desc(referrals.createdAt)).limit(10),
        db.select().from(patientHealthInsights).where(and(eq(patientHealthInsights.patientId, id), eq(patientHealthInsights.status, 'new'))).orderBy(desc(patientHealthInsights.createdAt)).limit(10),
        db.select().from(patientAssessments).where(and(eq(patientAssessments.patientId, id), eq(patientAssessments.familyId, familyId))).orderBy(desc(patientAssessments.assessedAt)).limit(10),
      ]);
    } catch (_) {
      // Phase-2 tables not yet migrated — return empty arrays
    }

    // Build cognitive timeline: group by careStage, compute stage stats
    const STAGE_ORDER = ['genetic_awareness', 'suspicion', 'bridge', 'certainty'];
    const cognitiveTimeline = STAGE_ORDER.map((stage) => {
      const stageEntries = allMemories.filter((m) => m.careStage === stage);
      const severities = stageEntries.map((m) => m.severity).filter((s): s is number => s != null);
      return {
        stage,
        count: stageEntries.length,
        avgSeverity: severities.length > 0 ? Math.round((severities.reduce((a, b) => a + b, 0) / severities.length) * 10) / 10 : null,
        unreportedCount: stageEntries.filter((m) => !m.isReportedToDoctor).length,
        firstDate: stageEntries[0]?.occurredAt ?? stageEntries[0]?.createdAt ?? null,
        lastDate: stageEntries[stageEntries.length - 1]?.occurredAt ?? stageEntries[stageEntries.length - 1]?.createdAt ?? null,
        recentEntries: stageEntries.slice(-3).reverse().map((m) => ({
          id: m.id,
          title: m.title,
          content: m.content,
          occurredAt: m.occurredAt,
          createdAt: m.createdAt,
          severity: m.severity,
          tags: m.tags,
          isReportedToDoctor: m.isReportedToDoctor,
          careStage: m.careStage,
        })),
      };
    }).filter((s) => s.count > 0);

    const totalUnreported = allMemories.filter((m) => !m.isReportedToDoctor).length;

    res.json({
      patient: patientOut,
      recentMemories: allMemories.slice(-10).reverse(),
      medicalDocuments: docs,
      medications: meds,
      recentTasks: taskList,
      questionnaireResults: responses,
      recentVitals,
      recentLabResults: recentLabs,
      pendingReferrals,
      criticalInsights,
      recentAssessments,
      cognitiveTimeline,
      totalUnreportedObservations: totalUnreported,
      totalObservations: allMemories.length,
      aiSummary: generateCognitiveAiSummary(allMemories, patient),
      alerts: criticalInsights.filter((i) => i.severity === 'critical'),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch doctor summary' });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// Medical Brain & Heart — Clinical Data Endpoints
// ──────────────────────────────────────────────────────────────────────────────

// ── Vitals ───────────────────────────────────────────────────────────────────

routes.get('/patients/:id/vitals', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'לא מחובר' });
    const familyId = (user as { effectiveFamilyId?: string }).effectiveFamilyId ?? user.familyId;
    const { id } = req.params;
    const { type, limit: limitParam } = req.query;
    const qLimit = Math.min(Number(limitParam) || 50, 200);

    const conditions = [eq(vitals.patientId, id), eq(vitals.familyId, familyId)];
    if (type) conditions.push(eq(vitals.type, type as any));

    const rows = await db
      .select()
      .from(vitals)
      .where(and(...conditions))
      .orderBy(desc(vitals.recordedAt))
      .limit(qLimit);
    res.json(rows);
  } catch (err: any) {
    if (err?.message?.includes('does not exist')) return res.json([]);
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch vitals' });
  }
});

routes.post('/patients/:id/vitals', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'לא מחובר' });
    if (user.role === 'viewer' || user.role === 'guest') return res.status(403).json({ error: 'אין הרשאה' });
    const familyId = (user as { effectiveFamilyId?: string }).effectiveFamilyId ?? user.familyId;
    const { id } = req.params;
    const { type, value, value2, unit, isAbnormal, notes, recordedAt } = req.body;
    if (!type || value == null || !unit) return res.status(400).json({ error: 'חסרים שדות חובה' });

    const [row] = await db
      .insert(vitals)
      .values({
        patientId: id,
        familyId,
        type,
        value: String(value),
        value2: value2 != null ? String(value2) : undefined,
        unit,
        isAbnormal: isAbnormal ?? false,
        notes: notes || null,
        recordedByUserId: user.id,
        recordedAt: recordedAt ? new Date(recordedAt) : new Date(),
      })
      .returning();
    res.status(201).json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create vital' });
  }
});

routes.delete('/vitals/:id', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'לא מחובר' });
    if (user.role === 'viewer' || user.role === 'guest') return res.status(403).json({ error: 'אין הרשאה' });
    const familyId = (user as { effectiveFamilyId?: string }).effectiveFamilyId ?? user.familyId;
    await db.delete(vitals).where(and(eq(vitals.id, req.params.id), eq(vitals.familyId, familyId)));
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete vital' });
  }
});

// ── Lab Results ──────────────────────────────────────────────────────────────

// GET /patients/:id/lab-results/trends?testName=HbA1c&limit=10
// Returns chronological history of a specific test for trend charts
routes.get('/patients/:id/lab-results/trends', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'לא מחובר' });
    const familyId = (user as { effectiveFamilyId?: string }).effectiveFamilyId ?? user.familyId;
    const { testName, limit: limitParam } = req.query;
    if (!testName || typeof testName !== 'string') {
      return res.status(400).json({ error: 'נדרש פרמטר testName' });
    }
    const limit = Math.min(Math.max(Number(limitParam) || 20, 1), 100);
    const rows = await db
      .select({
        id: labResults.id,
        testName: labResults.testName,
        value: labResults.value,
        unit: labResults.unit,
        isAbnormal: labResults.isAbnormal,
        testDate: labResults.testDate,
        createdAt: labResults.createdAt,
        referenceRangeLow: labResults.referenceRangeLow,
        referenceRangeHigh: labResults.referenceRangeHigh,
      })
      .from(labResults)
      .where(
        and(
          eq(labResults.patientId, req.params.id),
          eq(labResults.familyId, familyId),
          eq(labResults.testName, testName)
        )
      )
      .orderBy(labResults.createdAt)
      .limit(limit);
    res.json(rows);
  } catch (err: any) {
    if (err?.message?.includes('does not exist')) return res.json([]);
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch lab trends' });
  }
});

routes.get('/patients/:id/lab-results', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'לא מחובר' });
    const familyId = (user as { effectiveFamilyId?: string }).effectiveFamilyId ?? user.familyId;
    const rows = await db
      .select()
      .from(labResults)
      .where(and(eq(labResults.patientId, req.params.id), eq(labResults.familyId, familyId)))
      .orderBy(desc(labResults.createdAt))
      .limit(100);
    res.json(rows);
  } catch (err: any) {
    if (err?.message?.includes('does not exist')) return res.json([]);
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch lab results' });
  }
});

routes.post('/patients/:id/lab-results', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'לא מחובר' });
    if (user.role === 'viewer' || user.role === 'guest') return res.status(403).json({ error: 'אין הרשאה' });
    const familyId = (user as { effectiveFamilyId?: string }).effectiveFamilyId ?? user.familyId;
    const { testName, value, unit, referenceRangeLow, referenceRangeHigh, isAbnormal, testDate, orderingDoctor, labName, notes } = req.body;
    if (!testName || value == null) return res.status(400).json({ error: 'חסרים שדות חובה' });

    const [row] = await db
      .insert(labResults)
      .values({
        patientId: req.params.id,
        familyId,
        testName,
        value: String(value),
        unit: unit || null,
        referenceRangeLow: referenceRangeLow || null,
        referenceRangeHigh: referenceRangeHigh || null,
        isAbnormal: isAbnormal ?? false,
        testDate: testDate || null,
        orderingDoctor: orderingDoctor || null,
        labName: labName || null,
        notes: notes || null,
      })
      .returning();
    res.status(201).json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create lab result' });
  }
});

// ── Referrals ────────────────────────────────────────────────────────────────

routes.get('/patients/:id/referrals', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'לא מחובר' });
    const familyId = (user as { effectiveFamilyId?: string }).effectiveFamilyId ?? user.familyId;
    const rows = await db
      .select()
      .from(referrals)
      .where(and(eq(referrals.patientId, req.params.id), eq(referrals.familyId, familyId)))
      .orderBy(desc(referrals.createdAt))
      .limit(50);
    res.json(rows);
  } catch (err: any) {
    if (err?.message?.includes('does not exist')) return res.json([]);
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch referrals' });
  }
});

routes.post('/patients/:id/referrals', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'לא מחובר' });
    if (user.role === 'viewer' || user.role === 'guest') return res.status(403).json({ error: 'אין הרשאה' });
    const familyId = (user as { effectiveFamilyId?: string }).effectiveFamilyId ?? user.familyId;
    const { specialty, reason, urgency, referringDoctor, notes } = req.body;
    if (!specialty || !reason) return res.status(400).json({ error: 'חסרים שדות חובה' });

    const [row] = await db
      .insert(referrals)
      .values({
        patientId: req.params.id,
        familyId,
        specialty,
        reason,
        urgency: urgency || 'routine',
        status: 'pending',
        referringDoctor: referringDoctor || null,
        notes: notes || null,
      })
      .returning();
    res.status(201).json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create referral' });
  }
});

routes.patch('/referrals/:id', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'לא מחובר' });
    if (user.role === 'viewer' || user.role === 'guest') return res.status(403).json({ error: 'אין הרשאה' });
    const familyId = (user as { effectiveFamilyId?: string }).effectiveFamilyId ?? user.familyId;
    const allowed = ['status', 'scheduledDate', 'completedDate', 'notes', 'linkedTaskId'];
    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No fields to update' });
    updates.updatedAt = new Date();
    const [row] = await db
      .update(referrals)
      .set(updates as any)
      .where(and(eq(referrals.id, req.params.id), eq(referrals.familyId, familyId)))
      .returning();
    res.json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update referral' });
  }
});

// ── Diagnoses ────────────────────────────────────────────────────────────────

routes.get('/patients/:id/diagnoses', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'לא מחובר' });
    const familyId = (user as { effectiveFamilyId?: string }).effectiveFamilyId ?? user.familyId;
    const rows = await db
      .select()
      .from(patientDiagnoses)
      .where(and(eq(patientDiagnoses.patientId, req.params.id), eq(patientDiagnoses.familyId, familyId)))
      .orderBy(desc(patientDiagnoses.createdAt));
    res.json(rows);
  } catch (err: any) {
    if (err?.message?.includes('does not exist')) return res.json([]);
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch diagnoses' });
  }
});

routes.post('/patients/:id/diagnoses', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'לא מחובר' });
    if (user.role === 'viewer' || user.role === 'guest') return res.status(403).json({ error: 'אין הרשאה' });
    const familyId = (user as { effectiveFamilyId?: string }).effectiveFamilyId ?? user.familyId;
    const { condition, icdCode, diagnosedDate, status, severity, notes } = req.body;
    if (!condition) return res.status(400).json({ error: 'חסרים שדות חובה' });
    const [row] = await db
      .insert(patientDiagnoses)
      .values({ patientId: req.params.id, familyId, condition, icdCode, diagnosedDate, status: status || 'active', severity, notes })
      .returning();
    res.status(201).json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create diagnosis' });
  }
});

routes.patch('/diagnoses/:id', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'לא מחובר' });
    if (user.role === 'viewer' || user.role === 'guest') return res.status(403).json({ error: 'אין הרשאה' });
    const familyId = (user as { effectiveFamilyId?: string }).effectiveFamilyId ?? user.familyId;
    const { condition, status, severity, notes } = req.body;
    const [row] = await db
      .update(patientDiagnoses)
      .set({ condition, status, severity, notes, updatedAt: new Date() } as any)
      .where(and(eq(patientDiagnoses.id, req.params.id), eq(patientDiagnoses.familyId, familyId)))
      .returning();
    res.json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update diagnosis' });
  }
});

// ── Allergies ────────────────────────────────────────────────────────────────

routes.get('/patients/:id/allergies', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'לא מחובר' });
    const familyId = (user as { effectiveFamilyId?: string }).effectiveFamilyId ?? user.familyId;
    const rows = await db
      .select()
      .from(patientAllergies)
      .where(and(eq(patientAllergies.patientId, req.params.id), eq(patientAllergies.familyId, familyId)))
      .orderBy(desc(patientAllergies.createdAt));
    res.json(rows);
  } catch (err: any) {
    if (err?.message?.includes('does not exist')) return res.json([]);
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch allergies' });
  }
});

routes.post('/patients/:id/allergies', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'לא מחובר' });
    if (user.role === 'viewer' || user.role === 'guest') return res.status(403).json({ error: 'אין הרשאה' });
    const familyId = (user as { effectiveFamilyId?: string }).effectiveFamilyId ?? user.familyId;
    const { allergen, allergenType, reaction, severity, confirmedDate, status } = req.body;
    if (!allergen) return res.status(400).json({ error: 'חסרים שדות חובה' });
    const [row] = await db
      .insert(patientAllergies)
      .values({ patientId: req.params.id, familyId, allergen, allergenType: allergenType || 'other', reaction, severity, confirmedDate, status: status || 'active' })
      .returning();
    res.status(201).json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create allergy' });
  }
});

// ── Assessments ──────────────────────────────────────────────────────────────

routes.get('/patients/:id/assessments', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'לא מחובר' });
    const familyId = (user as { effectiveFamilyId?: string }).effectiveFamilyId ?? user.familyId;
    const rows = await db
      .select()
      .from(patientAssessments)
      .where(and(eq(patientAssessments.patientId, req.params.id), eq(patientAssessments.familyId, familyId)))
      .orderBy(desc(patientAssessments.assessedAt))
      .limit(50);
    res.json(rows);
  } catch (err: any) {
    if (err?.message?.includes('does not exist')) return res.json([]);
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch assessments' });
  }
});

routes.post('/patients/:id/assessments', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'לא מחובר' });
    if (user.role === 'viewer' || user.role === 'guest') return res.status(403).json({ error: 'אין הרשאה' });
    const familyId = (user as { effectiveFamilyId?: string }).effectiveFamilyId ?? user.familyId;
    const { assessmentType, score, maxScore, details, interpretation, assessedAt, nextAssessmentDue } = req.body;
    if (!assessmentType || score == null) return res.status(400).json({ error: 'חסרים שדות חובה' });
    const [row] = await db
      .insert(patientAssessments)
      .values({
        patientId: req.params.id,
        familyId,
        assessmentType,
        score,
        maxScore: maxScore ?? null,
        details: details ?? null,
        interpretation: interpretation ?? null,
        assessedByUserId: user.id,
        assessedAt: assessedAt ? new Date(assessedAt) : new Date(),
        nextAssessmentDue: nextAssessmentDue ?? null,
      })
      .returning();

    // Update patient's lastAssessmentDate
    await db
      .update(patients)
      .set({ lastAssessmentDate: new Date().toISOString().split('T')[0] })
      .where(eq(patients.id, req.params.id));

    res.status(201).json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create assessment' });
  }
});

// ── AI Health Insights ───────────────────────────────────────────────────────

routes.get('/patients/:id/health-insights', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'לא מחובר' });
    const familyId = (user as { effectiveFamilyId?: string }).effectiveFamilyId ?? user.familyId;
    const { status: statusFilter, severity: severityFilter } = req.query;
    const conditions = [
      eq(patientHealthInsights.patientId, req.params.id),
      eq(patientHealthInsights.familyId, familyId),
    ];
    if (statusFilter) conditions.push(eq(patientHealthInsights.status, String(statusFilter)));
    if (severityFilter) conditions.push(eq(patientHealthInsights.severity, severityFilter as any));
    try {
      const rows = await db
        .select()
        .from(patientHealthInsights)
        .where(and(...conditions))
        .orderBy(desc(patientHealthInsights.createdAt))
        .limit(50);
      res.json(rows);
    } catch (_) {
      res.json([]); // Phase-2 table not yet migrated
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch health insights' });
  }
});

routes.patch('/health-insights/:id/acknowledge', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'לא מחובר' });
    const familyId = (user as { effectiveFamilyId?: string }).effectiveFamilyId ?? user.familyId;
    const { action } = req.body; // 'acknowledge' | 'dismiss' | 'acted_upon'
    const newStatus = action === 'dismiss' ? 'dismissed' : action === 'acted_upon' ? 'acted_upon' : 'acknowledged';
    const [row] = await db
      .update(patientHealthInsights)
      .set({
        status: newStatus,
        acknowledgedByUserId: user.id,
        acknowledgedAt: new Date(),
      })
      .where(and(eq(patientHealthInsights.id, req.params.id), eq(patientHealthInsights.familyId, familyId)))
      .returning();
    res.json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update insight' });
  }
});

// ── Allergy Procedure Check (for appointment safety) ─────────────────────────

routes.get('/patients/:id/allergy-procedure-check', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'לא מחובר' });
    const familyId = (user as { effectiveFamilyId?: string }).effectiveFamilyId ?? user.familyId;
    const appointmentType = String(req.query.appointmentType || '');
    if (!appointmentType) return res.json([]);

    // Verify patient belongs to user's family
    const [patientCheck] = await db
      .select({ id: patients.id })
      .from(patients)
      .where(and(eq(patients.id, req.params.id), eq(patients.familyId, familyId)))
      .limit(1);
    if (!patientCheck) return res.status(403).json({ error: 'אין גישה' });

    const { checkAllergyProcedureConflicts } = await import('./services/medicalSafetyEngine');
    const alerts = await checkAllergyProcedureConflicts(req.params.id, appointmentType);
    res.json(alerts.map((a) => ({ allergen: a.allergen, message: a.message, recommendation: a.recommendation })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to check allergy conflicts' });
  }
});

// ── Medical Brain Rules ──────────────────────────────────────────────────────

routes.get('/medical-brain/rules', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'לא מחובר' });
    const familyId = (user as { effectiveFamilyId?: string }).effectiveFamilyId ?? user.familyId;
    try {
      const rows = await db
        .select()
        .from(medicalBrainRules)
        .where(and(
          eq(medicalBrainRules.isActive, true),
          // Global rules (familyId IS NULL) + family-specific rules
          sql`(${medicalBrainRules.familyId} IS NULL OR ${medicalBrainRules.familyId} = ${familyId})`
        ))
        .orderBy(desc(medicalBrainRules.priority));
      res.json(rows);
    } catch {
      res.json([]); // Table not yet migrated
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch medical brain rules' });
  }
});

routes.post('/medical-brain/rules', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'לא מחובר' });
    if (user.role === 'viewer' || user.role === 'guest') return res.status(403).json({ error: 'אין הרשאה' });
    const familyId = (user as { effectiveFamilyId?: string }).effectiveFamilyId ?? user.familyId;
    const { ruleType, name, description, triggerCondition, actions, priority } = req.body ?? {};
    if (!ruleType || !name || !triggerCondition || !actions) {
      return res.status(400).json({ error: 'חסרים שדות: ruleType, name, triggerCondition, actions' });
    }
    try {
      const [rule] = await db
        .insert(medicalBrainRules)
        .values({
          familyId,
          ruleType,
          name: name.trim(),
          description: description?.trim() || null,
          triggerCondition,
          actions,
          isActive: true,
          priority: priority ?? 50,
          createdByUserId: user.id,
        })
        .returning();
      res.status(201).json(rule);
    } catch {
      res.status(500).json({ error: 'טבלת medical_brain_rules לא קיימת עדיין — הרץ migration' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create medical brain rule' });
  }
});

routes.patch('/medical-brain/rules/:id', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'לא מחובר' });
    if (user.role === 'viewer' || user.role === 'guest') return res.status(403).json({ error: 'אין הרשאה' });
    const familyId = (user as { effectiveFamilyId?: string }).effectiveFamilyId ?? user.familyId;
    const { name, description, triggerCondition, actions, isActive, priority } = req.body ?? {};
    const [updated] = await db
      .update(medicalBrainRules)
      .set({ name, description, triggerCondition, actions, isActive, priority, updatedAt: new Date() })
      .where(and(eq(medicalBrainRules.id, req.params.id), eq(medicalBrainRules.familyId, familyId)))
      .returning();
    if (!updated) return res.status(404).json({ error: 'Rule not found' });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update rule' });
  }
});

routes.delete('/medical-brain/rules/:id', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'לא מחובר' });
    if (user.role === 'viewer' || user.role === 'guest') return res.status(403).json({ error: 'אין הרשאה' });
    const familyId = (user as { effectiveFamilyId?: string }).effectiveFamilyId ?? user.familyId;
    await db
      .delete(medicalBrainRules)
      .where(and(eq(medicalBrainRules.id, req.params.id), eq(medicalBrainRules.familyId, familyId)));
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete rule' });
  }
});

// ── Health Timeline ──────────────────────────────────────────────────────────

routes.get('/patients/:id/health-timeline', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'לא מחובר' });
    const familyId = (user as { effectiveFamilyId?: string }).effectiveFamilyId ?? user.familyId;
    const pid = req.params.id;

    const recentDocs = await db
      .select({ id: medicalDocuments.id, title: medicalDocuments.title, documentType: medicalDocuments.documentType, createdAt: medicalDocuments.createdAt })
      .from(medicalDocuments).where(and(eq(medicalDocuments.patientId, pid), eq(medicalDocuments.familyId, familyId))).orderBy(desc(medicalDocuments.createdAt)).limit(10);
    const recentMeds = await db.select().from(medications).where(and(eq(medications.patientId, pid), eq(medications.familyId, familyId))).orderBy(desc(medications.createdAt)).limit(10);
    const recentTasks = await db
      .select({ id: tasks.id, title: tasks.title, status: tasks.status, createdAt: tasks.createdAt })
      .from(tasks).where(and(eq(tasks.patientId, pid), eq(tasks.familyId, familyId))).orderBy(desc(tasks.createdAt)).limit(10);

    // Phase-2 tables — guarded
    let recentVitalsData: any[] = [], recentLabs: any[] = [], recentReferrals: any[] = [];
    let recentInsights: any[] = [];
    try {
      [recentVitalsData, recentLabs, recentReferrals, recentInsights] = await Promise.all([
        db.select().from(vitals).where(and(eq(vitals.patientId, pid), eq(vitals.familyId, familyId))).orderBy(desc(vitals.recordedAt)).limit(20),
        db.select().from(labResults).where(and(eq(labResults.patientId, pid), eq(labResults.familyId, familyId))).orderBy(desc(labResults.createdAt)).limit(20),
        db.select().from(referrals).where(and(eq(referrals.patientId, pid), eq(referrals.familyId, familyId))).orderBy(desc(referrals.createdAt)).limit(10),
        db.select().from(patientHealthInsights).where(and(eq(patientHealthInsights.patientId, pid), eq(patientHealthInsights.familyId, familyId))).orderBy(desc(patientHealthInsights.createdAt)).limit(15),
      ]);
    } catch (_) {
      // Phase-2 tables not yet migrated
    }

    // Merge into unified chronological timeline
    const timeline = [
      ...recentDocs.map((d) => ({ type: 'document', date: d.createdAt, data: d })),
      ...recentVitalsData.map((v) => ({ type: 'vital', date: (v as any).recordedAt, data: v })),
      ...recentLabs.map((l) => ({ type: 'lab', date: (l as any).createdAt, data: l })),
      ...recentReferrals.map((r) => ({ type: 'referral', date: (r as any).createdAt, data: r })),
      ...recentInsights.map((i) => ({ type: 'insight', date: (i as any).createdAt, data: i })),
      ...recentTasks.map((t) => ({ type: 'task', date: t.createdAt, data: t })),
      ...recentMeds.map((m) => ({ type: 'medication', date: m.createdAt, data: m })),
    ]
      .sort((a, b) => new Date(b.date as any).getTime() - new Date(a.date as any).getTime())
      .slice(0, 60);

    res.json(timeline);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch health timeline' });
  }
});

// ── Appointments ─────────────────────────────────────────────────────────────

routes.get('/patients/:id/appointments', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'לא מחובר' });
    const familyId = (user as { effectiveFamilyId?: string }).effectiveFamilyId ?? user.familyId;
    const rows = await db
      .select()
      .from(appointments)
      .where(and(eq(appointments.patientId, req.params.id), eq(appointments.familyId, familyId)))
      .orderBy(desc(appointments.scheduledAt))
      .limit(30);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
});

routes.post('/patients/:id/appointments', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'לא מחובר' });
    if (user.role === 'viewer' || user.role === 'guest') return res.status(403).json({ error: 'אין הרשאה' });
    const familyId = (user as { effectiveFamilyId?: string }).effectiveFamilyId ?? user.familyId;
    const { appointmentType, doctorName, specialty, location, scheduledAt, notes, relatedReferralId } = req.body;
    const [row] = await db
      .insert(appointments)
      .values({
        patientId: req.params.id,
        familyId,
        appointmentType,
        doctorName,
        specialty,
        location,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
        status: 'scheduled',
        notes,
        relatedReferralId: relatedReferralId || null,
      })
      .returning();

    // If linked to a referral — update referral status
    if (relatedReferralId) {
      await db
        .update(referrals)
        .set({ status: 'scheduled', scheduledDate: scheduledAt ? new Date(scheduledAt).toISOString().split('T')[0] : null, updatedAt: new Date() } as any)
        .where(eq(referrals.id, relatedReferralId));
    }

    res.status(201).json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create appointment' });
  }
});

routes.get('/patients/:id/completion-score', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'לא מחובר' });
    const familyId = (user as { effectiveFamilyId?: string }).effectiveFamilyId ?? user.familyId;
    const { id } = req.params;
    const [patient] = await db
      .select(SAFE_PATIENT_COLS)
      .from(patients)
      .where(and(eq(patients.id, id), eq(patients.familyId, familyId)))
      .limit(1);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });
    const score = computePatientCompletionScore(patient);
    const step = computeOnboardingStep(patient);
    res.json({ completionScore: score, onboardingStep: step });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to compute score' });
  }
});

// primary patient for current family
routes.get('/patients/primary', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'לא מחובר' });
    const familyId = (user as { effectiveFamilyId?: string }).effectiveFamilyId ?? user.familyId;

    const [patient] = await db
      .select(SAFE_PATIENT_COLS)
      .from(patients)
      .where(eq(patients.familyId, familyId))
      .orderBy(desc(patients.isPrimary), desc(patients.createdAt))
      .limit(1);

    if (!patient) return res.status(404).json({ error: 'No patient found' });
    const out = { ...patient, idNumber: decrypt(patient.idNumber), insuranceNumber: decrypt(patient.insuranceNumber) };
    res.json(out);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch primary patient' });
  }
});

routes.get('/patients/:id', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'לא מחובר' });
    const familyId = (user as { effectiveFamilyId?: string }).effectiveFamilyId ?? user.familyId;

    const { id } = req.params;
    const [patient] = await db
      .select(SAFE_PATIENT_COLS)
      .from(patients)
      .where(and(eq(patients.id, id), eq(patients.familyId, familyId)))
      .limit(1);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });
    const out = { ...patient, idNumber: decrypt(patient.idNumber), insuranceNumber: decrypt(patient.insuranceNumber) };
    res.json(out);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch patient' });
  }
});

// create primary patient for family
routes.post('/patients', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'לא מחובר' });
    const familyId = (user as { effectiveFamilyId?: string }).effectiveFamilyId ?? user.familyId;

    const { fullName, dateOfBirth, primaryDiagnosis, notes, idNumber, gender, insuranceNumber } = req.body ?? {};
    if (!fullName) return res.status(400).json({ error: 'fullName is required' });

    const values: Record<string, unknown> = {
      familyId,
      fullName,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      primaryDiagnosis: primaryDiagnosis ?? undefined,
      notes: notes ?? undefined,
      isPrimary: true,
    };
    if (idNumber != null && String(idNumber).trim()) values.idNumber = encrypt(String(idNumber).trim());
    if (gender != null) values.gender = String(gender).slice(0, 16) || null;
    if (insuranceNumber != null && String(insuranceNumber).trim()) values.insuranceNumber = encrypt(String(insuranceNumber).trim());

    const [created] = await db.insert(patients).values(values).returning(SAFE_PATIENT_COLS);
    if (created) {
      try {
        const score = computePatientCompletionScore(created);
        const step = computeOnboardingStep(created);
        await db.update(patients).set({ profileCompletionScore: score, onboardingStep: step }).where(eq(patients.id, created.id));
        (created as Record<string, unknown>).profileCompletionScore = score;
        (created as Record<string, unknown>).onboardingStep = step;
      } catch (_) {
        // Columns may not exist if Phase-1 migration not yet applied
      }
    }

    const out = created
      ? { ...created, idNumber: decrypt(created.idNumber), insuranceNumber: decrypt(created.insuranceNumber) }
      : created;
    res.status(201).json(out);
  } catch (err: any) {
    console.error('POST /patients error:', err?.code, err?.message);
    const msg = process.env.NODE_ENV === 'production'
      ? 'Failed to create patient'
      : (err?.message ?? String(err)).slice(0, 200);
    res.status(500).json({ error: msg });
  }
});

// partial update of patient (only within same family)
routes.patch('/patients/:id', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'לא מחובר' });
    const familyId = (user as { effectiveFamilyId?: string }).effectiveFamilyId ?? user.familyId;

    if (user.role === 'viewer' || user.role === 'guest') {
      return res.status(403).json({ error: 'אין הרשאה לעדכן פרופיל מטופל' });
    }

    const { id } = req.params;
    const [existing] = await db
      .select(SAFE_PATIENT_COLS)
      .from(patients)
      .where(and(eq(patients.id, id), eq(patients.familyId, familyId)))
      .limit(1);

    if (!existing) return res.status(404).json({ error: 'Patient not found' });

    const body = req.body ?? {};
    const update: any = {};

    if (body.fullName !== undefined) update.fullName = String(body.fullName);
    if (body.dateOfBirth !== undefined) {
      update.dateOfBirth = body.dateOfBirth ? new Date(body.dateOfBirth) : null;
    }
    if (body.primaryDiagnosis !== undefined) {
      update.primaryDiagnosis = body.primaryDiagnosis || null;
    }
    if (body.emergencyContact !== undefined) {
      update.emergencyContact = body.emergencyContact || null;
    }
    if (body.emergencyContactPhone !== undefined) {
      update.emergencyContactPhone = body.emergencyContactPhone || null;
    }
    if (body.primaryDoctorName !== undefined) {
      update.primaryDoctorName = body.primaryDoctorName || null;
    }
    if (body.primaryDoctorPhone !== undefined) {
      update.primaryDoctorPhone = body.primaryDoctorPhone || null;
    }
    if (body.healthFundName !== undefined) {
      update.healthFundName = body.healthFundName || null;
    }
    if (body.notes !== undefined) {
      update.notes = body.notes || null;
    }
    if (body.idNumber !== undefined) {
      update.idNumber = body.idNumber ? encrypt(String(body.idNumber).trim()) : null;
    }
    if (body.gender !== undefined) {
      update.gender = body.gender ? String(body.gender).slice(0, 16) : null;
    }
    if (body.insuranceNumber !== undefined) {
      update.insuranceNumber = body.insuranceNumber ? encrypt(String(body.insuranceNumber).trim()) : null;
    }
    if (body.bloodType !== undefined) update.bloodType = body.bloodType ? String(body.bloodType).slice(0, 8) : null;
    if (body.mobilityStatus !== undefined) update.mobilityStatus = body.mobilityStatus ? String(body.mobilityStatus).slice(0, 32) : null;
    if (body.cognitiveStatus !== undefined) update.cognitiveStatus = body.cognitiveStatus ? String(body.cognitiveStatus).slice(0, 32) : null;
    if (body.careLevel !== undefined) update.careLevel = body.careLevel ? String(body.careLevel).slice(0, 32) : null;
    if (body.lastAssessmentDate !== undefined) {
      update.lastAssessmentDate = body.lastAssessmentDate ? new Date(body.lastAssessmentDate) : null;
    }
    if (body.chronicConditions !== undefined) {
      update.chronicConditions = Array.isArray(body.chronicConditions) ? body.chronicConditions.filter(Boolean) : null;
    }
    if (body.allergies !== undefined) {
      update.allergies = Array.isArray(body.allergies) ? body.allergies.filter((a: any) => a?.name) : null;
    }
    if (body.profileCompletionScore !== undefined) {
      const n = Number(body.profileCompletionScore);
      update.profileCompletionScore = Number.isFinite(n) ? Math.min(100, Math.max(0, Math.round(n))) : null;
    }
    if (body.onboardingStep !== undefined) {
      const n = Number(body.onboardingStep);
      update.onboardingStep = Number.isFinite(n) ? Math.max(1, Math.round(n)) : null;
    }
    if (body.careStage !== undefined) {
      const validStages = ['genetic_awareness', 'suspicion', 'bridge', 'certainty'];
      const stage = String(body.careStage).trim();
      if (validStages.includes(stage)) {
        update.careStage = stage;
        update.stageUpdatedAt = new Date();
      }
    }
    // Phase-2 fields — stored separately, applied in guarded block after main update
    const p2: Record<string, unknown> = {};
    if (body.familyHistory !== undefined) {
      p2.familyHistory = Array.isArray(body.familyHistory) ? body.familyHistory : null;
    }
    if (body.adlScore !== undefined) {
      const n = Number(body.adlScore);
      p2.adlScore = Number.isFinite(n) ? Math.min(6, Math.max(0, Math.round(n))) : null;
    }
    if (body.iadlScore !== undefined) {
      const n = Number(body.iadlScore);
      p2.iadlScore = Number.isFinite(n) ? Math.min(8, Math.max(0, Math.round(n))) : null;
    }
    if (body.fallRiskLevel !== undefined) {
      const valid = ['low', 'medium', 'high'];
      p2.fallRiskLevel = valid.includes(body.fallRiskLevel) ? body.fallRiskLevel : null;
    }
    if (body.painLevel !== undefined) {
      const n = Number(body.painLevel);
      p2.painLevel = Number.isFinite(n) ? Math.min(10, Math.max(0, Math.round(n))) : null;
    }
    if (body.nutritionStatus !== undefined) {
      p2.nutritionStatus = body.nutritionStatus ? String(body.nutritionStatus).slice(0, 32) : null;
    }
    if (body.height !== undefined) {
      const n = Number(body.height);
      p2.height = Number.isFinite(n) && n > 0 ? n.toFixed(1) : null;
    }
    if (body.weight !== undefined) {
      const n = Number(body.weight);
      p2.weight = Number.isFinite(n) && n > 0 ? n.toFixed(2) : null;
    }
    if (body.specialists !== undefined) {
      p2.specialists = Array.isArray(body.specialists) ? body.specialists.filter((s: any) => s?.name) : null;
    }
    if (body.sdohFactors !== undefined) {
      p2.sdohFactors = body.sdohFactors && typeof body.sdohFactors === 'object' ? body.sdohFactors : null;
    }
    if (body.vaccinationHistory !== undefined) {
      p2.vaccinationHistory = Array.isArray(body.vaccinationHistory) ? body.vaccinationHistory : null;
    }
    if (body.lastHospitalizationDate !== undefined) {
      p2.lastHospitalizationDate = body.lastHospitalizationDate ? new Date(body.lastHospitalizationDate) : null;
    }
    if (body.advanceDirectives !== undefined) p2.advanceDirectives = Boolean(body.advanceDirectives);
    if (body.advanceDirectivesNotes !== undefined) p2.advanceDirectivesNotes = body.advanceDirectivesNotes || null;
    if (body.dnrStatus !== undefined) p2.dnrStatus = Boolean(body.dnrStatus);

    const merged = { ...existing, ...update };
    update.profileCompletionScore = computePatientCompletionScore(merged);
    update.onboardingStep = computeOnboardingStep(merged);

    const [updated] = await db
      .update(patients)
      .set(update)
      .where(eq(patients.id, id))
      .returning(SAFE_PATIENT_COLS);

    // Apply Phase-2 fields silently — no-op if migration not yet run
    await applyPhase2PatientUpdate(id, p2);

    const out = updated
      ? { ...updated, idNumber: decrypt(updated.idNumber), insuranceNumber: decrypt(updated.insuranceNumber) }
      : updated;
    res.json(out);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update patient' });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// TASKS – דורש התחברות, משימות לפי משפחות שהמשתמש חבר בהן
// ──────────────────────────────────────────────────────────────────────────────

async function userHasAccessToFamily(userId: string, fid: string): Promise<boolean> {
  const [u] = await db
    .select({ familyId: users.familyId, primaryFamilyId: users.primaryFamilyId })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!u) return false;
  if (u.familyId === fid || u.primaryFamilyId === fid) return true;
  const [fm] = await db
    .select({ userId: familyMembers.userId })
    .from(familyMembers)
    .where(and(eq(familyMembers.userId, userId), eq(familyMembers.familyId, fid)))
    .limit(1);
  return !!fm;
}

// POST /tasks/deduplicate — remove duplicate AI tasks keeping the oldest per title
routes.post('/tasks/deduplicate', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'לא מחובר' });
    const familyId = (user as { effectiveFamilyId?: string }).effectiveFamilyId ?? user.familyId;

    // Find all duplicate task titles (same familyId + title, more than 1 row)
    const dupeGroups = await db.execute(sql`
      SELECT title, array_agg(id ORDER BY created_at ASC) AS ids
      FROM tasks
      WHERE family_id = ${familyId}::uuid
      GROUP BY title
      HAVING count(*) > 1
    `);

    let deleted = 0;
    for (const row of (dupeGroups.rows as any[])) {
      // Keep the first (oldest) id, delete the rest
      const [_keep, ...toDelete] = row.ids as string[];
      if (toDelete.length > 0) {
        for (const dupId of toDelete) {
          await db.execute(sql`DELETE FROM tasks WHERE id = ${dupId}::uuid`);
          deleted++;
        }
      }
    }

    res.json({ ok: true, deleted, message: `הוסרו ${deleted} משימות כפולות` });
  } catch (err) {
    console.error('Deduplicate tasks error:', err);
    res.status(500).json({ error: 'Failed to deduplicate tasks' });
  }
});

routes.get('/tasks', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'לא מחובר' });
    const familyId = (req.query.familyId as string) ?? ((user as { effectiveFamilyId?: string }).effectiveFamilyId ?? user.familyId);
    if (!(await userHasAccessToFamily(user.id, familyId))) {
      return res.status(403).json({ error: 'אין גישה למשפחה זו' });
    }

    const {
      status, category, priority, assignedToUserId,
      source, dueBefore, dueAfter, patientId, myTasks,
    } = req.query as Record<string, string | undefined>;

    const where = [eq(tasks.familyId, familyId)];
    if (status)           where.push(eq(tasks.status, status as any));
    if (category)         where.push(eq(tasks.category, category as any));
    if (priority)         where.push(eq(tasks.priority, priority as any));
    if (patientId)        where.push(eq(tasks.patientId, patientId));
    if (assignedToUserId) where.push(eq(tasks.assignedToUserId, assignedToUserId));
    if (source)           where.push(eq(tasks.source, source as any));
    if (myTasks === 'true') where.push(eq(tasks.assignedToUserId, user.id));
    if (dueBefore)        where.push(lte(tasks.dueDate, new Date(dueBefore)));
    if (dueAfter)         where.push(gte(tasks.dueDate, new Date(dueAfter)));

    const list = await db
      .select({
        id: tasks.id, familyId: tasks.familyId, patientId: tasks.patientId,
        createdByUserId: tasks.createdByUserId, assignedToUserId: tasks.assignedToUserId,
        title: tasks.title, description: tasks.description,
        status: tasks.status, priority: tasks.priority, category: tasks.category,
        source: tasks.source, dueDate: tasks.dueDate,
        completedAt: tasks.completedAt, completedByUserId: tasks.completedByUserId,
        isRecurring: tasks.isRecurring, position: tasks.position,
        scheduledStart: tasks.scheduledStart, scheduledEnd: tasks.scheduledEnd,
        coAssigneeIds: tasks.coAssigneeIds,
        linkedDocumentIds: tasks.linkedDocumentIds,
        createdAt: tasks.createdAt,
        sourceEntityId: tasks.sourceEntityId,
        sourceEntityType: tasks.sourceEntityType,
      })
      .from(tasks)
      .where(and(...where))
      .orderBy(desc(tasks.createdAt));

    // Enrich with assignee names and user colors
    const userIds = [...new Set(list.flatMap((t) => {
      const ids = [t.assignedToUserId, t.createdByUserId].filter(Boolean) as string[];
      if (Array.isArray(t.coAssigneeIds)) ids.push(...(t.coAssigneeIds as string[]));
      return ids;
    }))];
    const userMap: Record<string, { name: string; color: string }> = {};
    if (userIds.length > 0) {
      const userRows = await db
        .select({ id: users.id, fullName: users.fullName, userColor: (users as any).userColor })
        .from(users)
        .where(inArray(users.id, userIds));
      for (const u of userRows) userMap[u.id] = { name: u.fullName ?? '', color: u.userColor ?? '#6366f1' };
    }

    const enriched = list.map((t) => ({
      ...t,
      assignedToName: t.assignedToUserId ? (userMap[t.assignedToUserId]?.name ?? null) : null,
      assignedToColor: t.assignedToUserId ? (userMap[t.assignedToUserId]?.color ?? '#6366f1') : null,
      createdByName: t.createdByUserId ? (userMap[t.createdByUserId]?.name ?? null) : null,
      coAssignees: Array.isArray(t.coAssigneeIds)
        ? (t.coAssigneeIds as string[]).map((uid) => ({ id: uid, name: userMap[uid]?.name ?? uid, color: userMap[uid]?.color ?? '#6366f1' }))
        : [],
      linkedDocumentIds: Array.isArray(t.linkedDocumentIds) ? t.linkedDocumentIds as string[] : [],
    }));

    res.json(enriched);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

routes.post('/tasks', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'לא מחובר' });
    const {
      familyId, title, description, status, priority, category,
      dueDate, patientId, assignedToUserId, scheduledStart, scheduledEnd,
      sourceDocTitle, sourceEntityId, taskFor, coAssigneeIds, linkedDocumentIds,
    } = req.body ?? {};
    if (!familyId || !title) {
      return res.status(400).json({ error: 'familyId and title are required' });
    }
    if (!(await userHasAccessToFamily(user.id, familyId))) {
      return res.status(403).json({ error: 'אין גישה למשפחה זו' });
    }

    const validStatuses = ['requested', 'scheduled', 'todo', 'in_progress', 'stuck', 'postponed', 'cancelled', 'done'];
    const validPriorities = ['urgent', 'high', 'medium', 'low'];
    const validCategories = ['medical', 'personal', 'administrative', 'shopping', 'transport', 'other'];

    const insertValues: Record<string, unknown> = {
      familyId,
      title: String(title).trim(),
      createdByUserId: user.id,
    };
    // Build description: optionally prepend source document context
    let fullDescription = description ?? null;
    if (sourceDocTitle) {
      const sourcePrefix = `[מקור: ${String(sourceDocTitle).trim()}]`;
      fullDescription = fullDescription ? `${sourcePrefix}\n${fullDescription}` : sourcePrefix;
    }
    if (taskFor && taskFor !== 'note') {
      const forLabel = taskFor === 'patient' ? '[למטופל]' : '[למטפל/משפחה]';
      fullDescription = fullDescription ? `${forLabel} ${fullDescription}` : forLabel;
    }
    if (fullDescription !== undefined) insertValues.description = fullDescription;
    if (status && validStatuses.includes(status)) insertValues.status = status;
    if (priority && validPriorities.includes(priority)) insertValues.priority = priority;
    if (category && validCategories.includes(category)) insertValues.category = category;
    else if (sourceDocTitle) insertValues.category = 'medical'; // default medical when from a document
    if (dueDate) insertValues.dueDate = new Date(dueDate);
    if (patientId) insertValues.patientId = patientId;
    if (assignedToUserId) insertValues.assignedToUserId = assignedToUserId;
    if (scheduledStart) insertValues.scheduledStart = new Date(scheduledStart);
    if (scheduledEnd) insertValues.scheduledEnd = new Date(scheduledEnd);
    if (sourceDocTitle) insertValues.source = 'ai'; // mark AI-generated tasks
    if (sourceEntityId) {
      insertValues.sourceEntityId = sourceEntityId;
      insertValues.sourceEntityType = 'document';
    }
    if (coAssigneeIds && Array.isArray(coAssigneeIds)) insertValues.coAssigneeIds = coAssigneeIds;
    if (linkedDocumentIds && Array.isArray(linkedDocumentIds)) insertValues.linkedDocumentIds = linkedDocumentIds;

    const [created] = await db
      .insert(tasks)
      .values(insertValues as any)
      .returning();

    if (created) {
      if (created.status === 'requested') {
        // Notify the assignee that they have a new task request
        if (assignedToUserId && assignedToUserId !== user.id) {
          const [requester] = await db.select({ fullName: users.fullName }).from(users).where(eq(users.id, user.id)).limit(1);
          createNotification(
            assignedToUserId,
            `בקשת משימה חדשה: "${String(title).trim()}"`,
            `${requester?.fullName ?? 'מישהו'} ביקש ממך לבצע משימה זו`,
            'info'
          );
        }
        // Notify family managers (excluding the requester) about the pending request
        const managerIds = await getFamilyManagerIds(familyId, user.id);
        for (const managerId of managerIds) {
          if (managerId !== assignedToUserId) {
            createNotification(
              managerId,
              `בקשת משימה ממתינה לאישור: "${String(title).trim()}"`,
              `נשלחה בקשה חדשה הדורשת אישור`,
              'warning'
            );
          }
        }
      } else {
        // Confirmed task – sync to calendar
        syncTaskToCalendar({
          id: created.id,
          title: created.title,
          description: created.description,
          dueDate: created.dueDate,
          scheduledStart: (created as any).scheduledStart ?? null,
          scheduledEnd: (created as any).scheduledEnd ?? null,
          status: String(created.status),
        }, user.id).catch((err) => console.error('Calendar sync failed:', err));
      }
    }

    res.status(201).json(created);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

routes.patch('/tasks/:id', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'לא מחובר' });
    const { id } = req.params;
    
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
    if (!task) return res.status(404).json({ error: 'משימה לא נמצאה' });
    
    if (!(await userHasAccessToFamily(user.id, task.familyId))) {
      return res.status(403).json({ error: 'אין גישה למשפחה זו' });
    }

    const { title, description, status, priority, dueDate, patientId, assignedToUserId, scheduledStart, scheduledEnd, coAssigneeIds, linkedDocumentIds } = req.body ?? {};
    const update: any = {};
    if (title !== undefined) update.title = String(title).trim();
    if (description !== undefined) update.description = description;
    if (status !== undefined && ['requested', 'scheduled', 'todo', 'in_progress', 'stuck', 'postponed', 'cancelled', 'done'].includes(status)) {
      update.status = status;
      if (status === 'done') update.completedAt = new Date();
    }
    if (priority !== undefined && ['urgent', 'low', 'medium', 'high'].includes(priority)) {
      update.priority = priority;
    }
    if (dueDate !== undefined) update.dueDate = dueDate ? new Date(dueDate) : null;
    if (patientId !== undefined) update.patientId = patientId;
    if (assignedToUserId !== undefined) update.assignedToUserId = assignedToUserId;
    if (scheduledStart !== undefined) update.scheduledStart = scheduledStart ? new Date(scheduledStart) : null;
    if (scheduledEnd !== undefined) update.scheduledEnd = scheduledEnd ? new Date(scheduledEnd) : null;
    if (coAssigneeIds !== undefined) update.coAssigneeIds = Array.isArray(coAssigneeIds) ? coAssigneeIds : [];
    if (linkedDocumentIds !== undefined) update.linkedDocumentIds = Array.isArray(linkedDocumentIds) ? linkedDocumentIds : [];

    const [updated] = await db.update(tasks).set(update).where(eq(tasks.id, id)).returning();
    if (updated && updated.status !== 'requested') {
      syncTaskToCalendar({
        id: updated.id,
        title: updated.title,
        description: updated.description,
        dueDate: updated.dueDate,
        scheduledStart: (updated as any).scheduledStart ?? null,
        scheduledEnd: (updated as any).scheduledEnd ?? null,
        status: String(updated.status),
      }, user.id).catch((err) => console.error('Calendar sync failed:', err));
    }
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// ── Helper: insert in-app notification (fire-and-forget) ──────────────────────
async function createNotification(
  userId: string,
  title: string,
  body: string,
  type: 'info' | 'success' | 'warning' | 'error' = 'info'
) {
  try {
    await db.insert(notifications).values({ userId, title, body, type });
  } catch (err) {
    console.error('createNotification failed:', err);
  }
}

// ── Helper: get user email by id ──────────────────────────────────────────────
async function getUserEmail(userId: string): Promise<string | null> {
  const [row] = await db.select({ email: users.email }).from(users).where(eq(users.id, userId)).limit(1);
  return row?.email ?? null;
}

// ── Helper: get family managers ───────────────────────────────────────────────
async function getFamilyManagerIds(familyId: string, excludeUserId?: string): Promise<string[]> {
  const rows = await db
    .select({ userId: familyMembers.userId })
    .from(familyMembers)
    .where(and(eq(familyMembers.familyId, familyId), eq(familyMembers.role, 'manager')));
  return rows.map((r) => r.userId).filter((id) => id !== excludeUserId);
}

routes.post('/tasks/:id/approve', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'לא מחובר' });
    const { id } = req.params;

    const [task] = await db
      .select({
        id: tasks.id, title: tasks.title, description: tasks.description,
        familyId: tasks.familyId, assignedToUserId: tasks.assignedToUserId,
        createdByUserId: tasks.createdByUserId, dueDate: tasks.dueDate,
        scheduledStart: (tasks as any).scheduledStart, scheduledEnd: (tasks as any).scheduledEnd,
      })
      .from(tasks).where(eq(tasks.id, id)).limit(1);
    if (!task) return res.status(404).json({ error: 'משימה לא נמצאה' });
    if (!(await userHasAccessToFamily(user.id, task.familyId))) {
      return res.status(403).json({ error: 'אין גישה למשפחה זו' });
    }

    const [updated] = await db
      .update(tasks).set({ status: 'todo' }).where(eq(tasks.id, id)).returning();

    if (updated) {
      // Sync to ASSIGNEE's calendar (not approver's)
      const syncUserId = task.assignedToUserId ?? task.createdByUserId;
      // Collect attendee emails: the approver + assignee
      const attendeeEmails: string[] = [];
      const approverEmail = await getUserEmail(user.id);
      if (approverEmail) attendeeEmails.push(approverEmail);
      if (task.assignedToUserId && task.assignedToUserId !== user.id) {
        const assigneeEmail = await getUserEmail(task.assignedToUserId);
        if (assigneeEmail) attendeeEmails.push(assigneeEmail);
      }

      syncTaskToCalendar({
        id: updated.id,
        title: updated.title,
        description: updated.description,
        dueDate: task.dueDate,
        scheduledStart: task.scheduledStart ? new Date(task.scheduledStart) : null,
        scheduledEnd: task.scheduledEnd ? new Date(task.scheduledEnd) : null,
        status: String(updated.status),
        attendeeEmails,
      }, syncUserId).catch((err) => console.error('Calendar sync failed:', err));

      // Notify the requester
      if (task.createdByUserId && task.createdByUserId !== user.id) {
        createNotification(
          task.createdByUserId,
          `המשימה "${task.title}" אושרה`,
          `הבקשה אושרה ונוספה ללוח המשימות`,
          'success'
        );
      }
    }

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to approve task' });
  }
});

routes.post('/tasks/:id/decline', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'לא מחובר' });
    const { id } = req.params;

    const [task] = await db
      .select({ id: tasks.id, title: tasks.title, familyId: tasks.familyId, createdByUserId: tasks.createdByUserId })
      .from(tasks).where(eq(tasks.id, id)).limit(1);
    if (!task) return res.status(404).json({ error: 'משימה לא נמצאה' });
    if (!(await userHasAccessToFamily(user.id, task.familyId))) {
      return res.status(403).json({ error: 'אין גישה למשפחה זו' });
    }

    const [updated] = await db
      .update(tasks).set({ status: 'cancelled' }).where(eq(tasks.id, id)).returning();

    // Notify the requester
    if (task.createdByUserId && task.createdByUserId !== user.id) {
      createNotification(
        task.createdByUserId,
        `הבקשה למשימה "${task.title}" נדחתה`,
        `ניתן לשלוח בקשה חדשה עם זמן אחר`,
        'warning'
      );
    }

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to decline task' });
  }
});

// ── DELETE /tasks/:id ─────────────────────────────────────────────────────────
routes.delete('/tasks/:id', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'לא מחובר' });
    const { id } = req.params;

    const [task] = await db
      .select({ id: tasks.id, familyId: tasks.familyId, createdByUserId: tasks.createdByUserId })
      .from(tasks).where(eq(tasks.id, id)).limit(1);
    if (!task) return res.status(404).json({ error: 'משימה לא נמצאה' });
    if (!(await userHasAccessToFamily(user.id, task.familyId))) {
      return res.status(403).json({ error: 'אין גישה למשפחה זו' });
    }
    // Only manager or creator may delete
    if (user.role !== 'manager' && task.createdByUserId !== user.id) {
      return res.status(403).json({ error: 'רק יוצר המשימה או מנהל יכול למחוק' });
    }

    await db.delete(tasks).where(eq(tasks.id, id));
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// ── GET /tasks/:id/checklists ─────────────────────────────────────────────────
routes.get('/tasks/:id/checklists', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'לא מחובר' });
    const { id } = req.params;

    const [task] = await db.select({ familyId: tasks.familyId }).from(tasks).where(eq(tasks.id, id)).limit(1);
    if (!task) return res.status(404).json({ error: 'משימה לא נמצאה' });
    if (!(await userHasAccessToFamily(user.id, task.familyId))) {
      return res.status(403).json({ error: 'אין גישה' });
    }

    const items = await db
      .select()
      .from(taskChecklists)
      .where(eq(taskChecklists.taskId, id))
      .orderBy(taskChecklists.position, taskChecklists.createdAt);
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch checklists' });
  }
});

// ── POST /tasks/:id/checklists ────────────────────────────────────────────────
routes.post('/tasks/:id/checklists', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'לא מחובר' });
    const { id } = req.params;
    const { text, position } = req.body ?? {};
    if (!text?.trim()) return res.status(400).json({ error: 'text is required' });

    const [task] = await db.select({ familyId: tasks.familyId }).from(tasks).where(eq(tasks.id, id)).limit(1);
    if (!task) return res.status(404).json({ error: 'משימה לא נמצאה' });
    if (!(await userHasAccessToFamily(user.id, task.familyId))) {
      return res.status(403).json({ error: 'אין גישה' });
    }

    const [item] = await db
      .insert(taskChecklists)
      .values({ taskId: id, text: String(text).trim(), position: position ?? 0 })
      .returning();
    res.status(201).json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create checklist item' });
  }
});

// ── PATCH /tasks/:id/checklists/:checkId ─────────────────────────────────────
routes.patch('/tasks/:id/checklists/:checkId', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'לא מחובר' });
    const { id, checkId } = req.params;
    const { text, isDone, position } = req.body ?? {};

    const [task] = await db.select({ familyId: tasks.familyId }).from(tasks).where(eq(tasks.id, id)).limit(1);
    if (!task) return res.status(404).json({ error: 'משימה לא נמצאה' });
    if (!(await userHasAccessToFamily(user.id, task.familyId))) {
      return res.status(403).json({ error: 'אין גישה' });
    }

    const updates: Record<string, unknown> = {};
    if (text !== undefined) updates.text = String(text).trim();
    if (isDone !== undefined) updates.isDone = Boolean(isDone);
    if (position !== undefined) updates.position = Number(position);

    const [updated] = await db
      .update(taskChecklists)
      .set(updates as any)
      .where(and(eq(taskChecklists.id, checkId), eq(taskChecklists.taskId, id)))
      .returning();
    if (!updated) return res.status(404).json({ error: 'פריט לא נמצא' });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update checklist item' });
  }
});

// ── DELETE /tasks/:id/checklists/:checkId ─────────────────────────────────────
routes.delete('/tasks/:id/checklists/:checkId', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'לא מחובר' });
    const { id, checkId } = req.params;

    const [task] = await db.select({ familyId: tasks.familyId }).from(tasks).where(eq(tasks.id, id)).limit(1);
    if (!task) return res.status(404).json({ error: 'משימה לא נמצאה' });
    if (!(await userHasAccessToFamily(user.id, task.familyId))) {
      return res.status(403).json({ error: 'אין גישה' });
    }

    await db.delete(taskChecklists)
      .where(and(eq(taskChecklists.id, checkId), eq(taskChecklists.taskId, id)));
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete checklist item' });
  }
});

// ── POST /tasks/:id/ai-decompose ──────────────────────────────────────────────
routes.post('/tasks/:id/ai-decompose', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'לא מחובר' });
    const { id } = req.params;

    const [task] = await db
      .select({ id: tasks.id, title: tasks.title, description: tasks.description, familyId: tasks.familyId })
      .from(tasks).where(eq(tasks.id, id)).limit(1);
    if (!task) return res.status(404).json({ error: 'משימה לא נמצאה' });
    if (!(await userHasAccessToFamily(user.id, task.familyId))) {
      return res.status(403).json({ error: 'אין גישה' });
    }

    const { callAI } = await import('./multiProviderAI');
    const prompt = `אתה עוזר לניהול משימות רפואיות. פרק את המשימה הבאה לרשימת תתי-משימות קצרות וברורות (2-8 פריטים).
משימה: "${task.title}"
${task.description ? `תיאור: "${task.description}"` : ''}

החזר JSON בדיוק בפורמט זה:
{"items": ["פריט 1", "פריט 2", "פריט 3"]}

כל פריט – פעולה ספציפית אחת. ללא מספרים, ללא כוכביות.`;

    const aiResult = await callAI('general', [{ role: 'user', content: prompt }], { maxTokens: 512 });
    const raw = aiResult.content;
    let items: string[] = [];
    try {
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (Array.isArray(parsed.items)) items = parsed.items.filter((i: unknown) => typeof i === 'string' && i.trim());
      }
    } catch { /* ignored */ }

    if (items.length === 0) return res.status(422).json({ error: 'AI לא הצליח לפרק את המשימה' });

    // Insert as checklist items
    const inserted = await db
      .insert(taskChecklists)
      .values(items.map((text, i) => ({ taskId: id, text: text.trim(), position: i })))
      .returning();

    res.json({ items: inserted });
  } catch (err: any) {
    console.error('[ai-decompose]', err);
    const msg = err?.message ?? '';
    const friendly = msg.includes('key') || msg.includes('auth') || msg.includes('API')
      ? 'שירות ה-AI אינו מוגדר – בדוק את מפתחות ה-API'
      : msg || 'AI לא הצליח לפרק את המשימה';
    res.status(500).json({ error: friendly });
  }
});

// ── PATCH /users/me/color ─────────────────────────────────────────────────────
routes.patch('/users/me/color', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'לא מחובר' });
    const { color, targetUserId } = req.body ?? {};
    if (!color || !/^#[0-9a-fA-F]{6}$/.test(color)) {
      return res.status(400).json({ error: 'צבע לא תקין (HEX #rrggbb)' });
    }
    // Managers can change another member's color
    const affectedUserId = (targetUserId && user.role === 'manager') ? targetUserId : user.id;
    const familyId = (user as any).effectiveFamilyId ?? user.familyId;

    // Check uniqueness within the family
    const takenRows = await db
      .select({ id: users.id, userColor: (users as any).userColor })
      .from(users)
      .where(eq(users.familyId, familyId));
    const taken = takenRows.find((r) => r.id !== affectedUserId && (r.userColor as string | null)?.toLowerCase() === color.toLowerCase());
    if (taken) {
      return res.status(409).json({ error: 'צבע זה כבר בשימוש על ידי חבר משפחה אחר' });
    }

    const [updated] = await db
      .update(users)
      .set({ userColor: color } as any)
      .where(eq(users.id, affectedUserId))
      .returning({ id: users.id, userColor: (users as any).userColor });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update color' });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// FAMILY – ניהול משפחה + הגדרות היררכיה
// ──────────────────────────────────────────────────────────────────────────────

// GET /family – Admin only (דליפת מידע). עד להפעלת Admin – 403.
routes.get('/family', async (_req, res) => {
  res.status(403).json({ error: 'Admin only – use /api/admin/families' });
});

// GET /families/me – משפחה נוכחית + חברים + קוד הזמנה (למשתמש מחובר)
routes.get('/families/me', async (req, res) => {
  try {
    const u = await getUserFromRequest(req);
    if (!u) return res.status(401).json({ error: 'לא מחובר' });
    const familyId = (u as { effectiveFamilyId?: string }).effectiveFamilyId ?? u.familyId;

    const [fam] = await db
      .select({
        id: families.id,
        familyName: families.familyName,
        inviteCode: families.inviteCode,
      })
      .from(families)
      .where(eq(families.id, familyId))
      .limit(1);

    if (!fam) return res.status(404).json({ error: 'משפחה לא נמצאה' });

    let primaryPatient: { id: string; fullName: string; photoUrl?: string | null } | null = null;
    try {
      const [p] = await db
        .select({ id: patients.id, fullName: patients.fullName, photoUrl: patients.photoUrl })
        .from(patients)
        .where(eq(patients.familyId, familyId))
        .orderBy(desc(patients.isPrimary), desc(patients.createdAt))
        .limit(1);
      if (p) primaryPatient = p;
    } catch (_) {}

    let members: Array<{
      userId: string;
      fullName: string;
      email: string;
      role: string;
      memberTier: string;
      permissions: string[];
      joinedAt: string;
    }>;

    try {
      const membersRows = await db
        .select({
          userId: familyMembers.userId,
          role: familyMembers.role,
          memberTier: familyMembers.memberTier,
          permissions: familyMembers.permissions,
          joinedAt: familyMembers.joinedAt,
          fullName: users.fullName,
          email: users.email,
          familyRole: users.familyRole,
          familyRoles: (users as any).familyRoles,
          influenceAreas: users.influenceAreas,
          proximity: users.proximity,
          availability: users.availability,
          userColor: (users as any).userColor,
        })
        .from(familyMembers)
        .innerJoin(users, eq(familyMembers.userId, users.id))
        .where(eq(familyMembers.familyId, familyId));

      if (membersRows.length > 0) {
        members = membersRows.map((m) => ({
          userId: m.userId,
          fullName: m.fullName,
          email: m.email,
          role: m.role,
          memberTier: m.memberTier ?? (m.role === 'manager' ? 'family' : 'supporter_friend'),
          permissions: (m.permissions ?? []) as string[],
          userColor: (m as any).userColor ?? '#6366f1',
          joinedAt: m.joinedAt instanceof Date ? m.joinedAt.toISOString() : String(m.joinedAt),
          familyRole: m.familyRole ?? null,
          familyRoles: ((m as any).familyRoles ?? null) as string[] | null,
          influenceAreas: (m.influenceAreas ?? null) as string[] | null,
          proximity: m.proximity ?? null,
          availability: m.availability ?? null,
        }));
      } else {
        const rows = await db
          .select({ id: users.id, fullName: users.fullName, email: users.email, role: users.role })
          .from(users)
          .where(eq(users.familyId, familyId));
        members = rows.map((r) => ({
          userId: r.id,
          fullName: r.fullName,
          email: r.email,
          role: r.role,
          memberTier: r.role === 'manager' ? 'family' : 'supporter_friend',
          permissions: [] as string[],
          joinedAt: new Date().toISOString(),
        }));
      }
    } catch (_familyMembersErr) {
      const rows = await db
        .select({ id: users.id, fullName: users.fullName, email: users.email, role: users.role })
        .from(users)
        .where(eq(users.familyId, familyId));
      members = rows.map((r) => ({
        userId: r.id,
        fullName: r.fullName,
        email: r.email,
        role: r.role,
        memberTier: r.role === 'manager' ? 'family' : 'supporter_friend',
        permissions: [] as string[],
        joinedAt: new Date().toISOString(),
      }));
    }

    res.json({
      id: fam.id,
      familyName: fam.familyName,
      inviteCode: fam.inviteCode ?? '',
      primaryPatient,
      members,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load family' });
  }
});

// PATCH /families/me/members/:userId – עדכון תפקיד והרשאות (manager בלבד)
routes.patch('/families/me/members/:userId', async (req, res) => {
  try {
    const u = await getUserFromRequest(req);
    if (!u) return res.status(401).json({ error: 'לא מחובר' });
    if (u.role !== 'manager')
      return res.status(403).json({ error: 'רק מנהל/ת משפחה יכול/ה לערוך הרשאות' });
    const familyId = (u as { effectiveFamilyId?: string }).effectiveFamilyId ?? u.familyId;

    const { userId } = req.params;
    const { role, permissions, memberTier } = req.body as {
      role?: string;
      permissions?: string[];
      memberTier?: string;
    };

    const allowedRoles = ['manager', 'caregiver', 'viewer', 'guest'];
    const allowedTiers = ['family', 'supporter_friend', 'supporter_medical'];
    const allowedPerms = [
      'view_patient',
      'edit_patient',
      'view_tasks',
      'edit_tasks',
      'view_financial',
      'edit_financial',
      'view_insurance',
      'edit_insurance',
      'view_documents',
      'manage_members',
    ];

    const newRole = role && allowedRoles.includes(role) ? role : undefined;
    const newTier = memberTier && allowedTiers.includes(memberTier) ? memberTier : undefined;
    const newPerms = Array.isArray(permissions)
      ? permissions.filter((p) => allowedPerms.includes(p))
      : undefined;

    if (!newRole && !newPerms && !newTier) return res.status(400).json({ error: 'נדרש role, permissions או memberTier' });

    let member = await db
      .select()
      .from(familyMembers)
      .where(
        and(eq(familyMembers.familyId, familyId), eq(familyMembers.userId, userId))
      )
      .limit(1);

    if (!member[0]) {
      const [targetUser] = await db
        .select()
        .from(users)
        .where(and(eq(users.id, userId), eq(users.familyId, familyId)))
        .limit(1);
      if (targetUser) {
        try {
          await db.insert(familyMembers).values({
            userId: targetUser.id,
            familyId,
            role: newRole ?? targetUser.role,
            memberTier: newTier ?? (targetUser.role === 'manager' ? 'family' : 'supporter_friend'),
            permissions: newPerms ?? [],
          });
        } catch (insertErr: any) {
          console.error('family_members insert:', insertErr);
          const msg = process.env.NODE_ENV !== 'production' ? (insertErr?.message ?? 'Insert failed') : 'Failed to update member';
          return res.status(500).json({ error: msg });
        }
        if (newRole) {
          try {
            await db.update(users).set({ role: newRole }).where(and(eq(users.id, userId), eq(users.familyId, familyId)));
          } catch (_) {}
        }
      } else {
        return res.status(404).json({ error: 'חבר משפחה לא נמצא' });
      }
    } else {
      const update: { role?: string; permissions?: string[]; memberTier?: string } = {};
      if (newRole) update.role = newRole;
      if (newPerms) update.permissions = newPerms;
      if (newTier) update.memberTier = newTier;
      if (Object.keys(update).length === 0) {
        return res.json({ ok: true });
      }
      await db
        .update(familyMembers)
        .set(update)
        .where(
          and(eq(familyMembers.familyId, familyId), eq(familyMembers.userId, userId))
        );
    }

    if (newRole) {
      try {
        await db
          .update(users)
          .set({ role: newRole })
          .where(and(eq(users.id, userId), eq(users.familyId, familyId)));
      } catch (_) {}
    }

    res.json({ ok: true });
  } catch (err: any) {
    console.error('PATCH /families/me/members error:', err);
    const msg = process.env.NODE_ENV !== 'production' && err?.message ? err.message : 'Failed to update member';
    res.status(500).json({ error: msg });
  }
});

// PATCH /families/me/members/:userId/caregiving-role – עדכון תפקיד טיפולי + מפת השפעה
routes.patch('/families/me/members/:userId/caregiving-role', async (req, res) => {
  try {
    const u = await getUserFromRequest(req);
    if (!u) return res.status(401).json({ error: 'לא מחובר' });
    if (u.role !== 'manager')
      return res.status(403).json({ error: 'רק מנהל/ת משפחה יכול/ה לערוך תפקידים' });
    const familyId = (u as { effectiveFamilyId?: string }).effectiveFamilyId ?? u.familyId;
    const { userId } = req.params;

    const [targetUser] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, userId), eq(users.familyId, familyId)))
      .limit(1);
    if (!targetUser) return res.status(404).json({ error: 'חבר משפחה לא נמצא' });

    const validRoles = ['medical_coordinator', 'financial_coordinator', 'daily_caregiver', 'emotional_support', 'legal_manager', 'family_coordinator'];
    const validProximities = ['local', 'nearby', 'remote'];
    const update: Record<string, unknown> = {};

    if (req.body.familyRole !== undefined) {
      update.familyRole = validRoles.includes(req.body.familyRole) ? req.body.familyRole : null;
    }
    if (req.body.familyRoles !== undefined) {
      update.familyRoles = Array.isArray(req.body.familyRoles)
        ? req.body.familyRoles.filter((r: string) => validRoles.includes(r))
        : null;
      // Keep familyRole in sync with the first selected role for backward compat
      if (Array.isArray(update.familyRoles) && (update.familyRoles as string[]).length > 0) {
        update.familyRole = (update.familyRoles as string[])[0];
      } else if (update.familyRoles === null) {
        update.familyRole = null;
      }
    }
    if (req.body.influenceAreas !== undefined) {
      update.influenceAreas = Array.isArray(req.body.influenceAreas) ? req.body.influenceAreas : null;
    }
    if (req.body.proximity !== undefined) {
      update.proximity = validProximities.includes(req.body.proximity) ? req.body.proximity : null;
    }
    if (req.body.availability !== undefined) {
      update.availability = req.body.availability ?? null;
    }

    if (Object.keys(update).length === 0) return res.status(400).json({ error: 'אין שדות לעדכון' });

    await db.update(users).set(update).where(eq(users.id, userId));
    res.json({ ok: true });
  } catch (err: any) {
    console.error('PATCH caregiving-role error:', err);
    res.status(500).json({ error: 'Failed to update caregiving role' });
  }
});

// POST /families/me/invite/regenerate – יצירת קוד הזמנה כללי חדש (manager בלבד)
routes.post('/families/me/invite/regenerate', async (req, res) => {
  try {
    const u = await getUserFromRequest(req);
    if (!u) return res.status(401).json({ error: 'לא מחובר' });
    if (u.role !== 'manager')
      return res.status(403).json({ error: 'רק מנהל/ת משפחה יכול/ה ליצור קוד הזמנה' });

    const code = await generateUniqueFamilyInviteCode();
    await db
      .update(families)
      .set({ inviteCode: code })
      .where(eq(families.id, u.familyId));

    res.json({ inviteCode: code });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to regenerate invite code' });
  }
});

// GET /families/me/invites – רשימת קודי הזמנה ספציפיים (manager בלבד)
routes.get('/families/me/invites', async (req, res) => {
  try {
    const u = await getUserFromRequest(req);
    if (!u) return res.status(401).json({ error: 'לא מחובר' });
    if (u.role !== 'manager')
      return res.status(403).json({ error: 'רק מנהל/ת משפחה יכול/ה לראות קודי הזמנה' });

    const list = await db
      .select()
      .from(familyInvites)
      .where(eq(familyInvites.familyId, u.familyId))
      .orderBy(desc(familyInvites.createdAt));

    res.json(
      list.map((inv) => ({
        id: inv.id,
        code: inv.code,
        role: inv.role,
        memberTier: inv.memberTier,
        permissions: inv.permissions ?? [],
        expiresAt: inv.expiresAt,
        createdAt: inv.createdAt,
      }))
    );
  } catch (err: any) {
    if (err?.code === '42P01' || err?.message?.includes('does not exist')) return res.json([]);
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch invites' });
  }
});

// POST /families/me/invites – יצירת קוד הזמנה ספציפי (manager בלבד)
routes.post('/families/me/invites', async (req, res) => {
  try {
    const u = await getUserFromRequest(req);
    if (!u) return res.status(401).json({ error: 'לא מחובר' });
    if (u.role !== 'manager')
      return res.status(403).json({ error: 'רק מנהל/ת משפחה יכול/ה ליצור קוד הזמנה' });

    const { role, memberTier, permissions, expiresInDays } = req.body ?? {};
    const allowedRoles = ['manager', 'caregiver', 'viewer', 'guest'];
    const allowedTiers = ['family', 'supporter_friend', 'supporter_medical'];
    const allowedPerms = [
      'view_patient',
      'edit_patient',
      'view_tasks',
      'edit_tasks',
      'view_financial',
      'edit_financial',
      'view_insurance',
      'edit_insurance',
      'view_documents',
      'manage_members',
    ];

    const r = role && allowedRoles.includes(role) ? role : 'viewer';
    const t = memberTier && allowedTiers.includes(memberTier) ? memberTier : 'supporter_friend';
    const perms = Array.isArray(permissions)
      ? permissions.filter((p) => allowedPerms.includes(p))
      : ['view_patient', 'view_tasks', 'view_documents'];

    let expiresAt: Date | null = null;
    if (typeof expiresInDays === 'number' && expiresInDays > 0) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    }

    const code = await generateUniqueInviteCode();
    const [inv] = await db
      .insert(familyInvites)
      .values({
        familyId: u.familyId,
        code,
        role: r,
        memberTier: t,
        permissions: perms,
        expiresAt,
      })
      .returning();

    res.status(201).json({
      id: inv.id,
      code: inv.code,
      role: inv.role,
      memberTier: inv.memberTier,
      permissions: inv.permissions ?? [],
      expiresAt: inv.expiresAt,
      createdAt: inv.createdAt,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create invite' });
  }
});

// POST /families/me/invites/send – שליחת הזמנה למייל (manager בלבד)
routes.post('/families/me/invites/send', async (req, res) => {
  try {
    const u = await getUserFromRequest(req);
    if (!u) return res.status(401).json({ error: 'לא מחובר' });
    if (u.role !== 'manager')
      return res.status(403).json({ error: 'רק מנהל/ת משפחה יכול/ה לשלוח הזמנה' });

    const { to, code, presetLabel } = req.body ?? {};
    const email = typeof to === 'string' ? to.trim() : '';
    const inviteCode = typeof code === 'string' ? code.trim() : '';
    if (!email || !inviteCode) {
      return res.status(400).json({ error: 'to ו-code נדרשים' });
    }

    const result = await sendInviteEmail(email, inviteCode, presetLabel);
    if (result.ok) return res.json({ ok: true });
    if (result.reason === 'no_api_key') {
      return res.json({ ok: false, error: 'no_api_key' });
    }
    return res.status(500).json({ ok: false, error: result.error ?? 'שגיאה בשליחת מייל' });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send invite email' });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// PROFESSIONALS DIRECTORY
// ──────────────────────────────────────────────────────────────────────────────

function normalizeProfName(name: string): string {
  return name.toLowerCase().replace(/\s+/g, ' ').trim();
}

routes.get('/professionals', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'לא מחובר' });
    const familyId = (user as any).effectiveFamilyId ?? user.familyId;
    const list = await db
      .select()
      .from(professionals)
      .where(eq(professionals.familyId, familyId))
      .orderBy(desc(professionals.createdAt));
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch professionals' });
  }
});

routes.post('/professionals', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'לא מחובר' });
    if (user.role === 'viewer' || user.role === 'guest') return res.status(403).json({ error: 'אין הרשאה' });
    const familyId = (user as any).effectiveFamilyId ?? user.familyId;
    const { name, category, specialty, clinicOrCompany, phone, fax, email, address, website, notes, lastInteractionDate } = req.body ?? {};
    if (!name?.trim()) return res.status(400).json({ error: 'שם נדרש' });
    const nameNorm = normalizeProfName(name);
    const [created] = await db
      .insert(professionals)
      .values({
        familyId,
        name: name.trim(),
        nameNormalized: nameNorm,
        category: category ?? 'medical',
        specialty: specialty ?? null,
        clinicOrCompany: clinicOrCompany ?? null,
        phone: phone ?? null,
        fax: fax ?? null,
        email: email ?? null,
        address: address ?? null,
        website: website ?? null,
        notes: notes ?? null,
        lastInteractionDate: lastInteractionDate ?? null,
        source: 'manual',
      } as any)
      .returning();
    res.status(201).json(created);
  } catch (err: any) {
    if (err.code === '23505') return res.status(409).json({ error: 'איש מקצוע עם שם זה וקטגוריה זו כבר קיים' });
    console.error(err);
    res.status(500).json({ error: 'Failed to create professional' });
  }
});

routes.get('/professionals/:id', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'לא מחובר' });
    const familyId = (user as any).effectiveFamilyId ?? user.familyId;
    const [pro] = await db
      .select()
      .from(professionals)
      .where(and(eq(professionals.id, req.params.id), eq(professionals.familyId, familyId)));
    if (!pro) return res.status(404).json({ error: 'Not found' });
    res.json(pro);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch professional' });
  }
});

routes.patch('/professionals/:id', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'לא מחובר' });
    if (user.role === 'viewer' || user.role === 'guest') return res.status(403).json({ error: 'אין הרשאה' });
    const familyId = (user as any).effectiveFamilyId ?? user.familyId;
    const [existing] = await db
      .select({ id: professionals.id })
      .from(professionals)
      .where(and(eq(professionals.id, req.params.id), eq(professionals.familyId, familyId)));
    if (!existing) return res.status(404).json({ error: 'Not found' });

    const { name, category, specialty, clinicOrCompany, phone, fax, email, address, website, notes, lastInteractionDate, linkedDocumentIds } = req.body ?? {};
    const update: Record<string, unknown> = { updatedAt: new Date() };
    if (name !== undefined) { update.name = name.trim(); update.nameNormalized = normalizeProfName(name); }
    if (category !== undefined) update.category = category;
    if (specialty !== undefined) update.specialty = specialty || null;
    if (clinicOrCompany !== undefined) update.clinicOrCompany = clinicOrCompany || null;
    if (phone !== undefined) update.phone = phone || null;
    if (fax !== undefined) update.fax = fax || null;
    if (email !== undefined) update.email = email || null;
    if (address !== undefined) update.address = address || null;
    if (website !== undefined) update.website = website || null;
    if (notes !== undefined) update.notes = notes || null;
    if (lastInteractionDate !== undefined) update.lastInteractionDate = lastInteractionDate || null;
    if (linkedDocumentIds !== undefined && Array.isArray(linkedDocumentIds)) update.linkedDocumentIds = linkedDocumentIds;

    const [updated] = await db
      .update(professionals)
      .set(update as any)
      .where(eq(professionals.id, req.params.id))
      .returning();
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update professional' });
  }
});

routes.delete('/professionals/:id', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'לא מחובר' });
    if (user.role === 'viewer' || user.role === 'guest') return res.status(403).json({ error: 'אין הרשאה' });
    const familyId = (user as any).effectiveFamilyId ?? user.familyId;
    const [deleted] = await db
      .delete(professionals)
      .where(and(eq(professionals.id, req.params.id), eq(professionals.familyId, familyId)))
      .returning({ id: professionals.id });
    if (!deleted) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete professional' });
  }
});
