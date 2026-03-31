-- Migration 0040: Performance indexes for high-frequency query columns
-- Adds indexes on family_id, user_id, patient_id and other commonly filtered columns
-- All indexes use IF NOT EXISTS to be idempotent.

-- sessions: look up by user (cleanup / list sessions)
CREATE INDEX IF NOT EXISTS idx_sessions_user_id      ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at   ON sessions(expires_at);

-- tasks: most queries filter by family_id, then status/due_date
CREATE INDEX IF NOT EXISTS idx_tasks_family_id       ON tasks(family_id);
CREATE INDEX IF NOT EXISTS idx_tasks_patient_id      ON tasks(patient_id) WHERE patient_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_user   ON tasks(assigned_to_user_id) WHERE assigned_to_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_status          ON tasks(family_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date        ON tasks(family_id, due_date) WHERE due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_created_at      ON tasks(family_id, created_at DESC);

-- patients
CREATE INDEX IF NOT EXISTS idx_patients_family_id    ON patients(family_id);

-- medical_documents
CREATE INDEX IF NOT EXISTS idx_medical_docs_family   ON medical_documents(family_id);
CREATE INDEX IF NOT EXISTS idx_medical_docs_patient  ON medical_documents(patient_id) WHERE patient_id IS NOT NULL;

-- medications
CREATE INDEX IF NOT EXISTS idx_medications_patient   ON medications(patient_id);
CREATE INDEX IF NOT EXISTS idx_medications_family    ON medications(family_id);

-- vitals
CREATE INDEX IF NOT EXISTS idx_vitals_patient        ON vitals(patient_id);
CREATE INDEX IF NOT EXISTS idx_vitals_family         ON vitals(family_id);
CREATE INDEX IF NOT EXISTS idx_vitals_recorded_at    ON vitals(patient_id, recorded_at DESC);

-- lab_results
CREATE INDEX IF NOT EXISTS idx_lab_results_patient   ON lab_results(patient_id);
CREATE INDEX IF NOT EXISTS idx_lab_results_family    ON lab_results(family_id);

-- referrals
CREATE INDEX IF NOT EXISTS idx_referrals_patient     ON referrals(patient_id);
CREATE INDEX IF NOT EXISTS idx_referrals_family      ON referrals(family_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status      ON referrals(patient_id, status);

-- appointments
CREATE INDEX IF NOT EXISTS idx_appointments_patient  ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_family   ON appointments(family_id);
CREATE INDEX IF NOT EXISTS idx_appointments_sched    ON appointments(family_id, scheduled_at) WHERE scheduled_at IS NOT NULL;

-- patient_diagnoses
CREATE INDEX IF NOT EXISTS idx_diagnoses_patient     ON patient_diagnoses(patient_id);
CREATE INDEX IF NOT EXISTS idx_diagnoses_family      ON patient_diagnoses(family_id);

-- patient_assessments
CREATE INDEX IF NOT EXISTS idx_assessments_patient   ON patient_assessments(patient_id);

-- patient_health_insights
CREATE INDEX IF NOT EXISTS idx_health_insights_pt    ON patient_health_insights(patient_id);
CREATE INDEX IF NOT EXISTS idx_health_insights_fam   ON patient_health_insights(family_id);
CREATE INDEX IF NOT EXISTS idx_health_insights_sev   ON patient_health_insights(family_id, severity) WHERE status = 'new';

-- memory_stories
CREATE INDEX IF NOT EXISTS idx_memory_family         ON memory_stories(family_id);
CREATE INDEX IF NOT EXISTS idx_memory_user           ON memory_stories(user_id);
CREATE INDEX IF NOT EXISTS idx_memory_patient        ON memory_stories(patient_id) WHERE patient_id IS NOT NULL;

-- notifications
CREATE INDEX IF NOT EXISTS idx_notif_user_unread     ON notifications(user_id, created_at DESC) WHERE read_at IS NULL;

-- audit_log
CREATE INDEX IF NOT EXISTS idx_audit_created_at      ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_entity          ON audit_log(entity_type, entity_id) WHERE entity_type IS NOT NULL;

-- family_members: look up all families for a user (multi-family support)
CREATE INDEX IF NOT EXISTS idx_family_members_user   ON family_members(user_id);

-- family_invites
CREATE INDEX IF NOT EXISTS idx_family_invites_fam    ON family_invites(family_id);

-- sync_events
CREATE INDEX IF NOT EXISTS idx_sync_events_family    ON sync_events(family_id);
CREATE INDEX IF NOT EXISTS idx_sync_events_patient   ON sync_events(patient_id) WHERE patient_id IS NOT NULL;

-- professionals directory
CREATE INDEX IF NOT EXISTS idx_professionals_family  ON professionals(family_id);

-- task_checklists
CREATE INDEX IF NOT EXISTS idx_checklists_task       ON task_checklists(task_id);

-- error_logs
CREATE INDEX IF NOT EXISTS idx_error_logs_created    ON error_logs(created_at DESC) WHERE resolved = false;
