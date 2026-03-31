-- AI usage tracking
CREATE TABLE IF NOT EXISTS "ai_usage" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "family_id" uuid REFERENCES "families"("id") ON DELETE CASCADE,
  "user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "model" varchar(64) NOT NULL,
  "tokens_used" integer NOT NULL DEFAULT 0,
  "cost_usd" numeric(10, 4) DEFAULT 0,
  "endpoint" varchar(128),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "ai_usage_family_idx" ON "ai_usage"("family_id");
CREATE INDEX IF NOT EXISTS "ai_usage_created_at_idx" ON "ai_usage"("created_at");
