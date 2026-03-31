-- Admin AI analyses archive: project analysis & feature planning
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
  "admin_user_id" uuid REFERENCES "admin_users"("id") ON DELETE SET NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "admin_ai_analyses_type_idx" ON "admin_ai_analyses"("type");
CREATE INDEX IF NOT EXISTS "admin_ai_analyses_admin_user_idx" ON "admin_ai_analyses"("admin_user_id");
CREATE INDEX IF NOT EXISTS "admin_ai_analyses_created_at_idx" ON "admin_ai_analyses"("created_at");
