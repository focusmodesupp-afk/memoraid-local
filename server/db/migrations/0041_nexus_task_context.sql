-- Add NEXUS deep-context columns for task extraction and sprint creation
ALTER TABLE nexus_extracted_tasks ADD COLUMN IF NOT EXISTS context_json JSONB;
ALTER TABLE dev_tasks ADD COLUMN IF NOT EXISTS nexus_context JSONB;
