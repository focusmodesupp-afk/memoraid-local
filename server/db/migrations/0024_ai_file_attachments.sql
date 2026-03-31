-- AI file attachments: attach files to analyses, link to media_library
CREATE TABLE IF NOT EXISTS "ai_analysis_attachments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "analysis_id" uuid NOT NULL REFERENCES "admin_ai_analyses"("id") ON DELETE CASCADE,
  "media_id" uuid REFERENCES "media_library"("id") ON DELETE SET NULL,
  "file_role" varchar(64) DEFAULT 'context',
  "processing_method" varchar(64) DEFAULT 'vision',
  "tokens_used" integer DEFAULT 0,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "ai_analysis_attachments_analysis_id_idx" ON "ai_analysis_attachments"("analysis_id");
CREATE INDEX IF NOT EXISTS "ai_analysis_attachments_media_id_idx" ON "ai_analysis_attachments"("media_id");

-- Add columns to admin_ai_analyses
ALTER TABLE "admin_ai_analyses"
  ADD COLUMN IF NOT EXISTS "attached_file_ids" uuid[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "admin_full_name" varchar(255),
  ADD COLUMN IF NOT EXISTS "analysis_metadata" jsonb DEFAULT '{}';
