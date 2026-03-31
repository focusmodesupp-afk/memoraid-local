-- AI analysis columns for medical_documents
ALTER TABLE "medical_documents" ADD COLUMN IF NOT EXISTS "ai_analysis_status" varchar(32);
ALTER TABLE "medical_documents" ADD COLUMN IF NOT EXISTS "ai_analysis_result" jsonb;
ALTER TABLE "medical_documents" ADD COLUMN IF NOT EXISTS "extracted_medications" jsonb;
ALTER TABLE "medical_documents" ADD COLUMN IF NOT EXISTS "extracted_tasks" jsonb;
ALTER TABLE "medical_documents" ADD COLUMN IF NOT EXISTS "simplified_diagnosis" text;
ALTER TABLE "medical_documents" ADD COLUMN IF NOT EXISTS "document_date" date;
ALTER TABLE "medical_documents" ADD COLUMN IF NOT EXISTS "issuing_doctor" varchar(255);
ALTER TABLE "medical_documents" ADD COLUMN IF NOT EXISTS "hospital_name" varchar(255);
