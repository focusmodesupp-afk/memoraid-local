-- family_invites: קודי הזמנה ספציפיים עם role/memberTier/permissions
CREATE TABLE IF NOT EXISTS "family_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"code" varchar(20) NOT NULL,
	"role" "user_role" NOT NULL DEFAULT 'viewer',
	"member_tier" varchar(32) DEFAULT 'supporter_friend',
	"permissions" jsonb DEFAULT '[]'::jsonb,
	"email_optional" varchar(255),
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "family_invites" ADD CONSTRAINT "family_invites_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "family_invites_code_unique" ON "family_invites" USING btree ("code");
