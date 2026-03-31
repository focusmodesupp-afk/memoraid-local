-- הוספת עמודת slot לקודי הזמנה לפי סוג משתמש (3 קודים קבועים)
ALTER TABLE "family_invites" ADD COLUMN IF NOT EXISTS "slot" varchar(16);
ALTER TABLE "family_invites" ALTER COLUMN "code" TYPE varchar(24);
CREATE UNIQUE INDEX IF NOT EXISTS "family_invites_family_slot_unique"
  ON "family_invites" ("family_id", "slot") WHERE "slot" IS NOT NULL;
