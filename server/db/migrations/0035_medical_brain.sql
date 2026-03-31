-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0035: Medical Brain & Heart
-- Adds 9 new clinical tables + extends patients, tasks, medical_documents
-- ─────────────────────────────────────────────────────────────────────────────

-- New enums
DO $$ BEGIN
  CREATE TYPE vital_type AS ENUM (
    'blood_pressure', 'blood_sugar', 'weight', 'heart_rate',
    'temperature', 'oxygen_saturation', 'respiratory_rate', 'pain_level'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE referral_status AS ENUM (
    'pending', 'scheduled', 'completed', 'cancelled', 'expired'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE insight_severity AS ENUM ('info', 'warning', 'critical');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE assessment_type AS ENUM (
    'adl', 'iadl', 'mmse', 'gds', 'falls_risk', 'pain', 'nutrition', 'frailty'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE diagnosis_status AS ENUM ('active', 'resolved', 'suspected', 'ruled_out');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE allergen_type AS ENUM ('drug', 'food', 'environment', 'contrast', 'other');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ─── Extend patients ────────────────────────────────────────────────────────
ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS adl_score INTEGER,
  ADD COLUMN IF NOT EXISTS iadl_score INTEGER,
  ADD COLUMN IF NOT EXISTS fall_risk_level VARCHAR(16),
  ADD COLUMN IF NOT EXISTS pain_level INTEGER,
  ADD COLUMN IF NOT EXISTS nutrition_status VARCHAR(32),
  ADD COLUMN IF NOT EXISTS height DECIMAL(5,1),
  ADD COLUMN IF NOT EXISTS weight DECIMAL(6,2),
  ADD COLUMN IF NOT EXISTS specialists JSONB,
  ADD COLUMN IF NOT EXISTS sdoh_factors JSONB,
  ADD COLUMN IF NOT EXISTS vaccination_history JSONB,
  ADD COLUMN IF NOT EXISTS last_hospitalization_date DATE,
  ADD COLUMN IF NOT EXISTS advance_directives BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS advance_directives_notes TEXT,
  ADD COLUMN IF NOT EXISTS dnr_status BOOLEAN DEFAULT false;

-- ─── Extend tasks ───────────────────────────────────────────────────────────
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS source_entity_type VARCHAR(32),
  ADD COLUMN IF NOT EXISTS source_entity_id UUID,
  ADD COLUMN IF NOT EXISTS linked_referral_id UUID;

-- ─── Extend medical_documents ───────────────────────────────────────────────
ALTER TABLE medical_documents
  ADD COLUMN IF NOT EXISTS extracted_referrals JSONB,
  ADD COLUMN IF NOT EXISTS extracted_lab_values JSONB,
  ADD COLUMN IF NOT EXISTS extracted_vitals JSONB,
  ADD COLUMN IF NOT EXISTS sync_status VARCHAR(32) DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS sync_completed_at TIMESTAMPTZ;

-- ─── vitals ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vitals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  type vital_type NOT NULL,
  value DECIMAL(10,2) NOT NULL,
  value2 DECIMAL(10,2),
  unit VARCHAR(32) NOT NULL,
  is_abnormal BOOLEAN DEFAULT false,
  notes TEXT,
  source_document_id UUID REFERENCES medical_documents(id) ON DELETE SET NULL,
  recorded_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vitals_patient_id ON vitals(patient_id);
CREATE INDEX IF NOT EXISTS idx_vitals_type_recorded ON vitals(patient_id, type, recorded_at DESC);

-- ─── lab_results ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lab_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  test_name VARCHAR(255) NOT NULL,
  value VARCHAR(64) NOT NULL,
  unit VARCHAR(32),
  reference_range_low VARCHAR(32),
  reference_range_high VARCHAR(32),
  is_abnormal BOOLEAN DEFAULT false,
  test_date DATE,
  ordering_doctor VARCHAR(255),
  lab_name VARCHAR(255),
  source_document_id UUID REFERENCES medical_documents(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lab_results_patient_id ON lab_results(patient_id);
CREATE INDEX IF NOT EXISTS idx_lab_results_abnormal ON lab_results(patient_id, is_abnormal);

-- ─── referrals ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  specialty VARCHAR(128) NOT NULL,
  reason TEXT NOT NULL,
  urgency VARCHAR(16) NOT NULL DEFAULT 'routine',
  status referral_status NOT NULL DEFAULT 'pending',
  referring_doctor VARCHAR(255),
  scheduled_date DATE,
  completed_date DATE,
  notes TEXT,
  source_document_id UUID REFERENCES medical_documents(id) ON DELETE SET NULL,
  linked_task_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referrals_patient_id ON referrals(patient_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(patient_id, status);

-- ─── appointments ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  appointment_type VARCHAR(64),
  doctor_name VARCHAR(255),
  specialty VARCHAR(128),
  location VARCHAR(255),
  scheduled_at TIMESTAMPTZ,
  status VARCHAR(32) NOT NULL DEFAULT 'scheduled',
  notes TEXT,
  related_referral_id UUID REFERENCES referrals(id) ON DELETE SET NULL,
  related_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON appointments(patient_id);

-- ─── patient_diagnoses ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS patient_diagnoses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  condition VARCHAR(255) NOT NULL,
  icd_code VARCHAR(16),
  diagnosed_date DATE,
  status diagnosis_status NOT NULL DEFAULT 'active',
  severity VARCHAR(16),
  notes TEXT,
  source_document_id UUID REFERENCES medical_documents(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patient_diagnoses_patient_id ON patient_diagnoses(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_diagnoses_status ON patient_diagnoses(patient_id, status);

-- ─── patient_allergies ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS patient_allergies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  allergen VARCHAR(255) NOT NULL,
  allergen_type allergen_type DEFAULT 'other',
  reaction TEXT,
  severity VARCHAR(32),
  confirmed_date DATE,
  status VARCHAR(16) NOT NULL DEFAULT 'active',
  source_document_id UUID REFERENCES medical_documents(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patient_allergies_patient_id ON patient_allergies(patient_id);

-- ─── patient_assessments ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS patient_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  assessment_type assessment_type NOT NULL,
  score INTEGER NOT NULL,
  max_score INTEGER,
  details JSONB,
  interpretation TEXT,
  assessed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  assessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  next_assessment_due DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patient_assessments_patient_id ON patient_assessments(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_assessments_type ON patient_assessments(patient_id, assessment_type, assessed_at DESC);

-- ─── patient_health_insights ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS patient_health_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  source_document_id UUID REFERENCES medical_documents(id) ON DELETE SET NULL,
  insight_type VARCHAR(64) NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  severity insight_severity NOT NULL DEFAULT 'info',
  status VARCHAR(32) NOT NULL DEFAULT 'new',
  acknowledged_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  acknowledged_at TIMESTAMPTZ,
  related_entity_type VARCHAR(32),
  related_entity_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_phi_patient_id ON patient_health_insights(patient_id);
CREATE INDEX IF NOT EXISTS idx_phi_status ON patient_health_insights(patient_id, status, severity);
CREATE INDEX IF NOT EXISTS idx_phi_family_critical ON patient_health_insights(family_id, severity, status);

-- ─── sync_events ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sync_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  source_type VARCHAR(32) NOT NULL,
  source_id UUID NOT NULL,
  target_type VARCHAR(32) NOT NULL,
  target_id UUID,
  action VARCHAR(32) NOT NULL,
  triggered_by VARCHAR(64) NOT NULL DEFAULT 'ai',
  metadata JSONB,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sync_events_family ON sync_events(family_id, synced_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_events_source ON sync_events(source_type, source_id);
