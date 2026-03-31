-- Add risk_level to dev_tasks for JIRA-like risk tracking
ALTER TABLE "dev_tasks" ADD COLUMN IF NOT EXISTS "risk_level" varchar(32) DEFAULT NULL;
