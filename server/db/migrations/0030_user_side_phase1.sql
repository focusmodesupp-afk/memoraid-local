-- Phase 1: Patients schema extensions + task_calendar_sync fix
-- Run after db:push or apply manually if needed

-- 1. Add new columns to patients (idempotent)
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "profile_completion_score" integer DEFAULT 0;
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "onboarding_step" integer DEFAULT 1;
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "insurance_number" text;
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "blood_type" varchar(8);
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "mobility_status" varchar(32);
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "cognitive_status" varchar(32);
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "care_level" varchar(32);
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "last_assessment_date" date;

-- 2. task_calendar_sync: change from unique(task_id) to composite PK (task_id, user_id)
-- Only if table exists with old structure (has id column, unique on task_id)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'task_calendar_sync' AND column_name = 'id') THEN
    ALTER TABLE "task_calendar_sync" DROP CONSTRAINT IF EXISTS "task_calendar_sync_task_id_unique";
    ALTER TABLE "task_calendar_sync" DROP CONSTRAINT IF EXISTS "task_calendar_sync_pkey";
    ALTER TABLE "task_calendar_sync" DROP COLUMN IF EXISTS "id";
    ALTER TABLE "task_calendar_sync" ADD PRIMARY KEY ("task_id", "user_id");
  END IF;
END $$;
