CREATE TABLE IF NOT EXISTS "medical_documents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "family_id" uuid NOT NULL REFERENCES "families"("id") ON DELETE CASCADE,
  "patient_id" uuid REFERENCES "patients"("id") ON DELETE SET NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "title" varchar(255) NOT NULL,
  "description" text,
  "document_type" varchar(64),
  "file_url" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "medical_documents_family_id_idx" ON "medical_documents"("family_id");
