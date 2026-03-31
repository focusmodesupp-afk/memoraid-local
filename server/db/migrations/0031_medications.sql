-- Medications table
CREATE TABLE IF NOT EXISTS "medications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "patient_id" uuid NOT NULL REFERENCES "patients"("id") ON DELETE CASCADE,
  "family_id" uuid NOT NULL REFERENCES "families"("id") ON DELETE CASCADE,
  "name" varchar(255) NOT NULL,
  "generic_name" varchar(255),
  "dosage" varchar(64),
  "frequency" varchar(64),
  "timing" jsonb,
  "start_date" date,
  "end_date" date,
  "prescribing_doctor" varchar(255),
  "is_active" boolean DEFAULT true,
  "source_document_id" uuid REFERENCES "medical_documents"("id") ON DELETE SET NULL,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "medications_patient_id_idx" ON "medications"("patient_id");
CREATE INDEX IF NOT EXISTS "medications_family_id_idx" ON "medications"("family_id");
