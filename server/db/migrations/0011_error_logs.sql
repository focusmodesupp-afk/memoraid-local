-- Error logs table for tracking application errors
CREATE TABLE IF NOT EXISTS "error_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "level" varchar(16) NOT NULL DEFAULT 'error',
  "message" text NOT NULL,
  "stack_trace" text,
  "context" jsonb,
  "user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "family_id" uuid REFERENCES "families"("id") ON DELETE SET NULL,
  "url" text,
  "user_agent" text,
  "ip_address" varchar(64),
  "resolved" boolean DEFAULT false NOT NULL,
  "resolved_by" uuid REFERENCES "admin_users"("id") ON DELETE SET NULL,
  "resolved_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "error_logs_level_idx" ON "error_logs"("level");
CREATE INDEX IF NOT EXISTS "error_logs_resolved_idx" ON "error_logs"("resolved");
CREATE INDEX IF NOT EXISTS "error_logs_created_at_idx" ON "error_logs"("created_at");
