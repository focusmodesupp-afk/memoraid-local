-- Phase 1: dev_phases + extend sprints + extend dev_tasks
-- Run manually on Supabase: SQL Editor -> paste and run.
-- Or: npm run db:push (if DATABASE_URL connects to Supabase).
-- Safe to run (IF NOT EXISTS, ADD COLUMN).

-- 1. dev_phases table
CREATE TABLE IF NOT EXISTS "dev_phases" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(255) NOT NULL,
  "description" text,
  "goals" jsonb DEFAULT '[]',
  "tech_stack" jsonb DEFAULT '[]',
  "complexity" varchar(32),
  "ai_context" text,
  "status" varchar(32) NOT NULL DEFAULT 'pending',
  "ai_analysis_result" jsonb,
  "total_cost_usd" decimal(10, 4),
  "position" integer NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- 2. Extend sprints
ALTER TABLE "sprints" ADD COLUMN IF NOT EXISTS "phase_id" uuid REFERENCES "dev_phases"("id") ON DELETE SET NULL;
ALTER TABLE "sprints" ADD COLUMN IF NOT EXISTS "estimated_tokens" integer;
ALTER TABLE "sprints" ADD COLUMN IF NOT EXISTS "estimated_cost_usd" decimal(10, 4);
ALTER TABLE "sprints" ADD COLUMN IF NOT EXISTS "cursor_prompt" text;
ALTER TABLE "sprints" ADD COLUMN IF NOT EXISTS "risk_level" varchar(32);

-- 3. Extend dev_tasks
ALTER TABLE "dev_tasks" ADD COLUMN IF NOT EXISTS "sprint_id" uuid REFERENCES "sprints"("id") ON DELETE SET NULL;
ALTER TABLE "dev_tasks" ADD COLUMN IF NOT EXISTS "phase_id" uuid REFERENCES "dev_phases"("id") ON DELETE SET NULL;
ALTER TABLE "dev_tasks" ADD COLUMN IF NOT EXISTS "target_file" varchar(500);
ALTER TABLE "dev_tasks" ADD COLUMN IF NOT EXISTS "estimated_tokens" integer DEFAULT 0;
ALTER TABLE "dev_tasks" ADD COLUMN IF NOT EXISTS "depends_on" jsonb DEFAULT '[]';
ALTER TABLE "dev_tasks" ADD COLUMN IF NOT EXISTS "ai_generated" boolean NOT NULL DEFAULT false;
ALTER TABLE "dev_tasks" ADD COLUMN IF NOT EXISTS "cursor_prompt_snippet" text;
ALTER TABLE "dev_tasks" ADD COLUMN IF NOT EXISTS "verification_steps" jsonb DEFAULT '[]';
