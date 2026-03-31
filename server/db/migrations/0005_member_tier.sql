-- member_tier: תגית לסוג חבר במשפחה (family / supporter_friend / supporter_medical)
ALTER TABLE "family_members" ADD COLUMN IF NOT EXISTS "member_tier" varchar(32) DEFAULT 'family';
--> statement-breakpoint
-- default: manager = family, others = supporter_friend
UPDATE "family_members" SET "member_tier" = 'family' WHERE "role" = 'manager';
UPDATE "family_members" SET "member_tier" = 'supporter_friend' WHERE "role" != 'manager';
