-- Rights categories and requests
CREATE TABLE IF NOT EXISTS "rights_categories" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "slug" varchar(64) NOT NULL UNIQUE,
  "title_he" varchar(255) NOT NULL,
  "title_en" varchar(255),
  "description_he" text,
  "description_en" text,
  "icon" varchar(32),
  "sort_order" integer DEFAULT 0,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "rights_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "family_id" uuid NOT NULL REFERENCES "families"("id") ON DELETE CASCADE,
  "category_slug" varchar(64),
  "notes" text,
  "status" varchar(32) DEFAULT 'pending',
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Memory stories extensions (occurred_at: date->timestamp if needed)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'memory_stories' AND column_name = 'occurred_at' AND data_type = 'date') THEN
    ALTER TABLE "memory_stories" ALTER COLUMN "occurred_at" TYPE timestamp with time zone USING occurred_at::timestamp with time zone;
  END IF;
END $$;
ALTER TABLE "memory_stories" ADD COLUMN IF NOT EXISTS "location" varchar(255);
ALTER TABLE "memory_stories" ADD COLUMN IF NOT EXISTS "emotional_tone" varchar(32);
ALTER TABLE "memory_stories" ADD COLUMN IF NOT EXISTS "tags" jsonb;
ALTER TABLE "memory_stories" ADD COLUMN IF NOT EXISTS "ai_insight" text;
ALTER TABLE "memory_stories" ADD COLUMN IF NOT EXISTS "is_reported_to_doctor" boolean DEFAULT false;
ALTER TABLE "memory_stories" ADD COLUMN IF NOT EXISTS "severity" integer;
