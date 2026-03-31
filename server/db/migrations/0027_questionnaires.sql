-- Questionnaires and responses for family care
CREATE TABLE IF NOT EXISTS "questionnaires" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "title" varchar(255) NOT NULL,
  "description" text,
  "questions" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "questionnaire_responses" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "questionnaire_id" uuid NOT NULL REFERENCES "questionnaires"("id") ON DELETE CASCADE,
  "family_id" uuid NOT NULL REFERENCES "families"("id") ON DELETE CASCADE,
  "patient_id" uuid REFERENCES "patients"("id") ON DELETE SET NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "answers" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "submitted_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "questionnaire_responses_family_id_idx" ON "questionnaire_responses"("family_id");
CREATE INDEX IF NOT EXISTS "questionnaire_responses_questionnaire_id_idx" ON "questionnaire_responses"("questionnaire_id");
