-- Pipelines System for Admin
-- Critical for automation, workflows, and data processing

-- Pipeline definitions
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
);

-- Pipeline runs (execution history)
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
);

-- Pipeline stages (steps in a pipeline)
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
);

-- Pipeline alerts
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
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS "pipelines_type_idx" ON "pipelines"("type");
CREATE INDEX IF NOT EXISTS "pipelines_status_idx" ON "pipelines"("status");
CREATE INDEX IF NOT EXISTS "pipelines_next_run_idx" ON "pipelines"("next_run");
CREATE INDEX IF NOT EXISTS "pipeline_runs_pipeline_id_idx" ON "pipeline_runs"("pipeline_id");
CREATE INDEX IF NOT EXISTS "pipeline_runs_status_idx" ON "pipeline_runs"("status");
CREATE INDEX IF NOT EXISTS "pipeline_runs_started_at_idx" ON "pipeline_runs"("started_at");
CREATE INDEX IF NOT EXISTS "pipeline_stages_pipeline_id_idx" ON "pipeline_stages"("pipeline_id");
CREATE INDEX IF NOT EXISTS "pipeline_stages_order_idx" ON "pipeline_stages"("stage_order");
CREATE INDEX IF NOT EXISTS "pipeline_alerts_pipeline_id_idx" ON "pipeline_alerts"("pipeline_id");
CREATE INDEX IF NOT EXISTS "pipeline_alerts_resolved_idx" ON "pipeline_alerts"("resolved");

-- Seed common pipelines
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
ON CONFLICT DO NOTHING;
