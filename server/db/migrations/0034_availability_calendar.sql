-- Availability Calendar: add 'requested' status + scheduled time columns

-- Add 'requested' to task_status enum (Postgres requires ALTER TYPE)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'requested'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'task_status')
  ) THEN
    ALTER TYPE task_status ADD VALUE 'requested' BEFORE 'scheduled';
  END IF;
END $$;

-- Add scheduled_start and scheduled_end columns to tasks
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "scheduled_start" timestamp with time zone;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "scheduled_end" timestamp with time zone;
