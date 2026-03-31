CREATE TABLE IF NOT EXISTS "memory_stories" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "family_id" uuid NOT NULL REFERENCES "families"("id") ON DELETE CASCADE,
  "patient_id" uuid REFERENCES "patients"("id") ON DELETE SET NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "title" varchar(255) NOT NULL,
  "content" text,
  "image_url" text,
  "occurred_at" date,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "memory_stories_family_id_idx" ON "memory_stories"("family_id");
