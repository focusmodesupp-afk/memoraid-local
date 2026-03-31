-- הרצה ב-Supabase SQL Editor: טבלת family_members (עדכון הרשאות)
-- Run this in Supabase Dashboard -> SQL Editor

-- 1. צור enum user_role אם עדיין לא קיים (בדרך כלל כבר קיים)
DO $$ BEGIN
  CREATE TYPE "user_role" AS ENUM ('manager', 'caregiver', 'viewer', 'guest');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. צור טבלת family_members
CREATE TABLE IF NOT EXISTS "family_members" (
  "user_id" uuid NOT NULL,
  "family_id" uuid NOT NULL,
  "role" "user_role" NOT NULL DEFAULT 'viewer',
  "member_tier" varchar(32) DEFAULT 'family',
  "permissions" jsonb DEFAULT '[]'::jsonb,
  "invited_by" uuid,
  "joined_at" timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY ("user_id", "family_id")
);

-- 3. Foreign keys
DO $$ BEGIN
  ALTER TABLE "family_members" ADD CONSTRAINT "family_members_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "family_members" ADD CONSTRAINT "family_members_family_id_families_id_fk"
    FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "family_members" ADD CONSTRAINT "family_members_invited_by_users_id_fk"
    FOREIGN KEY ("invited_by") REFERENCES "users"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 4. primary_family_id ב-users
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "primary_family_id" uuid;
DO $$ BEGIN
  ALTER TABLE "users" ADD CONSTRAINT "users_primary_family_id_families_id_fk"
    FOREIGN KEY ("primary_family_id") REFERENCES "families"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 5. מלא family_members מנתוני users הקיימים
INSERT INTO "family_members" ("user_id", "family_id", "role", "member_tier", "permissions")
SELECT u.id, u.family_id, u.role,
  CASE u.role WHEN 'manager' THEN 'family' ELSE 'supporter_friend' END,
  CASE u.role
    WHEN 'manager' THEN '["view_patient","edit_patient","view_tasks","edit_tasks","view_financial","edit_financial","view_insurance","edit_insurance","view_documents","manage_members"]'::jsonb
    WHEN 'caregiver' THEN '["view_patient","edit_patient","view_tasks","edit_tasks","view_documents"]'::jsonb
    WHEN 'viewer' THEN '["view_patient","view_tasks","view_documents"]'::jsonb
    ELSE '["view_patient","view_tasks"]'::jsonb
  END
FROM "users" u
ON CONFLICT ("user_id", "family_id") DO NOTHING;

-- 6. עדכן primary_family_id
UPDATE "users" SET "primary_family_id" = "family_id"
WHERE "primary_family_id" IS NULL AND "family_id" IS NOT NULL;
