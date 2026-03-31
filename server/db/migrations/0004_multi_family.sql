-- family_members: many-to-many user-family with role + permissions per family
CREATE TABLE IF NOT EXISTS "family_members" (
	"user_id" uuid NOT NULL,
	"family_id" uuid NOT NULL,
	"role" "user_role" NOT NULL DEFAULT 'viewer',
	"permissions" jsonb DEFAULT '[]'::jsonb,
	"invited_by" uuid,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "family_members_user_id_family_id_pk" PRIMARY KEY("user_id","family_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "family_members" ADD CONSTRAINT "family_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "family_members" ADD CONSTRAINT "family_members_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "family_members" ADD CONSTRAINT "family_members_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
-- primary_family_id: default family for user (nullable for migration)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "primary_family_id" uuid;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "users" ADD CONSTRAINT "users_primary_family_id_families_id_fk" FOREIGN KEY ("primary_family_id") REFERENCES "families"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
-- populate family_members from existing users.family_id
INSERT INTO "family_members" ("user_id", "family_id", "role", "permissions")
SELECT u.id, u.family_id, u.role, 
  CASE u.role 
    WHEN 'manager' THEN '["view_patient","edit_patient","view_tasks","edit_tasks","view_financial","edit_financial","view_insurance","edit_insurance","view_documents","manage_members"]'::jsonb
    WHEN 'caregiver' THEN '["view_patient","edit_patient","view_tasks","edit_tasks","view_documents"]'::jsonb
    WHEN 'viewer' THEN '["view_patient","view_tasks","view_documents"]'::jsonb
    ELSE '["view_patient","view_tasks"]'::jsonb
  END
FROM "users" u
ON CONFLICT ("user_id", "family_id") DO NOTHING;
--> statement-breakpoint
-- set primary_family_id from family_id
UPDATE "users" SET "primary_family_id" = "family_id" WHERE "primary_family_id" IS NULL AND "family_id" IS NOT NULL;
