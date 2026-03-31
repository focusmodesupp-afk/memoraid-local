-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0036: Care Stage, Family History & Family Roles
-- Adds care journey stage to patients and memory_stories,
-- family history to patients, and caregiving roles to users.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── Extend memory_stories ───────────────────────────────────────────────────
ALTER TABLE memory_stories
  ADD COLUMN IF NOT EXISTS care_stage VARCHAR(32);

CREATE INDEX IF NOT EXISTS idx_memory_stories_care_stage
  ON memory_stories(patient_id, care_stage);

-- ─── Extend patients ─────────────────────────────────────────────────────────
ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS care_stage VARCHAR(32) DEFAULT 'suspicion',
  ADD COLUMN IF NOT EXISTS stage_updated_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS family_history JSONB;

-- ─── Extend users (family member roles) ─────────────────────────────────────
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS family_role VARCHAR(32),
  ADD COLUMN IF NOT EXISTS influence_areas JSONB,
  ADD COLUMN IF NOT EXISTS proximity VARCHAR(16),
  ADD COLUMN IF NOT EXISTS availability JSONB;
