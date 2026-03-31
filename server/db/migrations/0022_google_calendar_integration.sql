-- Google Calendar integration tables
CREATE TABLE IF NOT EXISTS "user_google_calendar_tokens" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE UNIQUE,
  "access_token" text,
  "refresh_token" text NOT NULL,
  "expires_at" timestamp with time zone,
  "calendar_id" varchar(255) DEFAULT 'primary',
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "task_calendar_sync" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "task_id" uuid NOT NULL REFERENCES "tasks"("id") ON DELETE CASCADE UNIQUE,
  "calendar_event_id" varchar(255) NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "synced_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "user_google_calendar_tokens_user_id_idx" ON "user_google_calendar_tokens"("user_id");
CREATE INDEX IF NOT EXISTS "task_calendar_sync_task_id_idx" ON "task_calendar_sync"("task_id");
CREATE INDEX IF NOT EXISTS "task_calendar_sync_user_id_idx" ON "task_calendar_sync"("user_id");
